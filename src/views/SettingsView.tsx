import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  User,
  Shield,
  Bell,
  Send,
  Sliders,
  CheckCircle2,
  Lock,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { showToast, resetPaperAccount } = useTrading();

  // Settings local state
  const [telegramChatId, setTelegramChatId] = useState('@trademind_signals_bot');
  const [notifySignals, setNotifySignals] = useState(true);
  const [notifyVetoes, setNotifyVetoes] = useState(true);
  const [notifyTrades, setNotifyTrades] = useState(true);
  const [audioCues, setAudioCues] = useState(true);

  const handleTestTelegramAlert = () => {
    showToast('Simulated Telegram alert sent successfully to @trademind_signals_bot.', 'success');
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings and preferences saved successfully.', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-[#F4F7FB]">Platform Settings & Preferences</h2>
        <p className="text-xs text-[#91A0B5] mt-0.5">
          Configure personal credentials, multi-factor security, Telegram webhooks, and risk thresholds.
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Personal Profile Section */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#223044]">
            <User className="w-4 h-4 text-[#18D5C0]" />
            <h3 className="text-sm font-bold text-[#F4F7FB]">Personal Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Display Name</label>
              <input
                type="text"
                defaultValue="mrflexo"
                className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">Email Address</label>
              <input
                type="email"
                defaultValue="mrflexo926@gmail.com"
                disabled
                className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#91A0B5] opacity-75"
              />
            </div>
          </div>
        </div>

        {/* Security & 2FA */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#223044]">
            <Shield className="w-4 h-4 text-[#20D99A]" />
            <h3 className="text-sm font-bold text-[#F4F7FB]">Security & Authentication</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[#0D1420] rounded-lg border border-[#223044] text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#20D99A]/15 text-[#20D99A]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#F4F7FB]">Two-Factor Authentication (2FA)</div>
                <div className="text-[11px] text-[#91A0B5]">
                  Hardware TOTP Authenticator active on your account.
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded bg-[#20D99A]/15 text-[#20D99A] font-mono font-bold text-[11px] self-start sm:self-auto">
              ENFORCED
            </span>
          </div>
        </div>

        {/* Telegram Webhook & Notification Routing */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#223044]">
            <Send className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-[#F4F7FB]">Telegram Real-Time Alerts</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                Telegram Channel / Bot Webhook
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestTelegramAlert}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162232] hover:bg-[#223044] text-[#18D5C0] border border-[#223044] transition-colors whitespace-nowrap"
                >
                  Send Test Alert
                </button>
              </div>
              <span className="text-[10px] text-[#64748B]">
                Receives instant push notifications for new BUY/SELL/WAIT signals and News Veto events.
              </span>
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySignals}
                  onChange={(e) => setNotifySignals(e.target.checked)}
                  className="w-4 h-4 accent-[#18D5C0]"
                />
                <span className="text-[#F4F7FB]">Push alerts on new multi-agent BUY & SELL signals</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyVetoes}
                  onChange={(e) => setNotifyVetoes(e.target.checked)}
                  className="w-4 h-4 accent-[#18D5C0]"
                />
                <span className="text-[#F4F7FB]">Push alerts when News Agent triggers a trade VETO</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyTrades}
                  onChange={(e) => setNotifyTrades(e.target.checked)}
                  className="w-4 h-4 accent-[#18D5C0]"
                />
                <span className="text-[#F4F7FB]">Push alerts when Paper trades take-profit or stop-out</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioCues}
                  onChange={(e) => setAudioCues(e.target.checked)}
                  className="w-4 h-4 accent-[#18D5C0]"
                />
                <span className="text-[#F4F7FB]">Enable subtle trading desk audio cues</span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded-lg transition-colors shadow-lg shadow-[#18D5C0]/10"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
