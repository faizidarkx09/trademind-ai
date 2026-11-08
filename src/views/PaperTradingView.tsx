import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  DollarSign,
  PlusCircle,
  XCircle,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { PaperPosition } from '../types/trading';

export const PaperTradingView: React.FC = () => {
  const {
    virtualBalance,
    availableCash,
    openPositions,
    closedTrades,
    closePosition,
    resetPaperAccount,
    assets,
    selectedAsset,
    setSelectedAsset,
    executePaperTrade,
    adminRiskConfig,
    showToast,
  } = useTrading();

  // Execution form state
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<number>(selectedAsset.currentPrice);
  const [stopLoss, setStopLoss] = useState<number>(
    Math.round((selectedAsset.currentPrice * 0.98) * 100) / 100
  );
  const [takeProfit, setTakeProfit] = useState<number>(
    Math.round((selectedAsset.currentPrice * 1.05) * 100) / 100
  );
  const [riskPercent, setRiskPercent] = useState<number>(adminRiskConfig.riskPerTrade || 0.5);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync entry when selected asset changes
  const handleSelectAsset = (sym: string) => {
    const a = assets.find((x) => x.symbol === sym) || selectedAsset;
    setSelectedAsset(a);
    setEntryPrice(a.currentPrice);
    setStopLoss(Math.round((a.currentPrice * (direction === 'BUY' ? 0.98 : 1.02)) * 100) / 100);
    setTakeProfit(Math.round((a.currentPrice * (direction === 'BUY' ? 1.05 : 0.95)) * 100) / 100);
  };

  // Sizing calculations
  const maxRiskDollar = virtualBalance * (riskPercent / 100);
  const stopLossDistance = Math.abs(entryPrice - stopLoss);
  const calculatedQty =
    stopLossDistance > 0 ? Math.round((maxRiskDollar / stopLossDistance) * 1000) / 1000 : 0;
  const positionSizeUSD = Math.round(calculatedQty * entryPrice * 100) / 100;
  const riskRewardRatio =
    stopLossDistance > 0 ? (Math.abs(takeProfit - entryPrice) / stopLossDistance).toFixed(2) : '0';

  const handleExecuteTicket = (e: React.FormEvent) => {
    e.preventDefault();
    executePaperTrade({
      symbol: selectedAsset.symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      riskPercent,
    });
  };

  const totalUnrealized = openPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">Paper Trading Execution Desk</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Risk-free simulation environment enforcing institutional position sizing rules.
          </p>
        </div>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111A27] hover:bg-[#162232] border border-[#223044] text-xs text-[#91A0B5] hover:text-[#FF5C70] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Paper Portfolio ($100k)</span>
        </button>
      </div>

      {/* Top KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono tabular-nums">
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Total Paper Balance</div>
          <div className="text-xl font-bold text-[#F4F7FB] mt-1">
            ${virtualBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#20D99A] mt-0.5">Virtual Equity</div>
        </div>

        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Available Buying Power</div>
          <div className="text-xl font-bold text-[#18D5C0] mt-1">
            ${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#91A0B5] mt-0.5">Uncommitted Margin</div>
        </div>

        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Open Positions</div>
          <div className="text-xl font-bold text-[#F4F7FB] mt-1">{openPositions.length}</div>
          <div className="text-[10px] text-[#91A0B5] mt-0.5">
            Risk: {(openPositions.length * 0.5).toFixed(1)}% of Capital
          </div>
        </div>

        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl">
          <div className="text-[10px] text-[#64748B] uppercase font-sans">Unrealized P&L</div>
          <div
            className={`text-xl font-bold mt-1 ${
              totalUnrealized >= 0 ? 'text-[#20D99A]' : 'text-[#FF5C70]'
            }`}
          >
            {totalUnrealized >= 0 ? '+' : ''}${totalUnrealized.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#91A0B5] mt-0.5">Mark-to-Market</div>
        </div>
      </div>

      {/* Main Split: Execution Ticket & Positions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ORDER EXECUTION TICKET (1 Column) */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between text-xs font-mono">
          <form onSubmit={handleExecuteTicket} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#223044]">
              <span className="font-bold text-sm text-[#F4F7FB] font-sans">Order Ticket</span>
              <span className="text-[10px] text-[#18D5C0] font-mono">Instant Simulation</span>
            </div>

            {/* Asset Selector */}
            <div>
              <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Instrument</label>
              <select
                value={selectedAsset.symbol}
                onChange={(e) => handleSelectAsset(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol} · ${a.currentPrice.toLocaleString()} ({a.pair})
                  </option>
                ))}
              </select>
            </div>

            {/* Direction Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#080D16] rounded-lg border border-[#223044]">
              <button
                type="button"
                onClick={() => {
                  setDirection('BUY');
                  setStopLoss(Math.round((entryPrice * 0.98) * 100) / 100);
                  setTakeProfit(Math.round((entryPrice * 1.05) * 100) / 100);
                }}
                className={`py-2 text-xs font-bold rounded-md transition-colors ${
                  direction === 'BUY'
                    ? 'bg-[#20D99A] text-[#080D16]'
                    : 'text-[#91A0B5] hover:text-[#F4F7FB]'
                }`}
              >
                LONG / BUY
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection('SELL');
                  setStopLoss(Math.round((entryPrice * 1.02) * 100) / 100);
                  setTakeProfit(Math.round((entryPrice * 0.95) * 100) / 100);
                }}
                className={`py-2 text-xs font-bold rounded-md transition-colors ${
                  direction === 'SELL'
                    ? 'bg-[#FF5C70] text-[#080D16]'
                    : 'text-[#91A0B5] hover:text-[#F4F7FB]'
                }`}
              >
                SHORT / SELL
              </button>
            </div>

            {/* Price Targets */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Entry Price ($)</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#FF5C70] mb-1 font-sans">Stop Loss ($)</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#0D1420] border border-[#223044] rounded-lg text-[#FF5C70] focus:outline-none focus:border-[#FF5C70]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#20D99A] mb-1 font-sans">Take Profit ($)</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#0D1420] border border-[#223044] rounded-lg text-[#20D99A] focus:outline-none focus:border-[#20D99A]"
                  />
                </div>
              </div>

              {/* Risk Sizing */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-sans">
                  <span className="text-[#91A0B5]">Risk Budget:</span>
                  <span className="text-[#18D5C0] font-mono font-bold">
                    {riskPercent}% (${maxRiskDollar.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                  className="w-full accent-[#18D5C0] cursor-pointer"
                />
              </div>
            </div>

            {/* Computed Output Box */}
            <div className="p-3 bg-[#0D1420] rounded-lg border border-[#223044] space-y-1 text-[11px]">
              <div className="flex justify-between text-[#91A0B5]">
                <span>Quantity:</span>
                <span className="text-[#F4F7FB] font-bold">
                  {calculatedQty} {selectedAsset.symbol}
                </span>
              </div>
              <div className="flex justify-between text-[#91A0B5]">
                <span>Position Value:</span>
                <span className="text-[#F4F7FB]">${positionSizeUSD.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-[#91A0B5]">
                <span>Risk / Reward:</span>
                <span className="text-[#18D5C0] font-bold">1:{riskRewardRatio}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-bold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded-lg transition-colors font-sans shadow-lg shadow-[#18D5C0]/10"
            >
              Confirm Paper Trade
            </button>
          </form>
        </div>

        {/* OPEN POSITIONS & TRADE LOG (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Open Paper Positions */}
          <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#0D1420] border-b border-[#223044] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#20D99A]"></span>
                <h3 className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                  Active Open Positions ({openPositions.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">Live Mark-to-Market</span>
            </div>

            {openPositions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No active open positions. Execute a trade using the ticket on the left.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono tabular-nums">
                  <thead className="bg-[#080D16] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Mark Price</th>
                      <th className="px-4 py-3">Size / Value</th>
                      <th className="px-4 py-3">Unrealized P&L</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#223044]/60">
                    {openPositions.map((pos) => {
                      const isProfit = pos.unrealizedPnL >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-[#162232]/50">
                          <td className="px-4 py-3 font-sans font-bold text-[#F4F7FB]">
                            {pos.symbol}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                pos.direction === 'BUY'
                                  ? 'bg-[#20D99A]/15 text-[#20D99A]'
                                  : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                              }`}
                            >
                              {pos.direction}
                            </span>
                          </td>
                          <td className="px-4 py-3">${pos.entryPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[#18D5C0]">
                            ${pos.currentPrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-[#91A0B5]">
                            {pos.quantity} (${pos.positionSizeUSD.toLocaleString()})
                          </td>
                          <td
                            className={`px-4 py-3 font-bold ${
                              isProfit ? 'text-[#20D99A]' : 'text-[#FF5C70]'
                            }`}
                          >
                            {isProfit ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} (+
                            {pos.pnlPercent.toFixed(2)}%)
                          </td>
                          <td className="px-4 py-3 text-right font-sans">
                            <button
                              onClick={() => closePosition(pos.id, 'MANUAL_CLOSE')}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#FF5C70] hover:text-white bg-[#FF5C70]/10 hover:bg-[#FF5C70] rounded transition-colors"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Completed Paper Trades */}
          <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#0D1420] border-b border-[#223044] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                Recent Closed Paper Trades
              </h3>
              <span className="text-[11px] text-[#64748B] font-mono">Realized P&L Ledger</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead className="bg-[#080D16] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Exit</th>
                    <th className="px-4 py-3">Realized P&L</th>
                    <th className="px-4 py-3">Exit Reason</th>
                    <th className="px-4 py-3 text-right">Closed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223044]/60">
                  {closedTrades.slice(0, 5).map((trd) => {
                    const isProfit = trd.realizedPnL >= 0;
                    return (
                      <tr key={trd.id} className="hover:bg-[#162232]/50">
                        <td className="px-4 py-3 font-sans font-bold text-[#F4F7FB]">
                          {trd.symbol}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              trd.direction === 'BUY'
                                ? 'bg-[#20D99A]/15 text-[#20D99A]'
                                : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                            }`}
                          >
                            {trd.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3">${trd.entryPrice.toLocaleString()}</td>
                        <td className="px-4 py-3">${trd.exitPrice.toLocaleString()}</td>
                        <td
                          className={`px-4 py-3 font-bold ${
                            isProfit ? 'text-[#20D99A]' : 'text-[#FF5C70]'
                          }`}
                        >
                          {isProfit ? '+' : ''}${trd.realizedPnL.toFixed(2)} (+
                          {trd.pnlPercent.toFixed(2)}%)
                        </td>
                        <td className="px-4 py-3 text-[#91A0B5]">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D1420] border border-[#223044]">
                            {trd.exitReason}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[#64748B]">{trd.closeTime}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="p-6 bg-[#0D1420] border border-[#223044] rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FF5C70]/15 text-[#FF5C70]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F4F7FB]">Reset Virtual Portfolio?</h3>
            </div>
            <p className="text-xs text-[#91A0B5] leading-relaxed">
              This will close all active open paper positions and restore your starting virtual cash
              balance back to $100,000.00 USD. Historical analytics will be reset.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#162232] text-[#91A0B5] hover:text-[#F4F7FB]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetPaperAccount();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#FF5C70] hover:bg-[#FF5C70]/90 text-[#080D16]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
