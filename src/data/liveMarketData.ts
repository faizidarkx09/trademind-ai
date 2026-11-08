/**
 * TradeMind AI — live market data from Binance public REST endpoints.
 * NO API key, NO secrets, NO account: these endpoints are public.
 * Browser fetch to api.binance.com is CORS-enabled.
 *
 * Coverage: BTC, ETH, SOL only (Binance spot). Gold, EUR/USD and US
 * equities have NO free keyless live feed, so they stay SIMULATED and
 * the UI labels them as such. A failed fetch returns null and the app
 * falls back to simulated ticks — it NEVER shows a fake LIVE label.
 */
import type { Candle } from '../types/trading';

/** App symbol -> Binance spot symbol. Only these three are live. */
export const LIVE_CRYPTO_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
};

/**
 * Primary host is data-api.binance.vision (Binance's public market-data
 * host: same payloads, no geo-restriction, CORS-enabled). api.binance.com
 * is the fallback — it geo-blocks some locations (verified: this VM gets
 * "Service unavailable from a restricted location"). Each host is tried
 * in turn; a non-JSON or error payload never counts as success.
 */
const BINANCE_HOSTS = [
  'https://data-api.binance.vision/api/v3',
  'https://api.binance.com/api/v3',
];

async function fetchJsonOnce<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(path: string, timeoutMs = 8000): Promise<T | null> {
  for (const host of BINANCE_HOSTS) {
    const data = await fetchJsonOnce<T>(`${host}${path}`, timeoutMs);
    if (data !== null && data !== undefined) return data;
  }
  return null;
}

function toTimeLabel(openTimeMs: number): string {
  const d = new Date(openTimeMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Real 15m candles from Binance klines.
 * Returns null on any failure (offline, rate-limit, blocked).
 */
export async function fetchKlines(
  binanceSymbol: string,
  interval = '15m',
  limit = 200,
): Promise<Candle[] | null> {
  type Kline = [number, string, string, string, string, string];
  const data = await fetchJson<Kline[]>(
    `/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
  );
  // Shape check: the geo-block error payload is an object, not an array.
  if (!Array.isArray(data) || data.length < 60) return null;
  return data.map((k) => ({
    time: toTimeLabel(k[0]),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: Math.round(parseFloat(k[5])),
  }));
}

/**
 * Live spot prices for BTC/ETH/SOL in one call.
 * Returns a map of Binance symbol -> price, or null on failure.
 */
export async function fetchLivePrices(): Promise<Record<string, number> | null> {
  const symbols = Object.values(LIVE_CRYPTO_SYMBOLS);
  const data = await fetchJson<Array<{ symbol: string; price: string }>>(
    `/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  const out: Record<string, number> = {};
  data.forEach((d) => {
    const p = parseFloat(d.price);
    if (Number.isFinite(p)) out[d.symbol] = p;
  });
  return Object.keys(out).length > 0 ? out : null;
}

/** 24h stats (change %, high, low, quote volume) for one symbol. */
export async function fetch24hStats(binanceSymbol: string): Promise<{
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
} | null> {
  const data = await fetchJson<{
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    quoteVolume: string;
  }>(`/ticker/24hr?symbol=${binanceSymbol}`);
  if (!data || typeof data.priceChangePercent !== 'string') return null;
  const quoteVolume = parseFloat(data.quoteVolume);
  const volume24h =
    quoteVolume >= 1e9
      ? `$${(quoteVolume / 1e9).toFixed(1)}B`
      : `$${(quoteVolume / 1e6).toFixed(0)}M`;
  return {
    change24h: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h,
  };
}
