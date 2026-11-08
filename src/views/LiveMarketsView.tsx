import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { ArrowUpRight, ArrowDownRight, Search, Activity, Radio, BarChart3 } from 'lucide-react';
import { Asset } from '../types/trading';

export const LiveMarketsView: React.FC = () => {
  const { assets, setSelectedAsset, setActiveTab, openExecutionModal } = useTrading();
  const [filterType, setFilterType] = useState<'ALL' | 'crypto' | 'equity'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = assets.filter((a) => {
    if (filterType !== 'ALL' && a.assetClass !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">Live Market Screener</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Real-time multi-asset liquidity scanner across Digital Assets and US Equities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {assets.some((a) => a.dataSource === 'LIVE') ? (
            <span className="flex items-center gap-2 text-[#20D99A] px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>● LIVE — BINANCE CRYPTO (BTC · ETH · SOL)</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[#91A0B5] px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>SIMULATED STREAM · REALTIME TICKS</span>
            </span>
          )}
          <span className="text-[#64748B] px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044]">
            EQUITIES SIMULATED
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111A27] border border-[#223044] rounded-xl">
        <div className="flex items-center gap-1 p-1 bg-[#080D16] rounded-lg border border-[#223044]">
          {(['ALL', 'crypto', 'equity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                filterType === t
                  ? 'bg-[#18D5C0] text-[#080D16]'
                  : 'text-[#91A0B5] hover:text-[#F4F7FB]'
              }`}
            >
              {t === 'ALL' ? 'All Assets' : t === 'crypto' ? 'Crypto Majors' : 'US Equities'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-[#080D16] border border-[#223044] rounded-lg text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#18D5C0] w-48 font-mono"
          />
        </div>
      </div>

      {/* Market Assets Table */}
      <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1420] text-[#64748B] uppercase font-mono text-[10px] border-b border-[#223044]">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Feed</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">24h Change</th>
                <th className="px-4 py-3">24h High / Low</th>
                <th className="px-4 py-3">24h Volume</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#223044]/60 font-mono tabular-nums">
              {filtered.map((asset) => {
                const isPositive = asset.change24h >= 0;
                return (
                  <tr
                    key={asset.symbol}
                    className="hover:bg-[#162232]/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setActiveTab('overview');
                    }}
                  >
                    <td className="px-4 py-3.5 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#080D16] border border-[#223044] flex items-center justify-center font-bold font-mono text-xs text-[#18D5C0]">
                          {asset.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-[#F4F7FB]">{asset.symbol}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">{asset.pair}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          asset.dataSource === 'LIVE'
                            ? 'bg-[#20D99A]/10 border-[#20D99A]/25 text-[#20D99A]'
                            : 'bg-[#0D1420] border-[#223044] text-[#64748B]'
                        }`}
                      >
                        {asset.dataSource === 'LIVE' ? '● LIVE' : 'SIMULATED'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-[#F4F7FB]">
                      ${asset.currentPrice.toLocaleString('en-US', {
                        minimumFractionDigits: asset.currentPrice > 100 ? 2 : 4,
                      })}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isPositive
                            ? 'bg-[#20D99A]/15 text-[#20D99A]'
                            : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? '+' : ''}
                        {asset.change24h.toFixed(2)}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[#91A0B5]">
                      ${asset.high24h.toLocaleString()} / ${asset.low24h.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-[#91A0B5]">{asset.volume24h}</td>

                    <td className="px-4 py-3.5 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setActiveTab('overview');
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-[#91A0B5] hover:text-[#F4F7FB] bg-[#080D16] hover:bg-[#162232] rounded border border-[#223044] transition-colors"
                        >
                          Chart
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            openExecutionModal();
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded transition-colors"
                        >
                          Trade
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
