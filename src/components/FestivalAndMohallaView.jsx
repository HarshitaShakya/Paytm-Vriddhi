import React, { useState } from "react";
import { 
  Sparkles, 
  Award, 
  Crown, 
  Volume2, 
  Printer, 
  CheckCircle2, 
  QrCode, 
  Gift, 
  Users, 
  Calendar,
  Flame
} from "lucide-react";
import { FESTIVAL_TEMPLATES } from "../data/mockData";
import { soundbox } from "../utils/soundboxAudio";
import { buildLeaderboardAnnouncement } from "../utils/speechScripts";

export default function FestivalAndMohallaView({
  activeMerchant,
  currentFestival,
  onSelectFestival,
  customers,
  currentLanguage,
  onAnnounceLeaderboard
}) {
  const [announced, setAnnounced] = useState(false);

  // Safe helper for customer spend
  const getCustomerSpend = (c) => c?.activeSeason?.eligible_spend ?? c?.monthlySpend ?? 0;

  // Top 3 Spenders for Mohalla Leaderboard
  const topThree = [...(customers || [])]
    .filter(c => !c.isSuspicious)
    .sort((a, b) => getCustomerSpend(b) - getCustomerSpend(a))
    .slice(0, 3);

  const activeTemplate = FESTIVAL_TEMPLATES[currentFestival] || FESTIVAL_TEMPLATES.none || {
    id: "none",
    name: "Regular Kirana Mode",
    icon: "🛒",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    congratsLine: "Badhai ho {name}, aapka loyalty inaam khul gaya!"
  };

  const handleBroadcastLeaderboard = () => {
    const text = buildLeaderboardAnnouncement(topThree, activeMerchant?.name || "Sharma Kirana", currentLanguage);
    if (onAnnounceLeaderboard) {
      onAnnounceLeaderboard(text);
    }
    soundbox.announce({
      type: "leaderboard",
      speechText: text,
      lang: currentLanguage,
      onStart: () => setAnnounced(true),
      onEnd: () => setAnnounced(false)
    });
  };

  const handlePrintCounterCard = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* 1. Auto Festival Campaigns */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🪔</span>
              <h3 className="text-lg font-bold text-slate-900">
                Festival & Season Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              India runs on festivals! One-tap templates change thresholds, double rewards & Soundbox voice lines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Active Mode:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${activeTemplate.badgeColor}`}>
              {activeTemplate.icon} {activeTemplate.name}
            </span>
          </div>
        </div>

        {/* Festival Selection Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.values(FESTIVAL_TEMPLATES).map((f) => {
            const isSelected = currentFestival === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFestival(f.id)}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-400/40"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <span className="text-2xl">{f.icon}</span>
                <span className="text-xs font-bold text-slate-900">{f.name}</span>
                {f.doubleReward && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                    2x Rewards
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Festival Details Card */}
        {activeTemplate.id !== "none" && (
          <div className="bg-[#fcf5e5] border border-[#eddcb8] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Active Festive Campaign Rules:
              </span>
              <span className="text-[11px] font-semibold text-amber-800">
                Double Points Enabled ✨
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-[#eddcb8]">
                <div className="text-slate-500 text-[11px]">Threshold Discount</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {activeTemplate.thresholdDiscountPercent}% easier to hit threshold
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#eddcb8]">
                <div className="text-slate-500 text-[11px]">Festival Bonus Gift</div>
                <div className="font-bold text-amber-900 mt-0.5">
                  {activeTemplate.bonusGift}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#eddcb8]">
                <div className="text-slate-500 text-[11px]">Soundbox Voice Line</div>
                <div className="font-mono text-[10px] text-slate-700 italic mt-0.5">
                  "{activeTemplate.congratsLine.replace("{name}", "Rahul bhaiya")}"
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Mohalla Leaderboard ("Star Grahak of the Month") */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900">
                Mohalla Leaderboard (Star Grahak of the Month)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              The top 3 customers of the month are celebrated on the 1st of each month.
            </p>
          </div>

          <button
            onClick={handleBroadcastLeaderboard}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              announced
                ? "bg-amber-600 text-white animate-pulse"
                : "bg-[#78350f] hover:bg-[#92400e] text-white"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{announced ? "Announcing on Soundbox..." : "Announce Winners on Soundbox (1st of Month)"}</span>
          </button>
        </div>

        {/* Podium View for Top 3 Spenders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 (Silver) */}
          {topThree[1] && (
            <div className="order-2 md:order-1 bg-white rounded-xl p-5 border border-slate-200 text-center flex flex-col items-center justify-between space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xl font-bold">
                🥈
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Rank #2 • Star Grahak
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {topThree[1].name}
                </h4>
                <div className="text-xs font-mono font-bold text-[#0d3b66]">
                  ₹{getCustomerSpend(topThree[1]).toLocaleString()} spend
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {topThree[1].visitCount || 5} visits this month
                </div>
              </div>
              <div className="text-[11px] bg-slate-50 text-slate-700 font-semibold px-3 py-1 rounded-full border border-slate-200">
                Khaas Grahak Trophy
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Center) */}
          {topThree[0] && (
            <div className="order-1 md:order-2 bg-[#fcf5e5] rounded-xl p-6 border-2 border-amber-400 text-center flex flex-col items-center justify-between space-y-3 relative">
              <div className="absolute -top-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                Crown Champion 🥇
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-200 border-2 border-amber-400 flex items-center justify-center text-3xl font-bold">
                👑
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-[#eddcb8]">
                  Rank #1 • Shaan-e-Mohalla
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-1">
                  {topThree[0].name}
                </h4>
                <div className="text-base font-mono font-black text-amber-900">
                  ₹{getCustomerSpend(topThree[0]).toLocaleString()} spend
                </div>
                <div className="text-xs text-amber-900/80 mt-0.5 font-medium">
                  {topThree[0].visitCount || 8} visits • Top Kirana Customer
                </div>
              </div>
              <div className="text-xs bg-amber-600 text-white font-bold px-4 py-1.5 rounded-full">
                ₹300 Grand Prize + Counter Photo
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {topThree[2] && (
            <div className="order-3 bg-[#fbeeed] rounded-xl p-5 border border-rose-200 text-center flex flex-col items-center justify-between space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-xl font-bold">
                🥉
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Rank #3 • Star Grahak
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {topThree[2].name}
                </h4>
                <div className="text-xs font-mono font-bold text-[#0d3b66]">
                  ₹{getCustomerSpend(topThree[2]).toLocaleString()} spend
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {topThree[2].visitCount || 3} visits this month
                </div>
              </div>
              <div className="text-[11px] bg-white text-slate-700 font-semibold px-3 py-1 rounded-full border border-rose-200">
                Pakka Grahak Shield
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Printable Kirana Counter Display Standee */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-4 h-4 text-sky-600" />
              Counter Display QR Standee (Print & Place on Counter)
            </h3>
            <p className="text-xs text-slate-500">
              Kirana shops can display this standee on their billing counter to show off Star Customers and drive competition.
            </p>
          </div>

          <button
            onClick={handlePrintCounterCard}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Counter Standee</span>
          </button>
        </div>

        {/* Counter Display Graphic Card */}
        <div className="max-w-md mx-auto bg-[#e8f2fa] text-slate-900 rounded-xl p-6 border-2 border-[#cbe0f0] text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#002970] flex items-center justify-center font-bold text-white text-xs">
              Paytm
            </div>
            <div className="text-xs font-bold text-[#0d3b66] uppercase tracking-wider">
              Loyalty Soundbox Store
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">{activeMerchant?.name}</h2>
            <p className="text-xs text-slate-600">{activeMerchant?.area} • Pincode {activeMerchant?.pincode}</p>
          </div>

          {/* QR Code Placeholder Graphic */}
          <div className="bg-white p-4 rounded-xl inline-block border border-slate-200">
            <QrCode className="w-28 h-28 text-slate-900" />
            <div className="text-[10px] font-mono font-bold text-slate-700 mt-1">
              {activeMerchant?.upiId}
            </div>
          </div>

          <div className="bg-white border border-[#cbe0f0] rounded-xl p-3 text-left">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1 mb-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Iss Mahine Ke Star Grahak (Top Spenders):</span>
            </div>
            <div className="text-[11px] space-y-1 text-slate-700">
              <div>🥇 <strong>1st:</strong> {topThree[0]?.name || "Sharma ji"} (₹{getCustomerSpend(topThree[0])})</div>
              <div>🥈 <strong>2nd:</strong> {topThree[1]?.name || "Rahul"} (₹{getCustomerSpend(topThree[1])})</div>
              <div>🥉 <strong>3rd:</strong> {topThree[2]?.name || "Pooja ji"} (₹{getCustomerSpend(topThree[2])})</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-600">
            Pay via Paytm QR • 🥉 Pakka (₹1,000) • 🥈 Khaas (₹2,500) • 🥇 Shaan-e-Mohalla (₹5,000)
          </div>
        </div>
      </div>
    </div>
  );
}

