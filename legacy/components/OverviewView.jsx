import React from 'react';
import { 
  ArrowRight, 
  TrendingUp, 
  ShoppingBag, 
  Radio, 
  Users, 
  Sparkles, 
  ArrowRightLeft,
  Bot
} from 'lucide-react';

export default function OverviewView({
  activeMerchant,
  customers,
  procurementOrders,
  recentTransactions,
  distributorRadarItems,
  onNavigate
}) {
  const totalSales = activeMerchant.stats?.totalMonthlySales || 42800;
  const repeatCount = customers.filter(c => c.monthlySpend > 0).length || 24;
  const estimatedSavings = distributorRadarItems.reduce((acc, item) => acc + (item.monthlyLossAtVolume || 0), 0);
  const outstandingLiability = customers.reduce((sum, c) => {
    const pointsValue = Math.floor((c.pointsWallet?.balance || 0) / 10);
    const voucherValue = (c.rewards || []).filter(r => r.status === 'ISSUED').reduce((v, r) => v + (r.rewardValue || 0), 0);
    return sum + pointsValue + voucherValue;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Flat Pastel Hero */}
      <section className="bg-[#e6efe9] border border-[#c8dcd0] rounded-xl p-5 sm:p-6 text-slate-900">
        <div className="max-w-2xl">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Buy Smarter on Mandi. Reinvest Saved Margin in Loyalty.
          </h1>
          <p className="mt-1.5 text-xs text-slate-600">
            Cut wholesale distributor overcharges to fund customer loyalty rewards on the Soundbox.
          </p>
        </div>

        {/* Minimal 3-Step Flywheel Strip */}
        <div className="mt-4 pt-4 border-t border-[#c8dcd0] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-[#c8dcd0]">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>Distributor Price Radar</span>
            </div>
            <div className="mt-1 text-xs font-mono font-bold text-[#1b4332]">
              +₹{estimatedSavings.toLocaleString('en-IN')}/mo margin recovered
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-[#c8dcd0]">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#78350f]" />
              <span>Margin Funds Rewards</span>
            </div>
            <div className="mt-1 text-xs font-mono font-bold text-[#78350f]">
              Self-funded retention loop
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-[#c8dcd0]">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#0d3b66]" />
              <span>Soundbox 4.0 Loyalty</span>
            </div>
            <div className="mt-1 text-xs font-mono font-bold text-[#0d3b66]">
              4.8% cashback · 2.4x repeat rate
            </div>
          </div>
        </div>
      </section>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="sheet-card p-3.5">
          <div className="text-[11px] font-bold text-slate-500">Monthly Sales</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            ₹{totalSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            +18.4% vs last month
          </div>
        </div>

        <div className="bg-[#e6efe9] border border-[#c8dcd0] rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-[#1b4332]">Wholesale Savings</div>
          <div className="text-xl font-bold font-mono text-[#1b4332] mt-0.5">
            ₹{estimatedSavings.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#1b4332] mt-0.5">
            5 items below median
          </div>
        </div>

        <div className="sheet-card p-3.5">
          <div className="text-[11px] font-bold text-slate-500">Repeat Customers</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {repeatCount} / {customers.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Regulars this cycle
          </div>
        </div>

        <div className="bg-[#e8f2fa] border border-[#cbe0f0] rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-[#0d3b66]">Bachat Points</div>
          <div className="text-xl font-bold font-mono text-[#0d3b66] mt-0.5">
            12,840
          </div>
          <div className="text-[10px] text-[#0d3b66] mt-0.5">
            Layer 1 balance
          </div>
        </div>

        <div className="bg-[#fcf5e5] border border-[#eddcb8] rounded-xl p-3.5 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-bold text-[#78350f]">Pending Inaam</div>
          <div className="text-xl font-bold font-mono text-[#78350f] mt-0.5">
            ₹{outstandingLiability.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#78350f] mt-0.5">
            Voucher liability
          </div>
        </div>
      </div>

      {/* Quick Launch Workspaces - Concise without repeating descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('munim')}
          className="sheet-card p-3 text-left hover:border-slate-400 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#002970]/10 text-[#002970] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Munim Voice AI</div>
              <div className="text-[10px] text-slate-500">Voice Order Desk & Reminders</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={() => onNavigate('loyalty', 'pos')}
          className="sheet-card p-3 text-left hover:border-slate-400 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f2fa] text-[#0d3b66] flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">Soundbox POS</div>
              <div className="text-[10px] text-slate-500">3-Layer Terminal</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={() => onNavigate('bridge', 'reinvestment')}
          className="sheet-card p-3 text-left hover:border-slate-400 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fcf5e5] text-[#78350f] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">AI Kirana Advisor</div>
              <div className="text-[10px] text-slate-500">Reinvestment Bridge</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Dual Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Buy-Side Recent Restocks */}
        <div className="sheet-canvas p-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Recent Mandi Orders</h3>
              <p className="text-[10px] text-slate-500">Wholesale orders sent to suppliers</p>
            </div>
            <button
              onClick={() => onNavigate('munim')}
              className="text-[11px] font-bold text-[#1b4332] hover:underline"
            >
              Open Munim ({procurementOrders.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-1">
            {procurementOrders.slice(0, 4).map((order) => (
              <div key={order.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-[#0d3b66]">{order.id}</span>
                    <span>·</span>
                    <span>{order.items}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {order.seller} · {order.placed}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 text-xs">
                    ₹{order.value.toLocaleString('en-IN')}
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full mt-0.5 ${
                    order.status === 'Delivered'
                      ? 'bg-[#e6efe9] text-[#1b4332]'
                      : 'bg-[#fcf5e5] text-[#78350f]'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sell-Side Recent Customer Payments */}
        <div className="sheet-canvas p-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Customer Loyalty Stream</h3>
              <p className="text-[10px] text-slate-500">UPI payments broadcasted on Soundbox</p>
            </div>
            <button
              onClick={() => onNavigate('loyalty', 'pos')}
              className="text-[11px] font-bold text-[#0d3b66] hover:underline"
            >
              Open POS →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-1">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {tx.customerName}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {tx.eventType} · {tx.time}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-[#1b4332] text-xs">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full mt-0.5 bg-[#e6efe9] text-[#1b4332]">
                      Announced
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No customer transactions in this session yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
