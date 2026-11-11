/**
 * TradeMind AI — global trading state.
 * Paper trading only ($100,000 virtual). Simulated price ticks.
 * No real money, no broker connection, no secrets.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AdminRiskConfig,
  AdminRole,
  AIAgent,
  Asset,
  AssetClass,
  AuditLog,
  ClosedTrade,
  ExecutePaperTradeInput,
  NotificationItem,
  PaperPosition,
  Signal,
  SignalDecision,
  Strategy,
  TabId,
  ToastMessage,
  ToastType,
} from '../types/trading';
import {
  mockAgents,
  mockAssets,
  mockClosedTrades,
  mockOpenPositions,
  mockSignals,
  mockStrategies,
} from '../data/mockTradingData';
import {
  fetchKlines,
  fetchLivePrices,
  fetch24hStats,
  LIVE_CRYPTO_SYMBOLS,
} from '../data/liveMarketData';
import { buildLiveSignal } from '../data/indicators';
import {
  applyLiveAnalysis,
  buildAgentStates,
  runAllLiveAnalysis,
  type LiveAnalysis,
} from '../data/liveAnalysis';
import { buildAnalyzeRequest, fetchAiVerdict, loadingVerdict } from '../data/aiVerdict';

const STARTING_BALANCE = 100000;
const STORAGE_KEY = 'trademind-paper-v1';
/** AI verdict throttle: one /api/analyze call per asset per 2h. The free
 *  tier allows 50 requests/day — the 5-minute analysis cadence must NEVER
 *  trigger an AI call (3 assets x 288 runs/day would burn the quota). */
const AI_VERDICT_TTL_MS = 2 * 60 * 60 * 1000;

interface PersistedState {
  virtualBalance: number;
  openPositions: PaperPosition[];
  closedTrades: ClosedTrade[];
  favoriteStrategyIds: string[];
  activeRole: AdminRole;
  adminRiskConfig: AdminRiskConfig;
}

const DEFAULT_RISK_CONFIG: AdminRiskConfig = {
  riskPerTrade: 0.5,
  maxSignalsPerDay: 2,
  dailyStopLoss: 2.0,
  globalDrawdownPause: 4.0,
  blockWeekendTrading: true,
  globalTradingPaused: false,
  aiEnginePaused: false,
};

const SEED_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', timestamp: '2026-11-08 09:12', event: 'Risk invariants verified — max 0.5% per trade, RR gate 1:2.0 active.', actor: 'Risk Manager', severity: 'INFO' },
  { id: 'log-2', timestamp: '2026-11-08 08:47', event: 'News Agent VETO issued on SOL/USDT (mainnet maintenance).', actor: 'News Agent', severity: 'WARNING' },
  { id: 'log-3', timestamp: '2026-11-07 18:20', event: 'Paper position opened: BUY 0.052 BTC @ $96,120.', actor: 'mrflexo', severity: 'INFO' },
  { id: 'log-4', timestamp: '2026-11-07 15:05', event: 'Paper position opened: BUY 36 NVDA @ $135.90.', actor: 'mrflexo', severity: 'INFO' },
  { id: 'log-5', timestamp: '2026-11-07 09:00', event: 'Daily risk limits reset. Signals used today: 0 / 2.', actor: 'System', severity: 'INFO' },
];

const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: 'ntf-1', title: 'New BUY signal — BTC/USDT', message: 'Confidence 78% · Entry $97,420 · RR 1:2.4. All risk gates passed.', type: 'signal', timestamp: '14:32', read: false },
  { id: 'ntf-2', title: 'News VETO — SOL/USDT', message: 'Mainnet maintenance headline. SOL paper execution is blocked.', type: 'news', timestamp: '13:55', read: false },
  { id: 'ntf-3', title: 'Paper trade closed — TP hit', message: 'BUY BTC closed at $94,850 for +$200.75 realized.', type: 'execution', timestamp: '11:24', read: true },
  { id: 'ntf-4', title: 'Daily stop check passed', message: 'Realized P&L today is within the 2.0% daily stop limit.', type: 'risk', timestamp: '09:00', read: true },
];

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (typeof parsed.virtualBalance !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface TradingContextValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedAsset: Asset;
  setSelectedAsset: (asset: Asset) => void;
  assets: Asset[];
  signals: Signal[];
  agents: AIAgent[];
  /** Live analysis per crypto symbol (BTC/ETH/SOL), computed from real
   *  candles + market context + headlines. Empty until the first live
   *  run completes — views must show "pending", never preset numbers. */
  liveAnalysis: Record<string, LiveAnalysis>;
  /**
   * AI verdicts (POST /api/analyze, key server-side). refreshAiVerdict
   * fetches one asset's verdict (2h throttle applies — returns false
   * when the cached verdict is still fresh); refreshAllAiVerdicts does
   * the same for every crypto asset. The verdict is display-only and
   * never overwrites the rule decision.
   */
  refreshAiVerdict: (symbol: string) => boolean;
  refreshAllAiVerdicts: () => void;
  strategies: Strategy[];
  toggleFavoriteStrategy: (id: string) => void;
  virtualBalance: number;
  availableCash: number;
  openPositions: PaperPosition[];
  closedTrades: ClosedTrade[];
  executePaperTrade: (input: ExecutePaperTradeInput) => void;
  closePosition: (id: string, reason: string) => void;
  resetPaperAccount: () => void;
  selectedSignal: Signal | null;
  setSelectedSignal: (signal: Signal | null) => void;
  isExecutionModalOpen: boolean;
  openExecutionModal: (signal?: Signal) => void;
  closeExecutionModal: () => void;
  executionSignalTarget: Signal | null;
  toastMessage: ToastMessage | null;
  showToast: (text: string, type?: ToastType) => void;
  signalFilter: 'ALL' | SignalDecision;
  setSignalFilter: (f: 'ALL' | SignalDecision) => void;
  signalSearch: string;
  setSignalSearch: (q: string) => void;
  assetClassFilter: 'ALL' | AssetClass;
  setAssetClassFilter: (f: 'ALL' | AssetClass) => void;
  activeRole: AdminRole;
  setActiveRole: (role: AdminRole) => void;
  adminRiskConfig: AdminRiskConfig;
  updateRiskConfig: (patch: Partial<AdminRiskConfig>) => void;
  toggleGlobalPause: () => void;
  toggleAiEngine: () => void;
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  isNotificationDrawerOpen: boolean;
  openNotificationDrawer: () => void;
  closeNotificationDrawer: () => void;
  markAllNotificationsRead: () => void;
  isPricingModalOpen: boolean;
  openPricingModal: () => void;
  closePricingModal: () => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const persistedRef = useRef<PersistedState | null>(null);
  if (persistedRef.current === null) {
    persistedRef.current = loadPersisted();
  }
  const persisted = persistedRef.current;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [selectedAsset, setSelectedAssetState] = useState<Asset>(mockAssets[0]);
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [agents, setAgents] = useState<AIAgent[]>(mockAgents);
  const [liveAnalysis, setLiveAnalysis] = useState<Record<string, LiveAnalysis>>({});
  const [strategies, setStrategies] = useState<Strategy[]>(mockStrategies);
  const [virtualBalance, setVirtualBalance] = useState<number>(
    persisted?.virtualBalance ?? STARTING_BALANCE,
  );
  const [openPositions, setOpenPositions] = useState<PaperPosition[]>(
    persisted?.openPositions ?? mockOpenPositions,
  );
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(
    persisted?.closedTrades ?? mockClosedTrades,
  );
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executionSignalTarget, setExecutionSignalTarget] = useState<Signal | null>(null);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [signalFilter, setSignalFilter] = useState<'ALL' | SignalDecision>('ALL');
  const [signalSearch, setSignalSearch] = useState('');
  const [assetClassFilter, setAssetClassFilter] = useState<'ALL' | AssetClass>('ALL');
  const [activeRole, setActiveRole] = useState<AdminRole>(persisted?.activeRole ?? 'Super Admin');
  const [adminRiskConfig, setAdminRiskConfig] = useState<AdminRiskConfig>(
    persisted?.adminRiskConfig ?? DEFAULT_RISK_CONFIG,
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------- AI verdicts (POST /api/analyze) ------------- */
  /* In-memory only (no localStorage): last successful/attempted fetch per
   * symbol, for the 2h throttle. In-flight guard stops double fetches. */
  const aiVerdictFetchedAtRef = useRef<Map<string, number>>(new Map());
  const aiVerdictInFlightRef = useRef<Set<string>>(new Set());
  /* Latest assets / liveAnalysis for the verdict fetcher, which runs from
   * the mount effect (stale closures would otherwise see seed data). */
  const assetsRef = useRef<Asset[]>(assets);
  const liveAnalysisRef = useRef<Record<string, LiveAnalysis>>({});
  const runAiVerdictFetchRef = useRef<
    (symbol: string, analysis: LiveAnalysis) => Promise<void>
  >(async () => {});

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);
  useEffect(() => {
    liveAnalysisRef.current = liveAnalysis;
  }, [liveAnalysis]);

  /** Fetch one asset's AI verdict and attach it to its signal. Sets a
   *  'loading' verdict first, then 'ready' or 'unavailable' (rule
   *  fallback). Never throws; never touches signal.type / confidence. */
  const runAiVerdictFetch = useCallback(
    async (symbol: string, analysis: LiveAnalysis): Promise<void> => {
      if (aiVerdictInFlightRef.current.has(symbol)) return;
      const asset = assetsRef.current.find((a) => a.symbol === symbol);
      if (!asset) return;
      aiVerdictInFlightRef.current.add(symbol);
      setSignals((prev) =>
        prev.map((s) =>
          s.assetSymbol === symbol
            ? { ...s, aiVerdict: loadingVerdict(s.type, s.confidence) }
            : s,
        ),
      );
      try {
        const verdict = await fetchAiVerdict(buildAnalyzeRequest(symbol, asset, analysis));
        // Every completed attempt (ready OR unavailable) counts against
        // the 2h throttle, so a failing backend is not hammered either.
        aiVerdictFetchedAtRef.current.set(symbol, Date.now());
        setSignals((prev) =>
          prev.map((s) => (s.assetSymbol === symbol ? { ...s, aiVerdict: verdict } : s)),
        );
      } finally {
        aiVerdictInFlightRef.current.delete(symbol);
      }
    },
    [],
  );

  useEffect(() => {
    runAiVerdictFetchRef.current = runAiVerdictFetch;
  }, [runAiVerdictFetch]);

  // Restore favorites from persistence.
  useEffect(() => {
    const favIds = persisted?.favoriteStrategyIds;
    if (favIds && favIds.length > 0) {
      setStrategies((prev) =>
        prev.map((s) => ({ ...s, isFavorite: favIds.includes(s.id) })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist portfolio state.
  useEffect(() => {
    try {
      const state: PersistedState = {
        virtualBalance,
        openPositions,
        closedTrades,
        favoriteStrategyIds: strategies.filter((s) => s.isFavorite).map((s) => s.id),
        activeRole,
        adminRiskConfig,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode) — app still works in-memory.
    }
  }, [virtualBalance, openPositions, closedTrades, strategies, activeRole, adminRiskConfig]);

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    setToastMessage({ type, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 4500);
  }, []);

  /* Manual AI verdict refresh (button). Respects the same 2h throttle as
   * the auto-fetch — returns false (with a toast saying when the next
   * refresh is due) when the cached verdict is still fresh. */
  const refreshAiVerdict = useCallback(
    (symbol: string): boolean => {
      const analysis = liveAnalysisRef.current[symbol];
      if (!analysis) {
        showToast(
          `No live analysis for ${symbol} yet — AI verdict appears after the next analysis run.`,
          'warning',
        );
        return false;
      }
      const last = aiVerdictFetchedAtRef.current.get(symbol);
      if (last !== undefined && Date.now() - last < AI_VERDICT_TTL_MS) {
        const mins = Math.ceil((AI_VERDICT_TTL_MS - (Date.now() - last)) / 60000);
        const hours = Math.floor(mins / 60);
        showToast(
          `AI verdict for ${symbol} is fresh — next refresh in ~${hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`}.`,
          'info',
        );
        return false;
      }
      void runAiVerdictFetch(symbol, analysis);
      return true;
    },
    [runAiVerdictFetch, showToast],
  );

  const refreshAllAiVerdicts = useCallback((): void => {
    const started: string[] = [];
    const skippedFresh: string[] = [];
    for (const symbol of Object.keys(LIVE_CRYPTO_SYMBOLS)) {
      const analysis = liveAnalysisRef.current[symbol];
      if (!analysis) continue;
      const last = aiVerdictFetchedAtRef.current.get(symbol);
      if (last !== undefined && Date.now() - last < AI_VERDICT_TTL_MS) {
        skippedFresh.push(symbol);
        continue;
      }
      started.push(symbol);
      void runAiVerdictFetch(symbol, analysis);
    }
    if (started.length > 0) {
      showToast(`Refreshing AI verdicts for ${started.join(', ')}…`, 'info');
    } else if (skippedFresh.length > 0) {
      const soonest = Math.min(
        ...skippedFresh.map((s) => aiVerdictFetchedAtRef.current.get(s) ?? 0),
      );
      const mins = Math.max(
        1,
        Math.ceil((AI_VERDICT_TTL_MS - (Date.now() - soonest)) / 60000),
      );
      showToast(`All AI verdicts are fresh (2h cache) — next refresh in ~${mins}m.`, 'info');
    } else {
      showToast('No live analysis yet — AI verdicts appear after the next analysis run.', 'warning');
    }
  }, [runAiVerdictFetch, showToast]);

  const appendAuditLog = useCallback((event: string, actor: string, severity: AuditLog['severity']) => {
    setAuditLogs((prev) => [
      { id: `log-${Date.now()}`, timestamp: nowStamp(), event, actor, severity },
      ...prev,
    ]);
  }, []);

  const setSelectedAsset = useCallback((asset: Asset) => {
    setSelectedAssetState(asset);
  }, []);

  /* ------------- Live Binance feed (BTC/ETH/SOL) + simulated ticks ------------- */
  /* Crypto majors come from the Binance public feed (no key). Equities and any
     crypto whose feed fails keep the seeded simulated ticks, labelled SIMULATED. */
  const liveFailCountRef = useRef(0);
  const feedLostToastShownRef = useRef(false);
  const pollingRef = useRef(false);

  // Initial live candle load + 5-minute refresh (also rebuilds crypto signals
  // from the real candles through the indicator engine).
  useEffect(() => {
    let cancelled = false;
    const loadLiveCrypto = async () => {
      for (const symbol of Object.keys(LIVE_CRYPTO_SYMBOLS)) {
        const binance = LIVE_CRYPTO_SYMBOLS[symbol];
        const [klines, stats] = await Promise.all([
          fetchKlines(binance),
          fetch24hStats(binance),
        ]);
        if (cancelled) return;
        if (!klines || klines.length < 60) continue; // feed down — stays SIMULATED
        const lastClose = klines[klines.length - 1].close;
        setAssets((prev) =>
          prev.map((a) =>
            a.symbol === symbol
              ? {
                  ...a,
                  candles: klines,
                  currentPrice: lastClose,
                  change24h: stats?.change24h ?? a.change24h,
                  high24h: stats?.high24h ?? a.high24h,
                  low24h: stats?.low24h ?? a.low24h,
                  volume24h: stats?.volume24h ?? a.volume24h,
                  dataSource: 'LIVE',
                  lastPriceUpdate: nowStamp(),
                }
              : a,
          ),
        );
        setSignals((prev) =>
          prev.map((s) => (s.assetSymbol === symbol ? buildLiveSignal(s, klines) : s)),
        );
      }
    };
    // Live analysis pass: real chart + market + news per crypto asset.
    // Runs AFTER buildLiveSignal so the analysis decision (not the old
    // 70-gate alone) is authoritative for direction/confidence, and so
    // every agent vote is replaced with a computed one. Levels
    // (entry/SL/TP) stay as computed by the indicator engine.
    const runAnalysis = async () => {
      const analyses = await runAllLiveAnalysis();
      if (cancelled || analyses.length === 0) return;
      setLiveAnalysis((prev) => {
        const next = { ...prev };
        analyses.forEach((a) => {
          next[a.symbol] = a;
        });
        return next;
      });
      setAgents((prev) => buildAgentStates(prev, analyses));
      setSignals((prev) =>
        prev.map((s) => {
          const a = analyses.find((x) => x.symbol === s.assetSymbol);
          return a ? applyLiveAnalysis(s, a) : s;
        }),
      );
      // AI verdicts (frontend): throttled to one call per asset per 2h so
      // the 50/day free tier is never burned by the 5-minute analysis
      // cadence. Display-only — never overwrites the rule decision.
      for (const a of analyses) {
        const last = aiVerdictFetchedAtRef.current.get(a.symbol);
        if (last !== undefined && Date.now() - last < AI_VERDICT_TTL_MS) continue;
        void runAiVerdictFetchRef.current(a.symbol, a);
      }
    };
    loadLiveCrypto().then(() => {
      if (!cancelled) void runAnalysis();
    });
    const refreshId = setInterval(() => {
      loadLiveCrypto().then(() => {
        if (!cancelled) void runAnalysis();
      });
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4-second price ticks: live Binance poll for crypto, simulated drift otherwise.
  useEffect(() => {
    const applyPrice = (a: Asset, price: number): Asset => {
      const decimals = price > 1000 ? 2 : 4;
      const rounded = Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals);
      const lastCandle = a.candles[a.candles.length - 1];
      const candles =
        lastCandle && Math.abs(lastCandle.close - rounded) > 0.0001
          ? [...a.candles.slice(1), { ...lastCandle, close: rounded, high: Math.max(lastCandle.high, rounded), low: Math.min(lastCandle.low, rounded), volume: lastCandle.volume + Math.floor(Math.random() * 40) }]
          : a.candles;
      return { ...a, currentPrice: rounded, candles, lastPriceUpdate: nowStamp() };
    };

    const id = setInterval(() => {
      if (pollingRef.current) return; // never stack polls if the network is slow
      pollingRef.current = true;
      fetchLivePrices()
        .then((livePrices) => {
          if (livePrices) {
            liveFailCountRef.current = 0;
            feedLostToastShownRef.current = false;
          } else {
            liveFailCountRef.current += 1;
          }
          setAssets((prev) =>
            prev.map((a) => {
              const binance = LIVE_CRYPTO_SYMBOLS[a.symbol];
              if (binance && livePrices && livePrices[binance]) {
                return { ...applyPrice(a, livePrices[binance]), dataSource: 'LIVE' };
              }
              // Simulated drift for equities and for any live asset whose
              // feed is down on this tick (label stays honest — see below).
              const drift = (Math.random() - 0.5) * 0.003; // ±0.15% per tick
              const price = Math.max(a.currentPrice * (1 + drift), a.currentPrice * 0.9);
              return applyPrice(a, price);
            }),
          );
          // After 3 consecutive failed polls, stop claiming LIVE for crypto.
          if (!livePrices && liveFailCountRef.current >= 3) {
            setAssets((prev) =>
              prev.map((a) =>
                LIVE_CRYPTO_SYMBOLS[a.symbol] && a.dataSource === 'LIVE'
                  ? { ...a, dataSource: 'SIMULATED' }
                  : a,
              ),
            );
            if (!feedLostToastShownRef.current) {
              feedLostToastShownRef.current = true;
              showToast('Live Binance feed unreachable — crypto switched to simulated ticks.', 'warning');
            }
          }
        })
        .catch(() => {
          liveFailCountRef.current += 1;
        })
        .finally(() => {
          pollingRef.current = false;
        });
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selectedAsset in sync with ticking prices.
  useEffect(() => {
    setSelectedAssetState((prev) => assets.find((a) => a.symbol === prev.symbol) ?? prev);
  }, [assets]);

  // Re-mark positions + auto-close on SL/TP touch.
  useEffect(() => {
    setOpenPositions((prevPositions) => {
      if (prevPositions.length === 0) return prevPositions;
      const toClose: Array<{ pos: PaperPosition; exitPrice: number; reason: string }> = [];
      const next = prevPositions.map((pos) => {
        const asset = assets.find((a) => a.symbol === pos.symbol);
        if (!asset) return pos;
        const currentPrice = asset.currentPrice;
        const dir = pos.direction === 'BUY' ? 1 : -1;
        const unrealizedPnL = (currentPrice - pos.entryPrice) * dir * pos.quantity;
        const pnlPercent = pos.investedAmount > 0 ? (unrealizedPnL / pos.investedAmount) * 100 : 0;
        const updated = { ...pos, currentPrice, unrealizedPnL, pnlPercent };
        if (pos.direction === 'BUY') {
          if (currentPrice >= pos.takeProfit) toClose.push({ pos: updated, exitPrice: pos.takeProfit, reason: 'TP' });
          else if (currentPrice <= pos.stopLoss) toClose.push({ pos: updated, exitPrice: pos.stopLoss, reason: 'SL' });
        } else {
          if (currentPrice <= pos.takeProfit) toClose.push({ pos: updated, exitPrice: pos.takeProfit, reason: 'TP' });
          else if (currentPrice >= pos.stopLoss) toClose.push({ pos: updated, exitPrice: pos.stopLoss, reason: 'SL' });
        }
        return updated;
      });
      if (toClose.length > 0) {
        const closed: ClosedTrade[] = toClose.map(({ pos, exitPrice, reason }) => {
          const dir = pos.direction === 'BUY' ? 1 : -1;
          const realizedPnL = (exitPrice - pos.entryPrice) * dir * pos.quantity;
          return {
            id: `trd-${Date.now()}-${pos.id}`,
            symbol: pos.symbol,
            assetName: pos.assetName ?? pos.symbol,
            direction: pos.direction,
            entryPrice: pos.entryPrice,
            exitPrice,
            quantity: pos.quantity,
            investedUSD: pos.investedAmount,
            realizedPnL,
            pnlPercent: pos.investedAmount > 0 ? (realizedPnL / pos.investedAmount) * 100 : 0,
            exitReason: reason,
            closeTime: nowStamp(),
            status: realizedPnL >= 0 ? 'PROFIT' : 'LOSS',
          };
        });
        setClosedTrades((prev) => [...closed, ...prev]);
        setVirtualBalance((prev) => prev + closed.reduce((s, t) => s + t.realizedPnL, 0));
        closed.forEach((t) =>
          showToast(`Paper trade closed (${t.exitReason}): ${t.symbol} ${t.realizedPnL >= 0 ? '+' : ''}$${t.realizedPnL.toFixed(2)}`, t.realizedPnL >= 0 ? 'success' : 'warning'),
        );
        const closedIds = new Set(toClose.map((c) => c.pos.id));
        return next.filter((p) => !closedIds.has(p.id));
      }
      return next;
    });
  }, [assets, showToast]);

  const availableCash = useMemo(() => {
    const committed = openPositions.reduce((s, p) => s + p.investedAmount, 0);
    return Math.max(virtualBalance - committed, 0);
  }, [virtualBalance, openPositions]);

  const executePaperTrade = useCallback(
    (input: ExecutePaperTradeInput) => {
      if (adminRiskConfig.globalTradingPaused) {
        showToast('Trading is halted by the global circuit breaker.', 'error');
        return;
      }
      // Use the live assets state (not the seed list) so the entry is priced
      // off the current feed — live Binance for crypto, simulated otherwise.
      const asset = assets.find((a) => a.symbol === input.symbol);
      if (!asset) {
        showToast('Unknown asset for paper trade.', 'error');
        return;
      }
      if (input.direction === 'BUY' && input.stopLoss >= input.entryPrice) {
        showToast('Stop loss must be below entry for a BUY paper trade.', 'error');
        return;
      }
      if (input.direction === 'SELL' && input.stopLoss <= input.entryPrice) {
        showToast('Stop loss must be above entry for a SELL paper trade.', 'error');
        return;
      }
      const riskDollars = virtualBalance * (Math.min(input.riskPercent, adminRiskConfig.riskPerTrade) / 100);
      const slDistance = Math.abs(input.entryPrice - input.stopLoss);
      if (slDistance <= 0) {
        showToast('Stop loss distance must be greater than zero.', 'error');
        return;
      }
      const quantity = Math.round((riskDollars / slDistance) * 1000) / 1000;
      const investedAmount = Math.round(quantity * input.entryPrice * 100) / 100;
      if (investedAmount > availableCash) {
        showToast('Not enough available virtual cash for this paper trade size.', 'error');
        return;
      }
      const rr = Math.abs(input.takeProfit - input.entryPrice) / slDistance;
      if (rr < 2) {
        showToast('Risk gate: reward-to-risk is below 1:2.0 — trade blocked.', 'error');
        return;
      }
      const position: PaperPosition = {
        id: `pos-${Date.now()}`,
        signalId: input.signalId,
        symbol: input.symbol,
        assetName: asset.name,
        direction: input.direction,
        entryPrice: input.entryPrice,
        currentPrice: asset.currentPrice,
        quantity,
        positionSizeUSD: investedAmount,
        investedAmount,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        unrealizedPnL: 0,
        pnlPercent: 0,
        openTime: nowStamp(),
      };
      setOpenPositions((prev) => [position, ...prev]);
      appendAuditLog(`Paper position opened: ${input.direction} ${quantity} ${input.symbol} @ $${input.entryPrice.toLocaleString()}.`, 'mrflexo', 'INFO');
      showToast(`Paper trade opened: ${input.direction} ${quantity} ${input.symbol} (risk ${input.riskPercent}%).`, 'success');
      setIsExecutionModalOpen(false);
      setExecutionSignalTarget(null);
    },
    [adminRiskConfig, assets, availableCash, showToast, virtualBalance, appendAuditLog],
  );

  const closePosition = useCallback(
    (id: string, reason: string) => {
      setOpenPositions((prev) => {
        const pos = prev.find((p) => p.id === id);
        if (!pos) return prev;
        const dir = pos.direction === 'BUY' ? 1 : -1;
        const realizedPnL = (pos.currentPrice - pos.entryPrice) * dir * pos.quantity;
        const trade: ClosedTrade = {
          id: `trd-${Date.now()}`,
          symbol: pos.symbol,
          assetName: pos.assetName ?? pos.symbol,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          exitPrice: pos.currentPrice,
          quantity: pos.quantity,
          investedUSD: pos.investedAmount,
          realizedPnL,
          pnlPercent: pos.investedAmount > 0 ? (realizedPnL / pos.investedAmount) * 100 : 0,
          exitReason: reason,
          closeTime: nowStamp(),
          status: realizedPnL >= 0 ? 'PROFIT' : 'LOSS',
        };
        setClosedTrades((prevTrades) => [trade, ...prevTrades]);
        setVirtualBalance((prevBal) => prevBal + realizedPnL);
        showToast(`Position closed: ${pos.symbol} ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)}`, realizedPnL >= 0 ? 'success' : 'warning');
        return prev.filter((p) => p.id !== id);
      });
    },
    [showToast],
  );

  const resetPaperAccount = useCallback(() => {
    setVirtualBalance(STARTING_BALANCE);
    setOpenPositions(mockOpenPositions);
    setClosedTrades(mockClosedTrades);
    appendAuditLog('Paper portfolio reset to $100,000 virtual capital.', 'mrflexo', 'WARNING');
    showToast('Paper portfolio reset to $100,000 virtual capital.', 'success');
  }, [appendAuditLog, showToast]);

  const toggleFavoriteStrategy = useCallback((id: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s)),
    );
  }, []);

  const openExecutionModal = useCallback((signal?: Signal) => {
    if (signal) setExecutionSignalTarget(signal);
    else setExecutionSignalTarget(null);
    setIsExecutionModalOpen(true);
  }, []);

  const closeExecutionModal = useCallback(() => {
    setIsExecutionModalOpen(false);
    setExecutionSignalTarget(null);
  }, []);

  const updateRiskConfig = useCallback(
    (patch: Partial<AdminRiskConfig>) => {
      setAdminRiskConfig((prev) => ({ ...prev, ...patch }));
      appendAuditLog('Global risk invariants updated by Super Admin.', 'mrflexo', 'WARNING');
      showToast('Risk invariants saved.', 'success');
    },
    [appendAuditLog, showToast],
  );

  const toggleGlobalPause = useCallback(() => {
    setAdminRiskConfig((prev) => {
      const next = { ...prev, globalTradingPaused: !prev.globalTradingPaused };
      appendAuditLog(
        next.globalTradingPaused ? 'EMERGENCY: Global trading halted.' : 'Global trading resumed.',
        'mrflexo',
        next.globalTradingPaused ? 'CRITICAL' : 'WARNING',
      );
      showToast(
        next.globalTradingPaused ? 'Global trading halted — all paper orders blocked.' : 'Global trading resumed.',
        next.globalTradingPaused ? 'error' : 'success',
      );
      return next;
    });
  }, [appendAuditLog, showToast]);

  const toggleAiEngine = useCallback(() => {
    setAdminRiskConfig((prev) => {
      const next = { ...prev, aiEnginePaused: !prev.aiEnginePaused };
      appendAuditLog(
        next.aiEnginePaused ? 'AI 10-agent consensus engine frozen.' : 'AI 10-agent consensus engine resumed.',
        'mrflexo',
        'WARNING',
      );
      showToast(
        next.aiEnginePaused ? 'AI signal engine frozen.' : 'AI signal engine resumed.',
        next.aiEnginePaused ? 'warning' : 'success',
      );
      return next;
    });
  }, [appendAuditLog, showToast]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value: TradingContextValue = {
    activeTab,
    setActiveTab,
    selectedAsset,
    setSelectedAsset,
    assets,
    signals,
    agents,
    liveAnalysis,
    refreshAiVerdict,
    refreshAllAiVerdicts,
    strategies,
    toggleFavoriteStrategy,
    virtualBalance,
    availableCash,
    openPositions,
    closedTrades,
    executePaperTrade,
    closePosition,
    resetPaperAccount,
    selectedSignal,
    setSelectedSignal,
    isExecutionModalOpen,
    openExecutionModal,
    closeExecutionModal,
    executionSignalTarget,
    toastMessage,
    showToast,
    signalFilter,
    setSignalFilter,
    signalSearch,
    setSignalSearch,
    assetClassFilter,
    setAssetClassFilter,
    activeRole,
    setActiveRole,
    adminRiskConfig,
    updateRiskConfig,
    toggleGlobalPause,
    toggleAiEngine,
    auditLogs,
    notifications,
    isNotificationDrawerOpen,
    openNotificationDrawer: () => setIsNotificationDrawerOpen(true),
    closeNotificationDrawer: () => setIsNotificationDrawerOpen(false),
    markAllNotificationsRead,
    isPricingModalOpen,
    openPricingModal: () => setIsPricingModalOpen(true),
    closePricingModal: () => setIsPricingModalOpen(false),
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
};

export function useTrading(): TradingContextValue {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used inside <TradingProvider>.');
  return ctx;
}
