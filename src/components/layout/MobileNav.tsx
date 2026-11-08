import React from 'react';
import { useTrading } from '../../context/TradingContext';
import type { TabId } from '../../types/trading';
import { LayoutDashboard, Signal, Bot, Wallet, User } from 'lucide-react';

const ITEMS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'signals', label: 'Signals', icon: <Signal className="w-5 h-5" /> },
  { id: 'agents', label: 'Agents', icon: <Bot className="w-5 h-5" /> },
  { id: 'paper_trading', label: 'Trades', icon: <Wallet className="w-5 h-5" /> },
  { id: 'settings', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, openPositions } = useTrading();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1420]/95 backdrop-blur border-t border-[#223044]">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'paper_trading' && activeTab === 'my_trades');
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                isActive ? 'text-[#18D5C0]' : 'text-[#64748B]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'paper_trading' && openPositions.length > 0 && (
                <span className="absolute top-1.5 right-4 min-w-[16px] h-4 px-1 rounded-full bg-[#18D5C0] text-[#080D16] text-[10px] font-bold flex items-center justify-center">
                  {openPositions.length}
                </span>
              )}
              {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-[#18D5C0]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
