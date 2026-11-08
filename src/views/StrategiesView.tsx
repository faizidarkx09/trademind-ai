import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Strategy, StrategyCategory } from '../types/trading';
import {
  Layers,
  Star,
  Search,
  Filter,
  FlaskConical,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Info,
  X,
} from 'lucide-react';

export const StrategiesView: React.FC = () => {
  const { strategies, toggleFavoriteStrategy, setActiveTab } = useTrading();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | StrategyCategory>('ALL');
  const [search, setSearch] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [inspectingStrategy, setInspectingStrategy] = useState<Strategy | null>(null);

  const categories: StrategyCategory[] = [
    'Trend Following',
    'Momentum',
    'Breakout',
    'Mean Reversion',
    'Volatility',
    'Machine Learning',
  ];

  const filtered = strategies.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (showOnlyFavorites && !s.isFavorite) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const favoriteCount = strategies.filter((s) => s.isFavorite).length;

  return (
    <div className="space-y-6">
      {/* Title & Stats Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">Algorithmic Strategy Library</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            30 named quantitative strategies in the library — more being added.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044] text-[#F4F7FB]">
            <span>Total: </span>
            <strong className="text-[#18D5C0]">30</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044] text-[#F4F7FB]">
            <span>Favorites: </span>
            <strong className="text-[#F5B942]">{favoriteCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111A27] border border-[#223044] rounded-xl">
        {/* Categories Tab */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#080D16] rounded-lg border border-[#223044] max-w-full">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-[#18D5C0] text-[#080D16]'
                : 'text-[#91A0B5] hover:text-[#F4F7FB]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#18D5C0] text-[#080D16]'
                  : 'text-[#91A0B5] hover:text-[#F4F7FB]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Favorites Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showOnlyFavorites
                ? 'bg-[#F5B942]/15 border-[#F5B942]/40 text-[#F5B942]'
                : 'bg-[#080D16] border-[#223044] text-[#91A0B5] hover:text-[#F4F7FB]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-[#F5B942]' : ''}`} />
            <span>Favorites</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search strategy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#080D16] border border-[#223044] rounded-lg text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#18D5C0] w-48 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((strat) => (
          <div
            key={strat.id}
            className="flex flex-col justify-between p-4 bg-[#111A27] border border-[#223044] rounded-xl hover:border-[#18D5C0]/40 transition-all duration-200"
          >
            <div>
              {/* Header: Name, Favorite, Category */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#18D5C0] px-1.5 py-0.5 rounded bg-[#18D5C0]/10 border border-[#18D5C0]/20">
                    {strat.category}
                  </span>
                  <h3 className="font-bold text-sm text-[#F4F7FB] mt-1.5">{strat.name}</h3>
                </div>

                <button
                  onClick={() => toggleFavoriteStrategy(strat.id)}
                  className="p-1 rounded text-[#64748B] hover:text-[#F5B942] transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${
                      strat.isFavorite ? 'fill-[#F5B942] text-[#F5B942]' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-[#91A0B5] line-clamp-2 leading-relaxed mb-3">
                {strat.description}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#0D1420] rounded-lg border border-[#223044]/60 mb-3 text-xs font-mono tabular-nums">
                <div>
                  <div className="text-[10px] text-[#64748B]">Win Rate</div>
                  <div className="font-semibold text-[#20D99A] mt-0.5">
                    {strat.historicalWinRate}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#64748B]">Profit Factor</div>
                  <div className="font-semibold text-[#F4F7FB] mt-0.5">
                    {strat.profitFactor}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#64748B]">Max DD</div>
                  <div className="font-semibold text-[#FF5C70] mt-0.5">
                    {strat.maxDrawdown}%
                  </div>
                </div>
              </div>

              {/* Compatibility tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className="text-[10px] text-[#64748B]">Assets:</span>
                {strat.assetCompatibility.slice(0, 3).map((a) => (
                  <span
                    key={a}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#080D16] border border-[#223044] text-[#91A0B5]"
                  >
                    {a}
                  </span>
                ))}
                {strat.assetCompatibility.length > 3 && (
                  <span className="text-[10px] text-[#64748B] font-mono">
                    +{strat.assetCompatibility.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#223044] flex items-center gap-2">
              <button
                onClick={() => setInspectingStrategy(strat)}
                className="flex-1 py-1.5 px-3 text-xs font-medium text-[#91A0B5] hover:text-[#F4F7FB] bg-[#162232] hover:bg-[#223044] rounded-lg border border-[#223044] transition-colors"
              >
                Inspect
              </button>
              <button
                onClick={() => setActiveTab('backtesting')}
                className="flex-1 py-1.5 px-3 text-xs font-semibold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Backtest
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Strategy Parameters Modal */}
      {inspectingStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#0D1420] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#111A27] border-b border-[#223044]">
              <div>
                <span className="text-[10px] uppercase font-mono text-[#18D5C0]">
                  {inspectingStrategy.category}
                </span>
                <h3 className="text-base font-bold text-[#F4F7FB] mt-0.5">
                  {inspectingStrategy.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectingStrategy(null)}
                className="p-1.5 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#91A0B5] leading-relaxed">{inspectingStrategy.description}</p>

              <div>
                <h4 className="text-[11px] uppercase font-mono text-[#64748B] mb-2">
                  Configured Parameters & Optimization Range
                </h4>
                <div className="space-y-2">
                  {inspectingStrategy.parameters.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#111A27] border border-[#223044] font-mono"
                    >
                      <span className="text-[#91A0B5]">{p.name}</span>
                      <span className="text-[#18D5C0] font-bold">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#223044] flex items-center justify-between">
                <span className="text-[#64748B] font-mono text-[11px]">
                  Sample Historical Win Rate: {inspectingStrategy.historicalWinRate}%
                </span>
                <button
                  onClick={() => {
                    setInspectingStrategy(null);
                    setActiveTab('backtesting');
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded-lg"
                >
                  Load in Backtesting Engine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
