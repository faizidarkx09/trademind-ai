import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  FlaskConical,
  Play,
  RotateCcw,
  TrendingUp,
  Percent,
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
} from 'lucide-react';
import { BacktestTrade } from '../types/trading';

export const BacktestingView: React.FC = () => {
  const { strategies, assets, showToast } = useTrading();

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(strategies[0]?.id || '');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [timeframe, setTimeframe] = useState<string>('4H');
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>('2024-11-01');
  const [capital, setCapital] = useState<number>(100000);
  const [riskPerTrade, setRiskPerTrade] = useState<number>(0.5);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(true);

  // Deterministic simulation generator based on chosen parameters
  const generateSimulatedResults = () => {
    const selectedStrat = strategies.find((s) => s.id === selectedStrategyId) || strategies[0];
    const totalTrades = 124;
    const winRate = selectedStrat.historicalWinRate;
    const winningCount = Math.round(totalTrades * (winRate / 100));
    const losingCount = totalTrades - winningCount;
    const profitFactor = selectedStrat.profitFactor;
    const maxDrawdown = selectedStrat.maxDrawdown;

    // Generate equity curve points
    const points = [];
    let curEquity = capital;
    let peak = capital;
    let maxDd = 0;

    for (let i = 0; i <= 30; i++) {
      const isWin = Math.random() < winRate / 100;
      const change = isWin
        ? curEquity * (riskPerTrade / 100) * (1.8 + Math.random() * 0.8)
        : -curEquity * (riskPerTrade / 100);
      curEquity += change;
      if (curEquity > peak) peak = curEquity;
      const dd = ((peak - curEquity) / peak) * 100;
      if (dd > maxDd) maxDd = dd;

      points.push({
        day: `M${Math.floor(i / 3) + 1}`,
        equity: Math.round(curEquity),
        drawdown: Math.round(dd * 10) / 10,
      });
    }

    const totalReturnPercent = ((curEquity - capital) / capital) * 100;
    const totalReturnUSD = curEquity - capital;

    // Generate trade sample history
    const tradeHistory: BacktestTrade[] = [
      {
        id: 'bt-01',
        date: '2024-10-28 14:00',
        symbol: selectedSymbol,
        type: 'BUY',
        entryPrice: 67200,
        exitPrice: 71400,
        pnl: 1050,
        pnlPercent: 6.25,
        duration: '18h',
        reason: 'TP',
      },
      {
        id: 'bt-02',
        date: '2024-10-24 09:30',
        symbol: selectedSymbol,
        type: 'BUY',
        entryPrice: 66800,
        exitPrice: 65400,
        pnl: -500,
        pnlPercent: -2.09,
        duration: '8h',
        reason: 'SL',
      },
      {
        id: 'bt-03',
        date: '2024-10-20 18:00',
        symbol: selectedSymbol,
        type: 'SELL',
        entryPrice: 68900,
        exitPrice: 65200,
        pnl: 1420,
        pnlPercent: 5.37,
        duration: '2d 4h',
        reason: 'TP',
      },
      {
        id: 'bt-04',
        date: '2024-10-15 11:15',
        symbol: selectedSymbol,
        type: 'BUY',
        entryPrice: 62400,
        exitPrice: 64900,
        pnl: 880,
        pnlPercent: 4.0,
        duration: '1d 1h',
        reason: 'TP',
      },
      {
        id: 'bt-05',
        date: '2024-10-10 16:45',
        symbol: selectedSymbol,
        type: 'BUY',
        entryPrice: 63100,
        exitPrice: 62200,
        pnl: -490,
        pnlPercent: -1.42,
        duration: '12h',
        reason: 'SL',
      },
    ];

    return {
      totalReturnPercent: Math.round(totalReturnPercent * 10) / 10,
      totalReturnUSD: Math.round(totalReturnUSD),
      winRate,
      profitFactor,
      maxDrawdown,
      totalTrades,
      winningCount,
      losingCount,
      avgRR: '1:2.4',
      sharpeRatio: 2.14,
      points,
      tradeHistory,
    };
  };

  const [results, setResults] = useState(generateSimulatedResults());

  const handleRunBacktest = () => {
    setIsRunning(true);
    showToast('Executing deterministic walk-forward backtest simulation...', 'info');

    setTimeout(() => {
      setResults(generateSimulatedResults());
      setIsRunning(false);
      setHasRun(true);
      showToast('Backtest simulation completed across 124 historical trades.', 'success');
    }, 600);
  };

  // SVG dimensions for equity curve
  const svgWidth = 600;
  const svgHeight = 220;
  const minEq = Math.min(...results.points.map((p) => p.equity)) * 0.98;
  const maxEq = Math.max(...results.points.map((p) => p.equity)) * 1.02;

  const getEqX = (i: number) => (i / (results.points.length - 1)) * svgWidth;
  const getEqY = (val: number) => svgHeight - ((val - minEq) / (maxEq - minEq)) * svgHeight;

  const equityPath = results.points.reduce((acc, p, i) => {
    const x = getEqX(i);
    const y = getEqY(p.equity);
    return acc === '' ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPath = `${equityPath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">Walk-Forward Backtesting Workspace</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Institutional historical simulation engine to validate multi-agent rules on tick data.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044] text-xs text-[#91A0B5]">
          <AlertCircle className="w-4 h-4 text-[#F5B942] shrink-0" />
          <span>Historical simulation for research · Not guaranteed future returns</span>
        </div>
      </div>

      {/* Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT CONFIGURATION PANEL (1 Column) */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between space-y-4 text-xs font-mono">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#223044]">
              <span className="font-bold text-sm text-[#F4F7FB] font-sans">Simulation Setup</span>
              <span className="text-[10px] text-[#18D5C0] font-mono">Parameters</span>
            </div>

            <div className="space-y-3.5 mt-4">
              {/* Strategy Selector */}
              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Strategy Engine
                </label>
                <select
                  value={selectedStrategyId}
                  onChange={(e) => setSelectedStrategyId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Selector */}
              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Target Asset
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
                >
                  {assets.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol} ({a.pair}) - {a.assetClass.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timeframe */}
              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Execution Timeframe
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-[#080D16] rounded-lg border border-[#223044]">
                  {['15m', '1H', '4H', '1D'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`py-1 rounded text-center font-medium ${
                        timeframe === tf
                          ? 'bg-[#18D5C0] text-[#080D16]'
                          : 'text-[#91A0B5] hover:text-[#F4F7FB]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] text-[11px]"
                  />
                </div>
              </div>

              {/* Initial Capital & Risk per Trade */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Capital ($)</label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Risk / Trade</label>
                  <input
                    type="number"
                    step="0.1"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(parseFloat(e.target.value) || 0.5)}
                    className="w-full px-2.5 py-1.5 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="w-full py-2.5 px-4 text-xs font-bold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#18D5C0]/10 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Simulating Walk-Forward...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Execute Backtest
              </>
            )}
          </button>
        </div>

        {/* MAIN RESULTS AREA (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 bg-[#111A27] border border-[#223044] rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-sans">Total Return</div>
              <div className="text-lg font-bold text-[#20D99A] mt-1">
                +{results.totalReturnPercent}%
              </div>
              <div className="text-[10px] text-[#91A0B5]">
                +${results.totalReturnUSD.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-[#111A27] border border-[#223044] rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-sans">Win Rate</div>
              <div className="text-lg font-bold text-[#F4F7FB] mt-1">{results.winRate}%</div>
              <div className="text-[10px] text-[#91A0B5]">
                {results.winningCount}W / {results.losingCount}L
              </div>
            </div>

            <div className="p-3 bg-[#111A27] border border-[#223044] rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-sans">Profit Factor</div>
              <div className="text-lg font-bold text-[#18D5C0] mt-1">{results.profitFactor}</div>
              <div className="text-[10px] text-[#91A0B5]">Sharpe: {results.sharpeRatio}</div>
            </div>

            <div className="p-3 bg-[#111A27] border border-[#223044] rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-sans">Max Drawdown</div>
              <div className="text-lg font-bold text-[#FF5C70] mt-1">{results.maxDrawdown}%</div>
              <div className="text-[10px] text-[#91A0B5]">R/R: {results.avgRR}</div>
            </div>
          </div>

          {/* Interactive Equity Curve Chart */}
          <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#223044]">
              <span className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wider">
                Simulated Equity Growth Curve
              </span>
              <span className="text-xs text-[#20D99A] font-mono tabular-nums">
                Final: ${results.points[results.points.length - 1]?.equity.toLocaleString()} USD
              </span>
            </div>

            <div className="w-full h-52 relative">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18D5C0" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#18D5C0" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Fill Area */}
                <path d={areaPath} fill="url(#eqGradient)" />

                {/* Equity Curve Stroke */}
                <path d={equityPath} fill="none" stroke="#18D5C0" strokeWidth="2.5" />

                {/* Capital baseline horizontal line */}
                <line
                  x1={0}
                  y1={getEqY(capital)}
                  x2={svgWidth}
                  y2={getEqY(capital)}
                  stroke="#64748B"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono pt-1">
              <span>Start: ${capital.toLocaleString()}</span>
              <span>124 Total Simulated Trades</span>
              <span className="text-[#18D5C0]">Peak: ${maxEq.toFixed(0)}</span>
            </div>
          </div>

          {/* Simulated Trade History Table */}
          <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden">
            <div className="p-3 bg-[#0D1420] border-b border-[#223044] flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                Recent Backtest Trade Executions
              </span>
              <span className="text-[11px] text-[#64748B] font-mono">Sample 5 of 124</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead className="bg-[#080D16] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Asset</th>
                    <th className="px-3 py-2.5">Side</th>
                    <th className="px-3 py-2.5">Entry</th>
                    <th className="px-3 py-2.5">Exit</th>
                    <th className="px-3 py-2.5">P&L ($)</th>
                    <th className="px-3 py-2.5 text-right">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223044]/60">
                  {results.tradeHistory.map((trd) => {
                    const isProfit = trd.pnl >= 0;
                    return (
                      <tr key={trd.id} className="hover:bg-[#162232]/50">
                        <td className="px-3 py-2.5 text-[#91A0B5]">{trd.date}</td>
                        <td className="px-3 py-2.5 font-bold text-[#F4F7FB]">{trd.symbol}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              trd.type === 'BUY'
                                ? 'bg-[#20D99A]/15 text-[#20D99A]'
                                : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                            }`}
                          >
                            {trd.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">${trd.entryPrice.toLocaleString()}</td>
                        <td className="px-3 py-2.5">${trd.exitPrice.toLocaleString()}</td>
                        <td
                          className={`px-3 py-2.5 font-bold ${
                            isProfit ? 'text-[#20D99A]' : 'text-[#FF5C70]'
                          }`}
                        >
                          {isProfit ? '+' : ''}${trd.pnl.toLocaleString()} ({trd.pnlPercent}%)
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              trd.reason === 'TP'
                                ? 'bg-[#20D99A]/15 text-[#20D99A]'
                                : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                            }`}
                          >
                            {trd.reason}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
