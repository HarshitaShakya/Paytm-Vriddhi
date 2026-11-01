import React from 'react';
import { ShieldCheck, Radio, Server, CheckCircle2 } from 'lucide-react';

export default function Footer({ activeMerchant }) {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Paytm Merchant Network</span>
            </div>
            <span>·</span>
            <span>Terminal: {activeMerchant.name} ({activeMerchant.pincode})</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-slate-600">UPI: {activeMerchant.upiId}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>APMC Anonymised Data Pool</span>
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <Radio className="w-3.5 h-3.5 text-[#002970]" />
              <span>Soundbox 4.0 Pro Ready</span>
            </span>
            <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              IST Sync
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

