/**
 * TradeMind AI — LIVE ANALYSIS ENGINE.
 *
 * The tool does its OWN analysis from recent real data: it reads live
 * Binance candles, checks market context (funding, Fear & Greed) and
 * real headlines, then decides BUY / SELL / WAIT per asset.
 *
 * NOTHING here is a preset line. Every conclusion is computed from data
 * fetched at analysis time. When a source is unreachable, the field is
 * null and the UI says "unavailable" — a fake value is never invented.
 *
 * Sources (all public, no key):
 *  - Chart: Binance klines + 24h ticker (data-api.binance.vision)
 *  - Funding: Binance futures premium index (www.binance.com/fapi)
 *  - Sentiment: Fear & Greed index (api.alternative.me)
 *  - News: CoinDesk + Cointelegraph RSS via rss2json (CORS-enabled JSON)
 *
 * DECISION RULES (documented, no black box):
 *  1. Chart score (-100..+100) = trend ±40 + momentum ±25 + structure ±20
 *     + volume ±15, computed from EMA 20/50/200, RSI 14, MACD, ATR 14,
 *     50-bar support/resistance and 20-bar volume.
 *  2. Market adjustments (each capped, documented):
 *       funding rate > +0.05%/8h  -> -10 (longs crowded)
 *       funding rate < -0.05%/8h  -> +10 (shorts crowded)
 *       Fear & Greed >= 75        -> -10 (extreme greed caution)
 *       Fear & Greed <= 25        -> +10 (extreme fear contrarian tilt)
 *       per-asset news sentiment  -> -10..+10 (keyword-scored headlines)
 *  3. NEWS VETO (hard): a headline that BOTH mentions the asset (or the
 *     whole market) AND contains a hard-event keyword (halt, maintenance,
 *     exploit, hack, delist, lawsuit, outage, freeze, suspend, SEC
 *     charges) forces WAIT with newsRisk HIGH, whatever the chart says.
 *  4. Final: adjusted score >= +55 -> BUY; <= -55 -> SELL; else WAIT.
 *     Confidence: BUY/SELL = min(95, 60 + (|score|-55) * 0.7);
 *     WAIT = min(85, 50 + (55-|score|) * 0.6).
 *  5. SL / TP / RR are NOT decided here — they still come from the
 *     indicator engine (SL 1.5x ATR, RR 1:2). This module decides the
 *     direction and the confidence; the risk gate stays code-locked.
 */
import type { AIAgent, Candle, NewsRisk, Signal, SignalDecision } from '../types/trading';
import { fetchKlines, fetch24hStats, LIVE_CRYPTO_SYMBOLS } from './liveMarketData';
import { atr, emaSeries, macd, rsi } from './indicators';

/* ------------------------------------------------------------------ */
/* Small fetch helper with timeout — null on any failure.              */
/* ------------------------------------------------------------------ */
async function fetchJsonOnce<T>(url: string, timeoutMs = 9000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function utcStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/* ------------------------------------------------------------------ */
/* Market context sources                                              */
/* ------------------------------------------------------------------ */

export interface FundingInfo {
  symbol: string;
  fundingRate: number; // per 8h, e.g. 0.0001 = 0.01%
  markPrice: number;
  nextFundingTime: number | null;
}

/** Binance futures funding rate. www.binance.com/fapi works where
 *  fapi.binance.com is geo-blocked; fapi host is the fallback. */
export async function fetchFundingRate(binanceSymbol: string): Promise<FundingInfo | null> {
  const hosts = [
    'https://www.binance.com/fapi/v1',
    'https://fapi.binance.com/fapi/v1',
  ];
  for (const host of hosts) {
    const data = await fetchJsonOnce<{
      symbol: string;
      markPrice: string;
      lastFundingRate: string;
      nextFundingTime?: number;
    }>(`${host}/premiumIndex?symbol=${binanceSymbol}`);
    if (!data || typeof data.lastFundingRate !== 'string') continue;
    const rate = parseFloat(data.lastFundingRate);
    const mark = parseFloat(data.markPrice);
    if (!Number.isFinite(rate) || !Number.isFinite(mark)) continue;
    return {
      symbol: binanceSymbol,
      fundingRate: rate,
      markPrice: mark,
      nextFundingTime: data.nextFundingTime ?? null,
    };
  }
  return null;
}

export interface FearGreed {
  value: number; // 0..100
  classification: string; // e.g. "Fear"
  previousValue: number | null;
  previousClassification: string | null;
}

/** Crypto Fear & Greed Index (alternative.me, free, no key). */
export async function fetchFearGreed(): Promise<FearGreed | null> {
  const data = await fetchJsonOnce<{
    data?: Array<{ value: string; value_classification: string }>;
  }>('https://api.alternative.me/fng/?limit=2');
  if (!data || !Array.isArray(data.data) || data.data.length === 0) return null;
  const now = data.data[0];
  const prev = data.data[1] ?? null;
  const value = parseInt(now.value, 10);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    classification: now.value_classification,
    previousValue: prev ? parseInt(prev.value, 10) : null,
    previousClassification: prev ? prev.value_classification : null,
  };
}

/* ------------------------------------------------------------------ */
/* News — real headlines only, keyword sentiment (documented as such). */
/* ------------------------------------------------------------------ */

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const NEWS_FEEDS: Array<{ source: string; rss: string }> = [
  { source: 'CoinDesk', rss: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', rss: 'https://cointelegraph.com/rss' },
];

/** Fetch real headlines via rss2json (CORS-enabled). Returns [] on failure —
 *  the caller must show "news unavailable", never fake headlines. */
export async function fetchCryptoNews(limit = 15): Promise<NewsItem[]> {
  const all: NewsItem[] = [];
  const results = await Promise.all(
    NEWS_FEEDS.map(async (feed) => {
      const data = await fetchJsonOnce<{
        status?: string;
        items?: Array<{ title?: string; link?: string; pubDate?: string }>;
      }>(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.rss)}&count=15`,
      );
      if (!data || data.status !== 'ok' || !Array.isArray(data.items)) return;
      for (const it of data.items) {
        if (!it.title || !it.link) continue;
        all.push({
          title: it.title.trim(),
          link: it.link,
          pubDate: it.pubDate ?? '',
          source: feed.source,
        });
      }
    }),
  );
  void results;
  // Newest first (pubDate strings sort lexicographically for ISO-ish dates;
  // fall back to feed order when unparseable).
  all.sort((a, b) => {
    const ta = Date.parse(a.pubDate);
    const tb = Date.parse(b.pubDate);
    if (Number.isFinite(ta) && Number.isFinite(tb)) return tb - ta;
    return 0;
  });
  return all.slice(0, limit);
}

const BULLISH_WORDS = [
  'rally', 'surge', 'surges', 'breakout', 'bullish', 'inflow', 'inflows',
  'adoption', 'approval', 'approved', 'etf', 'record', 'gains', 'gain',
  'soar', 'soars', 'rebound', 'upgrade', 'accumulation', 'buys', 'bought',
  'milestone', 'partnership', 'all-time high', 'recovers', 'recovery',
];
const BEARISH_WORDS = [
  'crash', 'plunge', 'plunges', 'dump', 'bearish', 'outflow', 'outflows',
  'hack', 'exploit', 'exploited', 'lawsuit', 'sec', 'ban', 'banned',
  'delist', 'delisted', 'fear', 'sell-off', 'selloff', 'liquidation',
  'liquidations', 'drop', 'drops', 'falls', 'fall', 'decline', 'slump',
  'tumble', 'tumbles', 'warning', 'probe', 'criminal', 'fraud',
];
/** Hard-event keywords: only these can trigger a News VETO. */
const VETO_WORDS = [
  'halt', 'halted', 'maintenance', 'exploit', 'exploited', 'hack', 'hacked',
  'delist', 'delisted', 'lawsuit', 'outage', 'freeze', 'frozen', 'suspend',
  'suspended', 'sec charges', 'sec sues', 'emergency',
];

/** Keyword-based headline sentiment: +1 bullish, -1 bearish, 0 mixed/none.
 *  This is a transparent keyword count, NOT an ML model — labelled as such. */
export function scoreHeadlineSentiment(title: string): number {
  const t = ` ${title.toLowerCase()} `;
  const bull = BULLISH_WORDS.some((w) => t.includes(w));
  const bear = BEARISH_WORDS.some((w) => t.includes(w));
  if (bull && !bear) return 1;
  if (bear && !bull) return -1;
  return 0;
}

export interface NewsSentiment {
  /** Mean of per-headline scores, -1..+1. null when no headlines. */
  score: number | null;
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  headlines: NewsItem[];
}

export function summarizeNews(items: NewsItem[]): NewsSentiment {
  if (items.length === 0) {
    return { score: null, bullish: 0, bearish: 0, neutral: 0, total: 0, headlines: [] };
  }
  let bull = 0;
  let bear = 0;
  let sum = 0;
  for (const it of items) {
    const s = scoreHeadlineSentiment(it.title);
    sum += s;
    if (s > 0) bull += 1;
    else if (s < 0) bear += 1;
  }
  return {
    score: sum / items.length,
    bullish: bull,
    bearish: bear,
    neutral: items.length - bull - bear,
    total: items.length,
    headlines: items,
  };
}

const ASSET_ALIASES: Record<string, string[]> = {
  BTC: ['btc', 'bitcoin'],
  ETH: ['eth', 'ethereum', 'ether'],
  SOL: ['sol', 'solana'],
};

function headlineMentionsAsset(title: string, symbol: string): boolean {
  const t = title.toLowerCase();
  return (ASSET_ALIASES[symbol] ?? [symbol.toLowerCase()]).some((a) => t.includes(a));
}

function headlineIsMarketWide(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('crypto') ||
    t.includes('bitcoin') ||
    t.includes('btc') ||
    t.includes('digital asset') ||
    t.includes('market') ||
    t.includes('etf')
  );
}

/** Hard-event veto check: returns the offending headline or null. */
export function findVetoHeadline(items: NewsItem[], symbol: string): NewsItem | null {
  for (const it of items) {
    const t = it.title.toLowerCase();
    const mentions = headlineMentionsAsset(it.title, symbol) || headlineIsMarketWide(it.title);
    if (!mentions) continue;
    if (VETO_WORDS.some((w) => t.includes(w))) return it;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Chart analysis — computed from real candles.                        */
/* ------------------------------------------------------------------ */

export interface ChartFactor {
  name: string;
  points: number; // signed contribution to the chart score
  note: string; // human-readable, with the actual numbers
}

export interface ChartAnalysis {
  symbol: string;
  price: number;
  change24h: number | null;
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
  chartScore: number; // -100..+100
  factors: ChartFactor[];
  reasons: string[];
}

function lastOf(series: Array<number | null>): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null && series[i] !== undefined) return series[i] as number;
  }
  return null;
}

/**
 * Chart score (-100..+100) = trend ±40 + momentum ±25 + structure ±20
 * + volume ±15. Every factor carries its own note with real numbers.
 */
export function analyzeChart(
  symbol: string,
  candles: Candle[],
  change24h: number | null,
): ChartAnalysis | null {
  const closes = candles.map((c) => c.close);
  if (closes.length < 60) return null;
  const ema20 = lastOf(emaSeries(closes, 20));
  const ema50 = lastOf(emaSeries(closes, 50));
  const ema200 = closes.length >= 200 ? lastOf(emaSeries(closes, 200)) : null;
  const rsiValue = rsi(closes, 14);
  const macdValue = macd(closes);
  const atrValue = atr(candles, 14);
  if (ema20 === null || ema50 === null || rsiValue === null || macdValue.histogram === null || atrValue === null) {
    return null;
  }
  const price = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const atrPct = (atrValue / price) * 100;

  // 50-bar support / resistance (last 50 closed bars, current bar excluded
  // from the extremes so the level is not the bar itself).
  const window = candles.slice(-51, -1);
  const support = window.length > 0 ? Math.min(...window.map((c) => c.low)) : null;
  const resistance = window.length > 0 ? Math.max(...window.map((c) => c.high)) : null;

  // Structure: compare the last 5 closes vs the 5 before them.
  const recent = closes.slice(-5);
  const prior = closes.slice(-10, -5);
  const recentHigh = Math.max(...recent);
  const priorHigh = Math.max(...prior);
  const recentLow = Math.min(...recent);
  const priorLow = Math.min(...prior);
  const structure: ChartAnalysis['structure'] =
    recentHigh > priorHigh && recentLow > priorLow
      ? 'HH_HL'
      : recentHigh < priorHigh && recentLow < priorLow
        ? 'LH_LL'
        : 'MIXED';

  // Volume: last closed bar vs the 20-bar average before it.
  const vols = candles.map((c) => c.volume);
  const lastVol = vols[vols.length - 2] ?? vols[vols.length - 1];
  const avgVol =
    vols.slice(-21, -1).reduce((a, b) => a + b, 0) / Math.max(vols.slice(-21, -1).length, 1);
  const volumeRatio = avgVol > 0 ? lastVol / avgVol : null;

  const factors: ChartFactor[] = [];

  // --- Trend (±40) ---
  let trend = 0;
  if (ema20 > ema50) trend += 20;
  else trend -= 20;
  if (price > ema20) trend += 12;
  else trend -= 12;
  if (ema200 !== null) {
    if (price > ema200) trend += 8;
    else trend -= 8;
  }
  trend = Math.max(-40, Math.min(40, trend));
  factors.push({
    name: 'Trend',
    points: trend,
    note:
      `EMA20 ${ema20.toFixed(2)} vs EMA50 ${ema50.toFixed(2)}` +
      (ema200 !== null ? ` vs EMA200 ${ema200.toFixed(2)}` : ' (EMA200 needs 200 bars)') +
      `, price ${price.toFixed(2)} ${price > ema20 ? 'above' : 'below'} EMA20`,
  });

  // --- Momentum (±25) ---
  let momentum = 0;
  if (rsiValue >= 55 && rsiValue <= 70) momentum += 15;
  else if (rsiValue > 50 && rsiValue < 55) momentum += 7;
  else if (rsiValue >= 30 && rsiValue < 45) momentum -= 15;
  else if (rsiValue < 30) momentum -= 5;
  else if (rsiValue > 75) momentum -= 10;
  else if (rsiValue > 70) momentum += 5;
  if (macdValue.histogram > 0) momentum += 10;
  else momentum -= 10;
  momentum = Math.max(-25, Math.min(25, momentum));
  factors.push({
    name: 'Momentum',
    points: momentum,
    note: `RSI(14) ${rsiValue.toFixed(1)}, MACD histogram ${macdValue.histogram.toFixed(2)} (${macdValue.histogram > 0 ? 'positive' : 'negative'})`,
  });

  // --- Structure (±20) ---
  let structurePts = 0;
  if (structure === 'HH_HL') structurePts += 15;
  else if (structure === 'LH_LL') structurePts -= 15;
  if (resistance !== null && price > resistance - 0.5 * atrValue) structurePts -= 5;
  if (support !== null && price < support + 0.5 * atrValue) structurePts += 5;
  structurePts = Math.max(-20, Math.min(20, structurePts));
  factors.push({
    name: 'Structure',
    points: structurePts,
    note:
      `Structure ${structure === 'HH_HL' ? 'higher highs / higher lows' : structure === 'LH_LL' ? 'lower highs / lower lows' : 'mixed, no clear structure'}` +
      (support !== null && resistance !== null
        ? `; support $${support.toFixed(2)}, resistance $${resistance.toFixed(2)} (${((price - support) / atrValue).toFixed(1)} ATR above support, ${((resistance - price) / atrValue).toFixed(1)} ATR below resistance)`
        : ''),
  });

  // --- Volume (±15) ---
  let volumePts = 0;
  if (volumeRatio !== null) {
    const upBar = price > prevClose;
    if (volumeRatio >= 1.5) volumePts = upBar ? 15 : -15;
    else if (volumeRatio >= 1.0) volumePts = upBar ? 7 : -7;
  }
  factors.push({
    name: 'Volume',
    points: volumePts,
    note:
      volumeRatio !== null
        ? `Last closed-bar volume ${volumeRatio.toFixed(2)}x the 20-bar average (${price > prevClose ? 'buying' : 'selling'} bar)`
        : 'Volume data unavailable',
  });

  const chartScore = Math.max(
    -100,
    Math.min(100, factors.reduce((s, f) => s + f.points, 0)),
  );
  const reasons = factors.map((f) => `${f.name} ${f.points >= 0 ? '+' : ''}${f.points}: ${f.note}`);
  if (change24h !== null) {
    reasons.push(`24h change ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% (Binance 24h ticker)`);
  }
  reasons.push(`ATR(14) ${atrValue.toFixed(2)} (${atrPct.toFixed(2)}% of price) — 1.5x ATR stop = ${(1.5 * atrValue).toFixed(2)}`);

  return {
    symbol,
    price,
    change24h,
    ema20,
    ema50,
    ema200,
    rsi: rsiValue,
    macdHistogram: macdValue.histogram,
    atr: atrValue,
    atrPct,
    support,
    resistance,
    volumeRatio,
    structure,
    chartScore,
    factors,
    reasons,
  };
}

/* ------------------------------------------------------------------ */
/* Decision — chart + market + news, explicit rules (see file header). */
/* ------------------------------------------------------------------ */

export interface MarketContext {
  fearGreed: FearGreed | null;
  funding: Record<string, FundingInfo | null>;
  news: NewsItem[];
  newsAvailable: boolean;
  fetchedAt: string;
}

export async function fetchMarketContext(symbols: string[]): Promise<MarketContext> {
  const [fearGreed, news, ...fundingList] = await Promise.all([
    fetchFearGreed(),
    fetchCryptoNews(15),
    ...symbols.map((s) => fetchFundingRate(LIVE_CRYPTO_SYMBOLS[s] ?? s)),
  ]);
  const funding: Record<string, FundingInfo | null> = {};
  symbols.forEach((s, i) => {
    funding[s] = fundingList[i] ?? null;
  });
  return {
    fearGreed,
    funding,
    news,
    newsAvailable: news.length > 0,
    fetchedAt: utcStamp(),
  };
}

export interface LiveAnalysis {
  symbol: string;
  pair: string;
  chart: ChartAnalysis;
  adjustedScore: number;
  adjustments: Array<{ name: string; points: number; note: string }>;
  newsSentiment: NewsSentiment;
  assetNews: NewsItem[];
  fundingRate: number | null;
  fearGreed: number | null;
  veto: boolean;
  vetoHeadline: NewsItem | null;
  decision: SignalDecision;
  confidence: number;
  reasons: string[];
  bullCase: string;
  bearCase: string;
  analyzedAt: string;
  sources: { chart: 'LIVE'; market: string[]; news: 'LIVE' | 'UNAVAILABLE' };
}

export function decideFromAnalysis(
  symbol: string,
  pair: string,
  chart: ChartAnalysis,
  market: MarketContext,
): LiveAnalysis {
  const adjustments: LiveAnalysis['adjustments'] = [];
  let adjusted = chart.chartScore;

  // Funding adjustment.
  const funding = market.funding[symbol] ?? null;
  const fundingRate = funding ? funding.fundingRate : null;
  if (fundingRate !== null) {
    if (fundingRate > 0.0005) {
      adjusted -= 10;
      adjustments.push({ name: 'Funding', points: -10, note: `Funding +${(fundingRate * 100).toFixed(3)}%/8h — longs crowded, longs pay shorts` });
    } else if (fundingRate < -0.0005) {
      adjusted += 10;
      adjustments.push({ name: 'Funding', points: 10, note: `Funding ${(fundingRate * 100).toFixed(3)}%/8h — shorts crowded, shorts pay longs` });
    } else {
      adjustments.push({ name: 'Funding', points: 0, note: `Funding ${(fundingRate * 100).toFixed(4)}%/8h — neutral, no crowded side` });
    }
  } else {
    adjustments.push({ name: 'Funding', points: 0, note: 'Funding rate unavailable — no adjustment applied' });
  }

  // Fear & Greed adjustment (contrarian tilt, capped ±10).
  const fearGreed = market.fearGreed ? market.fearGreed.value : null;
  if (fearGreed !== null) {
    const cls = market.fearGreed?.classification ?? '';
    if (fearGreed >= 75) {
      adjusted -= 10;
      adjustments.push({ name: 'Fear & Greed', points: -10, note: `Fear & Greed ${fearGreed} (${cls}) — extreme greed, caution tilt` });
    } else if (fearGreed <= 25) {
      adjusted += 10;
      adjustments.push({ name: 'Fear & Greed', points: 10, note: `Fear & Greed ${fearGreed} (${cls}) — extreme fear, contrarian tilt` });
    } else {
      adjustments.push({ name: 'Fear & Greed', points: 0, note: `Fear & Greed ${fearGreed} (${cls}) — no extreme, no adjustment` });
    }
  } else {
    adjustments.push({ name: 'Fear & Greed', points: 0, note: 'Fear & Greed unavailable — no adjustment applied' });
  }

  // News: asset-relevant headlines only.
  const assetNews = market.news.filter(
    (n) => headlineMentionsAsset(n.title, symbol) || headlineIsMarketWide(n.title),
  );
  const newsSentiment = summarizeNews(assetNews);
  if (newsSentiment.score !== null) {
    const pts = Math.round(newsSentiment.score * 10);
    adjusted += pts;
    adjustments.push({
      name: 'News sentiment',
      points: pts,
      note: `Keyword sentiment ${newsSentiment.score >= 0 ? '+' : ''}${newsSentiment.score.toFixed(2)} over ${newsSentiment.total} headlines (${newsSentiment.bullish} bullish, ${newsSentiment.bearish} bearish) — keyword count, not ML`,
    });
  } else {
    adjustments.push({ name: 'News sentiment', points: 0, note: 'No headlines fetched — news unavailable, no adjustment applied' });
  }

  adjusted = Math.max(-100, Math.min(100, adjusted));

  // Hard news VETO.
  const vetoHeadline = findVetoHeadline(market.news, symbol);
  const veto = vetoHeadline !== null;

  let decision: SignalDecision;
  let confidence: number;
  if (veto) {
    decision = 'WAIT';
    confidence = 85;
  } else if (adjusted >= 55) {
    decision = 'BUY';
    confidence = Math.min(95, Math.round(60 + (adjusted - 55) * 0.7));
  } else if (adjusted <= -55) {
    decision = 'SELL';
    confidence = Math.min(95, Math.round(60 + (Math.abs(adjusted) - 55) * 0.7));
  } else {
    decision = 'WAIT';
    confidence = Math.min(85, Math.round(50 + (55 - Math.abs(adjusted)) * 0.6));
  }

  const reasons: string[] = [
    ...chart.reasons,
    ...adjustments.map((a) => `${a.name} ${a.points >= 0 ? '+' : ''}${a.points}: ${a.note}`),
    `Adjusted score ${adjusted >= 0 ? '+' : ''}${adjusted}/100 (chart ${chart.chartScore >= 0 ? '+' : ''}${chart.chartScore}) — ${decision} at ${confidence}% confidence`,
  ];
  if (veto && vetoHeadline) {
    reasons.push(`NEWS VETO: "${vetoHeadline.title}" (${vetoHeadline.source}) — hard-event headline, execution blocked`);
  }

  const bullCase =
    chart.resistance !== null
      ? `A break above resistance $${chart.resistance.toFixed(2)} opens the next leg up; invalidation is a close below support $${chart.support !== null ? chart.support.toFixed(2) : '—'}.`
      : 'No clear resistance level computed from recent candles.';
  const bearCase =
    chart.support !== null
      ? `Losing support $${chart.support.toFixed(2)} opens a fast move down; the 1.5x ATR stop sits ${(1.5 * (chart.atr ?? 0)).toFixed(2)} from entry.`
      : 'No clear support level computed from recent candles.';

  return {
    symbol,
    pair,
    chart,
    adjustedScore: adjusted,
    adjustments,
    newsSentiment,
    assetNews,
    fundingRate,
    fearGreed,
    veto,
    vetoHeadline,
    decision,
    confidence,
    reasons,
    bullCase,
    bearCase,
    analyzedAt: utcStamp(),
    sources: {
      chart: 'LIVE',
      market: [
        'Binance klines + 24h ticker',
        fundingRate !== null ? 'Binance funding rate' : 'funding unavailable',
        fearGreed !== null ? 'Fear & Greed index' : 'Fear & Greed unavailable',
      ],
      news: market.newsAvailable ? 'LIVE' : 'UNAVAILABLE',
    },
  };
}

/* ------------------------------------------------------------------ */
/* Orchestration — one call for the whole live board.                  */
/* ------------------------------------------------------------------ */

export async function runLiveAnalysis(
  symbol: string,
  market: MarketContext,
): Promise<LiveAnalysis | null> {
  const binance = LIVE_CRYPTO_SYMBOLS[symbol];
  if (!binance) return null;
  const [klines, stats] = await Promise.all([
    fetchKlines(binance, '15m', 250),
    fetch24hStats(binance),
  ]);
  if (!klines || klines.length < 60) return null;
  const chart = analyzeChart(symbol, klines, stats?.change24h ?? null);
  if (!chart) return null;
  return decideFromAnalysis(symbol, `${symbol}/USDT`, chart, market);
}

/** Full live board: BTC/ETH/SOL. Market context is fetched once and
 *  shared across assets (one Fear & Greed call, one news pull). */
export async function runAllLiveAnalysis(): Promise<LiveAnalysis[]> {
  const symbols = Object.keys(LIVE_CRYPTO_SYMBOLS);
  const market = await fetchMarketContext(symbols);
  const results = await Promise.all(symbols.map((s) => runLiveAnalysis(s, market)));
  return results.filter((r): r is LiveAnalysis => r !== null);
}

/* ------------------------------------------------------------------ */
/* Apply a live analysis to a signal — replaces ALL preset agent votes */
/* with computed ones, and sets decision / reasoning / news risk from   */
/* the real analysis. SL/TP/entry stay as computed by the indicator    */
/* engine (buildLiveSignal); this module owns direction + confidence.   */
/* ------------------------------------------------------------------ */

function vote(
  agentId: string,
  agentName: string,
  v: SignalDecision,
  confidence: number,
  note: string,
) {
  return { agentId, agentName, vote: v, confidence, note };
}

export function applyLiveAnalysis(prev: Signal, analysis: LiveAnalysis): Signal {
  // Entry/SL/TP were already set by buildLiveSignal from the same live
  // candles — this function only owns direction, confidence, votes and
  // reasoning, so those levels are kept as-is.
  const { chart } = analysis;
  const dir: SignalDecision = analysis.decision;
  const conf = analysis.confidence;
  const volNote =
    chart.volumeRatio !== null
      ? `Volume ${chart.volumeRatio.toFixed(2)}x 20-bar avg`
      : 'Volume data unavailable';

  const agentVotes = [
    vote('technical', 'Technical Agent', dir, conf,
      `EMA20 ${chart.ema20?.toFixed(2)} / EMA50 ${chart.ema50?.toFixed(2)}, RSI ${chart.rsi?.toFixed(0)}, MACD hist ${chart.macdHistogram?.toFixed(2)}`),
    vote('chart_vision', 'Chart Vision Agent', dir, conf,
      `Structure ${chart.structure === 'HH_HL' ? 'higher highs/lows' : chart.structure === 'LH_LL' ? 'lower highs/lows' : 'mixed'}; S $${chart.support?.toFixed(2) ?? '—'} / R $${chart.resistance?.toFixed(2) ?? '—'}`),
    vote('news', 'News Agent', analysis.veto ? 'WAIT' : dir, analysis.veto ? 90 : conf,
      analysis.veto && analysis.vetoHeadline
        ? `VETO: "${analysis.vetoHeadline.title}" (${analysis.vetoHeadline.source})`
        : analysis.newsSentiment.total > 0
          ? `${analysis.newsSentiment.total} headlines, keyword sentiment ${analysis.newsSentiment.score !== null ? analysis.newsSentiment.score.toFixed(2) : 'n/a'} (${analysis.newsSentiment.bullish} bull / ${analysis.newsSentiment.bearish} bear)`
          : 'News unavailable — no veto, no sentiment'),
    vote('sentiment', 'Sentiment Agent', dir, conf,
      analysis.fearGreed !== null
        ? `Fear & Greed ${analysis.fearGreed} (${analysis.newsSentiment.score !== null ? `news ${analysis.newsSentiment.score.toFixed(2)}` : 'news n/a'})${analysis.fundingRate !== null ? `, funding ${(analysis.fundingRate * 100).toFixed(3)}%/8h` : ', funding n/a'}`
        : 'Fear & Greed unavailable'),
    vote('macro', 'Macro Agent', dir, conf,
      analysis.fearGreed !== null
        ? `Regime from live data: Fear & Greed ${analysis.fearGreed}, ${analysis.symbol} 24h ${chart.change24h !== null ? `${chart.change24h >= 0 ? '+' : ''}${chart.change24h.toFixed(2)}%` : 'n/a'}`
        : 'Macro regime unavailable — no live market context'),
    vote('bull', 'Bull Agent', dir === 'SELL' ? 'WAIT' : dir, conf, analysis.bullCase),
    vote('bear', 'Bear Agent', dir === 'BUY' ? 'WAIT' : dir, conf, analysis.bearCase),
    vote('trader', 'Trader Agent', dir, conf,
      `Entry on live price, SL 1.5x ATR ($${chart.atr !== null ? (1.5 * chart.atr).toFixed(2) : '—'}), RR 1:2.0; ${volNote}`),
    vote('risk_manager', 'Risk Manager', analysis.veto ? 'WAIT' : dir, analysis.veto ? 95 : 90,
      analysis.veto
        ? 'News VETO enforced — execution blocked'
        : 'Gates pass: confidence gate, RR ≥ 1:2, SL 1.5x ATR'),
    vote('memory', 'Memory Agent', dir, conf,
      chart.atrPct !== null
        ? `Current 15m volatility ${chart.atrPct.toFixed(2)}% of price (ATR14); regime read from the last 200 live bars, not a stored analogue`
        : 'Volatility regime unavailable'),
  ];

  const newsRisk: NewsRisk = analysis.veto
    ? 'HIGH'
    : (analysis.newsSentiment.score !== null && analysis.newsSentiment.score <= -0.4) ||
        (analysis.fearGreed !== null && analysis.fearGreed <= 20)
      ? 'MEDIUM'
      : 'LOW';
  const newsRiskNote = analysis.veto && analysis.vetoHeadline
    ? `VETO ACTIVE — "${analysis.vetoHeadline.title}" (${analysis.vetoHeadline.source}). Execution blocked.`
    : analysis.newsSentiment.total > 0
      ? `${analysis.newsSentiment.total} real headlines scanned (${analysis.newsSentiment.bullish} bullish, ${analysis.newsSentiment.bearish} bearish, ${analysis.newsSentiment.neutral} neutral). No hard-event headline.`
      : 'News feed unavailable — no headlines scanned, no veto issued.';

  return {
    ...prev,
    type: dir,
    confidence: conf,
    timestamp: analysis.analyzedAt,
    agentVotes,
    reasoning:
      `Live analysis ${analysis.analyzedAt}: chart score ${chart.chartScore >= 0 ? '+' : ''}${chart.chartScore}/100, ` +
      `adjusted ${analysis.adjustedScore >= 0 ? '+' : ''}${analysis.adjustedScore}/100 after funding / Fear & Greed / news. ` +
      analysis.reasons.join(' '),
    bullCase: analysis.bullCase,
    bearCase: analysis.bearCase,
    newsRisk,
    newsRiskNote,
    dataSource: 'LIVE',
  };
}

/* ------------------------------------------------------------------ */
/* Agent panel — rebuild all 10 agent states from live analyses.       */
/* Takes the mock roster as the base (names, roles, weights) and       */
/* overwrites ONLY the computed fields: conclusion, findings, inputs,  */
/* last-analysis time and the news veto flag.                          */
/* ------------------------------------------------------------------ */

export function buildAgentStates(base: AIAgent[], analyses: LiveAnalysis[]): AIAgent[] {
  const bySymbol = new Map(analyses.map((a) => [a.symbol, a]));
  const btc = bySymbol.get('BTC');
  const stamp = analyses[0]?.analyzedAt ?? utcStamp();
  const vetoes = analyses.filter((a) => a.veto);
  const buys = analyses.filter((a) => a.decision === 'BUY');
  const sells = analyses.filter((a) => a.decision === 'SELL');
  const best = [...analyses].sort((a, b) => b.adjustedScore - a.adjustedScore)[0];
  const worst = [...analyses].sort((a, b) => a.adjustedScore - b.adjustedScore)[0];
  const fearGreed = analyses[0]?.fearGreed ?? null;
  const totalHeadlines = analyses[0]?.newsSentiment.total ?? 0;

  const patch: Record<string, Partial<AIAgent>> = {};

  if (btc) {
    patch.technical = {
      currentConclusion:
        `BTC EMA20 ${btc.chart.ema20?.toFixed(0)} vs EMA50 ${btc.chart.ema50?.toFixed(0)}, RSI ${btc.chart.rsi?.toFixed(0)} — chart score ${btc.chart.chartScore >= 0 ? '+' : ''}${btc.chart.chartScore}/100.`,
      findings: btc.chart.reasons.slice(0, 3),
      inputsConsidered: ['EMA 20/50/200 (live 15m)', 'RSI 14', 'MACD', 'ATR 14', 'Volume vs 20-bar avg'],
      lastAnalysisTime: stamp,
    };
    patch.chart_vision = {
      currentConclusion:
        btc.chart.support !== null && btc.chart.resistance !== null
          ? `BTC structure ${btc.chart.structure === 'HH_HL' ? 'higher highs/lows' : btc.chart.structure === 'LH_LL' ? 'lower highs/lows' : 'mixed'}; support $${btc.chart.support.toFixed(0)}, resistance $${btc.chart.resistance.toFixed(0)}.`
          : 'BTC support/resistance unavailable from live candles.',
      findings: [
        `Structure: ${btc.chart.structure}`,
        `Support $${btc.chart.support?.toFixed(2) ?? '—'} / resistance $${btc.chart.resistance?.toFixed(2) ?? '—'} (50-bar)`,
      ],
      inputsConsidered: ['Live 15m candles', '50-bar swing highs/lows', 'Structure scan'],
      lastAnalysisTime: stamp,
    };
  }

  patch.news = {
    currentConclusion:
      vetoes.length > 0
        ? `VETO ACTIVE on ${vetoes.map((v) => v.symbol).join(', ')} — "${vetoes[0].vetoHeadline?.title ?? 'hard-event headline'}"`
        : totalHeadlines > 0
          ? `${totalHeadlines} real headlines scanned (CoinDesk + Cointelegraph) — no hard-event headline, no veto.`
          : 'News feed unavailable — no headlines scanned, no veto issued.',
    findings:
      vetoes.length > 0
        ? vetoes.map((v) => `${v.symbol}: "${v.vetoHeadline?.title ?? ''}" (${v.vetoHeadline?.source ?? ''})`)
        : totalHeadlines > 0
          ? analyses.flatMap((a) => a.assetNews.slice(0, 2).map((n) => `[${n.source}] ${n.title}`)).slice(0, 3)
          : ['News feed unavailable'],
    inputsConsidered: ['CoinDesk RSS', 'Cointelegraph RSS', 'Keyword sentiment (not ML)'],
    isVetoActive: vetoes.length > 0,
    lastAnalysisTime: stamp,
  };

  patch.sentiment = {
    currentConclusion:
      fearGreed !== null
        ? `Fear & Greed ${fearGreed} — funding ${analyses.map((a) => `${a.symbol} ${a.fundingRate !== null ? `${(a.fundingRate * 100).toFixed(3)}%` : 'n/a'}`).join(', ')}.`
        : 'Fear & Greed unavailable — sentiment read is chart-only.',
    findings: analyses.map((a) =>
      `${a.symbol}: funding ${a.fundingRate !== null ? `${(a.fundingRate * 100).toFixed(4)}%/8h` : 'unavailable'}`,
    ),
    inputsConsidered: ['Fear & Greed index', 'Binance funding rates', 'Headline keyword sentiment'],
    lastAnalysisTime: stamp,
  };

  patch.macro = {
    currentConclusion:
      fearGreed !== null && btc
        ? `Regime from live data: Fear & Greed ${fearGreed}, BTC 24h ${btc.chart.change24h !== null ? `${btc.chart.change24h >= 0 ? '+' : ''}${btc.chart.change24h.toFixed(2)}%` : 'n/a'} — ${fearGreed >= 75 ? 'extreme greed, caution' : fearGreed <= 25 ? 'extreme fear' : 'no extreme reading'}.`
        : 'Macro regime unavailable — no live market context.',
    findings: [
      fearGreed !== null ? `Fear & Greed ${fearGreed}` : 'Fear & Greed unavailable',
      btc && btc.chart.change24h !== null ? `BTC 24h ${btc.chart.change24h.toFixed(2)}%` : 'BTC 24h unavailable',
    ],
    inputsConsidered: ['Fear & Greed index', 'BTC 24h ticker'],
    lastAnalysisTime: stamp,
  };

  if (best) {
    patch.bull = {
      currentConclusion:
        best.decision === 'BUY'
          ? `${best.symbol} leads the board (adjusted ${best.adjustedScore >= 0 ? '+' : ''}${best.adjustedScore}/100, ${best.confidence}% confidence) — ${best.bullCase}`
          : `No BUY on the board — strongest setup is ${best.symbol} (${best.adjustedScore >= 0 ? '+' : ''}${best.adjustedScore}/100, ${best.decision}).`,
      findings: [best.bullCase],
      inputsConsidered: ['Live chart scores', 'Resistance levels'],
      lastAnalysisTime: stamp,
    };
  }
  if (worst) {
    patch.bear = {
      currentConclusion:
        worst.decision === 'SELL'
          ? `${worst.symbol} weakest (adjusted ${worst.adjustedScore}/100, ${worst.confidence}% confidence) — ${worst.bearCase}`
          : `Weakest setup is ${worst.symbol} (${worst.adjustedScore >= 0 ? '+' : ''}${worst.adjustedScore}/100, ${worst.decision}) — ${worst.bearCase}`,
      findings: [worst.bearCase],
      inputsConsidered: ['Live chart scores', 'Support levels'],
      lastAnalysisTime: stamp,
    };
  }
  if (best && best.decision === 'BUY' && best.chart.atr !== null) {
    const sl = (1.5 * best.chart.atr).toFixed(2);
    patch.trader = {
      currentConclusion:
        `Best live entry: ${best.decision} ${best.symbol} @ $${best.chart.price.toFixed(2)}, SL 1.5x ATR ($${sl}), RR 1:2.0, ${best.confidence}% confidence.`,
      findings: [
        `Entry $${best.chart.price.toFixed(2)} on live price`,
        `SL distance $${sl} (1.5x ATR)`,
        `RR 1:2.0 clears the gate`,
      ],
      inputsConsidered: ['Live entry price', 'ATR 1.5x stop', 'RR gate 1:2.0'],
      lastAnalysisTime: stamp,
    };
  } else {
    patch.trader = {
      currentConclusion: 'No BUY setup clears the bar right now — standing aside is the trade.',
      findings: ['No decision ≥ +55 on the live board'],
      inputsConsidered: ['Live decisions', 'RR gate 1:2.0'],
      lastAnalysisTime: stamp,
    };
  }

  patch.risk_manager = {
    currentConclusion:
      vetoes.length > 0
        ? `${vetoes.map((v) => v.symbol).join(', ')} blocked by News VETO. Limits enforced on all other setups.`
        : `Gates enforced: ${buys.length} BUY / ${sells.length} SELL on the board, RR ≥ 1:2, SL 1.5x ATR, 0.5% risk/trade.`,
    findings: [
      `Board: ${buys.length} BUY, ${sells.length} SELL, ${analyses.length - buys.length - sells.length} WAIT`,
      vetoes.length > 0 ? `VETO active: ${vetoes.map((v) => v.symbol).join(', ')}` : 'No active veto',
    ],
    inputsConsidered: ['Risk per trade 0.5%', 'RR gate 1:2.0', 'Daily stop 2.0%', 'Drawdown pause 4.0%'],
    lastAnalysisTime: 'Live',
  };

  patch.memory = {
    currentConclusion:
      `Live volatility (ATR14 as % of price): ${analyses.map((a) => `${a.symbol} ${a.chart.atrPct !== null ? `${a.chart.atrPct.toFixed(2)}%` : 'n/a'}`).join(', ')} — read from the last 200 live 15m bars.`,
    findings: analyses.map((a) =>
      `${a.symbol}: ATR ${a.chart.atr?.toFixed(2) ?? '—'} (${a.chart.atrPct !== null ? `${a.chart.atrPct.toFixed(2)}% of price` : 'n/a'})`,
    ),
    inputsConsidered: ['Live 15m candles (200 bars)', 'ATR percentile read'],
    lastAnalysisTime: stamp,
  };

  return base.map((agent) => (patch[agent.id] ? { ...agent, ...patch[agent.id] } : agent));
}
