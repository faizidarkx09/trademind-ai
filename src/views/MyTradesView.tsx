import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';

export const MyTradesView: React.FC = () => {
  const { closedTrades, showToast } = useTrading();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = closedTrades.filter((t) => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.symbol.toLowerCase().includes(q) || t.assetName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleExportCSV = () => {
    const csvHeader = 'Trade ID,Symbol,Side,Entry,Exit,Quantity,Invested USD,Realized PnL,PnL %,Exit Reason,Close Date\n';
    const csvRows = closedTrades
      .map(
        (t) =>
          `"${t.id}","${t.symbol}","${t.direction}",${t.entryPrice},${t.exitPrice},${t.quantity},${t.investedUSD},${t.realizedPnL},${t.pnlPercent}%,"${t.exitReason}","${t.closeTime}"`
      )
      .join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trademind-paper-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Trade ledger exported to CSV file.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB]">My Trades Ledger</h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Audit-ready historical record of all executed virtual paper trading positions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111A27] hover:bg-[#162232] border border-[#223044] text-xs font-semibold text-[#F4F7FB] transition-colors"
        >
          <Download className="w-4 h-4 text-[#18D5C0]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111A27] border border-[#223044] rounded-xl">
        <div className="flex items-center gap-1 p-1 bg-[#080D16] rounded-lg border border-[#223044]">
          {(['ALL', 'PROFIT', 'LOSS'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filterStatus === st
                  ? st === 'PROFIT'
                    ? 'bg-[#20D99A] text-[#080D16]'
                    : st === 'LOSS'
                    ? 'bg-[#FF5C70] text-[#080D16]'
                    : 'bg-[#18D5C0] text-[#080D16]'
                  : 'text-[#91A0B5] hover:text-[#F4F7FB]'
              }`}
            >
              {st === 'ALL' ? 'All Executions' : st === 'PROFIT' ? 'Profits Only' : 'Losses Only'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search trade (BTC, SOL)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-[#080D16] border border-[#223044] rounded-lg text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#18D5C0] w-48 font-mono"
          />
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-[#0D1420] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Entry Price</th>
                <th className="px-4 py-3">Exit Price</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Invested</th>
                <th className="px-4 py-3">Realized P&L</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Close Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#223044]/60">
              {filtered.map((trd) => {
                const isProfit = trd.realizedPnL >= 0;
                return (
                  <tr key={trd.id} className="hover:bg-[#162232]/50">
                    <td className="px-4 py-3 font-sans">
                      <div className="font-bold text-[#F4F7FB]">{trd.symbol}</div>
                      <div className="text-[10px] text-[#64748B]">{trd.assetName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          trd.direction === 'BUY'
                            ? 'bg-[#20D99A]/15 text-[#20D99A]'
                            : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                        }`}
                      >
                        {trd.direction === 'BUY' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {trd.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3">${trd.entryPrice.toLocaleString()}</td>
                    <td className="px-4 py-3">${trd.exitPrice.toLocaleString()}</td>
                    <td className="px-4 py-3">{trd.quantity}</td>
                    <td className="px-4 py-3 text-[#91A0B5]">
                      ${trd.investedUSD.toLocaleString()}
                    </td>
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
  );
};
