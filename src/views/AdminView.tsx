import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Power,
  Users,
  Activity,
  KeyRound,
  FileText,
  Clock,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { AdminRole } from '../types/trading';

export const AdminView: React.FC = () => {
  const {
    activeRole,
    setActiveRole,
    adminRiskConfig,
    updateRiskConfig,
    toggleGlobalPause,
    toggleAiEngine,
    auditLogs,
    showToast,
  } = useTrading();

  const [confirmEmergencyModal, setConfirmEmergencyModal] = useState<'TRADING_PAUSE' | 'AI_PAUSE' | null>(null);

  // Temporary risk config edits
  const [riskPerTrade, setRiskPerTrade] = useState(adminRiskConfig.riskPerTrade);
  const [maxSignals, setMaxSignals] = useState(adminRiskConfig.maxSignalsPerDay);
  const [dailyStop, setDailyStop] = useState(adminRiskConfig.dailyStopLoss);
  const [globalDrawdown, setGlobalDrawdown] = useState(adminRiskConfig.globalDrawdownPause);
  const [weekendBlocked, setWeekendBlocked] = useState(adminRiskConfig.blockWeekendTrading);

  const isSuperAdmin = activeRole === 'Super Admin';
  const isManagerOrHigher = activeRole === 'Super Admin' || activeRole === 'Manager';

  const handleSaveRiskSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Permission Denied: Only Super Admin / Owner can save global risk limits.', 'error');
      return;
    }
    updateRiskConfig({
      riskPerTrade,
      maxSignalsPerDay: maxSignals,
      dailyStopLoss: dailyStop,
      globalDrawdownPause: globalDrawdown,
      blockWeekendTrading: weekendBlocked,
    });
  };

  // Mock institutional users list
  const usersList = [
    { id: 'usr-1', name: 'mrflexo (You)', email: 'mrflexo926@gmail.com', role: 'Super Admin', plan: 'Business', status: 'ACTIVE', lastActive: 'Just now' },
    { id: 'usr-2', name: 'Elena Rostova', email: 'e.rostova@propcapital.io', role: 'Manager', plan: 'Business', status: 'ACTIVE', lastActive: '12m ago' },
    { id: 'usr-3', name: 'David Chen', email: 'dchen@quantdesk.com', role: 'Trader', plan: 'Pro', status: 'ACTIVE', lastActive: '1h ago' },
    { id: 'usr-4', name: 'Sarah Miller', email: 'smiller@investcorp.net', role: 'Trader', plan: 'Pro', status: 'ACTIVE', lastActive: '3h ago' },
    { id: 'usr-5', name: 'Guest Analyst', email: 'auditor@kpmg.com', role: 'Viewer', plan: 'Free', status: 'RESTRICTED', lastActive: 'Yesterday' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & RBAC Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F4F7FB] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#A78BFA]" />
            Institutional Admin Control Center
          </h2>
          <p className="text-xs text-[#91A0B5] mt-0.5">
            Role-gated management console for risk invariants, emergency circuit breakers, and audit trails.
          </p>
        </div>

        {/* Current Active Role Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111A27] border border-[#223044] text-xs">
          <span className="text-[#91A0B5]">Acting Role:</span>
          <span className="font-bold font-mono text-[#18D5C0]">{activeRole}</span>
          {!isSuperAdmin && (
            <span className="text-[10px] text-[#F5B942] font-medium">(Read-Only Mode)</span>
          )}
        </div>
      </div>

      {/* EMERGENCY CIRCUIT BREAKERS */}
      <div className="p-5 bg-[#162232] border border-[#FF5C70]/40 rounded-xl space-y-4 shadow-lg shadow-[#FF5C70]/5">
        <div className="flex items-center justify-between pb-3 border-b border-[#223044]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF5C70] uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Emergency Platform Circuit Breakers
          </div>
          <span className="text-[10px] font-mono text-[#91A0B5]">Super Admin Authorization Required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Circuit Breaker 1: Global Trading Pause */}
          <div className="p-4 rounded-xl bg-[#0D1420] border border-[#223044] flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#F4F7FB]">Global Trading Execution</div>
              <div className="text-xs text-[#91A0B5] mt-0.5">
                {adminRiskConfig.globalTradingPaused
                  ? 'TRADING HALTED: All paper orders globally blocked.'
                  : 'Operational: Order execution desk accepting valid signals.'}
              </div>
            </div>

            <button
              onClick={() => {
                if (!isSuperAdmin) {
                  showToast('Super Admin role required to toggle emergency breaker.', 'error');
                  return;
                }
                setConfirmEmergencyModal('TRADING_PAUSE');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                adminRiskConfig.globalTradingPaused
                  ? 'bg-[#20D99A] hover:bg-[#20D99A]/90 text-[#080D16]'
                  : 'bg-[#FF5C70] hover:bg-[#FF5C70]/90 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>
                {adminRiskConfig.globalTradingPaused ? 'Resume Trading' : 'Halt Trading (Emergency)'}
              </span>
            </button>
          </div>

          {/* Circuit Breaker 2: AI Engine Pause */}
          <div className="p-4 rounded-xl bg-[#0D1420] border border-[#223044] flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#F4F7FB]">AI 10-Agent Consensus Engine</div>
              <div className="text-xs text-[#91A0B5] mt-0.5">
                {adminRiskConfig.aiEnginePaused
                  ? 'AI SIGNALS FROZEN: Multi-agent synthesis paused.'
                  : 'Operational: 10 specialized agents actively computing consensus.'}
              </div>
            </div>

            <button
              onClick={() => {
                if (!isSuperAdmin) {
                  showToast('Super Admin role required to pause AI engine.', 'error');
                  return;
                }
                setConfirmEmergencyModal('AI_PAUSE');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                adminRiskConfig.aiEnginePaused
                  ? 'bg-[#20D99A] hover:bg-[#20D99A]/90 text-[#080D16]'
                  : 'bg-[#F5B942] hover:bg-[#F5B942]/90 text-[#080D16]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{adminRiskConfig.aiEnginePaused ? 'Resume AI Engine' : 'Freeze AI Engine'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RISK CONTROL PANEL (1 Column) */}
        <div className="p-5 bg-[#111A27] border border-[#223044] rounded-xl flex flex-col justify-between space-y-4 text-xs font-mono">
          <form onSubmit={handleSaveRiskSettings} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#223044]">
              <span className="font-bold text-sm text-[#F4F7FB] font-sans">
                PRD Default Risk Parameters
              </span>
              <span className="text-[10px] text-[#18D5C0]">Rules Engine</span>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Max Risk Per Trade (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPerTrade}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setRiskPerTrade(parseFloat(e.target.value) || 0.5)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] disabled:opacity-50"
                />
                <span className="text-[10px] text-[#64748B]">PRD Spec: 0.5% max capital risk</span>
              </div>

              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Max Signals Per Day
                </label>
                <input
                  type="number"
                  value={maxSignals}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setMaxSignals(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] disabled:opacity-50"
                />
                <span className="text-[10px] text-[#64748B]">PRD Spec: 2 signals per day</span>
              </div>

              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Daily Stop Loss Limit (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={dailyStop}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setDailyStop(parseFloat(e.target.value) || 2.0)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] disabled:opacity-50"
                />
                <span className="text-[10px] text-[#64748B]">PRD Spec: 2.0% loss</span>
              </div>

              <div>
                <label className="block text-[11px] text-[#91A0B5] mb-1 font-sans">
                  Global Drawdown Pause (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={globalDrawdown}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setGlobalDrawdown(parseFloat(e.target.value) || 4.0)}
                  className="w-full px-3 py-2 bg-[#0D1420] border border-[#223044] rounded-lg text-[#F4F7FB] focus:outline-none focus:border-[#18D5C0] disabled:opacity-50"
                />
                <span className="text-[10px] text-[#64748B]">PRD Spec: 4.0% drawdown</span>
              </div>

              {/* Weekend Trading Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D1420] border border-[#223044]">
                <div>
                  <div className="text-[11px] font-sans font-medium text-[#F4F7FB]">
                    Block Weekend Trading
                  </div>
                  <div className="text-[10px] text-[#64748B]">No new trades Sat/Sun</div>
                </div>
                <input
                  type="checkbox"
                  checked={weekendBlocked}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setWeekendBlocked(e.target.checked)}
                  className="w-4 h-4 accent-[#18D5C0] cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isSuperAdmin}
              className="w-full py-2.5 px-4 text-xs font-bold text-[#080D16] bg-[#18D5C0] hover:bg-[#18D5C0]/90 rounded-lg transition-colors disabled:opacity-40 font-sans"
            >
              {isSuperAdmin ? 'Save Risk Invariants' : 'Locked (Super Admin Only)'}
            </button>
          </form>
        </div>

        {/* USER MANAGEMENT & SECURITY STATUS (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Security & Broker Key Invariants */}
          <div className="p-4 bg-[#111A27] border border-[#223044] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#0D1420] rounded-lg border border-[#223044]">
              <div className="flex items-center gap-2 text-[#20D99A] font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Owner 2FA Enforced</span>
              </div>
              <p className="text-[11px] text-[#91A0B5]">
                Hardware key / TOTP enforced on all configuration mutations.
              </p>
            </div>

            <div className="p-3 bg-[#0D1420] rounded-lg border border-[#223044]">
              <div className="flex items-center gap-2 text-[#18D5C0] font-bold mb-1">
                <Lock className="w-4 h-4" />
                <span>Encrypted Broker Keys</span>
              </div>
              <p className="text-[11px] text-[#91A0B5]">
                Keys stored in KMS HSM. Read-only feed rights; withdrawals permanently locked.
              </p>
            </div>

            <div className="p-3 bg-[#0D1420] rounded-lg border border-[#223044]">
              <div className="flex items-center gap-2 text-[#A78BFA] font-bold mb-1">
                <KeyRound className="w-4 h-4" />
                <span>Secrets Invariant</span>
              </div>
              <p className="text-[11px] text-[#91A0B5]">
                Raw API keys and secrets are never returned or rendered in the client interface.
              </p>
            </div>
          </div>

          {/* User Management Table */}
          <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#0D1420] border-b border-[#223044] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#18D5C0]" />
                <h3 className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                  Authorized Personnel & Access Control
                </h3>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">5 Total Operators</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead className="bg-[#080D16] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223044]/60">
                  {usersList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-[#162232]/50">
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-[#F4F7FB]">{usr.name}</div>
                        <div className="text-[11px] text-[#64748B] font-mono">{usr.email}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#18D5C0]">{usr.role}</td>
                      <td className="px-4 py-3 text-[#91A0B5]">{usr.plan}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            usr.status === 'ACTIVE'
                              ? 'bg-[#20D99A]/15 text-[#20D99A]'
                              : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                          }`}
                        >
                          {usr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#64748B]">{usr.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-[#111A27] border border-[#223044] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#0D1420] border-b border-[#223044] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#A78BFA]" />
                <h3 className="text-xs font-bold text-[#F4F7FB] uppercase tracking-wide">
                  Immutable Security Audit Trail
                </h3>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">Live Ingestion</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead className="bg-[#080D16] text-[#64748B] text-[10px] uppercase border-b border-[#223044]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Event Detail</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#223044]/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#162232]/50">
                      <td className="px-4 py-3 text-[#64748B]">{log.timestamp}</td>
                      <td className="px-4 py-3 font-sans text-[#F4F7FB]">{log.event}</td>
                      <td className="px-4 py-3 text-[#18D5C0]">{log.actor}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.severity === 'INFO'
                              ? 'bg-[#18D5C0]/15 text-[#18D5C0]'
                              : log.severity === 'WARNING'
                              ? 'bg-[#F5B942]/15 text-[#F5B942]'
                              : 'bg-[#FF5C70]/15 text-[#FF5C70]'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Confirmation Modal */}
      {confirmEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="p-6 bg-[#0D1420] border-2 border-[#FF5C70] rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#FF5C70]/20 text-[#FF5C70]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F4F7FB]">Confirm Dangerous Action</h3>
                <div className="text-xs text-[#FF5C70] font-mono">CRITICAL CIRCUIT BREAKER</div>
              </div>
            </div>

            <p className="text-xs text-[#91A0B5] leading-relaxed">
              {confirmEmergencyModal === 'TRADING_PAUSE'
                ? 'Are you certain you want to toggle the Global Trading Circuit Breaker? When paused, no paper or simulated executions will be accepted across any client accounts.'
                : 'Are you certain you want to toggle the 10-Agent AI Engine? Freezing the engine stops real-time signal generation until manually resumed.'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmEmergencyModal(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#162232] text-[#91A0B5] hover:text-[#F4F7FB]"
              >
                Abort Action
              </button>
              <button
                onClick={() => {
                  if (confirmEmergencyModal === 'TRADING_PAUSE') {
                    toggleGlobalPause();
                  } else {
                    toggleAiEngine();
                  }
                  setConfirmEmergencyModal(null);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#FF5C70] hover:bg-[#FF5C70]/90 text-white"
              >
                Confirm & Apply Breaker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
