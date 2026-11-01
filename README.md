<p align="center">
  <img src="docs/logo.jpg" alt="Paytm Vriddhi Logo" width="400" />
</p>

# Paytm Vriddhi: Buy Smarter, Sell Better

**Paytm "Build for India" Track**  
*Empowering Kirana Storekeepers across Bharat with Voice AI & Closed-Loop Economics.*

[![Repository](https://img.shields.io/badge/GitHub-HarshitaShakya%2FPaytm--Vriddhi-blue?logo=github)](https://github.com/HarshitaShakya/Paytm-Vriddhi)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Production%20Ready-black?logo=vercel)](https://vercel.com)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.3-61DAFB?logo=react)](https://react.dev)

---

## 1. The Core Concept: A Closed Economic Loop & "Munim"

Every small shopkeeper runs two businesses at once — **buying** goods from wholesale distributors (*thok vyapari*) in the morning and **selling** them to walk-in customers all day. Profit leaks happen on both sides:
1. **On the buy side:** Shopkeepers negotiate wholesale prices blind. Local distributors charge varying rates without transparency. Without visibility into live wholesale rates (*mandi bhav*), the shopkeeper silently loses margin on every restocking run.
2. **On the sell side:** Shopkeepers have no lightweight way to reward regular customers.

**Paytm Vriddhi** unites both sides with **Munim (मुनीम)** — a voice-first, Hinglish-speaking personal procurement assistant:

```
  ┌─────────────────────────────────────────────────────────────┐
  │         Buy Smarter: Munim Assistant & Mandi Radar          │
  │     (Voice Order -> Deterministic Pricing -> Best Bill)     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼ Margin Freed Up (₹3,200+ / mo)
  ┌─────────────────────────────────────────────────────────────┐
  │     AI Kirana Advisor: Margin Reinvestment Ledger           │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼ Self-Funds Customer Cashbacks
  ┌─────────────────────────────────────────────────────────────┐
  │        Sell Better: Soundbox 4.0 Pro & Loyalty Suite        │
  │  (Bachat Points + Milestones + Confetti Scratch Card)       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼ Repeat Footfall ↑ Higher Revenue
  ┌─────────────────────────────────────────────────────────────┐
  │            More Restocking Power for Next Morning           │
  └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Non-Negotiable Principles

1. **The LLM Understands; Code Computes.**  
   The LLM (Gemini) *only* transcribes speech and extracts structured entities and intent (`NluResult`). SKU matching, unit conversions, multi-supplier price comparisons, schemes (e.g. *"Buy 10 get 1 free"*), minimum order thresholds, and bill rendering are **100% deterministic code** with unit tests. **The LLM never calculates a price or total.**
2. **Channel-Agnostic Core.**  
   The entire system runs through a single entry point:  
   `handle_inbound_message(InboundMessage) -> list[OutboundMessage]`.  
   Web Browser, Telegram Bot, and WhatsApp Cloud API operate as thin adapters.
3. **Zero Cost.**  
   Runs entirely on free tiers: Gemini free tier, `edge-tts` neural voices, SQLite, Pillow, and open-source libraries.
4. **Safety & Versioned Confirmations.**  
   Orders are never placed without an explicit confirmation strictly bound to `(draft_id, draft_version)`. Any edits bump the draft version; stale confirmations are rejected with an updated re-quote.
5. **Privacy & Ephemeral Audio.**  
   Raw voice note audio is processed and purged immediately from memory. Only transcripts, parsed JSON, and outcomes are retained.
6. **No Regressions on Existing Dashboard.**  
   The existing dashboard tabs (*Suite Overview*, *Buy Smarter Mandi & Radar*, *Sell Better Soundbox Loyalty*, *AI Kirana Advisor*) remain 100% operational alongside the new *Munim: Voice Assistant* workspace.

---

## 3. System Architecture & Tech Stack

```
backend/
├── app/
│   ├── main.py                     # FastAPI server & CORS middleware
│   ├── cli.py                      # Developer CLI runner: python -m app.cli say "<utterance>"
│   ├── core/
│   │   ├── agent.py                # Hexagonal orchestrator: handle_inbound_message()
│   │   ├── schemas.py              # InboundMessage, OutboundMessage, ActionButton
│   │   ├── state.py                # Draft state machine & versioning (DRAFTING, QUOTED, CONFIRMED, PLACED)
│   │   ├── nlu.py                  # Gemini NLU with Pydantic JSON schema output + fallback
│   │   ├── matching.py             # SKU alias lookup & RapidFuzz scoring
│   │   ├── units.py                # Hinglish fractions (aadha, dedh, dhai) & pack unit checks
│   │   ├── pricing.py              # Decimal pricing: Option A (single) & Option B (split basket) + schemes
│   │   ├── billing.py              # Pillow bill renderer (820px certified PNG with Noto Sans Devanagari)
│   │   ├── replies.py              # Bilingual reply builder (Roman Hinglish display + Devanagari speech)
│   │   └── tts.py                  # Neural Hindi TTS (hi-IN-MadhurNeural) -> FFmpeg OGG/Opus
│   ├── adapters/
│   │   ├── web.py                  # Web REST endpoints (/api/chat, /api/voice, /api/action)
│   │   ├── telegram.py             # Telegram bot adapter (webhook + local polling runner)
│   │   └── whatsapp.py             # WhatsApp Cloud API adapter (HMAC verify, media download, 24h window)
│   └── db/
│       ├── models.py               # SQLModel tables (Merchant, Supplier, SKU, Draft, Order, MessageLog)
│       ├── session.py              # SQLite session factory
│       └── seed.py                 # Master seed script loading CSVs and YAML
├── prompts/
│   └── nlu_system.md               # Munim persona, kirana glossary, 12 few-shots
└── tests/                          # 56 Pytest test cases across all core modules
```

---

## 4. Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm
- **FFmpeg** (installed and available on PATH)

### 1. Backend Setup & Launch
```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Configure environment variables (or copy template)
cp backend/.env.example backend/.env

# 3. Seed SQLite database (runs automatically on first launch, or manually)
$env:PYTHONPATH="backend"
python -m app.db.seed

# 4. Start the FastAPI server
python -m app.main
```
Backend API will be running at `http://localhost:8000` (Health check: `http://localhost:8000/health`).

### 2. Frontend Setup & Launch
In a second terminal:
```bash
# Install frontend dependencies
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 5. Running the Test Suites

### Backend Pytest Suite (56 Unit & Integration Tests)
```bash
$env:PYTHONPATH="backend"
pytest backend/tests -v
```
**Test Coverage:**
- `test_units.py`: Fractions (`aadha`, `dedh`, `dhai`), Hindi digits, compound units, pack flags.
- `test_matching.py`: Exact alias matching, Devanagari matching, RapidFuzz fuzzy search.
- `test_pricing.py`: Free goods scheme math, single supplier selection with 1% reliability tie-breaker, out-of-stock skipping, split basket optimization.
- `test_state.py`: Draft lifecycle, version increments, and rejection of stale confirmations.
- `test_billing.py`: Certified Pillow bill PNG rendering, Devanagari fonts, Hindi number-to-words.
- `test_nlu.py`: 10 golden utterances covering standard orders, contextual item removals, quantity modifications, confirmations, and cancellations.
- `test_agent.py`: End-to-end conversation flows, order placements, and idempotency cache verification.
- `test_web_adapter.py`: REST `/api/chat`, `/api/voice`, `/api/action`, and `/api/orders` endpoints.
- `test_telegram_adapter.py`: Telegram text messages, inline keyboard building, and button callback handling.
- `test_tts.py`: Neural speech synthesis and `/api/tts` audio streaming.
- `test_whatsapp_adapter.py`: Webhook challenge verification, `X-Hub-Signature-256` HMAC validation, and interactive button payload formatting.

### Frontend Regression Suite (14 Tests)
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## 6. Testing Channels

### A. Testing with Web Microphone
1. Open `http://localhost:5173/` and navigate to the **"Munim: Voice Assistant"** tab.
2. Click the green **Microphone button** and say:
   > *"4 peti Bail Kolhu tel aur 2 katta chini"*
3. Munim parses the utterance, calculates the best rate from APMC suppliers, and renders the **certified bill image** in real time with interactive action buttons (`[✓ Order Confirm Karein]`, `[+ Kuch Aur Jodein]`, `[✎ Quantity Badlein]`, `[✗ Cancel]`).
4. Click **"Suniye (Aawaz)"** to hear Munim announce the quote aloud in Hindi!
5. Click **[Order Confirm Karein]** to bind the version and place the order into the global procurement ledger.

### B. Testing via Developer CLI
Run direct queries against the core agent without running any browser or server:
```bash
$env:PYTHONPATH="backend"
python -m app.cli say "4 peti Bail Kolhu tel aur 2 katta chini"
python -m app.cli say "theek hai order confirm kar do"
```

#### "Yaad Dila Dena" (Customer Demand Reminders) CLI Examples:
```bash
# 1. Note customer demand when an item is out of stock
python -m app.cli say "chai yaad dila dena"
# Output: Theek hai, Tata Tea Gold Leaf (500g) list mein hai.

# 2. Re-logging the same item increments demand counter without duplicate rows
python -m app.cli say "ye wali chai yaad dila dena"
# Output: Tata Tea Gold Leaf (500g) pehle se list mein hai, 2nd baar maangi gayi.

# 3. View currently open demand reminders
python -m app.cli say "meri reminder list dikhao"

# 4. Start a new wholesale order - Munim surfaces top demanded reminders as suggestions!
python -m app.cli say "4 peti Bail Kolhu tel aur 2 katta chini"
# Output: Draft bill + 💡 Yaad Dila Dena suggestions with [Sab add karo] and [Skip]

# 5. Add remembered item via voice or text patch
python -m app.cli say "wo chai add kar do"

# 6. Confirm order - closes the reminder and marks status as ordered automatically!
python -m app.cli say "haan order confirm kar do"
```

### C. Free Testing with Telegram Bot
1. Open Telegram and talk to [@BotFather](https://t.me/BotFather) to create a new free bot (`/newbot`).
2. Copy the bot token into `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
3. Run the local polling runner (no webhooks or public IP needed):
   ```bash
   $env:PYTHONPATH="backend"
   python -m app.adapters.telegram
   ```
4. Open your bot on Telegram:
   - Send a **voice note** or text message: *"5 kg pyaaz aur 10 kg aloo bhej do"*.
   - The bot replies with the **certified bill PNG photo**, caption in Roman Hinglish, and **inline action buttons**.
   - Tap **[✓ Confirm Order]** to finalize the order.

### D. WhatsApp Cloud API & Cloudflare Tunnel
See [docs/WHATSAPP_SETUP.md](file:///c:/Users/WHEELYDOS/Desktop/paytm%20hackathon/docs/WHATSAPP_SETUP.md) for full instructions on setting up Meta Developer credentials, validating HMAC signatures, and forwarding webhooks via Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8000`).

---

## 7. Golden Benchmark Cases

| Input Utterance | Parsed Items | Pricing & Rules Applied |
|---|---|---|
| `"4 peti Bail Kolhu tel aur 2 katta chini"` | Oil 4 peti, Sugar 2 katta | Best single APMC supplier (Shree Ganesh / Raj Traders), landed delivery cost computed. |
| `"3 bori arhar dal aur 2 katta chini"` | Toor Dal 3 bori, Sugar 2 katta | Shree Ganesh skipped due to out-of-stock dal; Raj Traders selected. |
| `"5 kg pyaaz aur 10 kg aloo bhej do"` | Onion 5 kg, Potato 10 kg | Mandi rates applied; conversational filler handled. |
| `"aadha kilo chini"` | Sugar 0.5 kg | Fractional multiplier parsed without pack warning. |
| `"dedh bori arhar dal aur dhai peti tel"` | Dal 1.5 bori, Oil 2.5 peti | Fractional pack warning flagged: *"Dhyan dein: khuli peti/bori check karein"*. |
| *"tel hata do"* (Contextual Edit) | Removes Oil from active draft | Active draft version bumped: `v1` $\to$ `v2`. |
| *"theek hai order confirm kar do"* | Confirm intent | Draft version validated $\to$ Order `ORD-...` placed. |
| `"chai yaad dila dena"` | Remember Intent (`remember_item`) | Item recorded in `reminders` table; linked to SKU alias. |
| `"ye wali chai yaad dila dena"` | Duplicate Reminder | Deduplicated by SKU/fuzzy match; `demand_count` bumped $\to$ `2`. |
| `"meri reminder list dikhao"` | List Reminders (`list_reminders`) | Returns active demand list with tap-to-dismiss chips. |
| `"wo chai add kar do"` (Contextual Add) | Links open reminder to draft | `status` $\to$ `in_cart`; draft bill re-rendered and priced. |
| `"2 katta chini order kar do"` | Item Disambiguation | Contains items $\to$ Parsed as `new_order` / `add_items` (never mistakenly confirms). |
| `"order place kar do"` (with QUOTED draft) | Voice Confirmation | Draft version validated $\to$ Order placed. |
| `"order place kar do"` (no draft) | Disambiguation / Clarification | Asks: *"Kaunsa order? Bill dobara bhejoon?"*. |

---

## 8. Voice Confirmation & Opt-In Auto-Place Safety Guardrails

### 1. Robust Voice Confirmation & Disambiguation
- **YAML-Backed Canonical Phrases:** English, Hinglish, and Devanagari confirmation phrases stored in `confirm_phrases.yaml` (*"order kar do"*, *"order place kar do"*, *"kar do"*, *"theek hai"*, *"haan"*, *"confirm"*, *"bhej do"*, etc.).
- **Item Disambiguation:** If an utterance contains grocery items or quantities (e.g. *"2 katta chini order kar do"*), it is strictly treated as `new_order` or `add_items`, never as an accidental confirmation.
- **Draft Existence Guardrail:** If an utterance contains a confirm phrase but no `QUOTED` draft exists, Munim asks for clarification: *"Kaunsa order? Bill dobara bhejoon?"*.
- **Voice Confirm Limit:** If draft total exceeds `merchant.voice_confirm_limit` (default ₹15,000), voice confirmation is blocked with a security prompt: *"Bill ₹X voice seema se bada hai. Kripya niche diye Confirm button se verify karein."*.

### 2. Opt-in Safe Auto-Place with Cancellation Window
Kirana storekeepers restock routine staples regularly. Auto-Place automates repeat restocking safely:
- **Merchant Settings (Opt-in, default OFF):**
  - `auto_place_enabled` (bool, default `False`)
  - `auto_place_max_total` (Decimal, default `5000.00`)
  - `auto_place_delay_seconds` (int, default `60` seconds)
  - `auto_place_tolerance_pct` (float, default `5.0%`)
- **9-Point Eligibility Invariant Matrix (`eligible_for_auto_place`):**
  All 9 conditions must strictly hold before auto-place countdown activates:
  1. `auto_place_enabled == True`
  2. NLU `overall_confidence >= 0.90`
  3. No clarification flags (`needs_clarification == False`)
  4. Every line matched to a catalog SKU above fuzzy threshold
  5. No unlisted or fractional-pack warnings
  6. Every SKU previously ordered by this merchant
  7. Order total $\le$ `auto_place_max_total`
  8. Order total within `auto_place_tolerance_pct` of the last comparable confirmed order
  9. Best supplier equals the merchant's usual supplier
- **Cancel Window & Countdown:**
  - Eligible drafts enter `AUTO_PENDING` state with `auto_place_at = now + delay`.
  - Bill caption informs the merchant: `"<N> second mein order place ho jayega. Rokna ho to Cancel dabayein ya 'ruko' bolein."`
  - Inline buttons: `[⚡ Abhi Place Karo]`, `[✗ Cancel]`, `[✎ Edit]`.
  - **Cancel Triggers:** Any incoming text/voice message, edit, Cancel button, or saying *"ruko"* cancels the countdown immediately, bumps draft version, and reverts state to `QUOTED`.
- **Background Poller:** Runs on startup to sweep overdue drafts and polls periodically, executing auto-place orders idempotently with `source="auto"`.
