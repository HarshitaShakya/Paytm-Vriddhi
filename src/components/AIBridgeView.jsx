import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRightLeft, 
  TrendingUp, 
  ShieldCheck, 
  Store, 
  DollarSign, 
  Clock, 
  Package, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  ShoppingBag,
  Radio
} from 'lucide-react';
import { AI_RECOMMENDATIONS } from '../data/mockData';
import { DISTRIBUTOR_RADAR_ITEMS } from '../data/mandiData';

export default function AIBridgeView({
  activeMerchant,
  onUpdateThreshold,
  onToggleSlowHourBoost,
  onNavigate,
  onToast
}) {
  const [appliedThreshold, setAppliedThreshold] = useState(false);
  const [boostEnabled, setBoostEnabled] = useState(activeMerchant.slowHourBoost?.enabled ?? true);
  const [clearedItems, setClearedItems] = useState({});

  const rec = AI_RECOMMENDATIONS[activeMerchant.id] || AI_RECOMMENDATIONS.m_sharma_kirana;
  const totalWholesaleSavings = DISTRIBUTOR_RADAR_ITEMS.reduce((sum, item) => sum + item.monthlyLossAtVolume, 0);
  const loyaltyMonthlyBudget = activeMerchant.monthlyBudgetCap || 4000;
  const rewardsFundedCount = Math.floor(totalWholesaleSavings / 100);

  const handleApplyThreshold = () => {
    onUpdateThreshold(rec.thresholdRecommendation.recommendedThreshold);
    setAppliedThreshold(true);
    onToast?.(`Threshold updated to ₹${rec.thresholdRecommendation.recommendedThreshold} / month`);
    setTimeout(() => setAppliedThreshold(false), 3000);
  };

  const handleToggleBoost = () => {
    const next = !boostEnabled;
    setBoostEnabled(next);
    onToggleSlowHourBoost(next);
    onToast?.(next ? 'Slow-hour 1.5x loyalty points enabled' : 'Slow-hour boost paused');
  };

  const handleClearItem = (idx) => {
    setClearedItems(prev => ({ ...prev, [idx]: true }));
    onToast?.('Item packaged into Lucky Dabba gift reward pool at ₹0 store cost!');
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-[#e6efe9] text-slate-900 rounded-xl p-6 sm:p-8 border border-[#c8dcd0]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Self-funding reinvestment bridge</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Self-Funded Customer Loyalty Engine
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              Every rupee saved on Mandi procurement directly funds customer cashbacks and rewards. Zero outside capital required.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#c8dcd0] text-center shrink-0 min-w-[200px]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1b4332]">
              ₹{totalWholesaleSavings.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Monthly Buying Margin Recovered
            </div>
            <div className="mt-2 text-[10px] bg-[#e6efe9] text-[#1b4332] px-2 py-0.5 rounded-full inline-block font-semibold border border-[#c8dcd0]">
              Funds {rewardsFundedCount} × ₹100 Customer Rewards
            </div>
          </div>
        </div>
      </div>

      {/* The Reinvestment Equation Breakdown */}
      <div className="sheet-canvas p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">The Closed Reinvestment Ledger</h3>
            <p className="text-xs text-slate-500">Live economic balance between buy-side savings & sell-side customer rewards</p>
          </div>
          <span className="badge badge-teal font-mono">100% Self-Funded</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-bold text-[#0d695b] uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>1. Mandi Radar Savings</span>
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              +₹{totalWholesaleSavings.toLocaleString('en-IN')} / mo
            </div>
            <p className="text-slate-600 text-[11px]">
              Overcharge recovered on 5 staple SKUs (Tata Salt, Bail Kolhu Oil, Sugar, Parle-G) using verified area median rates.
            </p>
            <button
              onClick={() => onNavigate('procurement', 'radar')}
              className="text-[#0d695b] font-bold hover:underline flex items-center gap-1 text-[11px] pt-1"
            >
              <span>View Overcharge Radar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-bold text-[#002970] uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>2. Soundbox Loyalty Budget</span>
            </div>
            <div className="text-xl font-black font-mono text-[#002970]">
              -₹2,400 / mo
            </div>
            <p className="text-slate-600 text-[11px]">
              Covers 18 Pakka Grahak (₹10) and 9 Khaas Grahak (₹40) and 2 Shaan Grahak (₹100) rewards announced aloud on the Soundbox.
            </p>
            <button
              onClick={() => onNavigate('loyalty', 'pos')}
              className="text-[#002970] font-bold hover:underline flex items-center gap-1 text-[11px] pt-1"
            >
              <span>View POS & Soundbox</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Net Monthly Store Lift</span>
            </div>
            <div className="text-xl font-black font-mono text-emerald-800">
              +₹{(totalWholesaleSavings - 2400).toLocaleString('en-IN')} / mo Free Cash
            </div>
            <p className="text-emerald-900 text-[11px]">
              Surplus margin retained after funding all loyalty rewards, plus +18.4% incremental repeat sales from regulars!
            </p>
            <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded inline-block">
              Zero Out-of-Pocket Expense
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Check Table: Top Customer Sales vs Wholesale Purchase Rate */}
      <div className="sheet-canvas p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Sales-to-Procurement Cross-Check
            </h3>
            <p className="text-xs text-slate-500">
              Top customer sellers from the Loyalty database checked against live wholesale rates
            </p>
          </div>
          <span className="badge badge-indigo">AI Diagnostic</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Top Store SKU</th>
                <th>Monthly Retail Volume</th>
                <th className="font-mono">Current Buy Rate</th>
                <th className="font-mono">Area Mandi Rate</th>
                <th className="font-mono">Overcharge Leak</th>
                <th>Loyalty Rewards It Can Fund</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-slate-900">Tata Salt (50kg bori)</td>
                <td className="text-slate-600 font-mono text-xs">40 boris / mo</td>
                <td className="font-mono text-slate-900 font-bold">₹540</td>
                <td className="font-mono text-emerald-700 font-bold">₹510 + 2 free</td>
                <td className="font-mono text-rose-600 font-bold">-₹1,200 / mo</td>
                <td className="text-xs text-slate-700 font-semibold">12 × ₹100 Shaan Rewards</td>
                <td>
                  <button
                    onClick={() => onNavigate('procurement', 'radar')}
                    className="btn-chip text-[11px]"
                  >
                    Open Counter-Offer
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-900">Bail Kolhu Mustard Oil</td>
                <td className="text-slate-600 font-mono text-xs">30 cartons / mo</td>
                <td className="font-mono text-slate-900 font-bold">₹1,420</td>
                <td className="font-mono text-emerald-700 font-bold">₹1,360</td>
                <td className="font-mono text-rose-600 font-bold">-₹1,800 / mo</td>
                <td className="text-xs text-slate-700 font-semibold">45 × ₹40 Khaas Rewards</td>
                <td>
                  <button
                    onClick={() => onNavigate('procurement', 'radar')}
                    className="btn-chip text-[11px]"
                  >
                    Open Counter-Offer
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-900">Madhur Sugar (50kg katta)</td>
                <td className="text-slate-600 font-mono text-xs">15 kattas / mo</td>
                <td className="font-mono text-slate-900 font-bold">₹2,150</td>
                <td className="font-mono text-emerald-700 font-bold">₹2,080</td>
                <td className="font-mono text-rose-600 font-bold">-₹1,050 / mo</td>
                <td className="text-xs text-slate-700 font-semibold">10 × ₹100 Shaan Rewards</td>
                <td>
                  <button
                    onClick={() => onNavigate('procurement', 'radar')}
                    className="btn-chip text-[11px]"
                  >
                    Open Counter-Offer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* The 4 AI Kirana Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Threshold Optimizer */}
        <div className="sheet-canvas p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              1. Spend Threshold Optimizer
            </h3>
            <span className="badge badge-indigo">
              Confidence {rec.thresholdRecommendation.confidenceScore}%
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Current Monthly Threshold:</span>
              <span className="font-mono font-bold text-slate-700">₹{activeMerchant.monthlyThreshold}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-900 font-bold">AI Recommended Target:</span>
              <span className="font-mono font-bold text-lg text-[#002970]">
                ₹{rec.thresholdRecommendation.recommendedThreshold}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Sector 18 Kirana Average:</span>
              <span className="font-mono text-slate-600">₹{rec.thresholdRecommendation.areaAverageThreshold}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 italic">
            "{rec.thresholdRecommendation.insightHinglish}"
          </p>

          <button
            onClick={handleApplyThreshold}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              appliedThreshold
                ? 'bg-emerald-600 text-white'
                : 'btn-primary'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{appliedThreshold ? 'Applied Successfully!' : 'Apply Recommended Threshold'}</span>
          </button>
        </div>

        {/* 2. Slow-Hour Footfall Booster */}
        <div className="sheet-canvas p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              2. Slow-Hour Footfall Booster
            </h3>
            <span className={`badge ${boostEnabled ? 'badge-green' : 'badge-slate'}`}>
              {boostEnabled ? 'Active (1.5x)' : 'Paused'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Detected Low Traffic Window:</span>
              <span className="font-mono font-bold text-slate-900">2:00 PM – 5:00 PM (Daily)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loyalty Multiplier:</span>
              <span className="font-mono font-bold text-amber-700">1.5x Bachat Points</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 italic">
            "{rec.slowHourAlert.rationale}"
          </p>

          <button
            onClick={handleToggleBoost}
            className="w-full btn-secondary py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-600" />
            <span>{boostEnabled ? 'Pause Slow-Hour Boost' : 'Enable 1.5x Multiplier'}</span>
          </button>
        </div>

        {/* 3. Dead-Stock Clearance via Lucky Dabba */}
        <div className="sheet-canvas p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              3. Dead-Stock Clearance via Lucky Dabba
            </h3>
            <span className="badge badge-indigo">₹0 Store Cost</span>
          </div>

          <div className="space-y-2">
            {(activeMerchant.deadStockItems || []).map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {item.quantity} units · Expiry in {item.expiryDays} days · Cost: ₹{item.unitCost}
                  </div>
                </div>
                <button
                  onClick={() => handleClearItem(idx)}
                  disabled={clearedItems[idx]}
                  className="btn-chip"
                >
                  {clearedItems[idx] ? '✓ In Dabba' : 'Move to Rewards'}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 italic">
            "{rec.deadStockRecommendation.rationale}"
          </p>
        </div>

        {/* 4. FMCG Brand Sponsorships */}
        <div className="sheet-canvas p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              4. FMCG Brand Sponsorships
            </h3>
            <span className="badge badge-teal">Brand Funded</span>
          </div>

          <div className="space-y-2">
            {(activeMerchant.sponsoredBrands || []).map((b, idx) => (
              <div key={idx} className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{b.brand}</div>
                  <div className="text-[11px] text-slate-500">
                    Sponsoring: {b.sponsoredItem} · Remaining: ₹{b.remainingBudget}
                  </div>
                </div>
                <span className="badge badge-green font-mono">
                  100% Co-Funded
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 italic">
            "{rec.brandSponsorship.rationale}"
          </p>
        </div>
      </div>
    </div>
  );
}

