/**
 * TradeMind AI — AI VERDICT client (frontend only).
 *
 * Calls POST /api/analyze, whose key lives server-side (Vercel env var).
 * The browser NEVER sends or sees any API key.
 *
 * Contract (exact — the backend worker owns /api/analyze.ts):
 *   Request:  { asset, pair, candles (last 50 OHLCV), indicators,
 *               market, newsHeadlines, ruleDecision, ruleConfidence, ruleScore }
 *   Success:  { decision, confidence, reasoning, keyFactors[], riskNote,
 *               model, source: "ai", cached, analyzedAt }
 *   Errors:   503 = AI not configured; 429 = rate limit; 502 = AI failed.
 *
 * fetchAiVerdict NEVER throws: any failure (network / timeout / non-2xx /
 * invalid payload) returns an 'unavailable' verdict carrying the rule
 * decision, so the UI falls back to the rule-based decision.
 */
import type { AiVerdict, Asset, Candle, SignalDecision } from '../types/trading';
import type { LiveAnalysis } from './liveAnalysis';

export interface AiAnalyzeRequest {
  asset: string;
  pair: string;
  candles: Candle[];
  indicators: {
    ema20: number | null;
    ema50: number | null;
    ema200: number | null;
    rsi: number | null;
    macdHistogram: number | null;
    atr: number | null;
    atrPct: number | null;
    support: number | null;
    resistance: number | null;
    volumeRatio: number | null;
    structure: 'HH_HL' | 'LH_LL' | 'MIXED';
    chartScore: number;
  };
  market: {
    fundingRate: number | null;
    fearGreed: number | null;
    fearGreedClass: string | null;
  };
  newsHeadlines: string[];
  ruleDecision: SignalDecision;
  ruleConfidence: number;
  ruleScore: number;
}

export interface AiAnalyzeResponse {
  decision: SignalDecision;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  riskNote: string;
  model: string;
  source: 'ai';
  cached: boolean;
  analyzedAt: string;
}

const AI_VERDICT_TIMEOUT_MS = 20_000;

/** Fear & Greed value -> classification. LiveAnalysis stores only the
 *  number, so the label is derived here with the standard bands. */
function fearGreedClass(value: number | null): string | null {
  if (value === null) return null;
  if (value >= 75) return 'Extreme Greed';
  if (value >= 55) return 'Greed';
  if (value >= 45) return 'Neutral';
  if (value >= 25) return 'Fear';
  return 'Extreme Fear';
}

/**
 * Build the exact backend-contract request from a live analysis.
 * Candles come from the asset (last 50), indicators + score from
 * analysis.chart, market context from the analysis, headlines are
 * titles only from analysis.assetNews.
 */
export function buildAnalyzeRequest(
  symbol: string,
  asset: Asset,
  analysis: LiveAnalysis,
): AiAnalyzeRequest {
  const { chart } = analysis;
  return {
    asset: symbol,
    pair: asset.pair,
    candles: asset.candles.slice(-50),
    indicators: {
      ema20: chart.ema20,
      ema50: chart.ema50,
      ema200: chart.ema200,
      rsi: chart.rsi,
      macdHistogram: chart.macdHistogram,
      atr: chart.atr,
      atrPct: chart.atrPct,
      support: chart.support,
      resistance: chart.resistance,
      volumeRatio: chart.volumeRatio,
      structure: chart.structure,
      chartScore: chart.chartScore,
    },
    market: {
      fundingRate: analysis.fundingRate,
      fearGreed: analysis.fearGreed,
      fearGreedClass: fearGreedClass(analysis.fearGreed),
    },
    newsHeadlines: analysis.assetNews.map((n) => n.title),
    ruleDecision: analysis.decision,
    ruleConfidence: analysis.confidence,
    ruleScore: analysis.adjustedScore,
  };
}

/** Loading placeholder: keeps the rule decision visible while fetching. */
export function loadingVerdict(
  ruleDecision: SignalDecision,
  ruleConfidence: number,
): AiVerdict {
  return {
    decision: ruleDecision,
    confidence: ruleConfidence,
    reasoning: '',
    keyFactors: [],
    riskNote: '',
    model: '',
    source: 'rule',
    status: 'loading',
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * POST /api/analyze with a 20s timeout. Never throws — on any failure
 * returns { status: 'unavailable' } carrying the rule decision so the
 * UI shows the rule-based decision instead.
 */
export async function fetchAiVerdict(request: AiAnalyzeRequest): Promise<AiVerdict> {
  const fallback: AiVerdict = {
    decision: request.ruleDecision,
    confidence: request.ruleConfidence,
    reasoning: '',
    keyFactors: [],
    riskNote: '',
    model: '',
    source: 'rule',
    status: 'unavailable',
    analyzedAt: new Date().toISOString(),
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_VERDICT_TIMEOUT_MS);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      // 503 (not configured), 429 (rate limit), 502 (AI failed) and any
      // other non-2xx all fall back to the rule decision.
      if (!res.ok) return fallback;
      const data = (await res.json()) as Partial<AiAnalyzeResponse>;
      if (data.decision !== 'BUY' && data.decision !== 'SELL' && data.decision !== 'WAIT') {
        return fallback;
      }
      if (
        typeof data.confidence !== 'number' ||
        !Number.isFinite(data.confidence) ||
        data.confidence < 0 ||
        data.confidence > 100
      ) {
        return fallback;
      }
      return {
        decision: data.decision,
        confidence: Math.round(data.confidence),
        reasoning: typeof data.reasoning === 'string' ? data.reasoning : '',
        keyFactors: Array.isArray(data.keyFactors)
          ? data.keyFactors.filter((f): f is string => typeof f === 'string')
          : [],
        riskNote: typeof data.riskNote === 'string' ? data.riskNote : '',
        model: typeof data.model === 'string' && data.model.length > 0 ? data.model : 'AI model',
        source: 'ai',
        status: 'ready',
        analyzedAt:
          typeof data.analyzedAt === 'string' ? data.analyzedAt : new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return fallback;
  }
}
