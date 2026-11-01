import React from 'react';
import { Store, ChevronDown, Radio } from 'lucide-react';
import { soundbox } from '../utils/soundboxAudio';

export default function Header({
  merchants,
  activeMerchant,
  onSelectMerchant,
  currentLanguage,
  onLanguageChange,
  soundboxPlaying = false
}) {
  const handleTestChime = () => {
    soundbox.playPaytmChime();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Lockup */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0d3b66] flex items-center justify-center text-white font-black text-base">
              <span className="text-[#93c5fd]">₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">Paytm Vriddhi</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Merchant Growth Suite: Buy Smarter, Sell Better
              </p>
            </div>
          </div>

          {/* Right Controls: Merchant Context & Soundbox Pill */}
          <div className="flex items-center gap-2.5">
            {/* Merchant Selector */}
            <div className="relative">
              <label className="flex items-center gap-2 bg-[#fafbf9] hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer transition text-xs font-semibold text-slate-800">
                <Store className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={activeMerchant.id}
                  onChange={(e) => onSelectMerchant(e.target.value)}
                  className="bg-transparent border-0 outline-none pr-4 cursor-pointer text-slate-900 font-bold text-xs"
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.area}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
              </label>
            </div>

            {/* Soundbox Status & Language Control */}
            <div className="flex items-center gap-1 bg-[#e8f2fa] border border-[#cbe0f0] rounded-lg p-0.5">
              <button
                onClick={handleTestChime}
                title="Test Soundbox Chime"
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold text-[#0d3b66] hover:bg-white transition"
              >
                <span className={`w-2 h-2 rounded-full ${soundboxPlaying ? 'bg-amber-500 animate-ping' : 'bg-emerald-600'}`} />
                <span className="hidden md:inline text-[11px]">Soundbox 4.0</span>
                <Radio className="w-3.5 h-3.5 text-[#0d3b66]" />
              </button>

              <div className="h-3.5 w-px bg-[#cbe0f0] mx-0.5" />

              <div className="flex items-center gap-0.5">
                {[
                  { id: 'hinglish', label: 'Hinglish' },
                  { id: 'hindi', label: 'हिंदी' },
                  { id: 'english', label: 'EN' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => onLanguageChange(lang.id)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition ${
                      currentLanguage === lang.id
                        ? 'bg-[#0d3b66] text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
