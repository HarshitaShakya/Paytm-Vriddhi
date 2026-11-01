import React, { useRef, useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Gift, Sparkles, Check, Share2, Clock, ShieldCheck, Tag } from "lucide-react";
import { soundbox } from "../utils/soundboxAudio";

export default function LuckyDabbaScratchCard({
  reward,
  customerName = "Rahul Sharma",
  merchantName = "Sharma Kirana",
  onScratchedComplete
}) {
  const canvasRef = useRef(null);
  const [isScratched, setIsScratched] = useState(reward?.scratched || false);
  const [scratchPercent, setScratchPercent] = useState(reward?.scratched ? 100 : 0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Default reward fallback if none provided
  const activeReward = reward || {
    title: "₹100 Lucky Dabba Cashback",
    value: 100,
    type: "cashback",
    sponsor: "Sharma Kirana Store",
    code: "LUCKY-100-8842",
    expiryDays: 15,
    isBrandSponsored: false
  };

  useEffect(() => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Draw metallic golden foil gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f59e0b");
    gradient.addColorStop(0.3, "#fef08a");
    gradient.addColorStop(0.5, "#d97706");
    gradient.addColorStop(0.8, "#fef08a");
    gradient.addColorStop(1, "#b45309");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative pattern on foil
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    for (let i = 0; i < width; i += 24) {
      for (let j = 0; j < height; j += 24) {
        ctx.beginPath();
        ctx.arc(i + 12, j + 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Text instructions on scratch foil
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎁 LUCKY DABBA 🎁", width / 2, height / 2 - 14);

    ctx.fillStyle = "#92400e";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Yahan scratch karein!", width / 2, height / 2 + 10);
    ctx.fillText("(Scratch to reveal reward)", width / 2, height / 2 + 28);
  }, [isScratched]);

  const scratch = (clientX, clientY) => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkScratchProgress();
  };

  const checkScratchProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    const percent = Math.round((transparentPixels / (pixels.length / 4)) * 100);
    setScratchPercent(percent);

    if (percent > 42 && !isScratched) {
      revealFullReward();
    }
  };

  const revealFullReward = () => {
    setIsScratched(true);
    setScratchPercent(100);

    // Launch celebratory confetti explosion
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00BAF2", "#f59e0b", "#10b981", "#6366f1"]
      });
    } catch (e) {
      console.warn("Confetti error:", e);
    }

    soundbox.playFanfareChime();
    if (onScratchedComplete) {
      onScratchedComplete(activeReward);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    scratch(e.clientX, e.clientY);
  };

  const handleShareWhatsApp = () => {
    const shareText = `Maine ${merchantName} par shopping karke jeeta: "${activeReward.title}"! 🎉 Paytm Loyalty Soundbox par mera Lucky Dabba khul gaya! Tum bhi aao!`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    
    // Copy to clipboard for easy demo
    navigator.clipboard?.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);

    // Open WhatsApp in new tab if allowed
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="bg-[#fcf5e5] border border-[#eddcb8] rounded-xl p-5 max-w-sm mx-auto text-slate-800 relative">
      {/* Badge Top */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-white px-2.5 py-1 rounded-full border border-[#eddcb8]">
          <Gift className="w-3.5 h-3.5 text-amber-600" />
          Paytm Lucky Dabba
        </span>
        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-rose-500" />
          Valid for 15 Days
        </span>
      </div>

      {/* Interactive Scratch Area Card */}
      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-white border border-[#eddcb8] flex flex-col items-center justify-center p-4 text-center">
        {/* Underlying Hidden Reward Details */}
        <div className="flex flex-col items-center justify-center space-y-2 z-0">
          <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center shadow-inner">
            <Sparkles className="w-7 h-7 text-amber-600 animate-spin" />
          </div>

          <div className="text-xl font-extrabold text-slate-900 leading-tight">
            {activeReward.title}
          </div>

          {activeReward.isBrandSponsored ? (
            <div className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              ⭐ 100% Brand Sponsored by {activeReward.sponsor}
            </div>
          ) : (
            <div className="text-xs text-slate-600">
              Sponsored by: <span className="font-semibold text-slate-800">{activeReward.sponsor}</span>
            </div>
          )}

          <div className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300 flex items-center gap-1">
            <Tag className="w-3 h-3 text-sky-600" />
            Code: {activeReward.code || "LUCKY-100-8842"}
          </div>

          <div className="text-[10px] text-rose-600 font-medium">
            Expires in 15 days • Show code at checkout
          </div>
        </div>

        {/* Scratch Canvas Overlay */}
        {!isScratched && (
          <canvas
            ref={canvasRef}
            width={320}
            height={224}
            className="scratch-canvas absolute inset-0 w-full h-full z-10"
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={() => setIsDrawing(true)}
            onTouchEnd={() => setIsDrawing(false)}
            onTouchMove={handleTouchMove}
          />
        )}
      </div>

      {/* Progress & Quick Reveal Button */}
      {!isScratched && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>Scratched: {scratchPercent}%</span>
          <button
            onClick={revealFullReward}
            className="text-[11px] text-sky-700 hover:text-sky-900 font-medium underline"
          >
            Quick Reveal ✨
          </button>
        </div>
      )}

      {/* Action Buttons when revealed */}
      {isScratched && (
        <div className="mt-4 space-y-2">
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-2 px-3 rounded-xl font-bold text-xs shadow transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedShare ? "Copied! Opening WhatsApp..." : "Share Win on WhatsApp Status"}</span>
          </button>
          
          <div className="text-center text-[10px] text-slate-500">
            Show this digital coupon to <span className="font-semibold">{merchantName}</span> during your next visit.
          </div>
        </div>
      )}
    </div>
  );
}

