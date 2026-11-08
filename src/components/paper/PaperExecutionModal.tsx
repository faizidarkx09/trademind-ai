import React, { useEffect, useMemo, useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import type { Signal } from '../../types/trading';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface PaperExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSignal: Signal | null;
}

export const PaperExecutionModal: React.FC<PaperExecutionModalProps> = ({
  isOpen,
  onClose,
  targetSignal,
}) => {
  const {
    selectedAsset,
    virtualBalance,
    adminRiskConfig,
    executePaperTrade,
    showToast,
  } = useTrading();

  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [riskPercent, setRiskPercent] = useState(adminRiskConfig.riskPerTrade);

  // Pre-fill from the signal (or the selected asset) whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    if (targetSignal) {
      setDirection(targetSignal.type === 'SELL' ? 'SELL' : 'BUY');
      setEntryPrice(targetSignal.entryPrice);
      setStopLoss(targetSignal.stopLoss);
      setTakeProfit(targetSignal.takeProfit);
      setRiskPercent(adminRiskConfig.riskPerTrade);
    } else {
      const p = selectedAsset.currentPrice;
      setDirection('BUY');
      setEntryPrice(p);
      setStopLoss(Math.round(p * 0.98 * 100) / 100);
      setTakeProfit(Math.round(p * 1.05 * 100) / 100);
      setRiskPercent(adminRiskConfig.riskPerTrade);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetSignal?.id]);

  const symbol = targetSignal?.assetSymbol ?? selectedAsset.symbol;
  const assetName = targetSignal?.assetName ?? selectedAsset.name;

  const sizing = useMemo(() => {
    const riskDollars = virtualBalance * (riskPercent / 100);
    const slDistance = Math.abs(entryPrice - stopLoss);
    const qty = slDistance > 0 ? Math.round((riskDollars / slDistance) * 1000) / 1000 : 0;
    const value = Math.round(qty * entryPrice * 100) / 100;
    const rr = slDistance > 0 ? Math.abs(takeProfit - entryPrice) / slDistance : 0;
    return { riskDollars, qty, value, rr };
  }, [virtualBalance, riskPercent, entryPrice, stopLoss, takeProfit]);

  if (!isOpen) return null;

  const blockedByVeto =
    targetSignal?.type === 'WAIT' || targetSignal?.newsRisk === 'HIGH';
  const rrOk = sizing.rr >= 2;

  const confirmTrade = () => {
    if (blockedByVeto) {
      showToast('News VETO active — this paper trade is blocked.', 'error');
      return;
    }
    if (!rrOk) {
      showToast('Risk gate: reward-to-risk is below 1:2.0 — trade blocked.', 'error');
      return;
    }
    executePaperTrade({
      symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      riskPercent,
      signalId: targetSignal?.id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0D1420] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#111A27] border-b border-[#223044]">
          <div>
            <h3 className="text-base font-bold text-[#F4F7FB]">
              {step === 1 ? 'Execute Paper Trade' : 'Confirm Paper Trade'}
            </h3>
            <p className="text-[11px] text-[#64748B] font-mono">
              {symbol} · {assetName} · Virtual money only — no real funds
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {blockedByVeto && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FF5C70]/10 border border-[#FF5C70]/30 text-[#FF5C70]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {targetSignal?.type === 'WAIT'
                  ? 'This signal is a WAIT — there is no trade to execute.'
                  : 'News Agent VETO is active on this asset. Execution is blocked until it clears.'}
              </p>
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#080D16] rounded-lg border border-[#223044]">
                {(['BUY', 'SELL'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`py-2 text-xs font-bold rounded-md transition-colors ${
                      direction === d
                        ? d === 'BUY'
                          ? 'bg-[#20D99A] text-[#080D16]'
                          : 'bg-[#FF5C70] text-[#080D16]'
                        : 'text-[#91A0B5] hover:text-[#F4F7FB]'
                    }`}
                  >
                    {d === 'BUY' ? 'LONG / BUY' : 'SHORT / SELL'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-[#91A0B5] mb-1">Entry ($)</label>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-[#080D16] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#FF5C70] mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-[#080D16] border border-[#223044] rounded-lg text-[#FF5C70] focus:outline-none focus:border-[#FF5C70] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#20D99A] mb-1">Take Profit ($)</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-[#080D16] border border-[#223044] rounded-lg text-[#20D99A] focus:outline-none focus:border-[#20D99A] font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#91A0B5]">Risk per trade</span>
                  <span className="text-[#18D5C0] font-mono font-bold">
                    {riskPercent}% (${sizing.riskDollars.toFixed(2)}) — max {adminRiskConfig.riskPerTrade}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max={adminRiskConfig.riskPerTrade}
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                  className="w-full accent-[#18D5C0] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#111A27] rounded-lg border border-[#223044] space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Quantity</span>
                  <span className="text-[#F4F7FB] font-bold">{sizing.qty} {symbol}</span>
                </div>
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Position value</span>
                  <span className="text-[#F4F7FB]">${sizing.value.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Risk / Reward</span>
                  <span className={rrOk ? 'text-[#20D99A] font-bold' : 'text-[#FF5C70] font-bold'}>
                    1:{sizing.rr.toFixed(2)} {rrOk ? '(passes 1:2.0 gate)' : '(below 1:2.0 gate)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={blockedByVeto}
                className="w-full py-2.5 text-xs font-bold rounded-lg bg-[#18D5C0] text-[#080D16] hover:bg-[#18D5C0]/90 disabled:opacity-40 transition-colors"
              >
                Review Order
              </button>
            </>
          ) : (
            <>
              <div className="p-4 bg-[#111A27] rounded-xl border border-[#223044] space-y-2 font-mono text-[11px]">
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Direction</span>
                  <span className={`font-bold ${direction === 'BUY' ? 'text-[#20D99A]' : 'text-[#FF5C70]'}`}>{direction} {symbol}</span>
                </div>
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Entry / SL / TP</span>
                  <span className="text-[#F4F7FB]">${entryPrice.toLocaleString()} / ${stopLoss.toLocaleString()} / ${takeProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Quantity / Value</span>
                  <span className="text-[#F4F7FB]">{sizing.qty} · ${sizing.value.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#91A0B5]">
                  <span>Max loss if stopped out</span>
                  <span className="text-[#FF5C70] font-bold">-${sizing.riskDollars.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#18D5C0]/5 border border-[#18D5C0]/25 text-[#91A0B5] text-[11px] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#18D5C0] shrink-0 mt-0.5" />
                <span>
                  Risk Manager approved: {riskPercent}% capital risk, RR 1:{sizing.rr.toFixed(2)}.
                  This is a simulated paper trade — no real money moves.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-lg bg-[#162232] text-[#91A0B5] hover:text-[#F4F7FB]"
                >
                  Back
                </button>
                <button
                  onClick={confirmTrade}
                  className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-[#20D99A] text-[#080D16] hover:bg-[#20D99A]/90"
                >
                  Confirm Paper Trade
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
