import React, { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import OverviewView from './components/OverviewView';
import MunimAssistantView from './components/MunimAssistantView';
import BuySmarterView from './components/BuySmarterView';
import SellBetterView from './components/SellBetterView';
import AIBridgeView from './components/AIBridgeView';

import { MERCHANTS, INITIAL_CUSTOMERS } from './data/mockData';
import { 
  INITIAL_MANDI_RATES, 
  INITIAL_PROCUREMENT_ORDERS, 
  DISTRIBUTOR_RADAR_ITEMS 
} from './data/mandiData';
import { soundbox } from './utils/soundboxAudio';
import { 
  processLoyaltyPayment, 
  processLoyaltyRefund, 
  extendRewardValidity 
} from './utils/loyaltyEngine';
import { evaluatePaymentTrust } from './utils/fraudEngine';
import { buildPaymentSpeech } from './utils/speechScripts';
import { Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Global States
  const [merchants, setMerchants] = useState(MERCHANTS);
  const [activeMerchantId, setActiveMerchantId] = useState('m_sharma_kirana');
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [activeCustomerId, setActiveCustomerId] = useState('c_01');

  // Navigation State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'procurement', 'loyalty', 'bridge'
  const [procurementSubTab, setProcurementSubTab] = useState('voice');
  const [loyaltySubTab, setLoyaltySubTab] = useState('pos');

  // Mandi & Procurement State
  const [mandiRates, setMandiRates] = useState(INITIAL_MANDI_RATES);
  const [procurementOrders, setProcurementOrders] = useState(INITIAL_PROCUREMENT_ORDERS);

  // Soundbox & Audio State
  const [currentLanguage, setCurrentLanguage] = useState('hinglish');
  const [lastAnnouncement, setLastAnnouncement] = useState({
    text: 'Paytm Soundbox 4.0 Pro ready. Waiting for payment…',
    type: 'ready',
    timestamp: Date.now()
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [soundboxPlaying, setSoundboxPlaying] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const activeMerchant = merchants.find(m => m.id === activeMerchantId) || merchants[0];
  const activeCustomer = customers.find(c => c.id === activeCustomerId) || customers[0];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(window.appToastTimer);
    window.appToastTimer = setTimeout(() => setToast(null), 3500);
  };

  // Soundbox Audio Language Handler
  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    soundbox.stop();
    const text = lang === 'hindi' 
      ? 'हिंदी भाषा चुनी गई। पेटीएम साउंडबॉक्स तैयार है।'
      : lang === 'english'
      ? 'English voice selected. Paytm Soundbox 4.0 is ready.'
      : 'Hinglish voice chuna gaya. Badhai ho, Soundbox taiyar hai!';
    
    setLastAnnouncement({ text, type: 'payment', timestamp: Date.now() });
    setSoundboxPlaying(true);
    soundbox.announce({
      type: 'payment',
      speechText: text,
      lang,
      onStart: () => setSoundboxPlaying(true),
      onEnd: () => setSoundboxPlaying(false)
    });
    showToast(`Voice switched to ${lang.toUpperCase()}`, 'info');
  };

  // Payment Execution (Soundbox POS)
  const handleExecutePayment = ({ txn, customer, amount, paymentMode, paymentStatus, autoApplyReward = true }) => {
    const trust = evaluatePaymentTrust({
      merchant: activeMerchant,
      customer,
      amount,
      paymentStatus,
      recentCustomerTransactions: customer.history || []
    });

    if (trust.isSuspicious || !trust.allowedForLoyalty) {
      const text = buildPaymentSpeech({ customer, amount, lang: currentLanguage, isSuspicious: true });
      setLastAnnouncement({ text, type: 'fraud', timestamp: Date.now(), amount, customerName: customer.name });
      setSoundboxPlaying(true);
      soundbox.announce({
        type: 'fraud',
        speechText: text,
        lang: currentLanguage,
        onStart: () => setSoundboxPlaying(true),
        onEnd: () => setSoundboxPlaying(false)
      });
      showToast(`Payment flagged: ${trust.reason}`, 'error');
      return;
    }

    const result = processLoyaltyPayment({
      txn: txn || {
        txn_id: `txn_${Date.now()}`,
        merchant_id: activeMerchant.id,
        customer_id: customer.id,
        amount,
        status: 'completed',
        paymentMode
      },
      merchant: activeMerchant,
      customer,
      currentLanguage,
      autoApplyReward
    });

    if (!result.success) {
      return showToast(result.reason, 'error');
    }

    // Update customer and merchant state
    setCustomers(prev => prev.map(c => c.id === customer.id ? result.customer : c));
    setMerchants(prev => prev.map(m => m.id === activeMerchant.id ? {
      ...m,
      stats: {
        ...m.stats,
        totalMonthlySales: m.stats.totalMonthlySales + amount,
        incrementalSales: m.stats.incrementalSales + (result.highestTierReward ? 350 : 50),
        budgetCapUsed: m.stats.budgetCapUsed + (result.highestTierReward?.rewardValue || 0)
      }
    } : m));

    // Announce aloud on Soundbox
    setLastAnnouncement({
      text: result.speechText,
      type: result.highestTierReward ? 'lucky_dabba' : 'payment',
      timestamp: Date.now(),
      amount,
      customerName: customer.name
    });
    setSoundboxPlaying(true);
    soundbox.announce({
      type: result.highestTierReward ? 'lucky_dabba' : 'payment',
      speechText: result.speechText,
      lang: currentLanguage,
      onStart: () => setSoundboxPlaying(true),
      onEnd: () => setSoundboxPlaying(false)
    });

    // Append to live feed
    setRecentTransactions(prev => [{
      id: `log_${Date.now()}`,
      customerName: customer.name,
      amount,
      status: paymentStatus,
      eventType: result.highestTierReward ? `${result.highestTierReward.name} Unlocked` : '+Bachat Points Credited',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, ...prev.slice(0, 9)]);

    showToast(`₹${amount} paid by ${customer.name} · +${result.earnedPoints} Bachat Points`);
  };

  // Refund Execution
  const handleExecuteRefund = ({ txnId, refundAmount, customer }) => {
    const result = processLoyaltyRefund({ txnId, refundAmount, merchant: activeMerchant, customer });
    setCustomers(prev => prev.map(c => c.id === customer.id ? result.customer : c));
    const refundSpeech = `Paytm par ${refundAmount} rupaye ka refund safalta se process hua.`;
    setLastAnnouncement({ text: refundSpeech, type: 'payment', timestamp: Date.now() });
    setSoundboxPlaying(true);
    soundbox.announce({
      type: 'payment',
      speechText: refundSpeech,
      lang: currentLanguage,
      onStart: () => setSoundboxPlaying(true),
      onEnd: () => setSoundboxPlaying(false)
    });
    showToast(`₹${refundAmount} refund processed · Points & rewards updated`);
  };

  // Mandi Rate Update Handler
  const handleUpdateMandiRate = (crop, median) => {
    setMandiRates(prev => prev.map(r => {
      if (r.crop === crop && r.market === 'Indore APMC') {
        const old = r.median;
        const change = ((median - old) / old) * 100;
        return {
          ...r,
          median,
          min: Math.round(median * 0.92),
          max: Math.round(median * 1.06),
          change,
          updated: 'Just now'
        };
      }
      return r;
    }));
    showToast(`${crop.toUpperCase()} rate updated to ₹${median.toLocaleString('en-IN')}/Qtl`);
  };

  // Add Procurement Order Handler
  const handleAddProcurementOrder = (newOrder) => {
    setProcurementOrders(prev => [newOrder, ...prev]);
  };

  // Generic Merchant Patch Handler
  const updateMerchant = (patch, msg) => {
    setMerchants(prev => prev.map(m => m.id === activeMerchant.id ? { ...m, ...patch } : m));
    if (msg) showToast(msg);
  };

  // Cross-Navigation Handler
  const handleNavigate = (tab, subTab = null) => {
    setActiveTab(tab);
    if (tab === 'procurement' && subTab) {
      setProcurementSubTab(subTab);
    } else if (tab === 'loyalty' && subTab) {
      setLoyaltySubTab(subTab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell flex flex-col min-h-screen">
      {/* 1. Global Header */}
      <Header
        merchants={merchants}
        activeMerchant={activeMerchant}
        onSelectMerchant={setActiveMerchantId}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        soundboxPlaying={soundboxPlaying}
      />

      {/* 2. Persistent Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 3. Main Sheet Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewView
            activeMerchant={activeMerchant}
            customers={customers}
            procurementOrders={procurementOrders}
            recentTransactions={recentTransactions}
            distributorRadarItems={DISTRIBUTOR_RADAR_ITEMS}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'munim' && (
          <MunimAssistantView
            activeMerchant={activeMerchant}
            onAddProcurementOrder={handleAddProcurementOrder}
            onToast={showToast}
          />
        )}

        {activeTab === 'procurement' && (
          <BuySmarterView
            activeMerchant={activeMerchant}
            mandiRates={mandiRates}
            onUpdateMandiRate={handleUpdateMandiRate}
            procurementOrders={procurementOrders}
            onAddProcurementOrder={handleAddProcurementOrder}
            initialSubTab={procurementSubTab}
            onToast={showToast}
          />
        )}

        {activeTab === 'loyalty' && (
          <SellBetterView
            activeMerchant={activeMerchant}
            merchants={merchants}
            customers={customers}
            activeCustomer={activeCustomer}
            onSelectCustomer={setActiveCustomerId}
            onTogglePrivacy={(id) => {
              setCustomers(p => p.map(c => c.id === id ? { ...c, optInName: !c.optInName } : c));
              showToast('Customer Soundbox name privacy toggled');
            }}
            onExtendReward={(id, reward) => {
              setCustomers(p => p.map(c => c.id === id ? extendRewardValidity(reward, c) : c));
              showToast('Reward voucher validity extended by +15 days');
            }}
            onExecutePayment={handleExecutePayment}
            onExecuteRefund={handleExecuteRefund}
            onUpdateMerchant={updateMerchant}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            lastAnnouncement={lastAnnouncement}
            onAnnounceLeaderboard={(text) => {
              setLastAnnouncement({ text, type: 'leaderboard', timestamp: Date.now() });
              setSoundboxPlaying(true);
              soundbox.announce({
                type: 'leaderboard',
                speechText: text,
                lang: currentLanguage,
                onStart: () => setSoundboxPlaying(true),
                onEnd: () => setSoundboxPlaying(false)
              });
            }}
            initialSubTab={loyaltySubTab}
            onToast={showToast}
          />
        )}

        {activeTab === 'bridge' && (
          <AIBridgeView
            activeMerchant={activeMerchant}
            onUpdateThreshold={(monthlyThreshold) => {
              updateMerchant({ monthlyThreshold }, `Threshold updated to ₹${monthlyThreshold}`);
            }}
            onToggleSlowHourBoost={(enabled) => {
              updateMerchant({
                slowHourBoost: { ...activeMerchant.slowHourBoost, enabled }
              }, enabled ? 'Slow-hour boost enabled' : 'Slow-hour boost paused');
            }}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        )}
      </main>

      {/* 4. Global Footer */}
      <Footer activeMerchant={activeMerchant} />

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold text-white shadow-lg animate-bounce ${
          toast.type === 'error'
            ? 'bg-rose-600'
            : toast.type === 'info'
            ? 'bg-[#002970]'
            : 'bg-emerald-700'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
