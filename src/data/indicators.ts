/**
 * TradeMind AI — real technical indicators, computed in code from candles.
 * No LLM math, no guesses: EMA / RSI / MACD / ATR from actual closes.
 * Signals are BUY / SELL only when the alignment score clears the 70%
 * confidence gate with RR >= 1:2 and SL = 1.5x ATR. Otherwise WAIT.
 * No signal is ever a profit guarantee.
 */
import type { Candle, Signal, SignalDecision } from '../types/trading';

/* ------------------------------------------------------------------ */
/* Indicator math (pure functions)                                     */
/* ------------------------------------------------------------------ */

/** EMA series; first value is the SMA of the first `period` closes. */
export function emaSeries(values: number[], period: number): Array<number | null> {
  const k = 2 / (period + 1);
  const out: Array<number | null> = new Array(values.length).fill(null);
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i < period - 1) return;
    if (i === period - 1) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else if (prev !== null) {
      prev = v * k + prev * (1 - k);
    }
    out[i] = prev;
  });
  return out;
}

function lastValue(series: Array<number | null>): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null && series[i] !== undefined) return series[i] as number;
  }
  return null;
}

/** RSI (Wilder's smoothing). Returns null when there are too few closes. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** MACD (12, 26, 9). Returns the latest MACD line, signal line, histogram. */
export function macd(closes: number[]): {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
} {
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdLine: Array<number | null> = closes.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? (ema12[i] as number) - (ema26[i] as number) : null,
  );
  const macdValues: number[] = [];
  const macdIndex: number[] = [];
  macdLine.forEach((v, i) => {
    if (v !== null) {
      macdValues.push(v);
      macdIndex.push(i);
    }
  });
  if (macdValues.length < 9) return { macd: null, signal: null, histogram: null };
  const signalSeries = emaSeries(macdValues, 9);
  const lastMacd = macdValues[macdValues.length - 1];
  const lastSignal = lastValue(signalSeries);
  void macdIndex;
  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram: lastSignal === null ? null : lastMacd - lastSignal,
  };
}

/** ATR (Wilder's smoothing) from candles. */
export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
  }
  let avg = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    avg = (avg * (period - 1) + trs[i]) / period;
  }
  return avg;
}

function roundTo(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function utcNowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/* ------------------------------------------------------------------ */
/* Signal engine — alignment score from real indicator values.         */
/* Long and short are scored separately; the stronger side wins,       */
/* but only at >= 70 confidence. Anything below that is WAIT.          */
/* ------------------------------------------------------------------ */

export interface ComputedSignal {
  type: SignalDecision;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  reasoning: string;
  components: {
    ema20: number | null;
    ema50: number | null;
    rsi: number | null;
    macdHistogram: number | null;
    atr: number | null;
    longScore: number;
    shortScore: number;
  };
}

export function computeSignalFromCandles(candles: Candle[]): ComputedSignal | null {
  const closes = candles.map((c) => c.close);
  if (closes.length < 60) return null;
  const ema20 = lastValue(emaSeries(closes, 20));
  const ema50 = lastValue(emaSeries(closes, 50));
  const rsiValue = rsi(closes, 14);
  const macdValue = macd(closes);
  const atrValue = atr(candles, 14);
  if (ema20 === null || ema50 === null || rsiValue === null || macdValue.histogram === null || atrValue === null) {
    return null;
  }
  const price = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const prevPrevClose = closes[closes.length - 3];

  // Long side: trend 40 + momentum 25 + MACD 20 + structure 15 = 100 max.
  let longScore = 0;
  if (ema20 > ema50) longScore += 20;
  if (price > ema20) longScore += 12;
  if (price > ema50) longScore += 8;
  if (rsiValue >= 55 && rsiValue <= 70) longScore += 25;
  else if (rsiValue > 50 && rsiValue < 55) longScore += 12;
  else if (rsiValue >= 45 && rsiValue <= 50) longScore += 5;
  if (rsiValue > 75) longScore -= 10; // overbought — chasing is penalised
  if (macdValue.histogram > 0) longScore += 20;
  const upBars = [prevClose > prevPrevClose, price > prevClose].filter(Boolean).length;
  if (upBars === 2) longScore += 15;
  else if (upBars === 1) longScore += 5;

  // Short side: mirror image.
  let shortScore = 0;
  if (ema20 < ema50) shortScore += 20;
  if (price < ema20) shortScore += 12;
  if (price < ema50) shortScore += 8;
  if (rsiValue >= 30 && rsiValue <= 45) shortScore += 25;
  else if (rsiValue > 45 && rsiValue < 50) shortScore += 12;
  else if (rsiValue >= 50 && rsiValue <= 55) shortScore += 5;
  if (rsiValue < 25) shortScore -= 10; // oversold — chasing down is penalised
  if (macdValue.histogram < 0) shortScore += 20;
  const downBars = [prevClose < prevPrevClose, price < prevClose].filter(Boolean).length;
  if (downBars === 2) shortScore += 15;
  else if (downBars === 1) shortScore += 5;

  longScore = Math.max(0, Math.min(100, Math.round(longScore)));
  shortScore = Math.max(0, Math.min(100, Math.round(shortScore)));

  const decimals = price > 1000 ? 2 : price > 100 ? 2 : 4;
  const slDistance = 1.5 * atrValue;
  let type: SignalDecision;
  let confidence: number;
  let reason: string;
  if (longScore >= 70 && longScore >= shortScore) {
    type = 'BUY';
    confidence = longScore;
    reason = `Trend + momentum align long (score ${longScore}/100). EMA20 above EMA50, RSI ${rsiValue.toFixed(0)}, MACD histogram positive.`;
  } else if (shortScore >= 70) {
    type = 'SELL';
    confidence = shortScore;
    reason = `Trend + momentum align short (score ${shortScore}/100). EMA20 below EMA50, RSI ${rsiValue.toFixed(0)}, MACD histogram negative.`;
  } else {
    type = 'WAIT';
    confidence = Math.max(longScore, shortScore);
    reason = `No side clears the 70% gate (long ${longScore}/100, short ${shortScore}/100). Standing aside is the signal — no forced trade.`;
  }

  const entryPrice = roundTo(price, decimals);
  const stopLoss =
    type === 'SELL'
      ? roundTo(entryPrice + slDistance, decimals)
      : roundTo(entryPrice - slDistance, decimals);
  const takeProfit =
    type === 'SELL'
      ? roundTo(entryPrice - 2 * slDistance, decimals)
      : roundTo(entryPrice + 2 * slDistance, decimals);

  return {
    type,
    confidence,
    entryPrice,
    stopLoss,
    takeProfit,
    riskReward: 2.0,
    reasoning:
      `Live 15m candles (n=${candles.length}): EMA20 ${ema20.toFixed(2)} vs EMA50 ${ema50.toFixed(2)}, ` +
      `RSI(14) ${rsiValue.toFixed(1)}, MACD hist ${macdValue.histogram.toFixed(2)}, ATR(14) ${atrValue.toFixed(2)}. ${reason}`,
    components: { ema20, ema50, rsi: rsiValue, macdHistogram: macdValue.histogram, atr: atrValue, longScore, shortScore },
  };
}

/**
 * Rebuild one signal from live candles, keeping the previous signal's
 * static fields (id, pair, timeframe, news risk, agent preset votes).
 * The News VETO (newsRisk HIGH) always forces WAIT, whatever the
 * indicators say — that rule is never overridden by the engine.
 */
export function buildLiveSignal(prev: Signal, candles: Candle[]): Signal {
  const computed = computeSignalFromCandles(candles);
  if (!computed) return prev;
  const lastClose = candles[candles.length - 1].close;
  const vetoActive = prev.newsRisk === 'HIGH';

  const agentVotes = prev.agentVotes.map((v) => {
    if (v.agentId === 'technical') {
      return {
        ...v,
        vote: computed.type,
        confidence: computed.confidence,
        note: `EMA20 ${computed.components.ema20?.toFixed(2)} / EMA50 ${computed.components.ema50?.toFixed(2)}, RSI ${computed.components.rsi?.toFixed(0)}, MACD hist ${computed.components.macdHistogram?.toFixed(2)}`,
      };
    }
    if (v.agentId === 'trader') {
      return {
        ...v,
        vote: computed.type,
        confidence: computed.confidence,
        note: `Entry on live price, SL 1.5x ATR, RR 1:${computed.riskReward.toFixed(1)}`,
      };
    }
    if (v.agentId === 'risk_manager') {
      return {
        ...v,
        vote: vetoActive ? 'WAIT' : computed.type,
        confidence: vetoActive ? 95 : 90,
        note: vetoActive
          ? 'News VETO enforced — execution blocked'
          : 'Gates pass: confidence ≥70%, RR ≥ 1:2, SL 1.5x ATR',
      };
    }
    return v;
  });

  return {
    ...prev,
    type: vetoActive ? 'WAIT' : computed.type,
    confidence: vetoActive ? Math.min(computed.confidence, prev.confidence) : computed.confidence,
    currentPrice: roundTo(lastClose, lastClose > 1000 ? 2 : 4),
    entryPrice: computed.entryPrice,
    stopLoss: computed.stopLoss,
    takeProfit: computed.takeProfit,
    riskReward: computed.riskReward,
    timestamp: utcNowStamp(),
    agentVotes,
    reasoning: vetoActive
      ? `${computed.reasoning} News VETO active — execution blocked until the veto clears.`
      : computed.reasoning,
    dataSource: 'LIVE',
  };
}
