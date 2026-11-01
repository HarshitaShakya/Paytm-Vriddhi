import React from 'react';
import { LayoutDashboard, ShoppingBag, Radio, Sparkles, Bot } from 'lucide-react';

export const NAV_TABS = [
  {
    id: 'overview',
    label: 'Suite Overview',
    icon: LayoutDashboard
  },
  {
    id: 'munim',
    label: 'Munim: Voice Assistant',
    icon: Bot,
    badge: 'AI'
  },
  {
    id: 'procurement',
    label: 'Buy Smarter: Mandi & Radar',
    icon: ShoppingBag
  },
  {
    id: 'loyalty',
    label: 'Sell Better: Soundbox Loyalty',
    icon: Radio
  },
  {
    id: 'bridge',
    label: 'AI Kirana Advisor',
    icon: Sparkles
  }
];

export default function Navigation({ activeTab, onSelectTab }) {
  return (
    <nav className="bg-[#fafbf9] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1.5 no-scrollbar">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0d3b66] border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0d3b66]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
