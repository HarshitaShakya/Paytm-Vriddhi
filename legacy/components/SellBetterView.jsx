import React, { useState } from 'react';
import { 
  Radio, 
  Users, 
  BarChart3, 
  Sparkles, 
  Gift, 
  ShieldCheck, 
  Store, 
  TrendingUp,
  Volume2
} from 'lucide-react';
import SoundboxDevice from './SoundboxDevice';
import MerchantPOSSimulator from './MerchantPOSSimulator';
import CustomerPassbookView from './CustomerPassbookView';
import MerchantDashboard from './MerchantDashboard';
import FestivalAndMohallaView from './FestivalAndMohallaView';

export default function SellBetterView({
  activeMerchant,
  merchants,
  customers,
  activeCustomer,
  onSelectCustomer,
  onTogglePrivacy,
  onExtendReward,
  onExecutePayment,
  onExecuteRefund,
  onUpdateMerchant,
  currentLanguage,
  onLanguageChange,
  lastAnnouncement,
  onAnnounceLeaderboard,
  initialSubTab = 'pos',
  onToast
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          {[
            { id: 'pos', label: 'Soundbox POS & Device', badge: 'Terminal' },
            { id: 'customers', label: 'Customer Passbook & Lucky Dabba', badge: `${customers.length} Grahak` },
            { id: 'analytics', label: 'ROI & Liability Dashboard', badge: 'Analytics' },
            { id: 'campaigns', label: 'Festival & Mohalla Campaigns', badge: 'Campaigns' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeSubTab === tab.id
                  ? 'bg-[#002970] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Radio className="w-4 h-4 text-[#002970]" />
          <span>Paytm Soundbox 4.0 Pro (Synthesizer Ready)</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 1: SOUNDBOX POS TERMINAL & HARDWARE SIMULATOR
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'pos' && (
        <div className="space-y-6">
          {/* Soundbox 4.0 Pro Hardware Device Simulation */}
          <SoundboxDevice
            activeMerchant={activeMerchant}
            lastAnnouncement={lastAnnouncement}
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
            topSpenders={customers.slice(0, 3)}
          />

          {/* POS Payment Simulator with 3-Layer Loyalty Preview */}
          <MerchantPOSSimulator
            merchants={merchants}
            activeMerchant={activeMerchant}
            customers={customers}
            onExecutePayment={onExecutePayment}
            onExecuteRefund={onExecuteRefund}
            currentLanguage={currentLanguage}
          />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 2: CUSTOMER PASSBOOK & LUCKY DABBA
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'customers' && (
        <CustomerPassbookView
          customers={customers}
          activeCustomer={activeCustomer}
          onSelectCustomer={onSelectCustomer}
          onTogglePrivacy={onTogglePrivacy}
          onExtendReward={onExtendReward}
          activeMerchant={activeMerchant}
        />
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 3: ROI & LIABILITY DASHBOARD
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'analytics' && (
        <MerchantDashboard
          activeMerchant={activeMerchant}
          customers={customers}
          onSendWinBackNudge={(c) => onToast?.(`WhatsApp offer voucher sent to ${c.name} (+91 ${c.phone})`)}
          onUpdateSeasonDays={(days) => onUpdateMerchant({ seasonDurationDays: days }, `Season duration set to ${days} days`)}
        />
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 4: FESTIVAL CAMPAIGNS & MOHALLA LEADERBOARD
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'campaigns' && (
        <FestivalAndMohallaView
          activeMerchant={activeMerchant}
          currentFestival={activeMerchant.activeFestival || 'none'}
          onSelectFestival={(id) => {
            onUpdateMerchant({ activeFestival: id }, `Festival campaign switched to ${id.toUpperCase()}`);
          }}
          customers={customers}
          currentLanguage={currentLanguage}
          onAnnounceLeaderboard={onAnnounceLeaderboard}
        />
      )}
    </div>
  );
}

