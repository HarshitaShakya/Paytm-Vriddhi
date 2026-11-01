// Soundbox Audio & Web Speech Synthesis Engine (Ultra-Snappy & Zero Lag)

class SoundboxEngine {
  constructor() {
    this.audioCtx = null;
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.voices = [];
    this.isMuted = false;
    this.currentUtterance = null;
    this.initAudioContext();
    this.initVoices();
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  initVoices() {
    if (!this.synth) return;
    // Load voices immediately and also on voiceschanged event
    const loadVoices = () => {
      try {
        this.voices = this.synth.getVoices() || [];
      } catch (e) {
        this.voices = [];
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Iconic Paytm Chime: Fast, bright 3-note ascending arpeggio (E5 -> G#5 -> B5)
  playPaytmChime() {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const notes = [
      { freq: 659.25, start: 0, duration: 0.09 },     // E5
      { freq: 830.61, start: 0.08, duration: 0.10 },   // G#5
      { freq: 987.77, start: 0.16, duration: 0.22 }    // B5
    ];

    notes.forEach(({ freq, start, duration }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      } catch (e) {
        console.warn("Chime note error:", e);
      }
    });
  }

  // Lucky Dabba Fanfare Chime: Upbeat celebration chord
  playFanfareChime() {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, start: 0, duration: 0.09 },     // C5
      { freq: 659.25, start: 0.08, duration: 0.09 },   // E5
      { freq: 783.99, start: 0.16, duration: 0.11 },   // G5
      { freq: 1046.50, start: 0.25, duration: 0.35 }   // C6
    ];

    notes.forEach(({ freq, start, duration }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.4, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      } catch (e) {
        console.warn("Fanfare error:", e);
      }
    });
  }

  // Warning chime for fraud / circular payment
  playWarningChime() {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const notes = [
      { freq: 440, start: 0, duration: 0.12 },
      { freq: 330, start: 0.12, duration: 0.22 }
    ];

    notes.forEach(({ freq, start, duration }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      } catch (e) {
        console.warn("Warning chime error:", e);
      }
    });
  }

  // Find the most authentic Indian voice or language-matched voice
  getBestVoice(lang = "hinglish") {
    if (!this.synth) return null;
    const voices = this.voices.length > 0 ? this.voices : (this.synth.getVoices() || []);
    if (!voices.length) return null;

    const isHindi = lang === "hindi" || lang === "hi-IN";
    const isHinglish = lang === "hinglish";
    const isEnglish = lang === "english" || lang === "en-IN" || lang === "en";

    // 1. Hindi search
    if (isHindi) {
      const hiVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith("hi") || 
        v.name.toLowerCase().includes("hindi") ||
        v.name.toLowerCase().includes("kalpana") ||
        v.name.toLowerCase().includes("hemant")
      );
      if (hiVoice) return hiVoice;
    }

    // 2. Hinglish search: Indian English or Hindi
    if (isHinglish) {
      const indianVoice = voices.find(v => 
        v.lang.toLowerCase() === "en-in" || 
        v.name.toLowerCase().includes("india") ||
        v.name.toLowerCase().includes("ravi") ||
        v.name.toLowerCase().includes("heera") ||
        v.name.toLowerCase().includes("neerja") ||
        v.lang.toLowerCase().startsWith("hi")
      );
      if (indianVoice) return indianVoice;
    }

    // 3. English search
    if (isEnglish) {
      const enInVoice = voices.find(v => 
        v.lang.toLowerCase() === "en-in" || 
        v.name.toLowerCase().includes("india")
      );
      if (enInVoice) return enInVoice;

      const anyEnVoice = voices.find(v => v.lang.toLowerCase().startsWith("en"));
      if (anyEnVoice) return anyEnVoice;
    }

    // Fallback: any matching language, then default
    return voices.find(v => v.lang.startsWith(isHindi ? "hi" : "en")) || voices[0];
  }

  // Instantly stop any previous utterance to avoid queue buildup
  stop() {
    if (!this.synth) return;
    try {
      this.synth.cancel();
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch (e) {
      console.warn("Stop error:", e);
    }
  }

  // Speak announcement via Web Speech API with Chrome GC bug safeguard
  speak(text, options = {}) {
    if (this.isMuted || !text) {
      if (options.onStart) options.onStart();
      if (options.onEnd) setTimeout(options.onEnd, 1200);
      return;
    }

    if (!this.synth) {
      console.warn("SpeechSynthesis not available.");
      if (options.onStart) options.onStart();
      if (options.onEnd) setTimeout(options.onEnd, 1200);
      return;
    }

    // Cancel any queued speech immediately
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    // Keep reference on instance and window to prevent garbage collection mid-speech
    this.currentUtterance = utterance;
    if (typeof window !== "undefined") {
      window.__paytmActiveUtterance = utterance;
    }

    const selectedVoice = this.getBestVoice(options.lang || "hinglish");
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = (options.lang === "hindi" || options.lang === "hi-IN") ? "hi-IN" : "en-IN";
    }

    utterance.rate = options.rate || 1.05;
    utterance.pitch = options.pitch || 1.05;
    utterance.volume = options.volume !== undefined ? options.volume : 1.0;

    let started = false;
    utterance.onstart = () => {
      started = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      console.warn("Speech error:", e);
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    // Ensure audio context and speech synthesis are awake
    this.ensureAudioContext();
    if (this.synth.paused) {
      this.synth.resume();
    }

    // Speak with a snappy micro-delay (160ms) after chime note starts
    const delay = options.chimeDelay !== undefined ? options.chimeDelay : 160;
    setTimeout(() => {
      try {
        this.synth.speak(utterance);
      } catch (err) {
        console.error("Speech speak failed:", err);
        if (options.onEnd) options.onEnd();
      }
    }, delay);
  }

  // Complete Soundbox announcement routine
  announce({
    type = "payment",
    speechText,
    onStart,
    onEnd,
    lang = "hinglish"
  }) {
    this.stop();
    this.ensureAudioContext();

    if (type === "lucky_dabba" || type === "tier_upgrade" || type === "festival" || type === "leaderboard") {
      this.playFanfareChime();
    } else if (type === "fraud") {
      this.playWarningChime();
    } else {
      this.playPaytmChime();
    }

    this.speak(speechText, {
      lang,
      chimeDelay: 170, // Crisp snappy delay right after chime starts
      onStart,
      onEnd
    });
  }
}

export const soundbox = new SoundboxEngine();
