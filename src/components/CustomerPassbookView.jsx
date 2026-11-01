import React, { useState } from "react";
import { 
  Coins, 
  Sparkles, 
  Award, 
  Users, 
  ShieldCheck, 
  Share2, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Phone,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Gift,
  Tag
} from "lucide-react";
import { FAMILY_POOLS } from "../data/mockData";
import { TIER_DEFINITIONS, extendRewardValidity, formatISTDisplay } from "../utils/loyaltyEngine";

export default function CustomerPassbookView({
  customers,
  activeCustomer,
  onSelectCustomer,
  onTogglePrivacy,
  onExtendReward,
  activeMerchant
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(activeCustomer?.id || "c_01");
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  const customer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const pool = customer.familyPoolId ? FAMILY_POOLS[customer.familyPoolId] : null;
  const poolMembers = pool ? customers.filter(c => pool.members.includes(c.id)) : [];

  // Season & Ladder metrics
  const season = customer.activeSeason || {
    eligible_spend: customer.monthlySpend || 0,
    duration_days: 90,
    end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    tiers_unlocked: []
  };

  const daysLeftInSeason = Math.max(0, Math.ceil((new Date(season.end_at) - new Date()) / (1000 * 60 * 60 * 24)));

  // Points Wallet (Layer 1)
  const points = customer.pointsWallet?.balance || 0;
  const pointsRupeeValue = (points * 0.5).toFixed(1);

  // Tier Status (Layer 3)
  const tierStatus = customer.tierStatus || {
    tier: "none",
    tier_name: "Naya Grahak",
    valid_until: null
  };

  const daysLeftTierStatus = tierStatus.valid_until 
    ? Math.max(0, Math.ceil((new Date(tierStatus.valid_until) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Next Milestone on Ladder
  const currentEligible = season.eligible_spend || 0;
  const nextTier = TIER_DEFINITIONS.find(t => t.threshold > currentEligible) || TIER_DEFINITIONS[TIER_DEFINITIONS.length - 1];
  const gapToNext = Math.max(0, nextTier.threshold - currentEligible);
  const ladderPercent = Math.min(100, Math.round((currentEligible / 5000) * 100));

  const handleExtend = (rewardId) => {
    if (onExtendReward) {
      onExtendReward(customer.id, rewardId);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Customer Switcher & Privacy Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
            {customer.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Viewing Customer Passbook:</div>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                if (onSelectCustomer) onSelectCustomer(e.target.value);
              }}
              className="text-sm font-bold text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) — {c.segment?.toUpperCase()} | {c.pointsWallet?.balance || 0} pts
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Soundbox Name Privacy Toggle */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="text-left">
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              {customer.optInName ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              Soundbox Name Privacy
            </div>
            <div className="text-[10px] text-slate-500">
              {customer.optInName ? "Voice speaks name aloud" : "Announce as 'ek khushnasib grahak'"}
            </div>
          </div>

          <button
            onClick={() => onTogglePrivacy(customer.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              customer.optInName
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-300 text-slate-700"
            }`}
          >
            {customer.optInName ? "Opted In" : "Anonymous"}
          </button>
        </div>
      </div>

      {/* Hero 3-Layer Visual Card */}
      <div className="bg-[#e8f2fa] text-slate-900 rounded-xl p-6 border border-[#cbe0f0] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-[#0d3b66] px-2.5 py-0.5 rounded-full border border-[#cbe0f0]">
                Loyalty Passbook
              </span>
              <span className="text-[10px] font-bold bg-[#fcf5e5] text-amber-900 px-2 py-0.5 rounded-full uppercase border border-[#eddcb8]">
                {customer.segment} buyer
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">{customer.name}</h2>
            <p className="text-xs text-slate-600">{activeMerchant.name} • {activeMerchant.area}</p>
          </div>

          {/* Tier Status Badge (Layer 3) */}
          <div className="bg-white px-3.5 py-2 rounded-xl border border-[#cbe0f0] text-right">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Tier Badge</div>
            <div className="text-sm font-black text-slate-900 flex items-center gap-1 justify-end">
              <span>{tierStatus.tier === "shaan" ? "🥇" : tierStatus.tier === "khaas" ? "🥈" : "🥉"}</span>
              <span>{tierStatus.tier_name || "Naya Grahak"}</span>
            </div>
            {daysLeftTierStatus > 0 && (
              <div className="text-[10px] text-[#1b4332] font-semibold mt-0.5">
                Perks valid for {daysLeftTierStatus} days
              </div>
            )}
          </div>
        </div>

        {/* LAYER 1: Bachat Points Wallet (Non-Resetting) */}
        <div className="bg-white rounded-xl p-4 border border-[#cbe0f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#fcf5e5] text-amber-800 flex items-center justify-center font-bold text-lg border border-[#eddcb8]">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Layer 1: Bachat Points Wallet
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {points} Points <span className="text-sm text-slate-600 font-sans font-semibold">(= ₹{pointsRupeeValue})</span>
              </div>
              <div className="text-[10px] text-slate-500">
                1 point per ₹100 spend • Never resets while active
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowLedgerModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#002970] text-white text-xs font-bold hover:bg-[#001f54] transition"
          >
            View Ledger
          </button>
        </div>

        {/* LAYER 2: Rolling Season Tier Ladder */}
        <div className="bg-white rounded-xl p-4 border border-[#cbe0f0] space-y-3">
          <div className="flex items-baseline justify-between text-xs">
            <div>
              <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wide">
                Layer 2: Rolling {season.duration_days || 90}-Day Season Ladder
              </div>
              <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                ₹{currentEligible.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">season spend</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                {daysLeftInSeason} days left in season
              </div>
              {gapToNext > 0 ? (
                <div className="text-xs text-slate-700 font-medium">
                  Sirf <strong className="text-[#0d3b66]">₹{gapToNext}</strong> aur to {nextTier.name}!
                </div>
              ) : (
                <div className="text-xs text-[#1b4332] font-bold">
                  Top Tier Achieved! 🥇
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-[#1b4332] h-full rounded-full transition-all duration-700"
              style={{ width: `${ladderPercent}%` }}
            />
          </div>

          {/* Tier Milestones with Desi Names & Thresholds */}
          <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-600 font-semibold pt-1">
            <span className={currentEligible >= 1000 ? "text-[#1b4332] font-bold" : ""}>
              🥉 Pakka Grahak (₹1,000)
            </span>
            <span className={currentEligible >= 2500 ? "text-[#1b4332] font-bold" : ""}>
              🥈 Khaas Grahak (₹2,500)
            </span>
            <span className={currentEligible >= 5000 ? "text-[#1b4332] font-bold" : ""}>
              🥇 Shaan-e-Mohalla (₹5,000)
            </span>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2">
            When season ends, ladder progress resets for next 90 days, but your Points, Tier badge & unexpired rewards never vanish.
          </div>
        </div>
      </div>

      {/* Rewards Portfolio (Status: ISSUED -> REDEEMED / EXPIRED / CANCELLED) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              Active Milestone Rewards (Auto-Applied on Next Payment)
            </h3>
            <p className="text-xs text-slate-500">
              Rewards are valid for 45-60 days (~2x your visit gap). One 15-day extension available!
            </p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
            {customer.rewards?.filter(r => r.status === "ISSUED").length || 0} Ready to Apply
          </span>
        </div>

        {customer.rewards && customer.rewards.length > 0 ? (
          <div className="space-y-3">
            {customer.rewards.map((rew) => {
              const isIssued = rew.status === "ISSUED";
              const isRedeemed = rew.status === "REDEEMED";
              const isCancelled = rew.status === "CANCELLED";

              return (
                <div
                  key={rew.reward_id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isIssued
                      ? "bg-amber-50/70 border-amber-300 shadow-sm"
                      : isRedeemed
                      ? "bg-slate-50 border-slate-200 opacity-80"
                      : "bg-rose-50 border-rose-200 opacity-80"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        ₹{rew.value} {rew.tier_name} Inaam
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        isIssued ? "bg-emerald-600 text-white" : isRedeemed ? "bg-slate-300 text-slate-700" : "bg-rose-600 text-white"
                      }`}>
                        {rew.status}
                      </span>
                      {rew.extended && (
                        <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-1.5 rounded">
                          +15d Extended
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Expires: {formatISTDisplay(rew.expires_at)}
                      </span>
                      {isIssued && (
                        <span className="text-emerald-700 font-bold">
                          • Auto-deducts on next bill
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: +15 Day Extension */}
                  {isIssued && !rew.extended && (
                    <button
                      onClick={() => handleExtend(rew.reward_id)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm shrink-0 flex items-center gap-1.5"
                      title="Extend validity by 15 days for in-store visit"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Extend +15 Days</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            No rewards issued yet. Spend ₹{gapToNext} more in this 90-day season to cross {nextTier.name}!
          </div>
        )}
      </div>

      {/* Daily Shoppers: 10-Visit Stamp Card */}
      {customer.segment === "daily" && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">☕</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Daily Buyer "Pakki Bachat" Stamp Card
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                For daily essentials (milk, bread, chai) — 10 visits = {customer.stampCard?.freeItem || "1 Free Item"}!
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              {customer.stampCard?.visits || 7} / 10 Visits
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isFilled = idx < (customer.stampCard?.visits || 7);
              return (
                <div
                  key={idx}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${
                    isFilled
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  {isFilled ? "✓" : idx + 1}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Points Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                Bachat Points Ledger (Append-Only)
              </h3>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {customer.pointsWallet?.ledger && customer.pointsWallet.ledger.length > 0 ? (
                customer.pointsWallet.ledger.map((l) => (
                  <div key={l.entry_id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                    <div>
                      <div className="font-bold text-slate-800">{l.reason === "EARN" ? "Bachat Earned" : l.reason}</div>
                      <div className="text-[10px] text-slate-500">{formatISTDisplay(l.created_at)}</div>
                    </div>
                    <div className={`font-mono font-bold ${l.points > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {l.points > 0 ? `+${l.points}` : l.points} pts
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400">
                  Earn 1 Bachat Point for every ₹100 spend.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLedgerModal(false)}
              className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
