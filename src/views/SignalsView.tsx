import React from 'react';
import { useTrading } from '../context/TradingContext';
import { SignalCard } from '../components/signals/SignalCard';
import { Signal, SignalDecision } from '../types/trading';
import { Search, Filter, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SignalsViewProps {
  onInspectSignal: (sig: Signal) => void;
}

export const SignalsView: React.FC<SignalsViewProps> = ({ onInspectSignal }) => {
  const {
    signals,
    signalFilter,
    setSignalFilter,
    signalSearch,
    setSignalSearch,
    assetClassFilter,
    setAssetClassFilter,
  } = useTrading();

  // Filter signals
  const filteredSignals = signals.filter((sig) => {
    // Type filter
    if (signalFilter !== 'ALL' && sig.type !== signalFilter) {
      return false;
    }
    // Asset class filter
    if (assetClassFilter !== 'ALL' && sig.assetClass !== assetClassFilter) {
      return false;
    }
    // Search
    if (signalSearch.trim()) {
      const q = signalSearch.toLowerCase();
      return (
        sig.assetSymbol.toLowerCase().includes(q) ||
        sig.assetName.toLowerCase().includes(q) ||
        sig.pair.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">AI Trading Signals</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Multi-agent market analysis and risk-filtered opportunities across Crypto & US Equities.
          </p>
        </div>

        {/* Regulatory & Safety Notice */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044] text-xs text-[#91A0B5]">
          <ShieldCheck className="w-4 h-4 text-[#18D5C0] shrink-0" />
          <span>Paper execution only · Signals are not guaranteed profit</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111A27] border border-[#223044] rounded-xl">
        {/* Signal Type Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#080D16] rounded-lg border border-[#223044]">
          {(['ALL', 'BUY', 'SELL', 'WAIT'] as const).map((filter) => {
            const isActive = signalFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setSignalFilter(filter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  isActive
                    ? filter === 'BUY'
                      ? 'bg-[#20D99A] text-[#080D16]'
                      : filter === 'SELL'
                      ? 'bg-[#FF5C70] text-[#080D16]'
                      : filter === 'WAIT'
                      ? 'bg-[#64748B] text-[#F4F7FB]'
                      : 'bg-[#18D5C0] text-[#080D16]'
                    : 'text-[#91A0B5] hover:text-[#F4F7FB]'
                }`}
              >
                {filter === 'ALL' ? 'All Signals' : filter}
              </button>
            );
          })}
        </div>

        {/* Right: Asset Class & Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Asset Class Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#080D16] rounded-lg border border-[#223044] text-xs">
            {(['ALL', 'crypto', 'equity'] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => setAssetClassFilter(cls)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  assetClassFilter === cls
                    ? 'bg-[#162232] text-[#18D5C0] font-semibold'
                    : 'text-[#64748B] hover:text-[#91A0B5]'
                }`}
              >
                {cls === 'ALL' ? 'All Assets' : cls}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search ticker (BTC, NVDA)..."
              value={signalSearch}
              onChange={(e) => setSignalSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#080D16] border border-[#223044] rounded-lg text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#18D5C0] w-48 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Signals Grid */}
      {filteredSignals.length === 0 ? (
        <div className="p-12 text-center bg-[#111A27] border border-[#223044] rounded-xl space-y-2">
          <p className="text-sm font-semibold text-[#F4F7FB]">No signals match the current criteria.</p>
          <p className="text-xs text-[#64748B]">Try clearing your search or selecting "All Signals".</p>
          <button
            onClick={() => {
              setSignalFilter('ALL');
              setAssetClassFilter('ALL');
              setSignalSearch('');
            }}
            className="mt-2 px-3 py-1.5 text-xs text-[#18D5C0] border border-[#18D5C0]/40 rounded-lg hover:bg-[#18D5C0]/10 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((sig) => (
            <SignalCard key={sig.id} signal={sig} onInspect={onInspectSignal} />
          ))}
        </div>
      )}
    </div>
  );
};
