/**
 * TradeMind AI — simulated market data.
 * Everything here is SIMULATED (seeded, deterministic) — no live feed,
 * no real money. Labels in the UI say "Simulated" wherever prices move.
 */
import type {
  AIAgent,
  AgentVote,
  Asset,
  Candle,
  ClosedTrade,
  PaperPosition,
  Signal,
  Strategy,
} from '../types/trading';

/* ------------------------------------------------------------------ */
/* Seeded PRNG (mulberry32) — deterministic candles, stable builds.    */
/* ------------------------------------------------------------------ */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(price: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(price * f) / f;
}

/** Generate `count` candles ending near `endPrice`. Deterministic per seed. */
export function generateCandles(
  seed: number,
  endPrice: number,
  count = 120,
  volatility = 0.012,
): Candle[] {
  const rand = mulberry32(seed);
  const decimals = endPrice > 1000 ? 2 : endPrice > 100 ? 2 : 4;
  // Walk backwards from a start price so the last close lands on endPrice.
  let price = endPrice * (1 - (rand() - 0.5) * 0.08);
  const candles: Candle[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const open = price;
    const drift = (rand() - 0.48) * volatility * 2;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * (1 + rand() * volatility * 0.6);
    const low = Math.min(open, close) * (1 - rand() * volatility * 0.6);
    const minsAgo = (count - 1 - i) * 15;
    const t = new Date(now - minsAgo * 60_000);
    candles.push({
      time: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
      open: roundTo(open, decimals),
      high: roundTo(high, decimals),
      low: roundTo(low, decimals),
      close: roundTo(close, decimals),
      volume: Math.round(500 + rand() * 4500),
    });
    price = close;
  }
  // Pin the final close to the quoted current price for consistency.
  const last = candles[candles.length - 1];
  if (last) {
    last.close = roundTo(endPrice, decimals);
    last.high = Math.max(last.high, last.close);
    last.low = Math.min(last.low, last.close);
  }
  return candles;
}

/* ------------------------------------------------------------------ */
/* Assets: BTC, ETH, SOL + NVDA, AAPL, SPY, TSLA, QQQ                 */
/* ------------------------------------------------------------------ */
const ASSET_DEFS: Array<{
  symbol: string;
  name: string;
  pair: string;
  assetClass: 'crypto' | 'equity';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  seed: number;
  vol: number;
}> = [
  { symbol: 'BTC', name: 'Bitcoin', pair: 'BTC/USDT', assetClass: 'crypto', price: 97420.5, change24h: 2.34, high24h: 98910, low24h: 94820, volume24h: '$28.4B', seed: 11, vol: 0.014 },
  { symbol: 'ETH', name: 'Ethereum', pair: 'ETH/USDT', assetClass: 'crypto', price: 3412.75, change24h: 1.82, high24h: 3498, low24h: 3302, volume24h: '$14.1B', seed: 22, vol: 0.016 },
  { symbol: 'SOL', name: 'Solana', pair: 'SOL/USDT', assetClass: 'crypto', price: 214.38, change24h: -3.41, high24h: 228.9, low24h: 208.4, volume24h: '$3.8B', seed: 33, vol: 0.022 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', pair: 'NVDA/USD', assetClass: 'equity', price: 138.42, change24h: 1.24, high24h: 140.1, low24h: 135.9, volume24h: '212M', seed: 44, vol: 0.011 },
  { symbol: 'AAPL', name: 'Apple Inc', pair: 'AAPL/USD', assetClass: 'equity', price: 227.86, change24h: 0.64, high24h: 229.4, low24h: 225.1, volume24h: '58M', seed: 55, vol: 0.007 },
  { symbol: 'SPY', name: 'S&P 500 ETF', pair: 'SPY/USD', assetClass: 'equity', price: 598.12, change24h: 0.38, high24h: 600.5, low24h: 594.8, volume24h: '74M', seed: 66, vol: 0.005 },
  { symbol: 'TSLA', name: 'Tesla Inc', pair: 'TSLA/USD', assetClass: 'equity', price: 342.15, change24h: -1.86, high24h: 352.8, low24h: 338.2, volume24h: '96M', seed: 77, vol: 0.016 },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', pair: 'QQQ/USD', assetClass: 'equity', price: 512.68, change24h: 0.92, high24h: 515.2, low24h: 506.4, volume24h: '41M', seed: 88, vol: 0.008 },
];

export const mockAssets: Asset[] = ASSET_DEFS.map((d) => ({
  symbol: d.symbol,
  name: d.name,
  pair: d.pair,
  assetClass: d.assetClass,
  currentPrice: d.price,
  change24h: d.change24h,
  high24h: d.high24h,
  low24h: d.low24h,
  volume24h: d.volume24h,
  candles: generateCandles(d.seed, d.price, 120, d.vol),
  dataSource: 'SIMULATED',
}));

/* ------------------------------------------------------------------ */
/* 10 AI agents                                                        */
/* ------------------------------------------------------------------ */
export const mockAgents: AIAgent[] = [
  {
    id: 'technical', name: 'Technical Agent', role: 'Indicators & momentum',
    shortDesc: 'Moving-average crossovers, RSI divergences and volume profiles across every timeframe.',
    currentConclusion: 'BTC above EMA-50 with RSI 61 — momentum favours continuation, not chasing.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '2 min ago',
    inputsConsidered: ['EMA 20/50/200', 'RSI 14', 'MACD', 'Volume profile'],
    findings: ['EMA 20 crossed above EMA 50 on the 4H chart', 'RSI 61 — strong but not overbought', 'Volume expanding on up candles'],
    decisionContribution: '18%',
  },
  {
    id: 'chart_vision', name: 'Chart Vision Agent', role: 'Pattern recognition',
    shortDesc: 'Detects ascending triangles, head & shoulders, flags and cup & handle formations.',
    currentConclusion: 'Ascending triangle forming on BTC 4H with resistance at $98,900.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '4 min ago',
    inputsConsidered: ['4H chart image', 'Pattern library v3', 'Support / resistance map'],
    findings: ['Higher lows compressing under flat resistance', 'Measured move target near $104,000 if breakout confirms'],
    decisionContribution: '12%',
  },
  {
    id: 'news', name: 'News Agent', role: 'Headline sentiment + VETO',
    shortDesc: 'Scans financial headlines in real time. Can hard-VETO any trade on high-impact news.',
    currentConclusion: 'VETO ACTIVE on SOL — network upgrade headline raises execution risk.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: true, lastAnalysisTime: '1 min ago',
    inputsConsidered: ['Wire headlines', 'Regulatory feed', 'Exchange notices'],
    findings: ['SOL mainnet maintenance announced', 'Veto blocks all SOL paper execution until cleared'],
    decisionContribution: 'VETO',
  },
  {
    id: 'sentiment', name: 'Sentiment Agent', role: 'Social & funding',
    shortDesc: 'Social volume, funding rates and the Fear & Greed index.',
    currentConclusion: 'Fear & Greed 68 (Greed) — crowded longs, but funding still neutral.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '6 min ago',
    inputsConsidered: ['Fear & Greed 68', 'Funding rates', 'Social mentions'],
    findings: ['Retail sentiment greedy, not euphoric', 'Funding neutral — no squeeze warning yet'],
    decisionContribution: '10%',
  },
  {
    id: 'macro', name: 'Macro Agent', role: 'Yields, CPI, USD',
    shortDesc: 'Treasury yields, CPI prints and dollar strength regime.',
    currentConclusion: 'US 10Y at 4.38%, DXY 104.2 — risk-on regime remains favourable.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '9 min ago',
    inputsConsidered: ['US 10Y 4.38%', 'DXY 104.2', 'CPI trend'],
    findings: ['Yields stable, no hawkish surprise priced in', 'Dollar flat — no headwind for crypto'],
    decisionContribution: '10%',
  },
  {
    id: 'bull', name: 'Bull Agent', role: 'Upside case',
    shortDesc: 'Argues the upside: breakout targets and liquidity accumulation.',
    currentConclusion: 'ETF inflows + triangle breakout could target $104,000 on BTC.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '3 min ago',
    inputsConsidered: ['ETF flows', 'Order-book liquidity', 'Breakout targets'],
    findings: ['Spot ETF inflows positive for 6 straight sessions', 'Liquidity pool above $98,900'],
    decisionContribution: '12%',
  },
  {
    id: 'bear', name: 'Bear Agent', role: 'Downside case',
    shortDesc: 'Argues the downside: overhead resistance and distribution warnings.',
    currentConclusion: 'Rejection wick at $98,900 and greedy sentiment argue for caution.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '3 min ago',
    inputsConsidered: ['Resistance clusters', 'Distribution signals', 'Long liquidations'],
    findings: ['Two rejections at $98,900 in 48h', 'Long leverage elevated vs 30-day average'],
    decisionContribution: '12%',
  },
  {
    id: 'trader', name: 'Trader Agent', role: 'Entry & sizing',
    shortDesc: 'Optimal entry trigger, dynamic position sizing and reward-to-risk scoring.',
    currentConclusion: 'Entry $97,420 with 0.5% risk sizing scores 1:2.4 — passes the risk gate.',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '2 min ago',
    inputsConsidered: ['Entry trigger', 'ATR 1.5x stop', 'Position sizing model'],
    findings: ['Entry sits on EMA-20 support', 'Risk/reward 1:2.4 clears the 1:2.0 minimum'],
    decisionContribution: '14%',
  },
  {
    id: 'risk_manager', name: 'Risk Manager', role: 'Code-locked safety',
    shortDesc: 'Enforces max 0.5% risk per trade, RR ≥ 1:2 and daily loss limits. Cannot be overridden.',
    currentConclusion: 'All gates pass for BTC signal. SOL blocked by News VETO. Limits enforced.',
    status: 'LOCKED', isCodeLocked: true, isVetoActive: false, lastAnalysisTime: 'Live',
    inputsConsidered: ['Risk per trade 0.5%', 'RR gate 1:2.0', 'Daily stop 2.0%', 'Drawdown pause 4.0%'],
    findings: ['No trade exceeds 0.5% capital risk', 'Daily loss within 2.0% stop', 'Circuit breakers armed'],
    decisionContribution: 'GATE',
  },
  {
    id: 'memory', name: 'Memory Agent', role: 'Historical regimes',
    shortDesc: 'Matches the current market to analogous historical regimes.',
    currentConclusion: 'Current regime matches Nov 2024 consolidation-before-breakout (similarity 0.81).',
    status: 'ONLINE', isCodeLocked: false, isVetoActive: false, lastAnalysisTime: '12 min ago',
    inputsConsidered: ['Regime embeddings', '2024 breakout analogues', 'Volatility clusters'],
    findings: ['Closest analogue resolved upward 68% of the time (simulated history)', 'Volatility regime: normal, not stressed'],
    decisionContribution: '12%',
  },
];

/* ------------------------------------------------------------------ */
/* Signals — agent votes built from the agent roster.                  */
/* ------------------------------------------------------------------ */
function votes(
  entries: Array<[string, 'BUY' | 'SELL' | 'WAIT', number, string]>,
): AgentVote[] {
  return entries.map(([agentId, vote, confidence, note]) => {
    const agent = mockAgents.find((a) => a.id === agentId);
    return { agentId, agentName: agent?.name ?? agentId, vote, confidence, note };
  });
}

export const mockSignals: Signal[] = [
  {
    id: 'sig-btc-01', assetSymbol: 'BTC', assetName: 'Bitcoin', pair: 'BTC/USDT',
    assetClass: 'crypto', type: 'BUY', status: 'ACTIVE', confidence: 78,
    currentPrice: 97420.5, entryPrice: 97420.5, stopLoss: 95800, takeProfit: 100900,
    riskReward: 2.4, timeframe: '4H', timestamp: '14:32 UTC', expiresIn: '3h 28m',
    agentVotes: votes([
      ['technical', 'BUY', 82, 'EMA 20 > EMA 50, RSI 61'],
      ['chart_vision', 'BUY', 76, 'Ascending triangle, higher lows'],
      ['news', 'BUY', 70, 'No blocking headlines for BTC'],
      ['sentiment', 'BUY', 68, 'Greed 68, funding neutral'],
      ['macro', 'BUY', 72, 'Yields stable, DXY flat'],
      ['bull', 'BUY', 84, 'ETF inflows + breakout target $104k'],
      ['bear', 'WAIT', 58, 'Resistance at $98,900 rejected twice'],
      ['trader', 'BUY', 80, 'Entry on EMA-20 support, RR 1:2.4'],
      ['risk_manager', 'BUY', 90, 'All gates pass'],
      ['memory', 'BUY', 74, 'Regime analogue resolved up 68% (simulated)'],
    ]),
    reasoning: 'Ten-agent consensus leans long: trend, pattern, macro and flows align above EMA-50 support, with a code-locked risk gate approving the 1:2.4 setup.',
    bullCase: 'Triangle breakout above $98,900 opens a measured move toward $104,000 on steady ETF inflows.',
    bearCase: 'Two rejections at $98,900 plus greedy sentiment could trap longs; invalidation is a 4H close below $95,800.',
    newsRisk: 'LOW', newsRiskNote: 'No high-impact BTC headlines in the last 6 hours.',
  },
  {
    id: 'sig-eth-01', assetSymbol: 'ETH', assetName: 'Ethereum', pair: 'ETH/USDT',
    assetClass: 'crypto', type: 'BUY', status: 'ACTIVE', confidence: 71,
    currentPrice: 3412.75, entryPrice: 3412.75, stopLoss: 3300, takeProfit: 3640,
    riskReward: 2.1, timeframe: '1H', timestamp: '14:18 UTC', expiresIn: '2h 05m',
    agentVotes: votes([
      ['technical', 'BUY', 74, 'RSI bouncing from 52, MACD curling up'],
      ['chart_vision', 'BUY', 69, 'Bull flag on 1H'],
      ['news', 'BUY', 66, 'Neutral headline flow'],
      ['sentiment', 'WAIT', 60, 'Social mentions cooling'],
      ['macro', 'BUY', 70, 'Risk-on macro regime'],
      ['bull', 'BUY', 78, 'Staking inflows rising'],
      ['bear', 'WAIT', 55, 'ETH/BTC ratio still weak'],
      ['trader', 'BUY', 72, 'RR 1:2.1 clears the gate'],
      ['risk_manager', 'BUY', 88, 'All gates pass'],
      ['memory', 'BUY', 68, 'Flag analogue resolved up in simulated history'],
    ]),
    reasoning: 'ETH follows BTC strength with its own bull-flag structure; the setup clears every risk gate but sentiment is only lukewarm, hence 71% confidence.',
    bullCase: 'Flag breakout targets $3,640 with staking demand as a tailwind.',
    bearCase: 'ETH/BTC weakness could cap upside; a break below $3,300 voids the setup.',
    newsRisk: 'LOW', newsRiskNote: 'No high-impact ETH headlines in the last 6 hours.',
  },
  {
    id: 'sig-sol-01', assetSymbol: 'SOL', assetName: 'Solana', pair: 'SOL/USDT',
    assetClass: 'crypto', type: 'WAIT', status: 'ACTIVE', confidence: 64,
    currentPrice: 214.38, entryPrice: 214.38, stopLoss: 206.0, takeProfit: 232.0,
    riskReward: 2.0, timeframe: '4H', timestamp: '13:55 UTC', expiresIn: '1h 40m',
    agentVotes: votes([
      ['technical', 'SELL', 66, 'Below EMA-20, RSI 44 and falling'],
      ['chart_vision', 'WAIT', 58, 'No clean pattern — choppy range'],
      ['news', 'WAIT', 40, 'VETO: mainnet maintenance headline'],
      ['sentiment', 'SELL', 62, 'Social sentiment turning fearful'],
      ['macro', 'WAIT', 60, 'Macro neutral for SOL'],
      ['bull', 'WAIT', 55, 'Upgrade could be bullish after completion'],
      ['bear', 'SELL', 70, 'Distribution under $228 resistance'],
      ['trader', 'WAIT', 50, 'No clean entry — veto blocks execution'],
      ['risk_manager', 'WAIT', 95, 'News VETO enforced — execution blocked'],
      ['memory', 'WAIT', 57, 'Maintenance windows were choppy in past regimes'],
    ]),
    reasoning: 'Technical and sentiment lean down, but the News Agent has an active VETO on SOL (mainnet maintenance). The system issues WAIT and blocks execution until the veto clears.',
    bullCase: 'Post-upgrade, a clean break above $228 could flip the bias quickly.',
    bearCase: 'Continued distribution under $228 with fearful sentiment points lower.',
    newsRisk: 'HIGH', newsRiskNote: 'VETO ACTIVE — mainnet maintenance headline. Execution blocked.',
  },
  {
    id: 'sig-nvda-01', assetSymbol: 'NVDA', assetName: 'NVIDIA Corp', pair: 'NVDA/USD',
    assetClass: 'equity', type: 'BUY', status: 'ACTIVE', confidence: 76,
    currentPrice: 138.42, entryPrice: 138.42, stopLoss: 134.5, takeProfit: 146.2,
    riskReward: 2.2, timeframe: '1D', timestamp: '14:05 UTC', expiresIn: '5h 12m',
    agentVotes: votes([
      ['technical', 'BUY', 80, 'Above all major EMAs, RSI 58'],
      ['chart_vision', 'BUY', 74, 'Cup & handle forming'],
      ['news', 'BUY', 72, 'Positive AI capex headlines'],
      ['sentiment', 'BUY', 70, 'Institutional flow positive'],
      ['macro', 'BUY', 68, 'AI capex cycle supportive'],
      ['bull', 'BUY', 82, 'Data-centre demand accelerating'],
      ['bear', 'WAIT', 60, 'Valuation stretched vs history'],
      ['trader', 'BUY', 78, 'RR 1:2.2, entry near support'],
      ['risk_manager', 'BUY', 89, 'All gates pass'],
      ['memory', 'BUY', 71, 'Similar earnings-run setups resolved up (simulated)'],
    ]),
    reasoning: 'NVDA holds above every major moving average with a cup & handle forming and supportive AI-spend headlines. Valuation is the only dissenting note.',
    bullCase: 'A break above $140 opens $146+ as data-centre orders accelerate.',
    bearCase: 'Stretched valuation — a broad market sell-off would hit high-beta NVDA first.',
    newsRisk: 'LOW', newsRiskNote: 'AI capex headlines positive; no blocking news.',
  },
  {
    id: 'sig-tsla-01', assetSymbol: 'TSLA', assetName: 'Tesla Inc', pair: 'TSLA/USD',
    assetClass: 'equity', type: 'SELL', status: 'ACTIVE', confidence: 69,
    currentPrice: 342.15, entryPrice: 342.15, stopLoss: 352.8, takeProfit: 321.0,
    riskReward: 2.1, timeframe: '4H', timestamp: '13:40 UTC', expiresIn: '2h 50m',
    agentVotes: votes([
      ['technical', 'SELL', 72, 'RSI rolling over from 68, MACD bearish cross'],
      ['chart_vision', 'SELL', 68, 'Double top at $352'],
      ['news', 'WAIT', 62, 'Mixed delivery headlines'],
      ['sentiment', 'SELL', 66, 'Retail longs crowded'],
      ['macro', 'WAIT', 58, 'Rates neutral for growth'],
      ['bull', 'WAIT', 56, 'Robotaxi headlines could spark a squeeze'],
      ['bear', 'SELL', 76, 'Distribution at $352 resistance'],
      ['trader', 'SELL', 70, 'RR 1:2.1, short entry at range top'],
      ['risk_manager', 'BUY', 86, 'Gates pass for the short setup'],
      ['memory', 'SELL', 64, 'Double-top analogues resolved down (simulated)'],
    ]),
    reasoning: 'TSLA printed a double top at $352 with momentum rolling over and crowded retail longs — the short setup clears the risk gate at 1:2.1.',
    bullCase: 'A surprise robotaxi headline could squeeze shorts above $353.',
    bearCase: 'Loss of $338 support opens a fast move toward $321.',
    newsRisk: 'MEDIUM', newsRiskNote: 'Delivery headlines mixed; monitor pre-market wires.',
  },
  {
    id: 'sig-spy-01', assetSymbol: 'SPY', assetName: 'S&P 500 ETF', pair: 'SPY/USD',
    assetClass: 'equity', type: 'WAIT', status: 'ACTIVE', confidence: 58,
    currentPrice: 598.12, entryPrice: 598.12, stopLoss: 592.0, takeProfit: 610.0,
    riskReward: 2.0, timeframe: '1D', timestamp: '13:20 UTC', expiresIn: '4h 05m',
    agentVotes: votes([
      ['technical', 'WAIT', 55, 'Flat momentum, RSI 54, no trigger'],
      ['chart_vision', 'WAIT', 52, 'Range-bound, no pattern'],
      ['news', 'WAIT', 60, 'Awaiting CPI print'],
      ['sentiment', 'WAIT', 57, 'Neutral positioning'],
      ['macro', 'WAIT', 59, 'CPI print pending — stand aside'],
      ['bull', 'BUY', 64, 'Earnings breadth improving'],
      ['bear', 'WAIT', 58, 'Seasonal headwinds into month-end'],
      ['trader', 'WAIT', 50, 'No edge — RR not compelling'],
      ['risk_manager', 'WAIT', 90, 'No trade: no setup clears the bar'],
      ['memory', 'WAIT', 54, 'Pre-CPI regimes were range-bound'],
    ]),
    reasoning: 'SPY is range-bound with a CPI print ahead. No agent sees a clean edge, so the system issues WAIT rather than forcing a trade.',
    bullCase: 'A soft CPI print could break the range toward $610.',
    bearCase: 'A hot CPI print risks a fast drop toward $592 support.',
    newsRisk: 'MEDIUM', newsRiskNote: 'CPI print pending — high-impact event, stand aside.',
  },
];

/* Seed signals are SIMULATED until the live engine rebuilds them. */
mockSignals.forEach((s) => {
  s.dataSource = 'SIMULATED';
});

/* ------------------------------------------------------------------ */
/* Strategies — 30 real, named entries across the 6 categories.       */
/* The view's "252" label is its own hard-coded copy; the library     */
/* ships the 30 curated strategies below (see report).                 */
/* ------------------------------------------------------------------ */
const STRATEGY_DEFS: Array<{
  name: string;
  category: Strategy['category'];
  description: string;
  winRate: number;
  pf: number;
  dd: number;
  assets: string[];
  params: Array<[string, string]>;
}> = [
  // Trend Following (5)
  { name: 'EMA 20/50 Crossover', category: 'Trend Following', description: 'Classic trend-following entry when the fast EMA crosses above the slow EMA, filtered by ADX trend strength.', winRate: 58, pf: 1.9, dd: 8.4, assets: ['BTC', 'ETH', 'NVDA'], params: [['Fast EMA', '20'], ['Slow EMA', '50'], ['ADX filter', '> 25']] },
  { name: 'ADX Trend Rider', category: 'Trend Following', description: 'Rides established trends only when ADX confirms strength, exiting when trend momentum fades.', winRate: 61, pf: 2.1, dd: 7.2, assets: ['BTC', 'SPY', 'QQQ'], params: [['ADX period', '14'], ['ADX threshold', '25'], ['Exit ADX', '< 20']] },
  { name: 'Supertrend Trail', category: 'Trend Following', description: 'Supertrend indicator flips drive entries, with the trailing line acting as a dynamic stop.', winRate: 55, pf: 1.8, dd: 9.1, assets: ['ETH', 'SOL', 'TSLA'], params: [['ATR period', '10'], ['Multiplier', '3.0'], ['Timeframe', '4H']] },
  { name: 'Donchian Breakout Rider', category: 'Trend Following', description: 'Enters on 20-period Donchian channel breakouts and rides the move with a trailing stop.', winRate: 52, pf: 2.2, dd: 10.6, assets: ['BTC', 'NVDA', 'AAPL'], params: [['Channel', '20 periods'], ['Trail', '10-period low'], ['Timeframe', '1D']] },
  { name: 'MACD Histogram Trend', category: 'Trend Following', description: 'MACD histogram expansion confirms trend direction; entries only with histogram momentum.', winRate: 57, pf: 1.7, dd: 8.8, assets: ['BTC', 'ETH', 'QQQ'], params: [['MACD', '12 / 26 / 9'], ['Histogram', '> 0'], ['Timeframe', '1H']] },
  // Momentum (5)
  { name: 'RSI Momentum Surge', category: 'Momentum', description: 'Buys RSI strength breaking above 60 after basing, targeting continuation momentum.', winRate: 56, pf: 1.8, dd: 9.4, assets: ['SOL', 'NVDA', 'TSLA'], params: [['RSI period', '14'], ['Trigger', 'RSI > 60'], ['Stop', '1.5x ATR']] },
  { name: 'Relative Strength Leaders', category: 'Momentum', description: 'Rotates into the strongest tickers by 3-month relative strength versus the index.', winRate: 62, pf: 2.0, dd: 7.8, assets: ['NVDA', 'AAPL', 'QQQ'], params: [['Lookback', '63 days'], ['Rebalance', 'Weekly'], ['Top N', '3']] },
  { name: 'Volume Spike Breakout', category: 'Momentum', description: 'Entries on price breakouts confirmed by volume at least 2x the 20-day average.', winRate: 54, pf: 1.9, dd: 10.2, assets: ['BTC', 'ETH', 'TSLA'], params: [['Volume multiple', '2.0x'], ['MA volume', '20 days'], ['Timeframe', '1H']] },
  { name: 'MACD + RSI Confluence', category: 'Momentum', description: 'Requires MACD cross and RSI momentum to agree before entry — fewer, higher-quality signals.', winRate: 63, pf: 2.3, dd: 6.9, assets: ['BTC', 'SPY', 'NVDA'], params: [['MACD', '12 / 26 / 9'], ['RSI band', '55–70'], ['Timeframe', '4H']] },
  { name: 'Opening Range Momentum', category: 'Momentum', description: 'Trades the first-hour range breakout in the direction of the opening momentum.', winRate: 53, pf: 1.7, dd: 9.8, assets: ['SPY', 'QQQ', 'AAPL'], params: [['Range window', 'First 60 min'], ['Entry', 'Range break'], ['Time stop', 'Close']] },
  // Breakout (5)
  { name: 'London Open Breakout', category: 'Breakout', description: 'Trades the break of the Asia session range at the London open with a fixed risk stop.', winRate: 51, pf: 1.9, dd: 11.4, assets: ['BTC', 'ETH'], params: [['Session range', 'Asia 00:00–08:00 UTC'], ['Stop', 'Range width'], ['Target', '2R']] },
  { name: 'Ascending Triangle Breakout', category: 'Breakout', description: 'Buys the breakout of an ascending triangle with rising volume confirmation.', winRate: 59, pf: 2.1, dd: 8.1, assets: ['BTC', 'NVDA', 'SOL'], params: [['Pattern', 'Ascending triangle'], ['Volume confirm', 'Yes'], ['Target', 'Measured move']] },
  { name: '52-Week High Breakout', category: 'Breakout', description: 'Long entries when price closes above its 52-week high on expanding volume.', winRate: 60, pf: 2.0, dd: 8.6, assets: ['NVDA', 'AAPL', 'QQQ'], params: [['Lookback', '252 days'], ['Volume confirm', 'Yes'], ['Timeframe', '1D']] },
  { name: 'Volatility Squeeze Breakout', category: 'Breakout', description: 'Waits for Bollinger Band squeeze, then trades the explosive expansion move.', winRate: 57, pf: 2.2, dd: 9.0, assets: ['BTC', 'ETH', 'SOL'], params: [['BB width', '6-month low'], ['Entry', 'Band break'], ['Stop', '1.5x ATR']] },
  { name: 'Opening Range Breakout (Equities)', category: 'Breakout', description: 'Equity variant: trades the 30-minute opening range break with VWAP confirmation.', winRate: 55, pf: 1.8, dd: 9.2, assets: ['SPY', 'QQQ', 'TSLA'], params: [['Range', 'First 30 min'], ['VWAP filter', 'Above for longs'], ['Time stop', '15:30']] },
  // Mean Reversion (5)
  { name: 'Bollinger Band Bounce', category: 'Mean Reversion', description: 'Buys touches of the lower Bollinger Band when RSI confirms oversold, targeting the middle band.', winRate: 64, pf: 1.9, dd: 7.4, assets: ['ETH', 'AAPL', 'SPY'], params: [['BB', '20 / 2.0'], ['RSI filter', '< 35'], ['Target', 'Middle band']] },
  { name: 'RSI Oversold Reversal', category: 'Mean Reversion', description: 'Counter-trend entries when RSI(14) dips below 30 and starts curling back up.', winRate: 61, pf: 1.8, dd: 8.2, assets: ['BTC', 'SOL', 'TSLA'], params: [['RSI period', '14'], ['Trigger', 'RSI < 30'], ['Confirm', 'RSI curl up']] },
  { name: 'VWAP Mean Reversion', category: 'Mean Reversion', description: 'Fades intraday extensions 2+ standard deviations from VWAP, targeting a return to the mean.', winRate: 58, pf: 1.7, dd: 9.6, assets: ['SPY', 'QQQ', 'NVDA'], params: [['Deviation', '2.0 SD'], ['Session', 'Intraday'], ['Target', 'VWAP']] },
  { name: 'Support Bounce Scalper', category: 'Mean Reversion', description: 'Buys tested support levels with tight stops, taking quick mean-reversion profits.', winRate: 66, pf: 1.6, dd: 6.8, assets: ['BTC', 'ETH', 'AAPL'], params: [['Support touches', '≥ 2'], ['Stop', '0.8x ATR'], ['Target', '1.5R']] },
  { name: 'Z-Score Reversion', category: 'Mean Reversion', description: 'Statistical reversion: enters when the 20-period z-score exceeds ±2 and exits at zero.', winRate: 59, pf: 1.8, dd: 8.9, assets: ['BTC', 'SPY', 'QQQ'], params: [['Lookback', '20 periods'], ['Entry z', '±2.0'], ['Exit z', '0']] },
  // Volatility (5)
  { name: 'ATR Expansion Rider', category: 'Volatility', description: 'Trades in the direction of ATR expansion breakouts, sizing down as volatility rises.', winRate: 54, pf: 1.9, dd: 10.8, assets: ['BTC', 'SOL', 'TSLA'], params: [['ATR period', '14'], ['Expansion', '> 1.5x avg'], ['Size', 'Vol-adjusted']] },
  { name: 'Straddle Breakout (Vol)', category: 'Volatility', description: 'Positions before scheduled events and trades the post-event volatility expansion.', winRate: 50, pf: 2.0, dd: 12.1, assets: ['NVDA', 'TSLA', 'AAPL'], params: [['Event', 'Earnings / CPI'], ['Entry', 'Pre-event'], ['Exit', 'Vol crush']] },
  { name: 'Keltner Channel Breakout', category: 'Volatility', description: 'Keltner channel breakouts with ATR-based stops, designed for trending volatility regimes.', winRate: 56, pf: 2.0, dd: 9.3, assets: ['ETH', 'BTC', 'QQQ'], params: [['EMA', '20'], ['ATR mult', '2.0'], ['Timeframe', '4H']] },
  { name: 'Low-Volatility Accumulator', category: 'Volatility', description: 'Accumulates positions during low-volatility compressions ahead of expansion moves.', winRate: 57, pf: 1.8, dd: 8.5, assets: ['SPY', 'AAPL', 'BTC'], params: [['Vol percentile', '< 20th'], ['Hold', 'Until expansion'], ['Stop', '1.5x ATR']] },
  { name: 'VIX Regime Filter', category: 'Volatility', description: 'A regime filter, not a standalone entry: only allows longs when VIX is falling and below 20.', winRate: 60, pf: 1.9, dd: 7.9, assets: ['SPY', 'QQQ', 'NVDA'], params: [['VIX threshold', '< 20'], ['VIX trend', 'Falling'], ['Role', 'Filter only']] },
  // Machine Learning (5)
  { name: 'Regime Classifier (ML)', category: 'Machine Learning', description: 'Random-forest regime classifier (trending / ranging / volatile) routes trades to the matching strategy family.', winRate: 59, pf: 2.0, dd: 8.7, assets: ['BTC', 'ETH', 'SPY'], params: [['Model', 'Random Forest'], ['Features', 'ADX / ATR / BB width'], ['Retrain', 'Weekly']] },
  { name: 'LSTM Trend Forecaster', category: 'Machine Learning', description: 'Sequence model forecasting next-period direction from price and volume windows.', winRate: 55, pf: 1.8, dd: 10.4, assets: ['BTC', 'ETH', 'SOL'], params: [['Window', '60 candles'], ['Horizon', '1 step'], ['Threshold', '0.6 prob']] },
  { name: 'Sentiment-Weighted ML', category: 'Machine Learning', description: 'Combines news/sentiment embeddings with technical features in a gradient-boosted model.', winRate: 58, pf: 1.9, dd: 9.1, assets: ['BTC', 'NVDA', 'TSLA'], params: [['Model', 'XGBoost'], ['Features', 'Sentiment + RSI'], ['Retrain', 'Daily']] },
  { name: 'Anomaly Guard (ML)', category: 'Machine Learning', description: 'Anomaly detector that blocks entries during abnormal regimes — a safety overlay, not an entry model.', winRate: 62, pf: 1.7, dd: 6.5, assets: ['BTC', 'SPY', 'QQQ'], params: [['Model', 'Isolation Forest'], ['Role', 'Veto overlay'], ['Sensitivity', '0.05']] },
  { name: 'Reinforcement Sizing (ML)', category: 'Machine Learning', description: 'Learns position sizing from simulated history, scaling size up only inside favourable regimes.', winRate: 57, pf: 2.1, dd: 9.7, assets: ['BTC', 'ETH', 'NVDA'], params: [['Model', 'PPO agent'], ['Reward', 'Sharpe-based'], ['Max size', '0.5% risk']] },
];

export const mockStrategies: Strategy[] = STRATEGY_DEFS.map((s, i) => ({
  id: `strat-${String(i + 1).padStart(2, '0')}`,
  name: s.name,
  category: s.category,
  description: s.description,
  historicalWinRate: s.winRate,
  profitFactor: s.pf,
  maxDrawdown: s.dd,
  assetCompatibility: s.assets,
  isFavorite: i === 0 || i === 5 || i === 13,
  parameters: s.params.map(([name, value]) => ({ name, value })),
}));

/* ------------------------------------------------------------------ */
/* Seed portfolio: 2 open positions + closed-trade history.             */
/* ------------------------------------------------------------------ */
export const mockOpenPositions: PaperPosition[] = [
  {
    id: 'pos-1', signalId: 'sig-btc-01', symbol: 'BTC', assetName: 'Bitcoin',
    direction: 'BUY', entryPrice: 96120, currentPrice: 97420.5, quantity: 0.052,
    positionSizeUSD: 4997.86, investedAmount: 4997.86, stopLoss: 94800, takeProfit: 100900,
    unrealizedPnL: 67.63, pnlPercent: 1.35, openTime: '2026-11-07 18:20',
  },
  {
    id: 'pos-2', signalId: 'sig-nvda-01', symbol: 'NVDA', assetName: 'NVIDIA Corp',
    direction: 'BUY', entryPrice: 135.9, currentPrice: 138.42, quantity: 36,
    positionSizeUSD: 4892.4, investedAmount: 4892.4, stopLoss: 132.4, takeProfit: 144.8,
    unrealizedPnL: 90.72, pnlPercent: 1.85, openTime: '2026-11-07 15:05',
  },
];

export const mockClosedTrades: ClosedTrade[] = [
  { id: 'trd-01', symbol: 'BTC', assetName: 'Bitcoin', direction: 'BUY', entryPrice: 91200, exitPrice: 94850, quantity: 0.055, investedUSD: 5016, realizedPnL: 200.75, pnlPercent: 4.0, exitReason: 'TP', closeTime: '2026-11-06 11:24', status: 'PROFIT' },
  { id: 'trd-02', symbol: 'NVDA', assetName: 'NVIDIA Corp', direction: 'BUY', entryPrice: 131.2, exitPrice: 136.8, quantity: 38, investedUSD: 4985.6, realizedPnL: 212.8, pnlPercent: 4.27, exitReason: 'TP', closeTime: '2026-11-05 16:40', status: 'PROFIT' },
  { id: 'trd-03', symbol: 'SOL', assetName: 'Solana', direction: 'BUY', entryPrice: 228.4, exitPrice: 221.9, quantity: 22, investedUSD: 5024.8, realizedPnL: -143, pnlPercent: -2.85, exitReason: 'SL', closeTime: '2026-11-05 09:12', status: 'LOSS' },
  { id: 'trd-04', symbol: 'ETH', assetName: 'Ethereum', direction: 'BUY', entryPrice: 3240, exitPrice: 3410, quantity: 1.55, investedUSD: 5022, realizedPnL: 263.5, pnlPercent: 5.25, exitReason: 'TP', closeTime: '2026-11-04 13:58', status: 'PROFIT' },
  { id: 'trd-05', symbol: 'TSLA', assetName: 'Tesla Inc', direction: 'SELL', entryPrice: 348.6, exitPrice: 356.2, quantity: 14, investedUSD: 4880.4, realizedPnL: -106.4, pnlPercent: -2.18, exitReason: 'SL', closeTime: '2026-11-04 10:31', status: 'LOSS' },
  { id: 'trd-06', symbol: 'AAPL', assetName: 'Apple Inc', direction: 'BUY', entryPrice: 221.4, exitPrice: 227.9, quantity: 22, investedUSD: 4870.8, realizedPnL: 143, pnlPercent: 2.94, exitReason: 'TP', closeTime: '2026-11-03 15:47', status: 'PROFIT' },
  { id: 'trd-07', symbol: 'SPY', assetName: 'S&P 500 ETF', direction: 'BUY', entryPrice: 591.2, exitPrice: 598.1, quantity: 8, investedUSD: 4729.6, realizedPnL: 55.2, pnlPercent: 1.17, exitReason: 'MANUAL_CLOSE', closeTime: '2026-11-02 12:05', status: 'PROFIT' },
  { id: 'trd-08', symbol: 'BTC', assetName: 'Bitcoin', direction: 'SELL', entryPrice: 93400, exitPrice: 92150, quantity: 0.054, investedUSD: 5043.6, realizedPnL: 67.5, pnlPercent: 1.34, exitReason: 'TP', closeTime: '2026-11-01 18:33', status: 'PROFIT' },
];
