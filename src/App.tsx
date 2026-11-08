/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { PaperExecutionModal } from './components/paper/PaperExecutionModal';
import { SignalDetailModal } from './components/signals/SignalDetailModal';
import { PricingModal } from './components/pricing/PricingModal';

// Views
import { OverviewView } from './views/OverviewView';
import { SignalsView } from './views/SignalsView';
import { LiveMarketsView } from './views/LiveMarketsView';
import { AgentsView } from './views/AgentsView';
import { StrategiesView } from './views/StrategiesView';
import { BacktestingView } from './views/BacktestingView';
import { PaperTradingView } from './views/PaperTradingView';
import { MyTradesView } from './views/MyTradesView';
import { AnalyticsView } from './views/AnalyticsView';
import { AdminView } from './views/AdminView';
import { SettingsView } from './views/SettingsView';

import { Signal, AIAgent } from './types/trading';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeTab,
    selectedSignal,
    setSelectedSignal,
    selectedAsset,
    isExecutionModalOpen,
    closeExecutionModal,
    executionSignalTarget,
    toastMessage,
    setActiveTab,
  } = useTrading();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inspectingAgent, setInspectingAgent] = useState<AIAgent | null>(null);

  const handleInspectSignal = (sig: Signal) => {
    setSelectedSignal(sig);
  };

  const handleInspectAgent = (agent: AIAgent) => {
    setInspectingAgent(agent);
    setActiveTab('agents');
  };

  return (
    <div className="min-h-screen bg-[#080D16] text-[#F4F7FB] flex flex-col font-sans">
      {/* Desktop Left Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Top Header */}
      <Header
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 pt-20 px-4 sm:px-6 pb-24 md:pb-12 ${
          sidebarCollapsed ? 'ml-0 md:ml-18' : 'ml-0 md:ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              onInspectSignal={handleInspectSignal}
              onInspectAgent={handleInspectAgent}
            />
          )}
          {activeTab === 'signals' && <SignalsView onInspectSignal={handleInspectSignal} />}
          {activeTab === 'live_markets' && <LiveMarketsView />}
          {activeTab === 'agents' && <AgentsView />}
          {activeTab === 'strategies' && <StrategiesView />}
          {activeTab === 'backtesting' && <BacktestingView />}
          {activeTab === 'paper_trading' && <PaperTradingView />}
          {activeTab === 'my_trades' && <MyTradesView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'admin' && <AdminView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'pricing' && <PricingModal />}
        </div>
      </main>

      {/* Mobile Touch Bottom Navigation */}
      <MobileNav />

      {/* Slide-over Notification Center */}
      <NotificationDrawer />

      {/* Global Paper Order Execution Modal */}
      <PaperExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={closeExecutionModal}
        targetSignal={executionSignalTarget}
      />

      {/* Deep 10-Agent Signal Detail Modal */}
      {selectedSignal && (
        <SignalDetailModal
          signal={selectedSignal}
          asset={selectedAsset}
          onClose={() => setSelectedSignal(null)}
        />
      )}

      {/* Subscription Pricing Modal */}
      <PricingModal />

      {/* Global Fintech Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-16 md:bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111A27] border border-[#223044] shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-[#20D99A] shrink-0" />
          )}
          {toastMessage.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-[#FF5C70] shrink-0" />
          )}
          {toastMessage.type === 'warning' && (
            <AlertTriangle className="w-4 h-4 text-[#F5B942] shrink-0" />
          )}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-[#18D5C0] shrink-0" />}
          <span className="text-[#F4F7FB]">{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
