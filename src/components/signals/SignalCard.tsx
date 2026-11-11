import React from 'react';
import type { Signal } from '../../types/trading';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Loader2,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  onInspect: (signal: Signal) => void;
}

const DECISION_STYLE: Record<Signal['type'], { badge: string; bar: string; label: string }> = {
  BUY: { badge: 'bg-[#20D99A] text-[#080D16]', bar: 'bg-[#20D99A]', label: 'BUY' },
  SELL: { badge: 'bg-[#FF5C70] text-[#080D16]', bar: 'bg-[#FF5C70]', label: 'SELL' },
  WAIT: { badge: 'bg-[#64748B] text-[#F4F7FB]', bar: 'bg-[#64748B]', label: 'WAIT' },
};

function formatVerdictTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal, onInspect }) => {
  const style = DECISION_STYLE[signal.type];
  const buyVotes = signal.agentVotes.filter((v) => v.vote === 'BUY').length;
  const sellVotes = signal.agentVotes.filter((v) => v.vote === 'SELL').length;
  const waitVotes = signal.agentVotes.filter((v) => v.vote === 'WAIT').length;

  return (
    <div
      onClick={() => onInspect(signal)}
      className="p-4 bg-[#111A27] border border-[#223044] rounded-xl hover:border-[#18D5C0]/40 transition-all cursor-pointer space-y-3"
    >
      {/* Header: pair + decision */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#F4F7FB] font-mono">{signal.pair}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D1420] border border-[#223044] text-[#91A0B5] font-mono uppercase">
              {signal.assetClass}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                signal.dataSource === 'LIVE'
                  ? 'bg-[#20D99A]/10 border-[#20D99A]/25 text-[#20D99A]'
                  : 'bg-[#0D1420] border-[#223044] text-[#64748B]'
              }`}
            >
              {signal.dataSource === 'LIVE' ? '● LIVE' : 'SIMULATED'}
            </span>
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            {signal.assetName} · {signal.timeframe} · {signal.timestamp}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-[#91A0B5] flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#F5B942]" /> AI Confidence
          </span>
          <span className="font-mono font-bold text-[#F4F7FB]">{signal.confidence}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#080D16] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${signal.confidence}%` }} />
        </div>
      </div>

      {/* Entry / SL / TP */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums text-[11px]">
        <div className="p-2 rounded-lg bg-[#0D1420] border border-[#223044]">
          <div className="text-[10px] text-[#64748B]">Entry</div>
          <div className="font-bold text-[#F4F7FB] mt-0.5">${signal.entryPrice.toLocaleString()}</div>
        </div>
        <div className="p-2 rounded-lg bg-[#0D1420] border border-[#223044]">
          <div className="text-[10px] text-[#64748B]">Stop Loss</div>
          <div className="font-bold text-[#FF5C70] mt-0.5">${signal.stopLoss.toLocaleString()}</div>
        </div>
        <div className="p-2 rounded-lg bg-[#0D1420] border border-[#223044]">
          <div className="text-[10px] text-[#64748B]">Take Profit</div>
          <div className="font-bold text-[#20D99A] mt-0.5">${signal.takeProfit.toLocaleString()}</div>
        </div>
      </div>

      {/* AI Analysis — display-only verdict from POST /api/analyze.
          Never overwrites the rule decision above; equities (no live
          analysis) simply show no section until a verdict exists. */}
      {signal.aiVerdict && (
        <div className="p-3 rounded-lg bg-[#080D16] border border-[#223044] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#F4F7FB]">
              <Sparkles className="w-3.5 h-3.5 text-[#18D5C0]" /> AI Analysis
            </span>
            {signal.aiVerdict.status === 'ready' && signal.aiVerdict.model ? (
              <span
                className="text-[10px] text-[#64748B] font-mono truncate max-w-[60%]"
                title={signal.aiVerdict.model}
              >
                {signal.aiVerdict.model}
              </span>
            ) : null}
          </div>

          {signal.aiVerdict.status === 'loading' ? (
            <div className="space-y-2">
              <div className="h-2 w-3/4 rounded bg-[#223044] animate-pulse" />
              <div className="h-2 w-1/2 rounded bg-[#223044] animate-pulse" />
              <p className="text-[10px] text-[#64748B] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching AI verdict…
              </p>
            </div>
          ) : signal.aiVerdict.status === 'unavailable' ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] text-[#F5B942] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> AI unavailable — rule-based
                decision
              </p>
              <p className="text-[11px] text-[#91A0B5]">
                Rule decision:{' '}
                <span className="font-bold text-[#F4F7FB]">{signal.type}</span>
                {' · '}
                {signal.confidence}% confidence
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${DECISION_STYLE[signal.aiVerdict.decision].badge}`}
                >
                  {DECISION_STYLE[signal.aiVerdict.decision].label}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#F4F7FB]">
                  {signal.aiVerdict.confidence}%
                </span>
                <span className="text-[10px] text-[#64748B] ml-auto font-mono">
                  {formatVerdictTime(signal.aiVerdict.analyzedAt)}
                </span>
              </div>
              {signal.aiVerdict.reasoning ? (
                <p className="text-[11px] leading-relaxed text-[#C6D2E0] line-clamp-3">
                  {signal.aiVerdict.reasoning}
                </p>
              ) : null}
              {signal.aiVerdict.keyFactors.length > 0 ? (
                <ul className="space-y-0.5">
                  {signal.aiVerdict.keyFactors.map((factor, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-[#91A0B5]">
                      <span className="text-[#18D5C0] shrink-0">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {signal.aiVerdict.riskNote ? (
                <p className="flex gap-1.5 text-[10px] leading-relaxed text-[#F5B942]/90">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
                  <span>{signal.aiVerdict.riskNote}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Footer: votes, R:R, expiry, news risk */}
      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#223044]/60">
        <span className="text-[#91A0B5] font-mono">
          <span className="text-[#20D99A] font-bold">{buyVotes} BUY</span>
          {' · '}
          <span className="text-[#FF5C70] font-bold">{sellVotes} SELL</span>
          {' · '}
          <span className="text-[#91A0B5]">{waitVotes} WAIT</span>
        </span>
        <span className="text-[#18D5C0] font-mono font-bold">R:R 1:{signal.riskReward.toFixed(1)}</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[#64748B]">
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3" /> Expires in {signal.expiresIn}
        </span>
        {signal.newsRisk === 'HIGH' ? (
          <span className="flex items-center gap-1 text-[#FF5C70] font-bold">
            <ShieldAlert className="w-3 h-3" /> VETO ACTIVE
          </span>
        ) : (
          <span>
            News risk: <span className={signal.newsRisk === 'MEDIUM' ? 'text-[#F5B942]' : 'text-[#20D99A]'}>{signal.newsRisk}</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 text-xs text-[#18D5C0] font-medium">
        {signal.type === 'BUY' ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : signal.type === 'SELL' ? (
          <ArrowDownRight className="w-3.5 h-3.5" />
        ) : null}
        <span>Inspect signal</span>
      </div>
    </div>
  );
};
