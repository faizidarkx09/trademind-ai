import React from 'react';
import { useTrading } from '../../context/TradingContext';
import type { TabId } from '../../types/trading';
import {
  LayoutDashboard,
  Signal,
  Activity,
  Bot,
  Layers,
  FlaskConical,
  Wallet,
  History,
  BarChart3,
  Shield,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  BrainCircuit,
  Crown,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'signals', label: 'AI Signals', icon: <Signal className="w-4 h-4" /> },
  { id: 'live_markets', label: 'Live Markets', icon: <Activity className="w-4 h-4" /> },
  { id: 'agents', label: 'AI Agents', icon: <Bot className="w-4 h-4" /> },
  { id: 'strategies', label: 'Strategies', icon: <Layers className="w-4 h-4" /> },
  { id: 'backtesting', label: 'Backtesting', icon: <FlaskConical className="w-4 h-4" /> },
  { id: 'paper_trading', label: 'Paper Trading', icon: <Wallet className="w-4 h-4" /> },
  { id: 'my_trades', label: 'My Trades', icon: <History className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { activeTab, setActiveTab, virtualBalance, activeRole, openPricingModal } = useTrading();

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-[#0D1420] border-r border-[#223044] transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-20 border-b border-[#223044] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#18D5C0]/15 border border-[#18D5C0]/30 flex items-center justify-center text-[#18D5C0] shrink-0">
          <BrainCircuit className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-wide text-[#F4F7FB] leading-none">
              TRADEMIND <span className="text-[#18D5C0]">AI</span>
            </div>
            <div className="text-[10px] tracking-[0.18em] text-[#64748B] mt-1">INTELLIGENT TRADING</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#18D5C0]/10 text-[#18D5C0] border border-[#18D5C0]/20'
                  : 'text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232] border border-transparent'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#18D5C0] shrink-0" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => setActiveTab('settings')}
          title="Settings"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-[#18D5C0]/10 text-[#18D5C0] border border-[#18D5C0]/20'
              : 'text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232] border border-transparent'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </button>
      </nav>

      {/* Account status */}
      <div className="p-3 border-t border-[#223044] space-y-3 shrink-0">
        {!collapsed && (
          <button
            onClick={openPricingModal}
            className="w-full p-3 rounded-xl bg-[#111A27] border border-[#223044] hover:border-[#18D5C0]/40 text-left transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#F4F7FB]">
              <Crown className="w-3.5 h-3.5 text-[#F5B942]" />
              Business Plan
            </div>
            <div className="text-[11px] text-[#91A0B5] mt-1 font-mono tabular-nums">
              Balance: ${virtualBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">
              {activeRole} · Paper trading only
            </div>
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};
