import React, { useState } from 'react';
import { X, TrendingUp, Check } from 'lucide-react';

export default function RateUpdateModal({ isOpen, onClose, onSaveRate }) {
  const [crop, setCrop] = useState('onion');
  const [value, setValue] = useState(2840);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value > 0) {
      onSaveRate(crop, Number(value));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[#0d695b] text-xs font-bold uppercase tracking-wider mb-1">
          <TrendingUp className="w-4 h-4" />
          <span>APMC Indore Pilot</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">Update Live Mandi Rate</h3>
        <p className="text-xs text-slate-500 mt-1">
          Broadcast a verified wholesale mandi rate update to the district network.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Crop</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-900"
            >
              <option value="onion">Onion (प्याज) - Indore APMC</option>
              <option value="potato">Potato (आलू) - Indore APMC</option>
              <option value="tomato">Tomato (टमाटर) - Indore APMC</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Median Rate (₹ per quintal)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 2850"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-900"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-teal"
            >
              <Check className="w-4 h-4" />
              Save & Broadcast Rate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

