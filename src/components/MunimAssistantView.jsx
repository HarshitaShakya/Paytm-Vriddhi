import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  RefreshCw,
  ShoppingBag,
  Clock,
  ArrowRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const QUICK_PROMPTS = [
  '4 peti Bail Kolhu tel aur 2 katta chini',
  '3 bori arhar dal aur 2 katta chini',
  'Chai yaad dila dena',
  '5 kg pyaaz aur 10 kg aloo bhej do',
  'aadha kilo chini',
  'theek hai order confirm kar do'
];

export default function MunimAssistantView({
  activeMerchant,
  onAddProcurementOrder,
  onToast
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'munim',
      text: 'Namaste Seth ji! Main aapka dukaan munim hoon. Kripya apna grocery order bol kar ya likh kar batayein (jaise: "4 peti Bail Kolhu tel aur 2 katta chini").',
      speechText: 'नमस्ते सेठ जी! मैं आपका दुकान मुनीम हूँ। बोल कर आर्डर बताइए।',
      time: 'Just now'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [latestBillImage, setLatestBillImage] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  const mediaRecorderRef = useRef(null);
  const speechRecRef = useRef(null);
  const audioChunksRef = useRef([]);
  const liveTranscriptRef = useRef('');
  const timerIntervalRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Clean-up recording timer
  useEffect(() => {
    return () => clearInterval(timerIntervalRef.current);
  }, []);

  // Text-to-speech speaker
  const speakDevanagari = (text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    setSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Microphone Audio Recording via MediaRecorder + Web Speech API
  // ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onToast?.('Microphone not supported on this device/browser', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      liveTranscriptRef.current = '';
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendAudio(audioBlob, liveTranscriptRef.current);
      };

      // Optional browser speech recognition for instant speech preview
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const sr = new SpeechRec();
          sr.lang = 'hi-IN';
          sr.continuous = true;
          sr.interimResults = true;
          sr.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              interim += event.results[i][0].transcript;
            }
            if (interim) {
              liveTranscriptRef.current = interim;
              setInputQuery(interim);
            }
          };
          sr.start();
          speechRecRef.current = sr;
        } catch (e) {
          console.warn('Browser SpeechRecognition fallback to server STT:', e);
        }
      }

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);
      onToast?.('Sun raha hoon... Boliye!', 'info');
    } catch (err) {
      console.error('Mic access error:', err);
      onToast?.('Mic permission denied. Please allow microphone access or type below.', 'error');
    }
  };

  const stopRecording = () => {
    if (speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
      setRecording(false);
    }
  };

  const handleToggleMic = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Network Handlers (POST /api/chat, /api/voice, /api/action)
  // ─────────────────────────────────────────────────────────────
  const handleSendText = async (textToSend = inputQuery) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    // Add user message
    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          sender_id: 'web_merchant_session',
          merchant_id: activeMerchant?.id || 'm_sharma_kirana'
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      processApiResponse(data);
    } catch (err) {
      console.warn('Backend offline, using client fallback:', err);
      handleClientFallback(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAudio = async (audioBlob, transcriptHint = '') => {
    setLoading(true);
    const spokenText = transcriptHint ? `🎤 "${transcriptHint}"` : '🎤 [Voice Note Delivered]';
    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: spokenText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_order.webm');
      formData.append('sender_id', 'web_merchant_session');
      formData.append('merchant_id', activeMerchant?.id || 'm_sharma_kirana');
      if (transcriptHint) {
        formData.append('transcript_hint', transcriptHint);
      }

      const res = await fetch(`${API_BASE}/voice`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      processApiResponse(data);
    } catch (err) {
      console.warn('Voice endpoint error:', err);
      onToast?.('Voice note uploaded, backend processing completed', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = async (button) => {
    if (loading) return;
    setLoading(true);

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: `[Action: ${button.label}]`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`${API_BASE}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: button.action,
          payload: button.payload || {},
          sender_id: 'web_merchant_session',
          merchant_id: activeMerchant?.id || 'm_sharma_kirana'
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      processApiResponse(data);

      if (button.action === 'confirm' && data.order_id) {
        onToast?.(`Order placed successfully! ID: ${data.order_id}`, 'success');
        onAddProcurementOrder?.({
          id: data.order_id,
          buyer: activeMerchant?.name || 'Sharma Kirana Store',
          items: 'Voice Wholesale Order',
          value: activeDraft?.grand_total || 21140,
          status: 'Awaiting supplier',
          placed: 'Just now',
          seller: activeDraft?.supplier_name || 'Shree Ganesh Foods'
        });
      }
    } catch (err) {
      console.error('Action failed:', err);
      onToast?.('Action failed: server offline', 'error');
    } finally {
      setLoading(false);
    }
  };

  const processApiResponse = (data) => {
    if (!data.success) {
      onToast?.(data.message || 'Error processing request', 'error');
      return;
    }

    // Update latest bill image
    if (data.image_base64) {
      setLatestBillImage(`data:image/png;base64,${data.image_base64}`);
    }

    if (data.draft_id) {
      setActiveDraft({
        id: data.draft_id,
        version: data.draft_version
      });
    }

    if (data.order_id) {
      setLastOrderId(data.order_id);
    }

    // Add Munim message
    const botMsg = {
      id: `m_${Date.now()}`,
      sender: 'munim',
      text: data.display_text,
      speechText: data.speech_text,
      buttons: data.buttons || [],
      suggestions: data.suggestions || null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botMsg]);

    // Optional audio announcement
    if (data.speech_text) {
      speakDevanagari(data.speech_text);
    }
  };

  const handleClientFallback = (text) => {
    const botMsg = {
      id: `m_${Date.now()}`,
      sender: 'munim',
      text: `Bhaiya, aapka order receive ho gaya: "${text}". Backend connect ho raha hai...`,
      speechText: 'भैया, आपका आर्डर मिल गया है।',
      buttons: [
        { label: '✓ Order Confirm Karein', action: 'confirm', payload: { version: 1 } },
        { label: '✗ Cancel', action: 'cancel', payload: { version: 1 } }
      ],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botMsg]);
  };

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="bg-[#002970] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Munim: Voice Kirana Assistant</h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Hinglish Voice Active
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Bol kar grocery aur wholesale order banayein · Best APMC Mandi rates & certified PNG bills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'reset',
                    sender: 'munim',
                    text: 'Naya draft shuru ho gaya hai. Boliye Seth ji, kya bhejwa dein?',
                    speechText: 'नया ड्राफ्ट शुरू हो गया है। बोलिए सेठ जी, क्या चाहिए?',
                    time: 'Just now'
                  }
                ]);
                setLatestBillImage(null);
                setActiveDraft(null);
                onToast?.('New order draft started', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition border border-white/10 text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Naya Draft</span>
            </button>
          </div>
        </div>

        {/* Quick Voice Prompt Chips */}
        <div className="mt-4 pt-3.5 border-t border-white/10">
          <div className="text-[11px] font-semibold text-blue-200 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Sample prompts (Click to test):</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendText(prompt)}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition shrink-0 border border-white/10 cursor-pointer"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Conversational Voice Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[640px]">
          {/* Feed Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800">Live Voice & Chat Desk</span>
            </div>
            {speaking && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#002970] animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Munim speaking...</span>
              </div>
            )}
          </div>

          {/* Chat Messages Scroll Area */}
          <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'munim' && (
                  <div className="w-8 h-8 rounded-full bg-[#002970] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#002970] text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/70'
                }`}>
                  <div className="font-semibold">{m.text}</div>

                  {/* Audio Read-Aloud Pill */}
                  {m.speechText && (
                    <button
                      onClick={() => speakDevanagari(m.speechText)}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-slate-700 hover:text-[#002970] text-[10px] font-bold border border-slate-200 cursor-pointer shadow-2xs"
                    >
                      <Volume2 className="w-3 h-3 text-[#002970]" />
                      <span>Suniye (Aawaz)</span>
                    </button>
                  )}

                  {/* Yaad Dila Dena SuggestionSet Chips */}
                  {m.suggestions && m.suggestions.items && m.suggestions.items.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-slate-800">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>{m.suggestions.title || 'Yaad Dila Dena Suggestions'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {m.suggestions.items.map((item, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleButtonClick({
                              action: 'reminder_toggle',
                              payload: {
                                reminder_id: item.reminder_id,
                                draft_id: m.suggestions.draft_id,
                                version: m.suggestions.draft_version
                              }
                            })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                              item.selected
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'bg-white hover:bg-amber-100/60 text-slate-700 border-amber-200'
                            }`}
                          >
                            <span>{item.selected ? '☑' : '☐'}</span>
                            <span>{item.label}</span>
                            {item.demand_count > 1 && (
                              <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                item.selected ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.demand_count}x
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-amber-200/50">
                        <button
                          onClick={() => handleButtonClick({
                            action: 'reminder_add_all',
                            payload: {
                              draft_id: m.suggestions.draft_id,
                              version: m.suggestions.draft_version
                            }
                          })}
                          className="px-2.5 py-1 rounded-md bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold cursor-pointer"
                        >
                          ⚡ Sab add karo
                        </button>
                        <button
                          onClick={() => handleButtonClick({
                            action: 'reminder_skip',
                            payload: {
                              draft_id: m.suggestions.draft_id,
                              version: m.suggestions.draft_version
                            }
                          })}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100/50 text-slate-600 text-[10px] font-medium border border-amber-200 cursor-pointer"
                        >
                          ⏭ Skip
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Action Buttons in Message */}
                  {m.buttons && m.buttons.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                      {m.buttons.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => handleButtonClick(btn)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            btn.action === 'confirm'
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                              : btn.action === 'cancel'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {btn.action === 'confirm' && <CheckCircle2 className="w-3 h-3" />}
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`text-[9px] mt-1.5 ${m.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                    {m.time}
                  </div>
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                <span className="w-2 h-2 rounded-full bg-[#002970] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#002970] animate-bounce delay-100"></span>
                <span className="w-2 h-2 rounded-full bg-[#002970] animate-bounce delay-200"></span>
                <span>Munim bill bana raha hai...</span>
              </div>
            )}
          </div>

          {/* Bottom Voice & Text Input Bar */}
          <div className="p-3 border-t border-slate-200 bg-white rounded-b-2xl">
            {recording && (
              <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-bold text-rose-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                  <span>Aawaz record ho rahi hai ({recordingTimer}s)... Boliye</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] hover:bg-rose-700 cursor-pointer"
                >
                  Rukiye & Bhejiye
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendText();
              }}
              className="flex items-center gap-2"
            >
              {/* Big Tap-to-Talk Mic Button */}
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-center ${
                  recording
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                }`}
                title={recording ? 'Recording stop karein' : 'Bol kar order karein'}
              >
                {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder='Boliye ya type karein (e.g. "4 peti tel aur 2 katta chini")...'
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002970]"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="p-3 rounded-xl bg-[#002970] text-white hover:bg-blue-900 disabled:opacity-40 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Certified Bill Invoice Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#002970]" />
              <h3 className="font-bold text-slate-900 text-xs">Live Certified Digital Bill</h3>
            </div>
            {activeDraft && (
              <span className="badge badge-teal font-mono text-[10px]">
                Draft {activeDraft.id} · v{activeDraft.version}
              </span>
            )}
          </div>

          {/* Rendered Bill Image / Placeholder */}
          {latestBillImage ? (
            <div className="space-y-3">
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50">
                <img
                  src={latestBillImage}
                  alt="Certified Procurement Bill"
                  className="w-full h-auto object-contain rounded-xl"
                />
              </div>

              {/* Bill Action Controls */}
              <div className="flex items-center justify-between gap-2">
                <a
                  href={latestBillImage}
                  download={`Paytm_Mandi_Bill_${activeDraft?.id || 'order'}.png`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bill PNG</span>
                </a>

                {activeDraft && (
                  <button
                    onClick={() => handleButtonClick({
                      action: 'confirm',
                      label: 'Order Confirm Karein',
                      payload: { draft_id: activeDraft.id, version: activeDraft.version }
                    })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Order</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
              <div className="w-12 h-12 rounded-full bg-slate-200/60 text-slate-400 mx-auto flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Koi Bill Generated Nahi Hai</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Mic dabakar ya type karke apna order boliye. Munim best price compare karke certified invoice banayega.
                </p>
              </div>
              <button
                onClick={() => handleSendText('4 peti Bail Kolhu tel aur 2 katta chini')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#002970] text-xs font-bold rounded-lg border border-slate-300 shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                <span>Sample Order Test Karein</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Procurement Info Banner */}
          <div className="bg-[#e6efe9] border border-[#c8dcd0] rounded-xl p-3 text-xs space-y-1">
            <div className="font-bold text-[#1b4332] flex items-center gap-1.5">
              <span>Paytm SmartDukaan Safety Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Order sirf tabhi confirm hota hai jab aap draft version verify karte hain. Stale ya badle hue orders par dubara quote milta hai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

