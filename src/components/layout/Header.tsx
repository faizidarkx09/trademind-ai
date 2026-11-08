import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import type { AdminRole, TabId } from '../../types/trading';
import { Bell, ChevronDown, Menu, Search, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  collapsed: boolean;
}

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  signals: 'AI Signals',
  live_markets: 'Live Markets',
  agents: 'AI Agents',
  strategies: 'Strategies',
  backtesting: 'Backtesting',
  paper_trading: 'Paper Trading',
  my_trades: 'My Trades',
  analytics: 'Analytics',
  admin: 'Admin',
  settings: 'Settings',
  pricing: 'Pricing',
};

const ROLES: AdminRole[] = ['Super Admin', 'Manager', 'Trader', 'Viewer'];

function sessionStatus(now: Date): Array<{ name: string; open: boolean }> {
  // Market sessions in UTC: NY 13:30–20:00, London 08:00–16:30, Tokyo 00:00–06:00.
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return [
    { name: 'New York', open: mins >= 810 && mins < 1200 },
    { name: 'London', open: mins >= 480 && mins < 990 },
    { name: 'Tokyo', open: mins < 360 },
  ];
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, collapsed }) => {
  const {
    activeTab,
    activeRole,
    setActiveRole,
    notifications,
    openNotificationDrawer,
    setActiveTab,
    setSignalSearch,
  } = useTrading();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const unread = notifications.filter((n) => !n.read).length;
  const sessions = sessionStatus(new Date());

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSignalSearch(query);
    setActiveTab('signals');
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-20 bg-[#080D16]/90 backdrop-blur border-b border-[#223044] transition-all duration-300 left-0 ${
        collapsed ? 'md:left-[72px]' : 'md:left-64'
      }`}
    >
      <div className="h-full px-4 sm:px-6 flex items-center gap-3">
        {/* Mobile menu */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs */}
        <div className="hidden sm:block min-w-0">
          <div className="text-[11px] text-[#64748B] font-mono">TradeMind AI</div>
          <div className="text-sm font-bold text-[#F4F7FB] truncate">
            {TAB_LABELS[activeTab] ?? 'Overview'}
          </div>
        </div>

        {/* Market sessions */}
        <div className="hidden lg:flex items-center gap-2 ml-4">
          {sessions.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#111A27] border border-[#223044] text-[10px] font-mono text-[#91A0B5]"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.open ? 'bg-[#20D99A]' : 'bg-[#64748B]'}`} />
              {s.name} {s.open ? 'Open' : 'Closed'}
            </span>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <form onSubmit={submitSearch} className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signals…  ( / )"
            className="pl-8 pr-3 py-2 text-xs bg-[#111A27] border border-[#223044] rounded-lg text-[#F4F7FB] placeholder-[#64748B] focus:outline-none focus:border-[#18D5C0] w-52 font-mono"
          />
        </form>

        {/* Paper trading badge */}
        <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18D5C0]/10 border border-[#18D5C0]/30 text-[10px] font-bold text-[#18D5C0] tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5" />
          PAPER TRADING MODE
        </span>

        {/* Notifications */}
        <button
          onClick={openNotificationDrawer}
          className="relative p-2 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF5C70] text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {/* Role selector */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-[#111A27] border border-[#223044] hover:border-[#18D5C0]/40 text-xs"
          >
            <span className="w-7 h-7 rounded-full bg-[#18D5C0]/15 border border-[#18D5C0]/30 flex items-center justify-center text-[#18D5C0] font-bold text-[11px]">
              {activeRole === 'Super Admin' ? 'SA' : activeRole.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block font-semibold text-[#F4F7FB]">{activeRole}</span>
              <span className="block text-[10px] text-[#64748B]">mrflexo</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>
          {roleMenuOpen && (
            <div className="absolute right-0 top-11 w-48 rounded-xl bg-[#111A27] border border-[#223044] shadow-2xl overflow-hidden z-50">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#64748B] border-b border-[#223044]">
                Switch acting role
              </div>
              {ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setActiveRole(role);
                    setRoleMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[#162232] ${
                    role === activeRole ? 'text-[#18D5C0] font-bold' : 'text-[#91A0B5]'
                  }`}
                >
                  {role}
                  {role === activeRole && <span className="float-right">✓</span>}
                </button>
              ))}
              <div className="px-3 py-2 text-[10px] text-[#64748B] border-t border-[#223044]">
                Viewer is read-only. Admin gates need Super Admin.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
