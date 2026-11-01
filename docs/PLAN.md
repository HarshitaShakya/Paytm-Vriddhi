# Paytm Vriddhi: Munim Voice Assistant Implementation Plan

**Date:** 2026-10-31  
**Author:** Applied ML & Full-Stack Engineering Team  
**Status:** Approved for Implementation (Phase 0)

---

## 1. System Architecture & Core Principles

```
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                               INBOUND CHANNELS                                   │
  │  [Web Browser Mic]         [Telegram Voice / Text]      [WhatsApp Cloud API]     │
  │  (MediaRecorder WebM)       (OGG/Opus Voice Note)       (OGG/Opus Webhook)       │
  └──────────────┬─────────────────────────┬───────────────────────────┬─────────────┘
                 │                         │                           │
  ┌──────────────▼─────────────────────────▼───────────────────────────▼─────────────┐
  │                               ADAPTER LAYER                                      │
  │  app/adapters/web.py        app/adapters/telegram.py     app/adapters/whatsapp.py│
  │  - JSON / Multipart API    - Inline buttons & photo     - HMAC-SHA256 signature  │
  │  - Session token auth      - Webhook or long-polling    - Two-step media download│
  └──────────────────────────────┬───────────────────────────────────────────────────┘
                                 │ InboundMessage(channel, sender_id, message_id,
                                 │                text, audio_bytes, mime_type,
                                 │                callback_data)
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                     HEXAGONAL CORE: app/core/agent.py                            │
  │                   handle(InboundMessage) -> list[OutboundMessage]                │
  │                                                                                  │
  │  1. Idempotency Check (message_log table: external_message_id UNIQUE)            │
  │  2. Audio Transcoding & Immediate Raw Audio Purge (FFmpeg -> 16kHz WAV)          │
  │  3. Intent & Entity Extraction (app/core/nlu.py -> Gemini / faster-whisper)      │
  │  4. Entity Matching & Normalization (app/core/matching.py + app/core/units.py)   │
  │  5. Draft State Machine (app/core/state.py: DRAFTING, QUOTED, CONFIRMED, PLACED) │
  │  6. Deterministic Pricing Optimizer (app/core/pricing.py: Schemes & Split Basket)│
  │  7. Certified Bill Rendering (app/core/billing.py: Pillow 800px PNG + Noto Sans) │
  │  8. Response Formatting (app/core/replies.py: Roman Hinglish + Devanagari TTS)   │
  │  9. Spoken Voice Note Generation (app/core/tts.py: Gemini TTS / edge-tts)        │
  └──────────────────────────────────────────────────────────────────────────────────┘
```

### Non-Negotiable Engineering Rules
1. **The LLM Understands; Code Computes.** The LLM only parses unstructured Hinglish speech into a structured Pydantic object (`NluResult`). SKU matching, unit conversions, multi-supplier price comparisons, schemes (e.g. "Buy 10 get 1 free"), minimum orders, delivery fees, and bill rendering are 100% deterministic Python code with unit tests. The LLM *never* computes or outputs a price or total.
2. **Channel-Agnostic Core.** The agent core exposes exactly one entry point: `handle(InboundMessage) -> list[OutboundMessage]`. Web, Telegram, and WhatsApp are thin adapters that normalize inputs and serialize outputs.
3. **Zero Cost & Free Tiers.** Uses Gemini 1.5/2.0 Flash / Flash Lite free tier, edge-tts/Gemini TTS, SQLite, Pillow, and RapidFuzz. Secrets are strictly loaded from environment variables (`GEMINI_API_KEY`, `GEMINI_MODEL`, `TELEGRAM_BOT_TOKEN`, `WHATSAPP_*`).
4. **Safety & Explicit Confirmation.** No order is placed without an explicit confirmation strictly bound to `(draft_id, draft_version)`. Stale or mismatched confirmations trigger an automatic re-quote. Ambiguous phrases or low confidence trigger a single short clarifying question.
5. **No Regression on Existing Dashboard.** All existing features (Overview, Buy Smarter Mandi & Radar, Sell Better Soundbox Loyalty, AI Kirana Advisor) remain operational.
6. **Privacy & Ephemeral Audio.** Raw audio files are deleted immediately after transcription. Only the transcript, parsed JSON, and business outcomes are logged.

---

## 2. Target File Structure

```
paytm hackathon/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI application, CORS, webhook routing, health check
│   │   ├── config.py                   # Pydantic BaseSettings (env vars, defaults, paths)
│   │   ├── cli.py                      # Developer CLI: python -m app.cli say "<input>"
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── agent.py                # Core entry point: handle(InboundMessage) -> list[OutboundMessage]
│   │   │   ├── schemas.py              # InboundMessage, OutboundMessage, ActionButton schemas
│   │   │   ├── state.py                # Draft state machine & versioning (IDLE, DRAFTING, QUOTED, CONFIRMED, PLACED, CANCELLED)
│   │   │   ├── nlu.py                  # Gemini NLU + JSON schema enforcement + fallback
│   │   │   ├── matching.py             # SKU alias lookup + RapidFuzz scoring
│   │   │   ├── units.py                # Hinglish fractions, pack conversions, validation
│   │   │   ├── pricing.py              # Option A (single supplier) & Option B (split basket) with Decimal precision
│   │   │   ├── billing.py              # Pillow bill PNG renderer (Noto Sans Devanagari)
│   │   │   ├── replies.py              # Bilingual reply builder (Roman Hinglish display + Devanagari speech)
│   │   │   └── tts.py                  # Text-to-Speech synthesizer (Gemini TTS / edge-tts) -> OGG/Opus
│   │   ├── adapters/
│   │   │   ├── __init__.py
│   │   │   ├── web.py                  # Web REST & WebSocket / Multipart audio endpoint
│   │   │   ├── telegram.py             # Telegram bot adapter (voice in, photo+inline buttons out)
│   │   │   └── whatsapp.py             # WhatsApp Cloud API adapter stub (HMAC verification, media download)
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── session.py              # SQLAlchemy/SQLModel engine & session maker
│   │   │   ├── models.py               # Database tables: Merchant, Supplier, SKU, SkuAlias, SupplierPrice, Draft, Order, OrderLine, MessageLog
│   │   │   └── seed.py                 # Seed script loading CSVs and YAML into SQLite
│   │   └── data/
│   │       ├── aliases_hinglish.yaml   # Colloquial grocery aliases (chini, tel, namak, etc.)
│   │       ├── units.yaml              # Units, fractions (aadha, dedh, dhai), pack sizes
│   │       ├── seed_catalog.csv        # 101+ SKU catalog data
│   │       ├── seed_prices.csv         # Supplier price quotes, schemes, stock, validity
│   │       └── fonts/                  # Bundled NotoSans-Regular.ttf, NotoSansDevanagari-Regular.ttf
│   ├── prompts/
│   │   └── nlu_system.md               # Munim persona, kirana glossary, 10+ few-shots, JSON schema rules
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                 # Pytest fixtures (in-memory SQLite DB, mock Gemini responses)
│   │   ├── golden_utterances.yaml      # Golden test cases for Hinglish grocery parsing
│   │   ├── test_units.py               # Unit tests for fractions, pack conversions, homophones
│   │   ├── test_matching.py            # Unit tests for SKU matching & fuzzing
│   │   ├── test_pricing.py             # Unit tests for single supplier, split basket, schemes, Decimal math
│   │   ├── test_state.py               # State machine transitions & stale confirmation rejections
│   │   ├── test_nlu.py                 # NLU schema validation and golden utterance parsing
│   │   ├── test_billing.py             # Bill image rendering & visual snapshot check
│   │   └── test_agent.py               # End-to-end conversation flows and idempotency tests
│   ├── requirements.txt                # Python dependencies
│   ├── .env.example                    # Template for environment variables
│   └── README.md                       # Backend setup, testing instructions, tunnel guide
├── src/
│   ├── components/
│   │   ├── MunimAssistantView.jsx      # NEW: Primary Voice Assistant Screen (Mic, Chat, Live Draft Bill)
│   │   ├── Navigation.jsx              # REFACTORED: Add "Munim: Voice Assistant" tab
│   │   ├── BuySmarterView.jsx          # REFACTORED: Link Bol-Ke-Mandi desk to backend Munim API
│   │   └── ... (All other components preserved unchanged)
│   └── ... (Existing frontend preserved)
└── docs/
    ├── AUDIT.md                        # Phase 0 Audit Document
    ├── PLAN.md                         # Phase 0 File-Level Implementation Plan
    └── WHATSAPP_SETUP.md               # Phase 7 WhatsApp Cloud API setup & deployment guide
```

---

## 3. Database Schema & Data Models

Using **SQLModel / SQLAlchemy** with SQLite (file: `backend/vriddhi.db`, overrideable via `DATABASE_URL`):

```sql
-- Merchants
CREATE TABLE merchants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    pin_code VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers (Wholesalers)
CREATE TABLE suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    market VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    reliability_score NUMERIC(3, 1) NOT NULL, -- e.g. 9.2
    on_time_pct INTEGER NOT NULL,            -- e.g. 98%
    min_order NUMERIC(10, 2) DEFAULT 0.00,   -- e.g. 2000.00
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,-- e.g. 150.00
    credit_days INTEGER DEFAULT 0            -- e.g. 7
);

-- SKUs (Master Catalog)
CREATE TABLE skus (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    pack_size VARCHAR(64) NOT NULL,          -- e.g. '1 L', '50 kg bori'
    standard_unit VARCHAR(32) NOT NULL,      -- e.g. 'peti', 'katta', 'bori', 'kg', 'packet'
    pack_multiplier NUMERIC(8, 2) DEFAULT 1.0-- e.g. 12 bottles per peti
);

-- SKU Aliases (Colloquial & Vernacular Synonyms)
CREATE TABLE sku_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_id VARCHAR(64) REFERENCES skus(id),
    alias VARCHAR(255) NOT NULL,             -- e.g. 'bail kolhu', 'sarson tel', 'mustard oil'
    is_primary BOOLEAN DEFAULT FALSE
);

-- Supplier Prices & Schemes
CREATE TABLE supplier_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_id VARCHAR(64) REFERENCES skus(id),
    supplier_id VARCHAR(64) REFERENCES suppliers(id),
    unit VARCHAR(32) NOT NULL,               -- e.g. 'peti', 'katta', 'kg'
    cash_price NUMERIC(10, 2) NOT NULL,
    credit_price NUMERIC(10, 2) NOT NULL,
    scheme_json TEXT,                        -- JSON: {"buy_qty": 10, "free_qty": 1, "free_sku_id": "sku_salt_1kg"}
    in_stock BOOLEAN DEFAULT TRUE,
    valid_until TIMESTAMP NOT NULL
);

-- Order Drafts (State Machine)
CREATE TABLE drafts (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) REFERENCES merchants(id),
    version INTEGER NOT NULL DEFAULT 1,
    state VARCHAR(32) NOT NULL,              -- IDLE, DRAFTING, QUOTED, CONFIRMED, PLACED, CANCELLED
    lines_json TEXT NOT NULL,                -- JSON array of line items with quantities & units
    supplier_plan_json TEXT,                 -- JSON with Option A (single) & Option B (split)
    selected_option VARCHAR(16) DEFAULT 'A', -- 'A' or 'B'
    payment_mode VARCHAR(32) DEFAULT 'cash', -- 'cash' or 'credit_7d'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL            -- 24 hours from creation/modification
);

-- Confirmed Orders
CREATE TABLE orders (
    id VARCHAR(64) PRIMARY KEY,              -- e.g. 'ORD-20261031-0042'
    draft_id VARCHAR(64) REFERENCES drafts(id),
    merchant_id VARCHAR(64) REFERENCES merchants(id),
    supplier_id VARCHAR(64) REFERENCES suppliers(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    savings_amount NUMERIC(10, 2) DEFAULT 0.00,
    payment_mode VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,             -- PLACED, DISPATCHED, DELIVERED, CANCELLED
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Lines
CREATE TABLE order_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id VARCHAR(64) REFERENCES orders(id),
    sku_id VARCHAR(64) REFERENCES skus(id),
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    free_quantity NUMERIC(10, 2) DEFAULT 0.00
);

-- Message Log (Webhook Idempotency & Audit)
CREATE TABLE message_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel VARCHAR(32) NOT NULL,            -- 'web', 'telegram', 'whatsapp'
    external_message_id VARCHAR(128) NOT NULL UNIQUE,
    sender_id VARCHAR(128) NOT NULL,
    transcript TEXT,
    parsed_json TEXT,
    response_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Deterministic Core Engines

### 4.1. NLU Contract (`app/core/nlu.py`)
Gemini 1.5/2.0 Flash is called with `temperature: 0` and strict Pydantic JSON schema constraint:

```python
class ParsedItem(BaseModel):
    raw_phrase: str
    name_guess: str
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    spoken_qty_word: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)

class NluResult(BaseModel):
    transcript_roman: str
    detected_language: Literal["hi", "en", "hinglish", "other"]
    intent: Literal[
        "new_order", "add_items", "remove_items", "change_quantity",
        "replace_item", "change_supplier", "set_payment_mode",
        "confirm", "cancel", "ask_price", "repeat_last_order",
        "status", "greeting", "unclear"
    ]
    items: List[ParsedItem] = []
    supplier_mention: Optional[str] = None
    payment_mode: Optional[Literal["cash", "credit_7d"]] = None
    needs_clarification: bool = False
    clarifying_question_hinglish: Optional[str] = None
    overall_confidence: float = Field(ge=0.0, le=1.0)
```

**Conversation Context Injection:**
When an existing draft exists, its current line items are injected into the prompt:
*"Current Draft Items: 4 peti Bail Kolhu tel, 2 katta chini. User utterance: 'tel hata do aur 1 katta chini badha do'."*
The LLM detects intent `remove_items` (tel) and `change_quantity` (chini: 2 -> 3), returning structured modifications.

### 4.2. Units & Quantity Normalizer (`app/core/units.py`)
- **Fractions Map:**
  - `aadha` / `आधा` / `half` = `0.5`
  - `dedh` / `derh` / `डेढ़` = `1.5`
  - `dhai` / `ढाई` = `2.5`
  - `pauna` / `paun` / `paune` / `पौन` = `0.75`
  - `sava` / `sawa` / `सवा` = `1.25`
- **Hindi Digits & Number Words:**
  - `ek`=1, `do`=2, `teen`=3, `chaar`=4, `paanch`=5, `chhe`=6, `saat`=7, `aath`=8, `nau`=9, `das`=10, `bees`=20, `pachaas`=50, `sau`=100.
- **Pack Unit Validation:**
  - Fractional pack units (e.g. "dhai peti tel", "aadha katta") trigger a mandatory confirmation note in the reply (*"Aapne dhai (2.5) peti bola hai. Kya aap 2 peti ya 3 peti chahenge ya khuli botal?"*).

### 4.3. SKU Matching Engine (`app/core/matching.py`)
1. **Direct Alias Index:** Fast exact match against pre-indexed lowercase aliases in `aliases_hinglish.yaml` and SQLite `sku_aliases`.
2. **RapidFuzz Fallback:** Token sort ratio and partial ratio (>82% threshold) against catalog titles and brand names.
3. If confidence is below threshold, flag `needs_clarification=True` and generate a single polite clarifying question (*"Bhaiya, Bail Kolhu mustard oil chahiye ya Fortune sunflower oil?"*).

### 4.4. Pricing Optimizer (`app/core/pricing.py`)
Deterministic financial calculation using `decimal.Decimal` (no floating-point rounding errors):
- **Option A (Best Single Supplier):**
  - Finds suppliers that can fulfill 100% of the in-stock items.
  - Applies schemes: for each line, if `buy_qty` met, adds `free_qty`.
  - Calculates subtotal. If subtotal < supplier `min_order`, adds shortfall or flags warning.
  - Adds `delivery_fee`.
  - Selects supplier with lowest total landed cost. If two suppliers are within 1% price difference, prefers higher `reliability_score`.
- **Option B (Best Split Basket):**
  - Evaluates items across all suppliers to pick the absolute cheapest unit rate.
  - Calculates landed cost per supplier including their respective delivery fees and minimum orders.
  - Only proposes Option B if the net savings exceed the additional delivery fee by at least ₹150.
- **Savings vs. Historical Rate:**
  - Calculates difference against the merchant's recent purchase rate: *"Aapki pichli khareed ke mukable ₹320 ki bachat."*

### 4.5. Draft State Machine (`app/core/state.py`)

```
             ┌──────────────┐
             │     IDLE     │
             └──────┬───────┘
                    │ new_order / voice note
                    ▼
             ┌──────────────┐
  ┌─────────►│   DRAFTING   │◄────────┐
  │          └──────┬───────┘         │
  │                 │ price & quote   │ edit / add / remove
  │                 ▼                 │ (bumps version)
  │          ┌──────────────┐         │
  │          │    QUOTED    ├─────────┘
  │          └──────┬───────┘
  │                 │
  │      ┌──────────┴──────────┐
  │      │                     │
  │      │ confirm             │ cancel
  │      │ (valid version)     │
  │      ▼                     ▼
  │ ┌──────────────┐     ┌───────────┐
  │ │  CONFIRMED   │     │ CANCELLED │
  │ └──────┬───────┘     └───────────┘
  │        │ dispatch
  │        ▼
  │ ┌──────────────┐
  │ │    PLACED    │
  │ └──────────────┘
  │
  └─ Stale Confirmation (mismatched draft_id or draft_version) -> Re-Quote & Bump Version
```

- Every modification bumps `draft.version = draft.version + 1`.
- Confirmations (`"haan"`, `"theek hai"`, `"kar do"`, `"confirm"`) are only accepted if:
  1. Current state is `QUOTED`.
  2. The confirmation payload or intent matches the active `draft_id` and latest `version`.
- If a stale or mismatched confirmation is received, the agent rejects it and returns an updated quote with the current version.

### 4.6. Certified Bill Image Renderer (`app/core/billing.py`)
Generates an 800px wide, high-resolution PNG using **Pillow (PIL)**:
- Bundles `NotoSans-Regular.ttf` and `NotoSansDevanagari-Regular.ttf` for pristine rendering of Hindi characters (कट्टा, बोरी, पेटी, रुपये).
- **Layout:**
  - Header: Paytm Vriddhi Navy `#002970`, "Bol-Ke-Mandi Wholesale Network", Draft/Invoice ID, Date & Time.
  - Merchant details: Shop name, location, and payment badge (CASH ON DELIVERY vs 7-DAY CREDIT).
  - Supplier banner: Chosen supplier name, APMC Trust Score (e.g. `9.2 / 10`), On-Time Delivery %.
  - Table: Serial, Item Name, Quantity & Pack, Landed Rate, Line Total, Free Scheme Goods highlighted in Emerald.
  - Delivery Fee & Tax breakdown.
  - Grand Total highlighted in large font.
  - Savings banner: *"Pichli khareed ke mukable ₹X ki bachat"*.
  - Footer: Validity timestamp (*"Yeh bhav 24 ghante ke liye maanya hai"*).

### 4.7. Bilingual Reply Builder (`app/core/replies.py`)
Every outbound response produces two distinct text representations:
1. `display_text`: Written in clean, friendly Roman Hinglish for screen/chat bubbles.
   *Example: "Bhaiya, aapka 4 peti Bail Kolhu tel aur 2 katta chini ka draft bill taiyar hai. Total ₹20,720 banta hai (Raj Traders). Confirm karein?"*
2. `speech_text`: Written with Devanagari for Hindi words and English for brand names/numbers, optimized for speech synthesis pronunciation.
   *Example: "भैया, आपका चार पेटी Bail Kolhu तेल और दो कट्टा चीनी का बिल तैयार है। कुल बीस हज़ार सात सौ बीस रुपये। क्या आर्डर कर दें?"*
- Spoken responses strictly adhere to the <15 seconds guideline; detailed row-by-row figures are carried by the bill image.

---

## 5. Channel-Agnostic Core Contract

### Inbound & Outbound Schemas (`app/core/schemas.py`)

```python
class ActionButton(BaseModel):
    label: str                  # e.g. "Order Confirm Karein"
    action: str                 # "confirm", "add_item", "edit", "cancel"
    payload: Dict[str, Any]     # {"draft_id": "d_123", "version": 2}

class InboundMessage(BaseModel):
    channel: Literal["web", "telegram", "whatsapp"]
    sender_id: str              # Unique user ID / phone / chat_id
    message_id: str             # Channel message ID for idempotency
    text: Optional[str] = None
    audio_bytes: Optional[bytes] = None
    mime_type: Optional[str] = None
    callback_data: Optional[str] = None # When user clicks an inline button

class OutboundMessage(BaseModel):
    recipient_id: str
    display_text: str           # Roman Hinglish text
    speech_text: Optional[str] = None # Text for TTS voice note
    image_bytes: Optional[bytes] = None # Pillow rendered bill PNG
    image_filename: Optional[str] = "bill.png"
    voice_bytes: Optional[bytes] = None # Synthesized OGG/Opus audio
    buttons: List[ActionButton] = []
```

### Channel Adapters
1. **Web Adapter (`app/adapters/web.py`):**
   - Endpoints: `POST /api/chat`, `POST /api/voice`, `POST /api/action`.
   - Accepts multipart audio from browser `MediaRecorder` or JSON text.
   - Returns JSON with display text, base64 bill image, base64 audio, and button descriptors.
2. **Telegram Adapter (`app/adapters/telegram.py`):**
   - Webhook or polling handler.
   - Inbound: downloads voice note file via Telegram Bot API, passes bytes to `handle()`.
   - Outbound: sends `sendPhoto` with bill image, caption with `display_text`, and `InlineKeyboardMarkup` with buttons carrying `draft_id:version`. Follows with `sendVoice` if voice reply enabled.
3. **WhatsApp Cloud API Stub (`app/adapters/whatsapp.py`):**
   - `GET /webhook/whatsapp`: Hub challenge verification (`hub.mode`, `hub.verify_token`, `hub.challenge`).
   - `POST /webhook/whatsapp`: `X-Hub-Signature-256` HMAC-SHA256 signature verification.
   - Two-step media download: fetches media URL via Graph API, downloads binary audio with Bearer token.
   - Interactive button message formatting (Image header + Body text + 3 Action Buttons).
   - Enforces 24-hour conversation window compliance.

---

## 6. Frontend Integration Plan

### Keep Existing Architecture Intact
- Existing tabs remain fully functional:
  - `OverviewView.jsx` (Suite Overview)
  - `BuySmarterView.jsx` (Buy Smarter Mandi & Radar)
  - `SellBetterView.jsx` (Sell Better Soundbox Loyalty)
  - `AIBridgeView.jsx` (AI Kirana Advisor)

### New First-Class Tab: "Munim: Voice Assistant"
1. **`src/components/MunimAssistantView.jsx`:**
   - **Hero Mic Desk:** Large, tactile microphone button with real-time waveform recording feedback using browser `MediaRecorder`.
   - **Sample Voice Prompt Chips:** Tap-to-speak suggestions ("4 peti Bail Kolhu tel aur 2 katta chini", "5 kg pyaaz aur 10 kg aloo", "dedh bori arhar dal").
   - **Interactive Chat Conversation:** Chat bubbles showing user queries (with audio playback) and Munim's Hinglish responses.
   - **Live Certified Bill Preview Panel:** Displays the server-rendered bill PNG with zoom, download, and instant Action Buttons:
     - `[✓ Order Confirm Karein]` (dispatches order to supplier)
     - `[+ Kuch Aur Jodein]` (prompts voice input)
     - `[✎ Quantity Badlein]` (inline edit)
     - `[✗ Cancel]` (cancels draft)
   - **Voice Note Player:** Embedded audio player playing Munim's Devanagari spoken voice confirmation.
2. **Bridge to BuySmarterView:**
   - In `BuySmarterView.jsx`, refactor the "Bol-Ke-Mandi Voice Desk" sub-tab to invoke the backend Munim API, ensuring both screens utilize the same deterministic pricing core.

---

## 7. Phased Implementation Roadmap

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7
Audit &     Core &      NLU &       Bill &      Web Chat    Telegram    TTS Voice   WhatsApp
Plan        Pricing     Prompts     Replies     Screen      Adapter     Notes       Stub
```

### Phase 0: Audit & Plan (Current)
- Deliverables: `docs/AUDIT.md`, `docs/PLAN.md`.
- No code modified.
- Stop and report to user for explicit "go".

### Phase 1: Core Foundation & Deterministic Pricing
- Deliverables:
  - Python project environment (`backend/requirements.txt`, `.env.example`).
  - Data files: `aliases_hinglish.yaml`, `units.yaml`, `seed_catalog.csv`, `seed_prices.csv`.
  - SQLite database & SQLModel models (`merchants`, `suppliers`, `skus`, `drafts`, `orders`, `message_log`).
  - `app/core/units.py`: Hinglish fractions (`aadha`, `dedh`, `dhai`), pack conversions.
  - `app/core/matching.py`: Alias lookup + RapidFuzz matching.
  - `app/core/pricing.py`: Decimal calculations, schemes, min orders, Option A (single) & Option B (split basket).
  - `app/core/state.py`: Draft state machine & versioning.
  - `app/cli.py`: Developer CLI (`python -m app.cli say "<input>"`).
  - Tests: `test_units.py`, `test_matching.py`, `test_pricing.py`, `test_state.py`.
- Verification Gate: All Phase 1 pytest tests pass.

### Phase 2: NLU Engine & Golden Utterance Benchmarks
- Deliverables:
  - `prompts/nlu_system.md`: Munim persona, Hinglish dictionary, 10+ few-shots, JSON schema enforcement.
  - `app/core/nlu.py`: Gemini API call with `temperature=0`, strict Pydantic parsing, retry logic, and faster-whisper fallback.
  - `tests/golden_utterances.yaml`: Standard test dataset covering:
    - `"4 peti Bail Kolhu tel aur 2 katta chini"`
    - `"3 bori arhar dal aur 2 katta chini"`
    - `"5 kg pyaaz aur 10 kg aloo bhej do"`
    - `"aadha kilo chini"`
    - `"dedh bori arhar dal aur dhai peti tel"` (with pack warning flag)
    - Modifications: `"tel hata do"`, `"chini 2 katta kar do"`
  - `tests/test_nlu.py`: Golden parse verification suite.
- Verification Gate: All golden utterances parse with 100% field accuracy.

### Phase 3: Certified Bill Renderer & Bilingual Replies
- Deliverables:
  - Bundled fonts: `NotoSans-Regular.ttf`, `NotoSansDevanagari-Regular.ttf`.
  - `app/core/billing.py`: Pillow renderer (~800px PNG) with itemized table, free schemes, and grand total.
  - `app/core/replies.py`: Generates `display_text` (Roman Hinglish) and `speech_text` (Devanagari).
  - `tests/test_billing.py`: Snapshot test saving sample bill image.
- Verification Gate: Pillow renders clean PNG with correct Hindi characters.

### Phase 4: Web Chat Screen & Frontend Integration
- Deliverables:
  - `backend/app/main.py`: FastAPI server with CORS, `/api/chat`, `/api/voice`, `/api/drafts`.
  - `backend/app/adapters/web.py`: Web adapter handling text and audio uploads.
  - `src/components/MunimAssistantView.jsx`: Voice-first web chat UI with mic recording and live bill viewer.
  - `src/components/Navigation.jsx`: Navigation item for Munim assistant.
  - Verify existing tabs (`OverviewView`, `BuySmarterView`, `SellBetterView`, `AIBridgeView`) are intact.
- Verification Gate: Browser mic recording generates and updates a live bill image on screen.

### Phase 5: Telegram Channel Adapter
- Deliverables:
  - `backend/app/adapters/telegram.py`: Webhook / polling adapter.
  - Inbound: Voice note download & text processing.
  - Outbound: Send bill photo + caption + inline action buttons (`[Confirm] [Add] [Edit]`).
  - State binding: Callback data carries `draft_id` and `version`.
- Verification Gate: Sending a voice note to Telegram bot returns the bill photo and functional inline buttons.

### Phase 6: TTS Voice Note Generation
- Deliverables:
  - `backend/app/core/tts.py`: Pluggable TTS engine (Gemini TTS / edge-tts) with FFmpeg conversion to OGG/Opus.
  - Deliver voice notes alongside bill images on Telegram and Web.
- Verification Gate: Voice note audio plays smoothly in Hinglish under 15 seconds.

### Phase 7: WhatsApp Cloud API Adapter Stub & Documentation
- Deliverables:
  - `backend/app/adapters/whatsapp.py`: Verification token check, HMAC-SHA256 signature verification, media download stub, interactive button reply format.
  - `docs/WHATSAPP_SETUP.md`: Comprehensive guide for Meta Developer Portal setup, webhook configuration, and Cloudflare Tunnel.
- Verification Gate: WhatsApp adapter verification unit tests pass.

---

## 8. Definition of Done

The project is complete when:
1. Shopkeeper can speak in Hinglish into the **Web Mic** or send a **Telegram Voice Note**:
   *"4 peti Bail Kolhu tel aur 2 katta chini"*
2. The agent responds with a **certified bill image** showing the best calculated price, items, and savings.
3. Follow-up voice notes (*"tel hata do, 1 katta chini badha do"*) correctly update the draft and re-render the bill.
4. Clicking **[Confirm Order]** verifies draft version and creates a placed order in the database.
5. All Pytest and Vitest test suites pass with 0 failures.
6. The entire system runs at **zero cost** on free tiers with thorough documentation.

