import React, { useState } from "react";
import { 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  History,
  CheckCircle,
  HelpCircle,
  Users,
  Coins,
  RefreshCw,
  Clock
} from "lucide-react";
import { evaluatePaymentTrust } from "../utils/fraudEngine";
import { 
  TIER_DEFINITIONS, 
  processLoyaltyPayment, 
  processLoyaltyRefund,
  formatISTDisplay 
} from "../utils/loyaltyEngine";
import { buildPaymentSpeech } from "../utils/speechScripts";

export default function MerchantPOSSimulator({
  merchants,
  activeMerchant,
  customers,
  onExecutePayment,
  onExecuteRefund,
  currentLanguage
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("c_01");
  const [amount, setAmount] = useState(500);
  const [paymentMode, setPaymentMode] = useState("upi_qr");
  const [paymentStatus, setPaymentStatus] = useState("completed"); // completed, refunded
  const [autoApplyReward, setAutoApplyReward] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Quick Preset Scenarios for Three-Layer Demonstration
  const PRESET_SCENARIOS = [
    {
      id: "preset_single_tier",
      title: "🥈 Single Tier Cross (Rahul +₹200)",
      desc: "Crosses ₹2,500 Khaas Grahak milestone",
      customerId: "c_01",
      amount: 200,
      status: "completed"
    },
    {
      id: "preset_multi_jump",
      title: "🚀 Multi-Tier Jump (Amit +₹3,000)",
      desc: "Crosses both ₹1,000 and ₹2,500 thresholds",
      customerId: "c_03",
      amount: 3000,
      status: "completed"
    },
    {
      id: "preset_progress_nudge",
      title: "🗣️ Progress Nudge (Sanjay +₹150)",
      desc: "Voice nudges: 'Sirf ₹150 aur'",
      customerId: "c_09",
      amount: 150,
      status: "completed"
    },
    {
      id: "preset_auto_apply",
      title: "💸 Auto-Apply Existing Reward",
      desc: "Unredeemed reward auto-deducted at billing",
      customerId: "c_01",
      amount: 450,
      status: "completed"
    },
    {
      id: "preset_season_urgency",
      title: "⏳ Season End Urgency Nudge",
      desc: "Near tier milestone with 14 days left in season",
      customerId: "c_08",
      amount: 20,
      status: "completed"
    },
    {
      id: "preset_circular_fraud",
      title: "🚨 Staff Circular Account Fraud",
      desc: "Staff circular loop flagged by anti-fraud filter",
      customerId: "c_13",
      amount: 200,
      status: "completed"
    }
  ];

  // Calculate live preview using Three-Layer logic
  const calculatePreview = () => {
    if (!selectedCustomer) return null;

    const trustResult = evaluatePaymentTrust({
      merchant: activeMerchant,
      customer: selectedCustomer,
      amount: Number(amount) || 0,
      paymentStatus,
      recentCustomerTransactions: selectedCustomer.history || []
    });

    if (trustResult.isSuspicious || !trustResult.allowedForLoyalty) {
      return {
        type: "fraud",
        trust: trustResult,
        headline: "⚠️ Suspicious / Not Counted for Loyalty",
        speech: buildPaymentSpeech({
          customer: selectedCustomer,
          amount,
          lang: currentLanguage,
          isSuspicious: true
        })
      };
    }

    const season = selectedCustomer.activeSeason || {
      eligible_spend: 0,
      duration_days: 90,
      end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      tiers_unlocked: []
    };

    const oldTotal = season.eligible_spend || 0;
    const newTotal = oldTotal + Number(amount);
    const earnedPoints = Math.floor(Number(amount) / 100);

    // Auto apply reward check
    let appliedReward = null;
    if (autoApplyReward && selectedCustomer.rewards) {
      appliedReward = selectedCustomer.rewards.find(r => r.status === "ISSUED");
    }

    // Crossed tiers
    const crossed = TIER_DEFINITIONS.filter(t => 
      oldTotal < t.threshold &&
      t.threshold <= newTotal &&
      !(season.tiers_unlocked || []).includes(t.threshold)
    );

    let highestTier = null;
    let isMultiJump = false;
    if (crossed.length > 0) {
      crossed.sort((a, b) => a.threshold - b.threshold);
      highestTier = crossed[crossed.length - 1];
      isMultiJump = crossed.length > 1;
    }

    // Next tier gap
    const nextTier = TIER_DEFINITIONS.find(t => t.threshold > newTotal);
    const nextTierGap = nextTier ? nextTier.threshold - newTotal : 0;

    // Season urgency
    const daysLeftInSeason = Math.max(0, Math.ceil((new Date(season.end_at) - new Date()) / (1000 * 60 * 60 * 24)));
    const isSeasonEndNudge = daysLeftInSeason <= 14 && nextTierGap > 0 && nextTierGap <= 450;

    const speech = buildPaymentSpeech({
      customer: selectedCustomer,
      amount,
      lang: currentLanguage,
      thresholdCrossed: Boolean(highestTier),
      isMultiTierJump: isMultiJump,
      tierName: highestTier?.name,
      rewardValue: highestTier?.rewardValue,
      pointsEarned: earnedPoints,
      appliedRewardDiscount: appliedReward ? appliedReward.value : 0,
      progressNudge: nextTier ? { remaining: nextTierGap, nextTierName: nextTier.name } : null,
      isSeasonEndNudge,
      seasonDaysLeft: daysLeftInSeason,
      merchantName: activeMerchant.name
    });

    return {
      type: isMultiJump ? "tier_upgrade" : highestTier ? "lucky_dabba" : isSeasonEndNudge || nextTierGap <= 450 ? "progress_nudge" : "normal",
      newTotal,
      oldTotal,
      earnedPoints,
      highestTier,
      isMultiJump,
      appliedReward,
      nextTierGap,
      speech,
      trust: trustResult
    };
  };

  const preview = calculatePreview();

  const handleApplyPreset = (preset) => {
    setSelectedCustomerId(preset.customerId);
    setAmount(preset.amount);
    setPaymentStatus(preset.status);
  };

  const handleDirectExecutePreset = (e, preset) => {
    e.stopPropagation();
    const cust = customers.find(c => c.id === preset.customerId);
    if (!cust) return;

    setSelectedCustomerId(preset.customerId);
    setAmount(preset.amount);
    setPaymentStatus(preset.status);

    const txn = {
      txn_id: `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      merchant_id: activeMerchant.id,
      customer_id: cust.id,
      amount: preset.amount,
      status: preset.status,
      paymentMode: "upi_qr"
    };

    onExecutePayment({
      txn,
      customer: cust,
      amount: preset.amount,
      paymentMode: "upi_qr",
      paymentStatus: preset.status,
      autoApplyReward
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;

    const txn = {
      txn_id: `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      merchant_id: activeMerchant.id,
      customer_id: selectedCustomer.id,
      amount: Number(amount),
      status: paymentStatus,
      paymentMode
    };

    if (paymentStatus === "refunded") {
      onExecuteRefund({
        txnId: txn.txn_id,
        refundAmount: Number(amount),
        customer: selectedCustomer
      });
      return;
    }

    onExecutePayment({
      txn,
      customer: selectedCustomer,
      amount: Number(amount),
      paymentMode,
      paymentStatus,
      autoApplyReward
    });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.upiId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Preset Scenario Cards */}
      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Three-Layer Demo Presets
            </h3>
          </div>
          <span className="text-xs font-medium bg-[#e8f2fa] text-[#0d3b66] px-2.5 py-0.5 rounded-full border border-[#cbe0f0]">
            6 Presets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESET_SCENARIOS.map((preset) => {
            const isSelected = selectedCustomerId === preset.customerId && amount === preset.amount;
            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`text-left p-3 rounded-xl border transition flex flex-col justify-between cursor-pointer group ${
                  isSelected 
                    ? "border-[#002970] bg-[#e8f2fa]"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>{preset.title}</span>
                    <span className="text-[11px] font-mono font-bold text-slate-800">₹{preset.amount}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {preset.desc}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Click to fill</span>
                  <button
                    type="button"
                    onClick={(e) => handleDirectExecutePreset(e, preset)}
                    className="px-2.5 py-1 rounded-lg bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-semibold text-[10px] transition active:scale-95 flex items-center gap-1"
                    title="Simulate this payment & speak immediately"
                  >
                    <span>Simulate Now ⚡</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Payment Simulation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Customer Selection & Amount */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-sky-600" />
              Kirana Counter POS (Simulate UPI Payment)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Merchant: {activeMerchant.upiId}
            </span>
          </div>

          {/* Customer Search & Select */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Select Customer (30 Mock Kirana Customers)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, phone or UPI ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2.5 border border-slate-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) — {c.segment?.toUpperCase()} | Season: ₹{c.activeSeason?.eligible_spend || 0} | Points: {c.pointsWallet?.balance || 0}
                </option>
              ))}
            </select>

            {/* Selected Customer Card Summary */}
            {selectedCustomer && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {selectedCustomer.name}
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded uppercase">
                      {selectedCustomer.segment || "weekly"}
                    </span>
                    {!selectedCustomer.optInName && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                        Anonymous on Box
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    UPI: {selectedCustomer.upiId} • Points: <strong className="text-amber-700 font-mono">{selectedCustomer.pointsWallet?.balance || 0} pts</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Season Spend (90d)</div>
                  <div className="text-sm font-bold text-sky-700 font-mono">
                    ₹{selectedCustomer.activeSeason?.eligible_spend || 0}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount Input & Fast Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Transaction Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 text-lg font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[50, 150, 200, 300, 500, 1200, 3000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium border transition ${
                    amount === amt
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Options: Auto-Apply Reward & Status */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="autoApply"
                checked={autoApplyReward}
                onChange={(e) => setAutoApplyReward(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <label htmlFor="autoApply" className="text-xs text-slate-700 font-bold cursor-pointer">
                Auto-Apply Active Reward Discount
              </label>
            </div>

            <div>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className={`w-full text-xs p-2.5 border rounded-xl font-bold ${
                  paymentStatus === "refunded"
                    ? "bg-rose-50 border-rose-300 text-rose-800"
                    : "bg-white border-slate-300 text-slate-800"
                }`}
              >
                <option value="completed">Completed Payment</option>
                <option value="refunded">Refund / Cancellation</option>
              </select>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleSubmit}
            className={`w-full py-3.5 px-4 font-bold rounded-xl transition transform active:scale-[0.99] flex items-center justify-center gap-2 text-sm text-white ${
              paymentStatus === "refunded"
                ? "bg-rose-700 hover:bg-rose-800"
                : "bg-[#002970] hover:bg-[#001f54]"
            }`}
          >
            <span>{paymentStatus === "refunded" ? "Process Refund & Revert Points" : "Simulate Payment & Speak on Soundbox"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Col: Three-Layer Intelligence Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#e8f2fa] text-slate-900 rounded-xl p-5 border border-[#cbe0f0]">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Three-Layer Engine Output Preview
            </h4>

            {preview ? (
              <div className="space-y-3 text-xs">
                {/* Event Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Predicted Event:</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    preview.isMultiJump
                      ? "bg-purple-100 text-purple-900 border border-purple-300"
                      : preview.highestTier
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : preview.type === "fraud"
                      ? "bg-rose-100 text-rose-900 border border-rose-300"
                      : "bg-[#e6efe9] text-[#1b4332] border border-emerald-300"
                  }`}>
                    {preview.isMultiJump && "MULTI-TIER JUMP"}
                    {!preview.isMultiJump && preview.highestTier && `${preview.highestTier.name} CROSSED`}
                    {preview.type === "progress_nudge" && "PROGRESS NUDGE"}
                    {preview.type === "fraud" && "FRAUD DETECTED"}
                    {preview.type === "normal" && "POINTS EARNED"}
                  </span>
                </div>

                {/* Spoken Text Box */}
                <div className="bg-white p-3 rounded-lg border border-[#cbe0f0]">
                  <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">
                    Spoken by Soundbox ({currentLanguage}):
                  </div>
                  <div className="text-xs font-mono text-slate-900 leading-relaxed font-semibold">
                    "{preview.speech}"
                  </div>
                </div>

                {/* 3 Layers Breakdown */}
                <div className="bg-white p-3 rounded-lg border border-[#cbe0f0] space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Layer 1 (Bachat Points):</span>
                    <span className="font-mono text-amber-800 font-bold">
                      +{preview.earnedPoints} pts (= ₹{(preview.earnedPoints * 0.5).toFixed(1)})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Layer 2 (Season Ladder):</span>
                    <span className="font-mono text-[#0d3b66] font-semibold">
                      ₹{preview.oldTotal} ➔ ₹{preview.newTotal} / ₹5,000
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Layer 3 (Tier Status):</span>
                    <span className="font-bold text-slate-900">
                      {preview.highestTier ? preview.highestTier.name : (selectedCustomer.tierStatus?.tier_name || "Naya Grahak")} (Valid 90d)
                    </span>
                  </div>
                  {preview.appliedReward && (
                    <div className="flex justify-between text-emerald-800 font-bold border-t border-slate-100 pt-1">
                      <span>Auto-Applied Discount:</span>
                      <span className="font-mono">-₹{preview.appliedReward.value}</span>
                    </div>
                  )}
                </div>

                {/* Fraud Check */}
                <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  preview.trust.isSuspicious
                    ? "bg-[#fbeeed] border border-rose-300 text-rose-900"
                    : "bg-[#e6efe9] border border-emerald-300 text-[#1b4332]"
                }`}>
                  {preview.trust.isSuspicious ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-[11px]">
                      {preview.trust.isSuspicious ? "Anti-Fraud Triggered" : "Verified UPI Payment"}
                    </div>
                    <div className="text-[10px] opacity-90 leading-normal">
                      {preview.trust.reason}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
