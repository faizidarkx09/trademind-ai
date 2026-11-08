import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Bell, CheckCheck, ShieldAlert, TrendingUp, Wallet, X } from 'lucide-react';

const TYPE_ICON: Record<string, React.ReactNode> = {
  signal: <TrendingUp className="w-4 h-4 text-[#18D5C0]" />,
  execution: <Wallet className="w-4 h-4 text-[#20D99A]" />,
  risk: <ShieldAlert className="w-4 h-4 text-[#F5B942]" />,
  news: <Bell className="w-4 h-4 text-[#FF5C70]" />,
};

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    closeNotificationDrawer,
    notifications,
    markAllNotificationsRead,
  } = useTrading();

  if (!isNotificationDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeNotificationDrawer} />
      <aside className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#0D1420] border-l border-[#223044] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#223044]">
          <div>
            <h3 className="text-sm font-bold text-[#F4F7FB] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#18D5C0]" />
              Notifications
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">Signals, executions, risk limits & news vetoes</p>
          </div>
          <button
            onClick={closeNotificationDrawer}
            className="p-1.5 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#223044] flex items-center justify-between">
          <span className="text-xs text-[#91A0B5]">
            {notifications.filter((n) => !n.read).length} unread
          </span>
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1 text-xs text-[#18D5C0] hover:underline"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all as read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {notifications.length === 0 && (
            <p className="text-xs text-[#64748B] text-center py-8">No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-xl border ${
                n.read ? 'bg-[#111A27] border-[#223044]' : 'bg-[#18D5C0]/5 border-[#18D5C0]/25'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#080D16] border border-[#223044] shrink-0">
                  {TYPE_ICON[n.type] ?? <Bell className="w-4 h-4 text-[#91A0B5]" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F4F7FB]">{n.title}</div>
                  <p className="text-[11px] text-[#91A0B5] leading-relaxed mt-0.5">{n.message}</p>
                  <div className="text-[10px] text-[#64748B] font-mono mt-1.5">
                    {n.timestamp} · {n.type.toUpperCase()}
                    {!n.read && <span className="text-[#18D5C0] font-bold"> · NEW</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
