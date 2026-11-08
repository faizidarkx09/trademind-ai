import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import type { Asset, Signal } from '../../types/trading';
import { InteractiveCandleChart } from '../charts/InteractiveCandleChart';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SignalDetailModalProps {
  signal: Signal;
  asset: Asset;
  onClose: () => void;
}

export const SignalDetailModal: React.FC<SignalDetailModalProps> = ({ signal, asset, onClose }) => {
  const { openExecutionModal, showToast } = useTrading();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const buyVotes = signal.agentVotes.filter((v) => v.vote === 'BUY').length;
  const sellVotes = signal.agentVotes.filter((v) => v.vote === 'SELL').length;
  const waitVotes = signal.agentVotes.filter((v) => v.vote === 'WAIT').length;
  const isVeto = signal.newsRisk === 'HIGH';
  const isWait = signal.type === 'WAIT';

  const handleExecute = () => {
    if (isVeto || isWait) {
      showToast(
        isVeto
          ? 'News VETO active — paper execution is blocked for this asset.'
          : 'This is a WAIT signal — there is no trade to execute.',
        'error',
      );
      return;
    }
    onClose();
    openExecutionModal(signal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#0D1420] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 bg-[#111A27] border-b border-[#223044]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#F4F7FB] font-mono">{signal.pair}</h3>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                  signal.type === 'BUY'
                    ? 'bg-[#20D99A] text-[#080D16]'
                    : signal.type === 'SELL'
                    ? 'bg-[#FF5C70] text-[#080D16]'
                    : 'bg-[#64748B] text-[#F4F7FB]'
                }`}
              >
                {signal.type}
              </span>
              <span className="text-[11px] text-[#91A0B5] font-mono">
                Confidence {signal.confidence}%
              </span>
            </div>
            <p className="text-xs text-[#91A0B5] mt-1">
              {signal.assetName} · {signal.timeframe} · Issued {signal.timestamp} · Expires in {signal.expiresIn}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
            aria-label="Close signal detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Chart with SL/TP bands */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                Chart — Entry / SL / TP Zones
              </span>
              <span
                className={`text-[10px] font-mono ${
                  signal.dataSource === 'LIVE' ? 'text-[#20D99A]' : 'text-[#64748B]'
                }`}
              >
                {signal.dataSource === 'LIVE' ? '● LIVE · BINANCE FEED' : 'SIMULATED DATA'}
              </span>
            </div>
            <InteractiveCandleChart
              candles={asset.candles}
              symbol={asset.pair}
              height={260}
              entryPrice={signal.entryPrice}
              stopLoss={signal.stopLoss}
              takeProfit={signal.takeProfit}
              dataSource={signal.dataSource ?? asset.dataSource ?? 'SIMULATED'}
              lastUpdated={asset.lastPriceUpdate}
            />
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-mono">
              <span className="text-[#18D5C0]">— Entry ${signal.entryPrice.toLocaleString()}</span>
              <span className="text-[#FF5C70]">— Stop Loss ${signal.stopLoss.toLocaleString()}</span>
              <span className="text-[#20D99A]">— Take Profit ${signal.takeProfit.toLocaleString()}</span>
              <span className="text-[#91A0B5]">R:R 1:{signal.riskReward.toFixed(1)}</span>
            </div>
          </div>

          {/* Reasoning + Bull/Bear */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#111A27] border border-[#223044]">
              <div className="text-[10px] uppercase font-mono text-[#64748B] mb-1">Why this signal</div>
              <p className="text-[#F4F7FB] leading-relaxed">{signal.reasoning}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111A27] border border-[#20D99A]/30">
              <div className="text-[10px] uppercase font-mono text-[#20D99A] mb-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Bull case
              </div>
              <p className="text-[#91A0B5] leading-relaxed">{signal.bullCase}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111A27] border border-[#FF5C70]/30">
              <div className="text-[10px] uppercase font-mono text-[#FF5C70] mb-1 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" /> Bear case
              </div>
              <p className="text-[#91A0B5] leading-relaxed">{signal.bearCase}</p>
            </div>
          </div>

          {/* News risk */}
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
              isVeto
                ? 'bg-[#FF5C70]/5 border-[#FF5C70]/40'
                : 'bg-[#111A27] border-[#223044]'
            }`}
          >
            {isVeto ? (
              <ShieldAlert className="w-4 h-4 text-[#FF5C70] shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#20D99A] shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold text-[#F4F7FB]">
                News risk: {signal.newsRisk}
                {isVeto && ' — VETO ACTIVE'}
              </span>
              <p className="text-[#91A0B5] mt-0.5 leading-relaxed">{signal.newsRiskNote}</p>
            </div>
          </div>

          {/* Agent votes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                10-Agent Breakdown
              </span>
              <span className="text-[11px] font-mono text-[#91A0B5]">
                <span className="text-[#20D99A] font-bold">{buyVotes} BUY</span>
                {' · '}
                <span className="text-[#FF5C70] font-bold">{sellVotes} SELL</span>
                {' · '}
                <span>{waitVotes} WAIT</span>
              </span>
            </div>
            <div className="space-y-2">
              {signal.agentVotes.map((vote) => (
                <div
                  key={vote.agentId}
                  className="rounded-xl bg-[#111A27] border border-[#223044] overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedAgent(expandedAgent === vote.agentId ? null : vote.agentId)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs text-left"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        vote.vote === 'BUY'
                          ? 'bg-[#20D99A]/15 text-[#20D99A]'
                          : vote.vote === 'SELL'
                          ? 'bg-[#FF5C70]/15 text-[#FF5C70]'
                          : 'bg-[#64748B]/15 text-[#91A0B5]'
                      }`}
                    >
                      {vote.vote}
                    </span>
                    <span className="font-semibold text-[#F4F7FB] flex-1">{vote.agentName}</span>
                    <span className="text-[#91A0B5] font-mono">{vote.confidence}%</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${
                        expandedAgent === vote.agentId ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedAgent === vote.agentId && (
                    <div className="px-3.5 pb-3 text-[11px] text-[#91A0B5] leading-relaxed border-t border-[#223044]/60 pt-2">
                      {vote.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk manager stamp + action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="flex-1 flex items-center gap-2 text-[11px] text-[#91A0B5]">
              <Lock className="w-4 h-4 text-[#18D5C0] shrink-0" />
              <span>
                Risk Manager (code-locked): max 0.5% risk/trade, RR ≥ 1:2.0. Signals are research —
                not guaranteed profit.
              </span>
            </div>
            <button
              onClick={handleExecute}
              disabled={isVeto || isWait}
              className="px-5 py-2.5 text-xs font-bold rounded-lg bg-[#18D5C0] text-[#080D16] hover:bg-[#18D5C0]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isVeto || isWait ? 'Execution Blocked' : 'Execute Paper Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
