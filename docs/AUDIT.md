# Paytm Vriddhi: Codebase Audit & Munim Assistant Integration

**Date:** 2026-10-31  
**Author:** Applied ML & Full-Stack Engineering Team  
**Status:** Complete (Phase 0)

---

## 1. Executive Summary

This audit evaluates the current state of the **Paytm Vriddhi** repository and outlines the transformation needed to introduce **Munim** — a voice-first, Hinglish-speaking personal procurement and business assistant for Indian kirana shopkeepers.

### Current Reality
- **Platform Architecture:** Client-only React 19 SPA running on Vite 8 and Tailwind CSS 4.
- **Backend Infrastructure:** Non-existent (no server, no database, no persistent API, no external webhook adapters).
- **Voice & NLP Implementation:** Browser-native Web Speech API (`webkitSpeechRecognition`) coupled with an ad-hoc regex/substring matching engine in `src/utils/mandiParser.js`.
- **Pricing & Calculation:** Basic floating-point math across hardcoded multi-seller quotes (`COMMODITY_QUOTES` and `CATALOG_PRODUCTS`). Schemes, minimum order thresholds, landed delivery costs, and split-basket optimization are not implemented.
- **Invoice Rendering:** Browser-only HTML5 Canvas (`createBillImage`) rendering to a base64 DataURL. Cannot generate bills on external channels like Telegram or WhatsApp.
- **Existing Dashboard Quality:** Rich, highly engaging UI components covering the closed economic loop:
  1. *Suite Overview* (`OverviewView.jsx`)
  2. *Buy Smarter* (`BuySmarterView.jsx`: Voice Desk, Mandi Bhav Radar, 101+ SKU Catalog, Procurement Ledger, Wholesale Suppliers Desk)
  3. *Sell Better* (`SellBetterView.jsx`: Soundbox 4.0 Pro Simulator, Merchant POS, Customer Passbook & Lucky Dabba Scratch Card, Analytics, Festival & Mohalla Campaigns)
  4. *AI Kirana Advisor* (`AIBridgeView.jsx`: Margin Reinvestment Ledger, Cross-Check, Slow-Hour Boost, Dead-Stock Clearance)

### The Munim Goal
Deliver a channel-agnostic, zero-cost, voice-first assistant ("Munim") accessible via Web Mic, Telegram Bot, and WhatsApp Cloud API (ready adapter), strictly honoring the principle: **LLM understands speech and intent; deterministic code computes SKUs, units, schemes, pricing, and renders the bill image.**

---

## 2. Inventory of Existing Codebase

| Path | Primary Responsibility | Current Strengths | Deficiencies / Technical Debt |
|---|---|---|---|
| `package.json` / `vite.config.js` | Frontend build configuration (Vite, React 19, Tailwind v4, Lucide icons, Canvas Confetti) | Modern, fast build times (~400ms); minimal dependencies. | No backend package management; no proxy setup for local API development. |
| `src/App.jsx` | Main application shell, global state (merchants, customers, orders, soundbox announcements), tab routing, toast banner. | Clear central state for UI prototype; clean transitions between views. | Mixes domain logic, soundbox speech synthesis triggers, and navigation in one large component (353 lines). |
| `src/components/Navigation.jsx` | Top persistent tab bar (Suite Overview, Buy Smarter, Sell Better, AI Kirana Advisor). | Responsive, clean icons and typography. | Lacks direct access to the new Munim chat assistant screen. |
| `src/components/Header.jsx` & `Footer.jsx` | Global branding, merchant selector dropdown, Soundbox audio language switcher (Hinglish/Hindi/English). | Good look & feel; supports active merchant switching. | Purely UI mock; merchant switching doesn't synchronize with server sessions. |
| `src/components/OverviewView.jsx` | High-level KPI cards, closed reinvestment loop summary, quick actions. | Strong visual narrative connecting buy savings to sell loyalty. | Uses hardcoded mock figures and static radar calculations. |
| `src/components/BuySmarterView.jsx` | Procurement hub with 5 sub-tabs (Voice Desk, Mandi Radar, 101+ Catalog, Ledger, Suppliers). | Comprehensive UI tabs, sample prompt pills, canvas bill preview and download. | Speech recognition only works in Chromium browsers; order parsing mixes UI state with parsing logic; order state has no rollback/versioning. |
| `src/components/SellBetterView.jsx` | Loyalty hub hosting Soundbox simulator, POS terminal, customer passbooks, ROI analytics. | Realistic Soundbox 4.0 Pro hardware simulator; interactive POS with customer spend ledger. | Entirely client-side state in memory. |
| `src/components/SoundboxDevice.jsx` | 3D visual & interactive Paytm Soundbox 4.0 Pro with LED glow ring and LCD matrix display. | High merchant appeal; reactive to payment events. | Relies on browser Web Speech synthesis for audio playback. |
| `src/components/MerchantPOSSimulator.jsx` | Cash/UPI transaction simulator with trust & fraud scoring. | Demonstrates 3-layer loyalty logic in action. | Uses dummy transactions with in-memory array updates. |
| `src/components/CustomerPassbookView.jsx` | Customer passbook, 10-stamp visit card, voucher extensions, Lucky Dabba scratch card. | Interactive HTML5 canvas scratch card with confetti. | Static customer records. |
| `src/components/FestivalAndMohallaView.jsx` | Seasonal campaign presets (Diwali, Eid, Holi) and community top spenders leaderboard. | Excellent localization and merchant context. | Static data presets. |
| `src/components/AIBridgeView.jsx` | Margin reinvestment ledger, sales-to-procurement cross check, slow-hour boost toggle. | Clearly articulates the core hackathon value proposition. | Static mathematical calculations based on mock datasets. |
| `src/data/mandiData.js` | Wholesale suppliers, APMC mandi rates, commodity quotes (oil, sugar, dal, onion, potato), catalog seed (34 base items generated into 101 SKUs), distributor price radar items. | Realistic Indian kirana products, brands (Tata Salt, Bail Kolhu, Madhur Sugar), and regional distributors (Shree Ganesh, Raj Traders, Malwa Fresh). | Quotes are static; lack minimum order quantities, delivery fees, and promotional schemes (e.g., buy 10 get 1 free). |
| `src/data/mockData.js` | Merchant profiles (Sharma Kirana, etc.), customer spend history, loyalty points wallets, vouchers, fraud parameters. | Rich domain model representation. | Client-side only; not normalized for database persistence. |
| `src/utils/mandiParser.js` | Devanagari transliteration, keyword matching for voice orders, canvas bill renderer (`createBillImage`). | Contains valuable Hindi/Devanagari digit maps, colloquial fraction handlers (`dedh`, `dhai`, `aadha`). | Ad-hoc regex parsing brittle to reordered phrasing or conversational interruptions; canvas bill rendering cannot run on server or headless bots; uses float math for money. |
| `src/utils/loyaltyEngine.js` | 3-layer loyalty calculation (Bachat Points, rolling season ladder, milestone rewards). | Deterministic, well-structured business logic. | Client-only JS; should remain in frontend POS simulator. |
| `src/utils/fraudEngine.js` | Circular transaction detection, velocity threshold checks, self-payment flags. | Sound business rules for Kirana UPI security. | In-memory evaluation only. |
| `src/utils/soundboxAudio.js` | Web Audio API oscillator chimes (Paytm 3-note arpeggio, celebratory fanfares) + speech synthesis. | Zero latency chimes without external MP3 dependencies. | Browser-dependent; cannot produce voice notes for Telegram/WhatsApp. |
| `src/utils/speechScripts.js` | Script generation for payment confirmation announcements in Hindi, Hinglish, English. | Natural sounding merchant announcements. | Pure strings; no audio synthesis. |
| `tests/parser.test.js` | Node.js test script for 14 regex parsing and Devanagari transliteration cases. | Verifies existing baseline parsing cases. | Not integrated with standard test runners (Jest/Vitest/Pytest); only 14 simple test cases. |

---

## 3. Detailed Gap Analysis: Current vs. Munim Target

| Capability | Current State | Required Target State (Munim) | Technical Gap |
|---|---|---|---|
| **Voice Processing** | Browser `webkitSpeechRecognition` (only runs if browser tab is open and mic permission granted). | Voice notes (audio files from Web, Telegram `.ogg`/`.oga`, WhatsApp audio) + raw microphone input. | Need server-side audio ingestion, temporary file handling, audio transcoding via FFmpeg, and transcription via Gemini / local faster-whisper fallback. Immediate privacy-preserving raw audio deletion. |
| **NLU & Intent Extraction** | Brittle regex and keyword search in `mandiParser.js`. Incapable of intent shifts, edits, or multi-turn context. | Zero-temperature Gemini LLM with strict Pydantic JSON schema output (`NluResult`), parsing items, brands, quantities, units, supplier mentions, payment modes, and conversation intents. | LLM extracts structured intent; code deterministically computes pricing. Fallback handling when offline or rate-limited. |
| **Entity Matching & Units** | Direct substring search against a small array of aliases. | Two-stage matching: alias lookup table + normalized RapidFuzz token matching against SQLite SKU catalog. Units engine resolving colloquial Hindi fractions and pack conversions. | Python `units.py` + `matching.py` with YAML rules and unit test verification. |
| **Pricing & Optimization** | First matching quote or lowest cash/credit rate without rules. | Deterministic optimizer with Decimal precision. Evaluates landed cost including supplier minimum orders, delivery fees, and schemes (e.g., buy 10 get 1 free). Produces Option A (single supplier) and Option B (split basket). | Python `pricing.py` with full scheme and multi-supplier constraint logic. |
| **Draft State Machine** | None. React component simply stores `parsedItems` in local state. | Robust persistent state machine: `IDLE` → `DRAFTING` → `QUOTED` → `CONFIRMED` → `PLACED` (or `CANCELLED`). Orders strictly bound to `(draft_id, draft_version)`. | Python `state.py` backed by SQLite/SQLModel with version increments on every modification. Stale confirmations rejected. |
| **Bill Generation** | HTML5 Canvas drawing in `mandiParser.js` requiring a browser DOM. | Pillow (PIL) server-side renderer generating an ~800px PNG with Noto Sans & Noto Sans Devanagari fonts, itemized table, free items, savings line, and grand total. | Python `billing.py` capable of returning raw PNG bytes for Web, Telegram photo messages, and WhatsApp media upload. |
| **Multi-Channel Adapters** | None (Single web page). | Clean hexagonal architecture: Core exposes `handle(InboundMessage) -> list[OutboundMessage]`. Web, Telegram, and WhatsApp Cloud API operate as thin adapters. | FastAPI webhook routes and adapter layer (`app/adapters/`). |
| **Spoken Voice Output** | Browser Web Speech Synthesis (`window.speechSynthesis`). | High-quality TTS engine (Gemini TTS / edge-tts) producing OGG/Opus voice notes for Telegram, WhatsApp, and Web audio playback. | Python `tts.py` with FFmpeg conversion. |

---

## 4. Itemized Disposition: What to Keep, Refactor, Delete & Add

### A. What to KEEP (Zero Breaking Changes)
1. **Existing UI Tabs & Views:**
   - `OverviewView.jsx`: Keep as the high-level dashboard.
   - `SellBetterView.jsx`: Keep the complete Soundbox 4.0 Pro simulator, Merchant POS, Customer Passbook, Scratch Card, and Campaigns.
   - `AIBridgeView.jsx`: Keep the reinvestment ledger, cross-check, and slow-hour boost simulator.
   - `Header.jsx`, `Footer.jsx`: Keep global branding and design tokens.
2. **Design Tokens & Theme:**
   - Framed-Sheet Merchant OS design tokens in `index.css` (Paytm Navy `#002970`, Deep Teal `#1b4332`, Amber `#b45309`, etc.).
3. **Soundbox Audio Synthesizer:**
   - `soundboxAudio.js` and `speechScripts.js` for instant in-browser Soundbox POS chimes.
4. **Existing Test Suite:**
   - `tests/parser.test.js` remains runnable via `npm test` to guarantee backwards compatibility.

### B. What to REFACTOR / REPURPOSE
1. **`src/components/Navigation.jsx` & `src/App.jsx`:**
   - Add a prominent first-class navigation option: **"Munim: Voice Assistant"** (`munim`).
   - Default the active tab to `munim` or provide an omnipresent Quick-Access Dock so shopkeepers can immediately interact with the assistant while still switching to other tabs seamlessly.
2. **`src/components/BuySmarterView.jsx`:**
   - Connect the existing "Bol-Ke-Mandi Voice Desk" sub-tab to the backend Munim API endpoint so voice notes and typed orders use the new deterministic pricing and bill rendering engine, while preserving the existing tabs (Mandi Bhav Radar, 101+ Catalog, Procurement Ledger, Wholesale Suppliers).
3. **`src/data/mandiData.js`:**
   - Export and align catalog SKUs and supplier records with the backend SQLite seed database (`seed_catalog.csv` and `seed_prices.csv`) so both frontend catalog views and backend pricing use identical master data.

### C. What to DEPRECATE / REMOVE (Phased)
1. **Ad-hoc regex parser in `src/utils/mandiParser.js` for live production orders:**
   - Retained as a fallback utility and for existing node test suite, but replaced in the primary flow by the backend Munim core.
2. **Client-only bill canvas rendering for official orders:**
   - Replaced by the server-rendered Pillow PNG invoice, guaranteeing identical certified bills across Web, Telegram, and WhatsApp.

### D. What to ADD (The Munim System)
1. **Python FastAPI Backend (`backend/`):**
   - Clean, modular backend adhering to the target architecture.
   - Core domain logic: `agent.py`, `state.py`, `nlu.py`, `matching.py`, `units.py`, `pricing.py`, `billing.py`, `replies.py`, `tts.py`.
   - SQLite Database & Models: `models.py` (Merchants, Suppliers, SKUs, Aliases, Prices, Drafts, Orders, MessageLog).
   - Seed data & rule configuration: `aliases_hinglish.yaml`, `units.yaml`, `seed_catalog.csv`, `seed_prices.csv`.
   - Adapters: `web.py`, `telegram.py`, `whatsapp.py`.
   - Developer CLI: `python -m app.cli say "<text or audio file>"`.
2. **Prompt Assets:**
   - `prompts/nlu_system.md` containing the Munim persona, kirana slang dictionary, few-shots, and JSON output constraints.
3. **Backend Test Suite (`backend/tests/`):**
   - Pytest suite covering units, matching, pricing (schemes, split basket), draft state machine (stale confirmation rejection), idempotent message handling, and golden Hinglish utterances.
4. **Frontend Munim Screen (`src/components/MunimAssistantView.jsx`):**
   - Dedicated voice-first conversational workspace: Big Tap-to-Talk Mic button with audio visualizer, chat bubble history, live interactive draft invoice card, action buttons ([Confirm Order], [Add Items], [Edit], [Cancel]), and voice audio player.

---

## 5. Risk Assessment & Mitigations

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|
| **LLM Price Hallucination** | Severe (shopkeeper gets incorrect quote or financial loss). | High if LLM does math | **Strict Separation:** Gemini *never* sees or calculates prices. LLM output schema strictly extracts entity strings and quantities. All prices, schemes, taxes, and totals are computed in Python with `Decimal`. |
| **Stale Order Confirmations** | Moderate (shopkeeper confirms an outdated price or expired draft). | Medium | State machine requires every confirmation to carry matching `draft_id` and `draft_version`. Any update bumps version; expired or mismatched confirmations force a re-quote. |
| **Free-Tier LLM Rate Limits** | Moderate (temporary 429 errors during voice rush hours). | Medium | Exponential backoff retry with jitter; graceful fallback to local transcription (faster-whisper) and regex matching if external LLM is temporarily unreachable. |
| **Audio Format Fragmentation** | Moderate (Telegram sends `.oga`/`.ogg` Opus; Web sends `.webm` or `.wav`; WhatsApp sends `.ogg`/`.mp4`). | High | Universal FFmpeg conversion pipeline in backend adapter ingest, converting all inbound audio to standardized 16kHz WAV for parsing, followed by immediate deletion of raw files. |
| **Breaking Existing Hackathon Demo** | Severe (judges cannot access existing tabs). | Low if audited | Add Munim alongside existing tabs without deleting or breaking existing components. Keep all existing mock data intact. |

---

## 6. Audit Conclusion & Next Steps

The repository is healthy, cleanly organized on the frontend, and passes its existing test suite. However, it currently lacks a backend, deterministic pricing engine, server-side bill renderer, and multi-channel capability.

The file-level plan in [docs/PLAN.md](file:///c:/Users/WHEELYDOS/Desktop/paytm%20hackathon/docs/PLAN.md) outlines the verified step-by-step implementation from Phase 1 through Phase 7.

