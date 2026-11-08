import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { InteractiveCandleChart } from '../components/charts/InteractiveCandleChart';
import { SignalCard } from '../components/signals/SignalCard';
import { Signal, AIAgent } from '../types/trading';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Lock,
  ChevronRight,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface OverviewViewProps {
  onInspectSignal: (sig: Signal) => void;
  onInspectAgent: (agent: AIAgent) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onInspectSignal,
  onInspectAgent,
}) => {
  const {
    virtualBalance,
    openPositions,
    closedTrades,
    assets,
    selectedAsset,
    setSelectedAsset,
    signals,
    agents,
    setActiveTab,
    openExecutionModal,
  } = useTrading();

  // Top metric computations
  const totalRealizedPnL = closedTrades.reduce((acc, t) => acc + t.realizedPnL, 0);
  const totalUnrealizedPnL = openPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
  const todayPnL = totalRealizedPnL + totalUnrealizedPnL;
  const todayPnLPercent = ((todayPnL / 100000) * 100).toFixed(2);

  const winningTrades = closedTrades.filter((t) => t.realizedPnL > 0).length;
  const winRate =
    closedTrades.length > 0
      ? ((winningTrades / closedTrades.length) * 100).toFixed(1)
      : '68.4';

  const activeSignalsCount = signals.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Paper Account Balance */}
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#91A0B5]">
            <span className="font-medium">Paper Account Balance</span>
            <div className="p-1.5 rounded-lg bg-[#0D1420] border border-[#223044] text-[#18D5C0]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#F4F7FB] tabular-nums">
              ${virtualBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs mt-1 text-[#20D99A] font-mono tabular-nums">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+$525.00 (+0.52%)</span>
              <span className="text-[#64748B]">All-Time</span>
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-[#223044]/60">
            <span>Starting Capital: $100,000.00</span>
            <span className="text-[#18D5C0]">Virtual</span>
          </div>
        </div>

        {/* Metric 2: Today's P&L */}
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#91A0B5]">
            <span className="font-medium">Today's Paper P&L</span>
            <div className="p-1.5 rounded-lg bg-[#0D1420] border border-[#223044] text-[#20D99A]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
                todayPnL >= 0 ? 'text-[#20D99A]' : 'text-[#FF5C70]'
              }`}
            >
              {todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1 text-[#91A0B5] font-mono tabular-nums">
              <span>{todayPnLPercent}% portfolio equity drift</span>
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-[#223044]/60">
            <span>Open Risk: 1.0%</span>
            <span className="text-[#20D99A]">Within Daily Stop (2.0%)</span>
          </div>
        </div>

        {/* Metric 3: Win Rate */}
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#91A0B5]">
            <span className="font-medium">Paper Win Rate</span>
            <div className="p-1.5 rounded-lg bg-[#0D1420] border border-[#223044] text-[#A78BFA]">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#F4F7FB] tabular-nums">
              {winRate}%
            </div>
            <div className="flex items-center gap-1 text-xs mt-1 text-[#91A0B5] font-mono tabular-nums">
              <span>{closedTrades.length} Completed Trades Logged</span>
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-[#223044]/60">
            <span>Profit Factor: 2.38</span>
            <span className="text-[#18D5C0]">Institutional</span>
          </div>
        </div>

        {/* Metric 4: Active AI Signals */}
        <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#91A0B5]">
            <span className="font-medium">Active AI Signals</span>
            <div className="p-1.5 rounded-lg bg-[#0D1420] border border-[#223044] text-[#F5B942]">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#F4F7FB] tabular-nums">
              {activeSignalsCount}
            </div>
            <div className="flex items-center gap-2 text-xs mt-1 text-[#91A0B5]">
              <span className="text-[#20D99A]">3 BUY</span>
              <span>·</span>
              <span className="text-[#FF5C70]">1 SELL</span>
              <span>·</span>
              <span className="text-[#91A0B5]">2 WAIT</span>
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-[#223044]/60">
            <span>News Veto: 1 Active</span>
            <span className="text-[#20D99A]">All Agents Online</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN DASHBOARD SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN AREA (2 COLUMNS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Market Performance Chart Container */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F4F7FB]">Market Performance Chart</h2>
                <p className="text-xs text-[#91A0B5]">
                  Live interactive candlestick charting with multi-agent indicator overlays.
                </p>
              </div>

              {/* Asset Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#111A27] rounded-xl border border-[#223044]">
                {assets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg font-mono transition-all ${
                      selectedAsset.symbol === asset.symbol
                        ? 'bg-[#18D5C0] text-[#080D16] shadow-sm'
                        : 'text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]'
                    }`}
                  >
                    {asset.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Candlestick Component */}
            <InteractiveCandleChart
              candles={selectedAsset.candles}
              symbol={selectedAsset.pair}
              height={380}
              dataSource={selectedAsset.dataSource ?? 'SIMULATED'}
              lastUpdated={selectedAsset.lastPriceUpdate}
            />
          </div>

          {/* B. Latest AI Signals Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F4F7FB]">Latest AI Signals</h3>
                <p className="text-xs text-[#91A0B5]">
                  Multi-agent consensus opportunities filtered by strict risk parameters.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('signals')}
                className="text-xs text-[#18D5C0] hover:underline flex items-center gap-1 font-medium"
              >
                <span>View All Signals</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grid of Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signals.slice(0, 4).map((sig) => (
                <SignalCard key={sig.id} signal={sig} onInspect={onInspectSignal} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT AREA (1 COLUMN) */}
        <div className="space-y-6">
          {/* C. AI Intelligence Summary Card */}
          <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#223044]">
              <h3 className="text-sm font-bold text-[#F4F7FB] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#A78BFA]" />
                AI Intelligence Summary
              </h3>
              <span className="text-[10px] font-mono text-[#20D99A] flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> SYNCHRONIZED
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[#91A0B5] mb-1">
                  <span>Overall Market Sentiment</span>
                  <span className="text-[#20D99A] font-semibold">Moderate Greed (68/100)</span>
                </div>
                <div className="w-full h-1.5 bg-[#080D16] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#18D5C0] to-[#20D99A] w-[68%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#91A0B5] mb-1">
                  <span>Bull vs Bear Consensus</span>
                  <span className="text-[#18D5C0] font-semibold font-mono">72% Long Bias</span>
                </div>
                <div className="w-full h-1.5 bg-[#080D16] rounded-full overflow-hidden flex">
                  <div className="h-full bg-[#20D99A] w-[72%]" />
                  <div className="h-full bg-[#FF5C70] w-[28%]" />
                </div>
                <div className="flex justify-between text-[10px] text-[#64748B] mt-1 font-mono">
                  <span>Bull: 72%</span>
                  <span>Bear: 28%</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0D1420] border border-[#223044] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-[#F4F7FB]">News Risk Guard</div>
                  <div className="text-[10px] text-[#64748B]">Active Veto on SOL/USDT</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF5C70]/15 text-[#FF5C70] font-bold">
                  1 VETO ACTIVE
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0D1420] border border-[#223044] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-[#F4F7FB]">Macro Regime</div>
                  <div className="text-[10px] text-[#64748B]">US 10Y: 4.38% · DXY: 104.2</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18D5C0]/15 text-[#18D5C0]">
                  FAVORABLE
                </span>
              </div>
            </div>
          </div>

          {/* D. AI Agent Status Strip (10 Specialized Agents) */}
          <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#223044]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#20D99A]"></span>
                <h3 className="text-sm font-bold text-[#F4F7FB]">Specialized Agents (10)</h3>
              </div>
              <button
                onClick={() => setActiveTab('agents')}
                className="text-xs text-[#18D5C0] hover:underline"
              >
                Control Center
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => onInspectAgent(agent)}
                  className="p-2.5 rounded-lg bg-[#0D1420] border border-[#223044] hover:border-[#18D5C0]/40 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#F4F7FB] flex items-center gap-1.5">
                      {agent.name}
                      {agent.isCodeLocked && <Lock className="w-3 h-3 text-[#18D5C0]" />}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
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
                  <p className="text-[11px] text-[#91A0B5] line-clamp-1">
                    {agent.currentConclusion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* E. Recent Paper Trades */}
          <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#223044]">
              <h3 className="text-sm font-bold text-[#F4F7FB]">Recent Paper Positions</h3>
              <button
                onClick={() => setActiveTab('paper_trading')}
                className="text-xs text-[#18D5C0] hover:underline"
              >
                Trade Desk
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {openPositions.length === 0 ? (
                <div className="py-4 text-center text-[#64748B]">No open positions.</div>
              ) : (
                openPositions.map((pos) => (
                  <div
                    key={pos.id}
                    className="p-2.5 rounded-lg bg-[#0D1420] border border-[#223044] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1 rounded ${
                            pos.direction === 'BUY'
                              ? 'bg-[#20D99A]/20 text-[#20D99A]'
                              : 'bg-[#FF5C70]/20 text-[#FF5C70]'
                          }`}
                        >
                          {pos.direction}
                        </span>
                        <span className="font-semibold text-[#F4F7FB]">{pos.symbol}</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        Entry: ${pos.entryPrice.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right tabular-nums">
                      <div
                        className={`font-semibold ${
                          pos.unrealizedPnL >= 0 ? 'text-[#20D99A]' : 'text-[#FF5C70]'
                        }`}
                      >
                        {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#91A0B5]">
                        +{pos.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
