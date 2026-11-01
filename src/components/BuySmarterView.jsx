import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Mic, 
  MicOff, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  Camera, 
  Upload, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  FileText, 
  Search, 
  Plus, 
  Minus, 
  Clock, 
  Phone, 
  Store, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  WHOLESALE_SUPPLIERS, 
  CATALOG_PRODUCTS, 
  COMMODITY_QUOTES, 
  DISTRIBUTOR_RADAR_ITEMS 
} from '../data/mandiData';
import { 
  parseVoiceOrder, 
  calculateOrder, 
  createBillImage,
  devanagariToHinglish
} from '../utils/mandiParser';
import RateUpdateModal from './RateUpdateModal';

const SAMPLE_VOICE_PROMPTS = [
  '4 peti Bail Kolhu tel aur 2 katta chini',
  '3 bori arhar dal aur 2 katta chini',
  '5 kg pyaaz aur 10 kg aloo bhej do',
  'aadha kilo chini',
  'dedh bori arhar dal aur dhai peti tel'
];

export default function BuySmarterView({
  activeMerchant,
  mandiRates,
  onUpdateMandiRate,
  procurementOrders,
  onAddProcurementOrder,
  initialSubTab = 'voice',
  onToast
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // Voice Order Desk State
  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('Taiyaar hoon — Hindi, Hinglish ya English mein boliye.');
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' or 'credit'
  const [selectedSeller, setSelectedSeller] = useState('Shree Ganesh Foods');
  const [parsedItems, setParsedItems] = useState([]);
  const [generatedBillUrl, setGeneratedBillUrl] = useState(null);
  const [generatedBillId, setGeneratedBillId] = useState(null);
  const [orderDispatched, setOrderDispatched] = useState(false);

  // Mandi Radar State
  const [cropFilter, setCropFilter] = useState('all');
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [scanningBill, setScanningBill] = useState(false);
  const [scannedBillDone, setScannedBillDone] = useState(false);

  // Catalog State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');

  // Speech Recognition Ref
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Categories list
  const categories = ['all', ...new Set(CATALOG_PRODUCTS.map(p => p.category))];

  // Recalculate bill whenever items or payment mode change
  const currentCalculation = calculateOrder(parsedItems, paymentMode, selectedSeller);

  // Clean-up speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // Sync subTab if parent changed
  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Handle Speech Recognition
  const handleToggleVoice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      setSpeechStatus('Web Speech API is not supported in this browser. Please type below.');
      onToast?.('Speech API not supported — type your order below', 'error');
      return;
    }

    if (listening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      clearTimeout(silenceTimerRef.current);
      setListening(false);
      setSpeechStatus('Awaaz capture ho gayi. Review karein.');
      return;
    }

    const recognition = new Speech();
    recognitionRef.current = recognition;
    // Set to en-IN so spoken Hindi/Hinglish speech transcribes directly in Roman letters
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setListening(true);
      setSpeechStatus('Sun raha hoon… Boliye jaise: "4 peti tel aur 2 katta chini" (Hinglish mode)');
    };

    recognition.onresult = (e) => {
      clearTimeout(silenceTimerRef.current);
      let fullTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        fullTranscript += e.results[i][0].transcript + ' ';
      }
      const raw = fullTranscript.trim();
      // Instantly convert any Devanagari text to clean Roman Hinglish so it types in Hinglish
      const hinglish = devanagariToHinglish(raw);
      setVoiceText(hinglish);
      setSpeechStatus('Aapki baat Hinglish mein likh raha hoon…');

      // 3.2s silence auto-parse
      silenceTimerRef.current = setTimeout(() => {
        if (hinglish) {
          handleParseText(hinglish);
        }
        try { recognition.stop(); } catch (err) {}
        setListening(false);
      }, 3200);
    };

    recognition.onerror = (e) => {
      setListening(false);
      setSpeechStatus('Mic access nahi mila ya silence tha. Neeche type karein.');
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      setSpeechStatus('Mic start error. Type your order below.');
    }
  };

  const handleParseText = (textToParse = voiceText) => {
    if (!textToParse.trim()) {
      onToast?.('Please speak or type an order first', 'error');
      return;
    }

    // Intercept reminder phrases
    const lower = textToParse.toLowerCase();
    const isReminder = /yaad|note\s*kar|likh\s*lo|agli\s*baar|याद|नोट|लिख/.test(lower);
    if (isReminder) {
      setSpeechStatus('💡 "Yaad Dila Dena" reminder detected! Use Munim Assistant tab for customer reminders & supplier bills.');
      onToast?.('Reminders are recorded in the Munim Assistant tab!', 'info');
      return;
    }

    const matched = parseVoiceOrder(textToParse, COMMODITY_QUOTES);
    if (!matched.length) {
      setSpeechStatus('Item samajh nahi aaya. Kripya item aur quantity boliye (jaise: 4 peti tel, 2 katta chini).');
      onToast?.('No recognizable item matched. Try: 4 peti tel aur 2 katta chini', 'error');
      return;
    }

    setParsedItems(matched);
    setGeneratedBillUrl(null);
    setGeneratedBillId(null);
    setOrderDispatched(false);
    setSpeechStatus(`${matched.length} item matched. Draft bill ready for review.`);
    onToast?.(`${matched.length} item(s) recognized. Draft bill updated.`);
  };

  const handleUpdateItemQty = (key, delta) => {
    setParsedItems(prev => {
      return prev.map(item => {
        if (item.key === key) {
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(item => item.qty > 0);
    });
  };

  const handleGenerateInvoiceAndSend = () => {
    if (!parsedItems.length) return;
    const newId = `BK-${Math.floor(2050 + Math.random() * 8000)}`;
    const billPngUrl = createBillImage(currentCalculation, newId, selectedSeller, activeMerchant.name);

    setGeneratedBillUrl(billPngUrl);
    setGeneratedBillId(newId);
    setOrderDispatched(true);

    // Save to procurement orders list
    const orderItemsSummary = currentCalculation.items.map(i => `${i.qty} ${i.unit} ${i.product.label}`).join(', ');
    onAddProcurementOrder?.({
      id: newId,
      buyer: activeMerchant.name,
      items: orderItemsSummary,
      value: currentCalculation.total,
      status: 'Awaiting supplier',
      placed: 'Just now',
      seller: selectedSeller
    });

    onToast?.(`Order ${newId} confirmed! Certified PNG invoice generated & supplier notified.`);
  };

  const handleSimulateScanBill = () => {
    setScanningBill(true);
    setScannedBillDone(false);
    setTimeout(() => {
      setScanningBill(false);
      setScannedBillDone(true);
      onToast?.('Bill processed! 5 items benchmarked against area median rates.');
    }, 1200);
  };

  const filteredRates = cropFilter === 'all' 
    ? mandiRates 
    : mandiRates.filter(r => r.crop === cropFilter);

  const filteredCatalog = CATALOG_PRODUCTS.filter(p => {
    const matchesCat = catalogCategory === 'all' || p.category === catalogCategory;
    const matchesSearch = !catalogSearch || [p.label, p.category, ...p.aliases].join(' ').toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'voice', label: 'Bol-Ke-Mandi Voice Desk', badge: 'Order' },
            { id: 'radar', label: 'Mandi Bhav & Price Radar', badge: 'Intelligence' },
            { id: 'catalog', label: '101+ SKU Catalog', badge: `${CATALOG_PRODUCTS.length}` },
            { id: 'orders', label: 'Procurement Ledger', badge: `${procurementOrders.length}` },
            { id: 'suppliers', label: 'Wholesale Suppliers Desk', badge: '3 Verified' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === tab.id
                  ? 'bg-white text-[#0d695b] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeSubTab === tab.id ? 'bg-teal-50 text-[#0d695b]' : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#0d695b]" />
          <span>Indore APMC & Noida District Live Network</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 1: BOL-KE-MANDI VOICE PROCUREMENT DESK
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'voice' && (
        <div className="space-y-6">
          <div className="bg-[#e6efe9] border border-[#c8dcd0] rounded-xl p-4 sm:p-5 text-slate-900">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bolkar Order Karein. Sabse Saste Daam Paayein.</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Speak naturally in Hindi or Hinglish. Automatically transcribes and types in clean Roman Hinglish (e.g. <em>4 peti tel aur 2 katta chini</em>).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Voice/Text Input and Parsing Console */}
            <div className="lg:col-span-7 sheet-canvas p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0d695b] flex items-center justify-center font-bold text-xs">
                    BK
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Voice & NLP Order Input</h3>
                    <p className="text-xs text-slate-500">{speechStatus}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleVoice}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      listening
                        ? 'bg-rose-500 text-white animate-pulse shadow-sm'
                        : 'bg-teal-50 text-[#0d695b] hover:bg-teal-100 border border-teal-200'
                    }`}
                  >
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{listening ? 'Sunna Band Karein' : 'Tap to Speak'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Quick Chips */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Click to Test Sample Orders:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_VOICE_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setVoiceText(prompt);
                        handleParseText(prompt);
                      }}
                      className="btn-chip"
                    >
                      <span>"{prompt}"</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input Area */}
              <div>
                <textarea
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  placeholder="Yahan boliye ya Hinglish mein type karein: e.g. 4 peti tel aur 2 katta chini..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0d695b] min-h-[90px] resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[11px] text-slate-400">
                    Types in Hinglish. Press Review to parse quantities & check supplier inventory.
                  </span>
                  <button
                    onClick={() => handleParseText()}
                    className="btn-teal"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Review Order
                  </button>
                </div>
              </div>

              {/* Multi-Supplier Quote Cards */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Supplier Offers (APMC Live)</span>
                  <span className="text-[11px] text-slate-500">Pick preferred distributor</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {WHOLESALE_SUPPLIERS.map(supp => {
                    const isSelected = selectedSeller === supp.name;
                    return (
                      <button
                        key={supp.name}
                        onClick={() => setSelectedSeller(supp.name)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border-[#0d695b] shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{supp.name}</span>
                          <span className="text-[10px] font-mono font-bold text-[#0d695b] bg-teal-100/60 px-1.5 py-0.5 rounded">
                            {supp.score} ★
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{supp.detail}</div>
                        <div className="mt-2 text-[11px] font-bold text-slate-700">
                          {isSelected ? '✓ Selected' : 'Choose'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Draft Bill & Certified Canvas Invoice Preview */}
            <div className="lg:col-span-5 sheet-canvas p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Interactive Draft Bill</h3>
                  <p className="text-xs text-slate-500">Supplier: {selectedSeller}</p>
                </div>

                {/* Cash vs 7-day Credit Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setPaymentMode('cash')}
                    className={`px-2 py-1 rounded transition ${
                      paymentMode === 'cash' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMode('credit')}
                    className={`px-2 py-1 rounded transition ${
                      paymentMode === 'credit' ? 'bg-[#002970] text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    7-Day Credit
                  </button>
                </div>
              </div>

              {parsedItems.length > 0 ? (
                <div className="space-y-4">
                  {/* Itemized Table */}
                  <div className="divide-y divide-slate-100">
                    {currentCalculation.items.map(item => (
                      <div key={item.key} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.product.label}</div>
                          <div className="text-[11px] text-slate-500">
                            ₹{item.rate.toLocaleString('en-IN')} / {item.unit} · {item.quote.seller}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Quantity +/- Buttons */}
                          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <button
                              onClick={() => handleUpdateItemQty(item.key, -1)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-slate-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold px-1.5 text-xs text-slate-900">
                              {item.qty} {item.unit}
                            </span>
                            <button
                              onClick={() => handleUpdateItemQty(item.key, 1)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-slate-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-mono font-bold text-slate-900 w-16 text-right">
                            ₹{item.line.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Totals */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({currentCalculation.items.length} items)</span>
                      <span className="font-mono">₹{currentCalculation.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST & Mandi Cess</span>
                      <span className="font-mono text-emerald-700 font-bold">Included (0% extra)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery (APMC Direct)</span>
                      <span className="font-mono text-emerald-700 font-bold">Free Pickup</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-sm text-[#002970]">
                      <span>Total Amount Payable</span>
                      <span className="font-mono text-base">₹{currentCalculation.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Confirm & Generate Invoice Button */}
                  <div className="space-y-2">
                    <button
                      onClick={handleGenerateInvoiceAndSend}
                      className="w-full btn-teal py-3 font-bold flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Create Certified PNG Invoice & Dispatch Order</span>
                    </button>
                    <p className="text-[11px] text-slate-400 text-center">
                      Auto-routes to {selectedSeller} on the Paytm APMC Network.
                    </p>
                  </div>

                  {/* Rendered Invoice Download Card */}
                  {generatedBillUrl && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Invoice {generatedBillId} Ready!</span>
                        </div>
                        <a
                          href={generatedBillUrl}
                          download={`${generatedBillId}-bill.png`}
                          className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PNG</span>
                        </a>
                      </div>

                      <div className="border border-emerald-300 rounded-lg overflow-hidden max-h-48 shadow-xs">
                        <img
                          src={generatedBillUrl}
                          alt="Generated Digital Bill Preview"
                          className="w-full h-auto object-cover"
                        />
                      </div>

                      <div className="text-[11px] text-emerald-800">
                        ✓ Dispatched to <strong>{selectedSeller}</strong> · Status: <strong>Awaiting Supplier</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">
                    No items in draft yet. Tap the mic above or click a test prompt like: <br />
                    <span className="font-bold text-slate-600">"4 peti Bail Kolhu tel aur 2 katta chini"</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 2: MANDI BHAV & DISTRIBUTOR PRICE RADAR
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'radar' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-[#e8f2fa] border border-[#cbe0f0] rounded-xl p-4 sm:p-5 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Mandi Bhav & Distributor Price Radar</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Collaborative bill-scanning network. Compare live district wholesale benchmarks to cut distributor overcharges.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSimulateScanBill}
                disabled={scanningBill}
                className="btn-primary text-xs font-bold py-2 px-3.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{scanningBill ? 'Scanning Bill…' : 'Scan Wholesale Bill'}</span>
              </button>
              <button
                onClick={() => setIsRateModalOpen(true)}
                className="btn-secondary text-xs font-bold py-2 px-3.5"
              >
                Update Mandi Rate
              </button>
            </div>
          </div>

          {scannedBillDone && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong>Bill OCR Complete:</strong> 5 items extracted from Wholesale Invoice #INV-889. Compared with 80+ shops in PIN {activeMerchant.pincode}.
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-900">₹3,240 Total Monthly Recoverable Margin</span>
            </div>
          )}

          {/* Local Price Radar Table */}
          <div className="sheet-canvas p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Pin Code Price Radar ({activeMerchant.pincode})</h3>
                <p className="text-xs text-slate-500">Normalised for pack size, GST & active distributor schemes</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Min. 15 local merchants contributing per SKU</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item & Pack Size</th>
                    <th>Brand</th>
                    <th className="font-mono">Your Rate</th>
                    <th className="font-mono">Area Median</th>
                    <th>Active Scheme / Discount</th>
                    <th>Reporting</th>
                    <th>Verdict</th>
                    <th>Suggested Counter-Offer</th>
                  </tr>
                </thead>
                <tbody>
                  {DISTRIBUTOR_RADAR_ITEMS.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold text-slate-900">
                        {item.item}
                        <div className="text-[11px] text-slate-400 font-normal">{item.packSize}</div>
                      </td>
                      <td className="text-slate-600">{item.brand}</td>
                      <td className="font-mono font-bold text-slate-900">₹{item.distributorCharged}</td>
                      <td className="font-mono font-bold text-emerald-700">₹{item.areaMedianRate}</td>
                      <td className="text-[11px] text-slate-600">
                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                          {item.activeScheme}
                        </span>
                      </td>
                      <td className="text-[11px] text-slate-500">
                        {item.reportingPeersPercent}% ({item.reportingCount} shops)
                      </td>
                      <td>
                        <span className={`badge ${
                          item.verdict === 'Fair'
                            ? 'badge-green'
                            : item.verdict.includes('High')
                            ? 'badge-red'
                            : 'badge-amber'
                        }`}>
                          {item.verdict}
                        </span>
                      </td>
                      <td>
                        <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-200 italic max-w-xs">
                          "{item.suggestedCounterOffer}"
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live APMC Mandi Board */}
          <div className="sheet-canvas p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Live APMC Mandi Rates Board</h3>
                <p className="text-xs text-slate-500">Indore, Dewas & Ujjain Krishi Upaj Mandi live rates</p>
              </div>

              <div className="flex items-center gap-1.5">
                {['all', 'onion', 'potato', 'tomato'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCropFilter(c)}
                    className={`btn-chip ${cropFilter === c ? 'active' : ''}`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => setIsRateModalOpen(true)}
                  className="btn-teal py-1 text-xs"
                >
                  + Update Rate
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>APMC Market</th>
                    <th className="font-mono">Min (₹/Qtl)</th>
                    <th className="font-mono">Median (₹/Qtl)</th>
                    <th className="font-mono">Max (₹/Qtl)</th>
                    <th>24h Change</th>
                    <th>Last Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((r, i) => (
                    <tr key={i}>
                      <td className="font-bold text-slate-900">{r.name}</td>
                      <td className="text-slate-600">{r.market}</td>
                      <td className="font-mono text-slate-500">₹{r.min.toLocaleString('en-IN')}</td>
                      <td className="font-mono font-bold text-slate-900">₹{r.median.toLocaleString('en-IN')}</td>
                      <td className="font-mono text-slate-500">₹{r.max.toLocaleString('en-IN')}</td>
                      <td className={`font-mono font-bold ${r.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {r.change >= 0 ? '+' : ''}{r.change.toFixed(1)}%
                      </td>
                      <td className="text-[11px] text-slate-400">{r.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 3: 101+ SKU WHOLESALE CATALOG
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'catalog' && (
        <div className="sheet-canvas p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Wholesale B2B Catalog (101 SKUs)</h3>
              <p className="text-xs text-slate-500">Direct APMC wholesale pricing across 20 categories</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search item, Hindi alias..."
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 w-48 focus:outline-none"
                />
              </div>

              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories (20)' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Label & Hindi Aliases</th>
                  <th>Pack Size</th>
                  <th>Category</th>
                  <th className="font-mono">Cash Rate</th>
                  <th className="font-mono">7-Day Credit</th>
                  <th>GST</th>
                  <th>Stock</th>
                  <th>Default Supplier</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="font-bold text-slate-900">{product.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {product.aliases.slice(0, 3).join(' · ')}
                      </div>
                    </td>
                    <td className="text-slate-600 font-mono text-xs">{product.pack}</td>
                    <td>
                      <span className="badge badge-slate text-[10px]">{product.category}</span>
                    </td>
                    <td className="font-mono font-bold text-slate-900">₹{product.cash}</td>
                    <td className="font-mono text-slate-600">₹{product.credit}</td>
                    <td className="font-mono text-xs text-slate-500">{product.gst}%</td>
                    <td>
                      <span className={`text-xs font-mono font-bold ${
                        product.stock < 25 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {product.stock} in stock
                      </span>
                    </td>
                    <td className="text-xs text-slate-700">{product.seller}</td>
                    <td>
                      <button
                        onClick={() => {
                          const phrase = `${product.aliases[0]} 1 ${product.pack}`;
                          setVoiceText(phrase);
                          setActiveSubTab('voice');
                          handleParseText(phrase);
                        }}
                        className="btn-chip text-[11px]"
                      >
                        Use in Voice Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 4: PROCUREMENT ORDERS LEDGER
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'orders' && (
        <div className="sheet-canvas p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Procurement Orders Ledger</h3>
              <p className="text-xs text-slate-500">Track status of wholesale restock orders sent to suppliers</p>
            </div>
            <span className="badge badge-teal font-mono">{procurementOrders.length} Orders Logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Buyer Store</th>
                  <th>Items Description</th>
                  <th className="font-mono">Total Value</th>
                  <th>Fulfillment Supplier</th>
                  <th>Status</th>
                  <th>Placed At</th>
                </tr>
              </thead>
              <tbody>
                {procurementOrders.map(order => (
                  <tr key={order.id}>
                    <td className="font-mono font-bold text-[#002970]">{order.id}</td>
                    <td className="text-slate-800 font-medium">{order.buyer}</td>
                    <td className="text-slate-700">{order.items}</td>
                    <td className="font-mono font-bold text-slate-900">
                      ₹{order.value.toLocaleString('en-IN')}
                    </td>
                    <td className="text-slate-600">{order.seller}</td>
                    <td>
                      <span className={`badge ${
                        order.status === 'Delivered'
                          ? 'badge-green'
                          : order.status === 'Ready for pickup'
                          ? 'badge-indigo'
                          : 'badge-amber'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400">{order.placed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SUB-TAB 5: WHOLESALE SUPPLIERS DESK
          ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'suppliers' && (
        <div className="sheet-canvas p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Wholesale Supplier Desk</h3>
            <p className="text-xs text-slate-500">APMC-verified distributors serving your district</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {WHOLESALE_SUPPLIERS.map(supp => (
              <div key={supp.name} className="sheet-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm">{supp.name}</h4>
                  <span className="badge badge-teal font-mono">{supp.score} ★</span>
                </div>
                <div className="text-xs text-slate-500">{supp.market}</div>
                <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Benchmark Rate:</span>
                    <strong className="font-mono text-slate-900">{supp.rate} / quintal</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reliability Record:</span>
                    <span className="text-emerald-700 font-bold">{supp.detail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Orders Fulfilled:</span>
                    <span className="font-mono">{supp.acceptedOrders} orders</span>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Phone className="w-3.5 h-3.5" /> {supp.phone}
                  </span>
                  <span className="text-emerald-600 font-bold">Verified APMC</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate Update Modal */}
      <RateUpdateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onSaveRate={onUpdateMandiRate}
      />
    </div>
  );
}
