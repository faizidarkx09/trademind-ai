import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { AIAgent } from '../types/trading';
import {
  Cpu,
  Lock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  LineChart,
  Eye,
  Newspaper,
  HeartHandshake,
  Globe2,
  Database,
  ArrowRight,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';

interface AgentsViewProps {
  onSelectAgent?: (agent: AIAgent) => void;
}

export const AgentsView: React.FC<AgentsViewProps> = () => {
  const { agents } = useTrading();
  const [inspectingAgent, setInspectingAgent] = useState<AIAgent | null>(null);

  // Live counts — computed from agent state, never hard-coded.
  const onlineCount = agents.filter((a) => a.status === 'ONLINE' || a.status === 'LOCKED').length;
  const newsAgent = agents.find((a) => a.id === 'news');

  // Agent Icon mapping
  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'technical':
        return <LineChart className="w-5 h-5 text-[#18D5C0]" />;
      case 'chart_vision':
        return <Eye className="w-5 h-5 text-[#18D5C0]" />;
      case 'news':
        return <Newspaper className="w-5 h-5 text-[#F5B942]" />;
      case 'sentiment':
        return <HeartHandshake className="w-5 h-5 text-[#A78BFA]" />;
      case 'macro':
        return <Globe2 className="w-5 h-5 text-[#91A0B5]" />;
      case 'bull':
        return <TrendingUp className="w-5 h-5 text-[#20D99A]" />;
      case 'bear':
        return <TrendingDown className="w-5 h-5 text-[#FF5C70]" />;
      case 'trader':
        return <Cpu className="w-5 h-5 text-[#18D5C0]" />;
      case 'risk_manager':
        return <Lock className="w-5 h-5 text-[#18D5C0]" />;
      case 'memory':
        return <Database className="w-5 h-5 text-[#A78BFA]" />;
      default:
        return <Cpu className="w-5 h-5 text-[#91A0B5]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">AI Intelligence Center</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Monitor how 10 specialized autonomous agents evaluate market conditions in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044]">
            <span className="w-2 h-2 rounded-full bg-[#20D99A]"></span>
            <span className="text-[#F4F7FB]">{onlineCount}/10 Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044]">
            <Lock className="w-3.5 h-3.5 text-[#18D5C0]" />
            <span className="text-[#18D5C0]">1 Protected Lock</span>
          </div>
        </div>
      </div>

      {/* Special Highlights: Bull vs Bear Debate & News VETO Guard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* News Agent VETO Highlight — driven by the live news agent state */}
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#FF5C70]/10 border border-[#FF5C70]/30 text-[#FF5C70] shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F4F7FB]">News Agent Active VETO Protocol</span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  newsAgent?.isVetoActive
                    ? 'bg-[#FF5C70] text-[#080D16]'
                    : 'bg-[#20D99A]/15 text-[#20D99A]'
                }`}
              >
                {newsAgent?.isVetoActive ? 'VETO TRIGGERED' : 'NO VETO'}
              </span>
            </div>
            <p className="text-[#91A0B5] mt-1 leading-relaxed">
              {newsAgent?.currentConclusion ??
                'News feed pending — no headlines scanned yet.'}
            </p>
          </div>
        </div>

        {/* Code-Locked Risk Manager Invariant */}
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#18D5C0]/10 border border-[#18D5C0]/30 text-[#18D5C0] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F4F7FB]">Protected Risk Manager Invariant</span>
              <span className="px-2 py-0.5 rounded bg-[#18D5C0]/20 text-[#18D5C0] font-mono text-[10px]">
                CODE-LOCKED
              </span>
            </div>
            <p className="text-[#91A0B5] mt-1 leading-relaxed">
              The Risk Manager is an immutable software safety layer. It strictly prevents trades
              exceeding 0.5% capital risk, rejects reward-to-risk setups below 1:2.0, and enforces
              daily loss circuit breakers. Configuration controls cannot be bypassed by prompts.
            </p>
          </div>
        </div>
      </div>

      {/* 10 Specialized Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const isVeto = agent.id === 'news' && agent.isVetoActive;
          const isLocked = agent.isCodeLocked;

          return (
            <div
              key={agent.id}
              className={`flex flex-col justify-between p-4 bg-[#111A27] border rounded-xl transition-all duration-200 hover:border-[#18D5C0]/40 ${
                isVeto
                  ? 'border-[#FF5C70]/40 bg-[#FF5C70]/5'
                  : isLocked
                  ? 'border-[#18D5C0]/40 bg-[#18D5C0]/5'
                  : 'border-[#223044]'
              }`}
            >
              <div>
                {/* Agent Card Top Bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#0D1420] border border-[#223044]">
                      {getAgentIcon(agent.id)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#F4F7FB] flex items-center gap-1.5">
                        {agent.name}
                        {isLocked && <Lock className="w-3.5 h-3.5 text-[#18D5C0]" />}
                      </h3>
                      <div className="text-[11px] text-[#64748B]">{agent.role}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      agent.status === 'ONLINE'
                        ? 'bg-[#20D99A]/15 text-[#20D99A]'
                        : agent.status === 'LOCKED'
                        ? 'bg-[#18D5C0]/15 text-[#18D5C0]'
                        : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                {/* Short Description */}
                <p className="text-xs text-[#91A0B5] line-clamp-2 leading-relaxed mb-3">
                  {agent.shortDesc}
                </p>

                {/* Current Conclusion Box */}
                <div className="p-2.5 rounded-lg bg-[#0D1420] border border-[#223044]/80 text-xs mb-3">
                  <div className="text-[10px] uppercase font-mono text-[#64748B] mb-1">
                    Current Thesis
                  </div>
                  <div className="text-[#F4F7FB] font-medium leading-normal line-clamp-2">
                    {agent.currentConclusion}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-3 border-t border-[#223044] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{agent.lastAnalysisTime}</span>
                </div>

                <button
                  onClick={() => setInspectingAgent(agent)}
                  className="text-xs text-[#18D5C0] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Detail Modal / Drawer */}
      {inspectingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#0D1420] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#111A27] border-b border-[#223044]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#080D16] border border-[#223044]">
                  {getAgentIcon(inspectingAgent.id)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F4F7FB] flex items-center gap-1.5">
                    {inspectingAgent.name}
                    {inspectingAgent.isCodeLocked && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18D5C0]/20 text-[#18D5C0]">
                        CODE-LOCKED
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-[#91A0B5]">{inspectingAgent.role}</div>
                </div>
              </div>

              <button
                onClick={() => setInspectingAgent(null)}
                className="p-1.5 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              <div>
                <h4 className="text-xs uppercase font-mono text-[#64748B] mb-1">Role Description</h4>
                <p className="text-[#F4F7FB] leading-relaxed">{inspectingAgent.shortDesc}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase font-mono text-[#64748B] mb-1">Current Conclusion</h4>
                <p className="text-[#18D5C0] font-semibold leading-relaxed bg-[#111A27] p-3 rounded-lg border border-[#223044]">
                  {inspectingAgent.currentConclusion}
                </p>
              </div>

              <div>
                <h4 className="text-xs uppercase font-mono text-[#64748B] mb-2">Inputs Considered</h4>
                <div className="flex flex-wrap gap-2">
                  {inspectingAgent.inputsConsidered.map((inp, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-[#111A27] border border-[#223044] text-[#91A0B5] font-mono text-[11px]"
                    >
                      {inp}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase font-mono text-[#64748B] mb-2">Key Findings</h4>
                <ul className="space-y-1.5">
                  {inspectingAgent.findings.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[#91A0B5]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#20D99A] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-[#223044] flex items-center justify-between text-[#64748B] font-mono text-[11px]">
                <span>Decision Weight: {inspectingAgent.decisionContribution}</span>
                <span>Last Updated: {inspectingAgent.lastAnalysisTime}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
