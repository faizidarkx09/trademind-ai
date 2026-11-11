/**
 * TradeMind AI — shared trading domain types.
 * Paper trading only. No real money, no broker connection.
 * All prices / signals in this app are simulated unless a feed is
 * explicitly labelled "Live".
 */

export type SignalDecision = 'BUY' | 'SELL' | 'WAIT';

export type AssetClass = 'crypto' | 'equity';

export type SignalStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED';

export type NewsRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type AgentStatus = 'ONLINE' | 'LOCKED' | 'OFFLINE';

export type AdminRole = 'Super Admin' | 'Manager' | 'Trader' | 'Viewer';

export type TradeDirection = 'BUY' | 'SELL';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type TabId =
  | 'overview'
  | 'signals'
  | 'live_markets'
  | 'agents'
  | 'strategies'
  | 'backtesting'
  | 'paper_trading'
  | 'my_trades'
  | 'analytics'
  | 'admin'
  | 'settings'
  | 'pricing';

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Price feed source. LIVE = real Binance public feed; SIMULATED = seeded ticks. */
export type DataSource = 'LIVE' | 'SIMULATED';

export interface Asset {
  symbol: string;
  name: string;
  pair: string;
  assetClass: AssetClass;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  candles: Candle[];
  /** Feed source; undefined in old persisted state means SIMULATED. */
  dataSource?: DataSource;
  /** Local time of the last successful price update. */
  lastPriceUpdate?: string;
}

export interface AgentVote {
  agentId: string;
  agentName: string;
  vote: SignalDecision;
  confidence: number;
  note: string;
}

export interface Signal {
  id: string;
  assetSymbol: string;
  assetName: string;
  pair: string;
  assetClass: AssetClass;
  type: SignalDecision;
  status: SignalStatus;
  confidence: number;
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  timeframe: string;
  timestamp: string;
  expiresIn: string;
  agentVotes: AgentVote[];
  reasoning: string;
  bullCase: string;
  bearCase: string;
  newsRisk: NewsRisk;
  newsRiskNote: string;
  /** Feed the signal was computed from; undefined means SIMULATED. */
  dataSource?: DataSource;
  /**
   * AI verdict from POST /api/analyze (OpenRouter model, key server-side).
   * DISPLAY-ONLY: it NEVER overwrites the signal's rule decision
   * (Signal.type) — it is shown as a separate "AI Analysis" section.
   * Undefined until the first verdict fetch for this asset.
   */
  aiVerdict?: AiVerdict;
}

/**
 * AI verdict for one signal. `status` drives the UI:
 *  - 'loading'     — fetch in flight, show a skeleton, keep rule decision.
 *  - 'ready'       — real AI answer (source 'ai'), show decision + reasoning.
 *  - 'unavailable' — any failure (503 not configured / 429 / 502 / network /
 *    invalid response); decision/confidence fall back to the rule engine so
 *    the card still shows the rule-based decision.
 */
export interface AiVerdict {
  decision: SignalDecision;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  riskNote: string;
  model: string;
  source: 'ai' | 'rule';
  status: 'loading' | 'ready' | 'unavailable';
  analyzedAt: string;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  shortDesc: string;
  currentConclusion: string;
  status: AgentStatus;
  isCodeLocked: boolean;
  isVetoActive: boolean;
  lastAnalysisTime: string;
  inputsConsidered: string[];
  findings: string[];
  decisionContribution: string;
}

export interface StrategyParameter {
  name: string;
  value: string;
}

export type StrategyCategory =
  | 'Trend Following'
  | 'Momentum'
  | 'Breakout'
  | 'Mean Reversion'
  | 'Volatility'
  | 'Machine Learning';

export interface Strategy {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  historicalWinRate: number;
  profitFactor: number;
  maxDrawdown: number;
  assetCompatibility: string[];
  isFavorite: boolean;
  parameters: StrategyParameter[];
}

export interface PaperPosition {
  id: string;
  signalId?: string;
  symbol: string;
  assetName?: string;
  direction: TradeDirection;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  positionSizeUSD: number;
  investedAmount: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL: number;
  pnlPercent: number;
  openTime: string;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  assetName: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  investedUSD: number;
  realizedPnL: number;
  pnlPercent: number;
  exitReason: string;
  closeTime: string;
  status: 'PROFIT' | 'LOSS';
}

export interface BacktestTrade {
  id: string;
  date: string;
  symbol: string;
  type: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  duration: string;
  reason: 'TP' | 'SL' | 'MANUAL_CLOSE' | 'TIMEOUT';
}

export interface AdminRiskConfig {
  riskPerTrade: number;
  maxSignalsPerDay: number;
  dailyStopLoss: number;
  globalDrawdownPause: number;
  blockWeekendTrading: boolean;
  globalTradingPaused: boolean;
  aiEnginePaused: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'signal' | 'execution' | 'risk' | 'news';
  timestamp: string;
  read: boolean;
}

export interface ToastMessage {
  type: ToastType;
  text: string;
}

export interface ExecutePaperTradeInput {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  signalId?: string;
}
