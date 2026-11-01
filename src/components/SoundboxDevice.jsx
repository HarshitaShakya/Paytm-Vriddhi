import React, { useState, useEffect, useRef } from "react";
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Radio, 
  Sparkles, 
  ShieldAlert, 
  Gift, 
  CheckCircle2, 
  TrendingUp,
  Languages,
  Info
} from "lucide-react";
import { soundbox } from "../utils/soundboxAudio";
import { buildLeaderboardAnnouncement } from "../utils/speechScripts";

export default function SoundboxDevice({
  activeMerchant,
  lastAnnouncement,
  currentLanguage,
  onLanguageChange,
  topSpenders = []
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [ringColor, setRingColor] = useState("idle"); // idle, green, gold, blue, amber
  const [transcript, setTranscript] = useState(
    lastAnnouncement?.text || "Paytm Soundbox 4.0 Pro ready. Waiting for payment..."
  );

  const isFirstRender = useRef(true);

  // Handle external announcement from POS Simulator
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // Do NOT auto-play on initial page load before user gesture
    }

    if (lastAnnouncement && lastAnnouncement.type !== "ready") {
      setTranscript(lastAnnouncement.text);
      triggerAnnouncementVisuals(lastAnnouncement.type, lastAnnouncement.text, currentLanguage);
    }
  }, [lastAnnouncement]);

  const triggerAnnouncementVisuals = (type, customText = null, langOverride = null) => {
    const textToSpeak = customText || transcript || "Paytm par payment safal raha.";
    const language = langOverride || currentLanguage;

    setIsPlaying(true);
    if (type === "lucky_dabba" || type === "tier_upgrade" || type === "festival" || type === "leaderboard") {
      setRingColor("gold");
    } else if (type === "progress_nudge") {
      setRingColor("blue");
    } else if (type === "fraud") {
      setRingColor("amber");
    } else {
      setRingColor("green");
    }

    soundbox.announce({
      type: type || "payment",
      speechText: textToSpeak,
      lang: language,
      onStart: () => setIsPlaying(true),
      onEnd: () => {
        setIsPlaying(false);
        setActivePreset(null);
        setTimeout(() => setRingColor("idle"), 2000);
      }
    });
  };

  const handleReplay = () => {
    if (!transcript) return;
    triggerAnnouncementVisuals(lastAnnouncement?.type || "payment", transcript, currentLanguage);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundbox.isMuted = nextMuted;
    if (nextMuted) {
      soundbox.stop();
      setIsPlaying(false);
    }
  };

  // Instant Language Switching with Voice Feedback (Zero Lag)
  const handleLanguageSwitch = (newLang) => {
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }

    soundbox.stop();
    let confirmationText = "";
    if (newLang === "hindi") {
      confirmationText = "हिंदी भाषा चुनी गई। पेटीएम साउंडबॉक्स तैयार है।";
    } else if (newLang === "english") {
      confirmationText = "English voice selected. Paytm Soundbox is ready.";
    } else {
      confirmationText = "Hinglish voice chuna gaya. Badhai ho, Soundbox taiyar hai!";
    }

    setTranscript(confirmationText);
    triggerAnnouncementVisuals("payment", confirmationText, newLang);
  };

  // Fast preset audio testing with instant language adaptation
  const playTestPreset = (presetType) => {
    setActivePreset(presetType);
    let text = "";
    let type = presetType;

    if (presetType === "lucky_dabba") {
      if (currentLanguage === "hindi") {
        text = "पेटीएम पर 500 रुपये प्राप्त हुए। बधाई हो राहुल भैया, आपका लकी डब्बा खुल गया!";
      } else if (currentLanguage === "english") {
        text = "Rupees 500 received on Paytm. Congratulations Rahul, your Lucky Dabba reward is unlocked!";
      } else {
        text = "Paytm par 500 rupaye prapt hue. Badhai ho Rahul bhaiya, aapka Lucky Dabba khul gaya!";
      }
    } else if (presetType === "progress_nudge") {
      if (currentLanguage === "hindi") {
        text = "पेटीएम पर 300 रुपये प्राप्त हुए। सिर्फ 200 रुपये और, आपका 100 रुपये का ईनाम पक्का!";
      } else if (currentLanguage === "english") {
        text = "Rupees 300 received on Paytm. Just rupees 200 more to unlock your Rupees 100 reward!";
      } else {
        text = "Paytm par 300 rupaye prapt hue. Sirf 200 rupaye aur, aapka 100 rupaye ka inaam pakka!";
      }
    } else if (presetType === "tier_upgrade") {
      if (currentLanguage === "hindi") {
        text = "पेटीएम पर 1200 रुपये प्राप्त हुए। शानदार! बधाई हो पूजा जी, आप बन गई हैं शान-ए-मोहल्ला!";
      } else if (currentLanguage === "english") {
        text = "Rupees 1200 received on Paytm. Congratulations Pooja, you are now Shaan-e-Mohalla of Sharma Store!";
      } else {
        text = "Paytm par 1200 rupaye prapt hue. Shandar! Badhai ho Pooja ji, aap ban gayi hain Shaan-e-Mohalla!";
      }
    } else if (presetType === "fraud") {
      if (currentLanguage === "hindi") {
        text = "पेटीएम पर 10 रुपये प्राप्त हुए। ध्यान दें: संदिग्ध भुगतान पैटर्न डिटेक्ट हुआ है। लॉयल्टी पॉइंट्स नहीं जोड़े गए।";
      } else if (currentLanguage === "english") {
        text = "Rupees 10 received on Paytm. Suspicious payment pattern flagged. Excluded from loyalty rewards.";
      } else {
        text = "Paytm par 10 rupaye prapt hue. Dhyan dein: suspicious payment flag hui hai. Loyalty points add nahi honge.";
      }
    } else if (presetType === "leaderboard") {
      text = buildLeaderboardAnnouncement(topSpenders, activeMerchant?.name || "Sharma Kirana", currentLanguage);
    } else {
      // Normal ₹250
      if (currentLanguage === "hindi") {
        text = "पेटीएम पर 250 रुपये प्राप्त हुए।";
      } else if (currentLanguage === "english") {
        text = "Rupees 250 received on Paytm.";
      } else {
        text = "Paytm par 250 rupaye prapt hue.";
      }
    }

    setTranscript(text);
    triggerAnnouncementVisuals(type, text, currentLanguage);
  };

  const ringStyles = {
    idle: "border-slate-300 bg-slate-50",
    green: "border-emerald-500 bg-[#e6efe9]",
    gold: "border-amber-400 bg-[#fcf5e5]",
    blue: "border-[#002970] bg-[#e8f2fa]",
    amber: "border-rose-400 bg-[#fbeeed]"
  };

  return (
    <div className="bg-[#e8f2fa] text-slate-900 rounded-xl p-5 border border-[#cbe0f0] max-w-xl mx-auto">
      {/* Top Device Header */}
      <div className="flex items-center justify-between border-b border-[#cbe0f0] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#002970] flex items-center justify-center font-bold text-white text-xs tracking-wider">
            Paytm
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              Paytm Soundbox 4.0 Pro
              <span className="text-[10px] bg-white text-emerald-800 px-1.5 py-0.5 rounded font-medium border border-emerald-300">
                Voice Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-600">
              {activeMerchant?.name} • {activeMerchant?.area}
            </p>
          </div>
        </div>

        {/* Language dialect switcher with instant audio confirmation */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#cbe0f0] text-xs">
          <button
            onClick={() => handleLanguageSwitch("hinglish")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition transform active:scale-95 ${
              currentLanguage === "hinglish"
                ? "bg-[#002970] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Switch to Hinglish natural kirana voice"
          >
            Hinglish
          </button>
          <button
            onClick={() => handleLanguageSwitch("hindi")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition transform active:scale-95 ${
              currentLanguage === "hindi"
                ? "bg-[#002970] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="हिंदी आवाज़ में सुनें"
          >
            हिंदी
          </button>
          <button
            onClick={() => handleLanguageSwitch("english")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition transform active:scale-95 ${
              currentLanguage === "english"
                ? "bg-[#002970] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Switch to Indian English voice"
          >
            English
          </button>
        </div>
      </div>

      {/* Main Soundbox 3D Hardware Simulation Box */}
      <div className="relative bg-white rounded-xl p-6 border border-[#cbe0f0] flex flex-col items-center">
        {/* Glow Ring Indicator */}
        <div
          className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 relative ${
            ringStyles[ringColor]
          }`}
        >
          {/* Pulsing halo effect when playing */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full animate-ring-pulse border-2 border-emerald-400 pointer-events-none" />
          )}

          {/* Speaker mesh with animated sound frequency bars */}
          <div className="flex items-center justify-center gap-1.5 h-10 w-20">
            {isPlaying ? (
              <>
                <div className="w-1.5 bg-emerald-500 rounded-full animate-soundwave-1" />
                <div className="w-1.5 bg-sky-600 rounded-full animate-soundwave-2" />
                <div className="w-1.5 bg-amber-500 rounded-full animate-soundwave-3" />
                <div className="w-1.5 bg-sky-600 rounded-full animate-soundwave-4" />
                <div className="w-1.5 bg-emerald-500 rounded-full animate-soundwave-5" />
              </>
            ) : (
              <div className="flex gap-1">
                <div className="w-1.5 h-2 bg-slate-400 rounded-full" />
                <div className="w-1.5 h-3 bg-slate-400 rounded-full" />
                <div className="w-1.5 h-4 bg-slate-500 rounded-full" />
                <div className="w-1.5 h-3 bg-slate-400 rounded-full" />
                <div className="w-1.5 h-2 bg-slate-400 rounded-full" />
              </div>
            )}
          </div>

          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mt-1">
            {isPlaying ? "Broadcasting..." : "Soundbox Ready"}
          </div>
        </div>

        {/* Digital LCD Dot-Matrix Display */}
        <div className="w-full mt-5 bg-[#0f172a] rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono mb-1">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              UPI 2.0 CONNECTED ({currentLanguage.toUpperCase()})
            </span>
            <span className="text-slate-400 font-sans text-[10px]">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Announcement text on display */}
          <div className="font-mono text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide min-h-[44px] flex items-center justify-center text-center px-2 py-1 bg-black/40 rounded border border-emerald-900/40">
            "{transcript}"
          </div>
        </div>

        {/* Physical hardware control buttons */}
        <div className="flex items-center justify-between w-full mt-4 px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                isMuted
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              title={isMuted ? "Unmute Soundbox Voice" : "Mute Soundbox Voice"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{isMuted ? "Muted" : "Speaker ON"}</span>
            </button>

            <button
              onClick={handleReplay}
              disabled={isPlaying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition active:scale-95"
              title="Repeat last announcement"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isPlaying ? "animate-spin" : ""}`} />
              <span>Replay Voice</span>
            </button>
          </div>

          {/* Soundbox hardware badge */}
          <div className="text-[10px] text-slate-500 font-mono tracking-wider">
            SN: SBX-NOIDA-9942
          </div>
        </div>
      </div>

      {/* Voice Demo Quick Presets */}
      <div className="mt-4 pt-3 border-t border-[#cbe0f0]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick Demo Voice Presets:
          </span>
          <span className="text-[10px] text-slate-600 font-medium">Tap to hear live</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => playTestPreset("payment")}
            className={`flex items-center gap-1.5 text-left p-2 rounded-lg border text-[11px] transition transform active:scale-95 cursor-pointer ${
              activePreset === "payment"
                ? "bg-[#e6efe9] border-emerald-600 text-emerald-900 font-bold"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Normal ₹250</span>
          </button>

          <button
            onClick={() => playTestPreset("lucky_dabba")}
            className={`flex items-center gap-1.5 text-left p-2 rounded-lg border text-[11px] transition transform active:scale-95 cursor-pointer ${
              activePreset === "lucky_dabba"
                ? "bg-[#fcf5e5] border-amber-500 text-amber-900 font-bold"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Lucky Dabba Unlocked!</span>
          </button>

          <button
            onClick={() => playTestPreset("progress_nudge")}
            className={`flex items-center gap-1.5 text-left p-2 rounded-lg border text-[11px] transition transform active:scale-95 cursor-pointer ${
              activePreset === "progress_nudge"
                ? "bg-[#e8f2fa] border-sky-600 text-sky-950 font-bold"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Progress Nudge (Sirf ₹200 aur)</span>
          </button>

          <button
            onClick={() => playTestPreset("tier_upgrade")}
            className={`flex items-center gap-1.5 text-left p-2 rounded-lg border text-[11px] transition transform active:scale-95 cursor-pointer ${
              activePreset === "tier_upgrade"
                ? "bg-purple-50 border-purple-400 text-purple-900 font-bold"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Shaan-e-Mohalla Upgrade</span>
          </button>

          <button
            onClick={() => playTestPreset("fraud")}
            className={`flex items-center gap-1.5 text-left p-2 rounded-lg border text-[11px] transition transform active:scale-95 cursor-pointer ${
              activePreset === "fraud"
                ? "bg-[#fbeeed] border-rose-400 text-rose-900 font-bold"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Fraud/Circular Alert</span>
          </button>

          <button
            onClick={() => playTestPreset("leaderboard")}
            className={`flex items-center gap-1.5 text-left p-2 rounded-lg border text-[11px] transition transform active:scale-95 cursor-pointer ${
              activePreset === "leaderboard"
                ? "bg-[#fcf5e5] border-amber-500 text-amber-900 font-bold"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>1st of Month Star Spenders</span>
          </button>
        </div>
      </div>
    </div>
  );
}
