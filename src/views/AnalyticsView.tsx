import React from 'react';
import { useTrading } from '../context/TradingContext';
import {
  PieChart,
  TrendingUp,
  Percent,
  BarChart3,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { closedTrades, virtualBalance } = useTrading();

  // Performance data by asset
  const assetBreakdown = [
    { symbol: 'BTC', name: 'Bitcoin', pnl: 1450.0, winRate: 75.0, count: 8, color: '#18D5C0' },
    { symbol: 'NVDA', name: 'NVIDIA Corp', pnl: 920.0, winRate: 71.4, count: 7, color: '#20D99A' },
    { symbol: 'SOL', name: 'Solana', pnl: 936.0, winRate: 66.7, count: 6, color: '#A78BFA' },
    { symbol: 'ETH', name: 'Ethereum', pnl: 990.0, winRate: 60.0, count: 5, color: '#38BDF8' },
    { symbol: 'AAPL', name: 'Apple Inc', pnl: 330.0, winRate: 80.0, count: 5, color: '#F5B942' },
    { symbol: 'TSLA', name: 'Tesla Inc', pnl: -227.5, winRate: 40.0, count: 5, color: '#FF5C70' },
  ];

  // Buy vs Sell stats
  const buyTrades = closedTrades.filter((t) => t.direction === 'BUY');
  const buyProfit = buyTrades.reduce((acc, t) => acc + t.realizedPnL, 0);
  const buyWinRate = 75.0;

  const sellTrades = closedTrades.filter((t) => t.direction === 'SELL');
  const sellProfit = 0; // mostly buy trades in MVP history
  const sellWinRate = 60.0;

  // Monthly returns data
  const monthlyData = [
    { month: 'Jun', returnPct: 4.2 },
    { month: 'Jul', returnPct: 6.8 },
    { month: 'Aug', returnPct: -1.4 },
    { month: 'Sep', returnPct: 3.9 },
    { month: 'Oct', returnPct: 8.5 },
    { month: 'Nov (MTD)', returnPct: 5.2 },
  ];

  // SVG dimensions for P&L curve
  const chartW = 600;
  const chartH = 180;
  const pnlPoints = [100000, 100800, 101400, 100900, 102100, 103200, 104525];
  const minPnl = Math.min(...pnlPoints) * 0.99;
  const maxPnl = Math.max(...pnlPoints) * 1.01;

  const getX = (idx: number) => (idx / (pnlPoints.length - 1)) * chartW;
  const getY = (val: number) => chartH - ((val - minPnl) / (maxPnl - minPnl)) * chartH;

  const pathD = pnlPoints.reduce((acc, val, idx) => {
    const x = getX(idx);
    const y = getY(val);
    return acc === '' ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-bold text-[#F4F7FB]">Portfolio & Execution Analytics</h2>
        <p className="text-xs text-[#91A0B5] mt-0.5">
          Mathematical breakdown of trading edge, win rates, and capital efficiency.
        </p>
      </div>

      {/* Top Key Metric Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono tabular-nums">
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Cumulative Return</div>
          <div className="text-2xl font-bold text-[#20D99A] mt-1">+4.52%</div>
          <div className="text-[10px] text-[#91A0B5] mt-0.5">+$4,525.00 Virtual Capital</div>
        </div>

        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Overall Win Rate</div>
          <div className="text-2xl font-bold text-[#F4F7FB] mt-1">68.4%</div>
          <div className="text-[10px] text-[#20D99A] mt-0.5">26 Wins / 12 Losses</div>
        </div>

        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Profit Factor</div>
          <div className="text-2xl font-bold text-[#18D5C0] mt-1">2.38</div>
          <div className="text-[10px] text-[#91A0B5] mt-0.5">Gross Wins / Gross Losses</div>
        </div>

        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Max Historic Drawdown</div>
          <div className="text-2xl font-bold text-[#FF5C70] mt-1">2.1%</div>
          <div className="text-[10px] text-[#91A0B5] mt-0.5">Well within 4.0% Global Pause</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative P&L Curve */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#223044]">
            <span className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
              Cumulative Paper Equity Curve
            </span>
            <span className="text-xs text-[#20D99A] font-mono tabular-nums">+$4,525.00 Net</span>
          </div>

          <div className="w-full h-44 relative">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#20D99A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#20D99A" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path d={areaD} fill="url(#anGrad)" />
              <path d={pathD} fill="none" stroke="#20D99A" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono pt-1">
            <span>Base: $100,000.00</span>
            <span>Steady Upside Drift</span>
            <span className="text-[#F4F7FB] font-bold">${virtualBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Monthly Returns Bar Chart */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#223044]">
            <span className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
              Monthly Return Distribution
            </span>
            <span className="text-xs text-[#18D5C0] font-mono tabular-nums">Avg: +4.5% / mo</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2">
            {monthlyData.map((m) => {
              const isPos = m.returnPct >= 0;
              const heightPct = Math.min(100, Math.abs(m.returnPct) * 10);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isPos ? 'text-[#20D99A]' : 'text-[#FF5C70]'
                    }`}
                  >
                    {isPos ? '+' : ''}
                    {m.returnPct}%
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      isPos ? 'bg-[#20D99A]/80' : 'bg-[#FF5C70]/80'
                    }`}
                  />
                  <span className="text-[10px] text-[#91A0B5] font-mono">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-[#64748B] font-mono text-center pt-1 border-t border-[#223044]">
            5 Out of 6 Positive Months
          </div>
        </div>
      </div>

      {/* Asset Breakdown & Direction Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance by Asset (2 Columns) */}
        <div className="lg:col-span-2 bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#0D1420] border-b border-[#223044] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
              Performance by Asset Class & Ticker
            </h3>
            <span className="text-[11px] text-[#64748B] font-mono">Realized + Mark</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-[#080D16] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Trades</th>
                  <th className="px-4 py-3">Win Rate</th>
                  <th className="px-4 py-3">Net Realized P&L</th>
                  <th className="px-4 py-3 text-right">Edge Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223044]/60">
                {assetBreakdown.map((row) => (
                  <tr key={row.symbol} className="hover:bg-[#162232]/50">
                    <td className="px-4 py-3 font-sans font-bold text-[#F4F7FB]">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span>{row.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#91A0B5]">{row.count}</td>
                    <td className="px-4 py-3 text-[#F4F7FB]">{row.winRate}%</td>
                    <td
                      className={`px-4 py-3 font-bold ${
                        row.pnl >= 0 ? 'text-[#20D99A]' : 'text-[#FF5C70]'
                      }`}
                    >
                      {row.pnl >= 0 ? '+' : ''}${row.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="w-24 ml-auto h-1.5 bg-[#080D16] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(10, Math.min(100, (row.pnl / 1500) * 100))}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BUY vs SELL Efficiency (1 Column) */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-[#223044]">
              <h3 className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                Directional Efficiency
              </h3>
              <p className="text-[11px] text-[#64748B]">BUY (Long) vs SELL (Short) Analysis</p>
            </div>

            <div className="space-y-4 my-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#0D1420] border border-[#223044] space-y-1.5">
                <div className="flex items-center justify-between text-[#20D99A] font-bold">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> LONG / BUY
                  </span>
                  <span>75.0% Win Rate</span>
                </div>
                <div className="flex justify-between text-[#91A0B5] text-[11px]">
                  <span>Net P&L:</span>
                  <span className="text-[#20D99A] font-bold">+$4,752.50</span>
                </div>
                <div className="flex justify-between text-[#91A0B5] text-[11px]">
                  <span>Avg R/R Achieved:</span>
                  <span className="text-[#F4F7FB]">1:2.6</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0D1420] border border-[#223044] space-y-1.5">
                <div className="flex items-center justify-between text-[#FF5C70] font-bold">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" /> SHORT / SELL
                  </span>
                  <span>60.0% Win Rate</span>
                </div>
                <div className="flex justify-between text-[#91A0B5] text-[11px]">
                  <span>Net P&L:</span>
                  <span className="text-[#FF5C70] font-bold">-$227.50</span>
                </div>
                <div className="flex justify-between text-[#91A0B5] text-[11px]">
                  <span>Avg R/R Achieved:</span>
                  <span className="text-[#F4F7FB]">1:2.1</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#223044] text-[11px] text-[#64748B] text-center">
            Long setups demonstrate superior risk-adjusted alpha in the current regime.
          </div>
        </div>
      </div>
    </div>
  );
};
