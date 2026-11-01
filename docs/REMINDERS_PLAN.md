# "Yaad Dila Dena" (Smart Demand Reminders) Implementation Plan

## 1. Overview
The "Yaad Dila Dena" feature enables kirana shopkeepers to log customer demand for out-of-stock or uncarried products via voice or text (e.g., *"chai yaad dila dena"*, *"atta note kar lo"*, *"ye wali chai yaad dila dena"*). 

When the shopkeeper later starts a wholesale procurement order:
1. The assistant surfaces top demand-driven reminders as interactive suggestion chips.
2. The merchant can toggle individual items, add all, or skip.
3. Added reminders are linked to the active draft and priced through APMC suppliers.
4. When the order is confirmed, linked reminders are automatically marked as `ordered`.
5. If an item is unselected, removed, or the draft cancelled, reminders return to `open`.
6. Stale version clicks are safely rejected with re-quotes, and Telegram callbacks strictly respect the 64-byte payload limit.

---

## 2. Architecture & Design Principles
- **LLM understands; code computes:** Intent extraction and entity recognition are isolated to NLU (returning strict Pydantic schemas). All state transitions, deduplication, demand bumping, pricing, and expiration logic reside in deterministic Python services.
- **Channel-agnostic core:** `agent.py` emits structured `SuggestionSet` and `ActionButton` models; channel adapters (`telegram.py`, `whatsapp.py`, `web.py`, `cli.py`) translate them to native UI elements.
- **Strict Free-Tier Compatibility:** Operates offline with deterministic fallbacks or via Gemini free tier.

---

## 3. Files to Touch

### A. Database Models & Schema
- **`backend/app/db/models.py`**:
  - Add `Reminder` table model with columns:
    - `id: str` (Primary Key, e.g. `rem_<hex>`)
    - `merchant_id: str` (Foreign Key to `merchants.id`, indexed)
    - `label_roman: str`
    - `sku_id: Optional[str]` (Foreign Key to `skus.id`, nullable)
    - `brand: Optional[str]` (nullable)
    - `qty: Optional[Decimal]` (nullable)
    - `unit: Optional[str]` (nullable)
    - `note: Optional[str]` (nullable)
    - `image_ref: Optional[str]` (nullable)
    - `status: str` (`open`, `in_cart`, `ordered`, `dismissed`, default `open`)
    - `demand_count: int` (default 1)
    - `linked_draft_id: Optional[str]` (Foreign Key to `drafts.id`, nullable)
    - `linked_line_id: Optional[str]` (nullable)
    - `created_at: datetime`
    - `last_requested_at: datetime`
    - `expires_at: datetime` (default +30 days)
    - `source_message_id: Optional[str]` (nullable)

### B. Core Schemas & Suggestion Models
- **`backend/app/core/schemas.py`**:
  - Add `SuggestionItem` (reminder_id, label, demand_count, selected, sku_id, qty, unit).
  - Add `SuggestionSet` (title, items, actions, draft_id, draft_version).
  - Add `suggestions: Optional[SuggestionSet]` to `OutboundMessage`.

### C. NLU (Natural Language Understanding)
- **`backend/prompts/nlu_system.md`** & **`prompts/nlu_system.md`**:
  - Add `remember_item`, `list_reminders`, `remove_reminder` intents.
  - Add `reminder_items: List[ParsedItem]`.
  - Add 10+ few-shot examples clearly distinguishing remember phrases (*yaad dila dena*, *note kar lo*, *likh lo*, *agli baar mangwana*) from order phrases (*bhej do*, *mangwa do*, *chahiye abhi*).
  - Document contextual reminder resolution (*"haan wo chai add kar do"*).
- **`backend/app/core/nlu.py`**:
  - Update `NluResult` schema with new intents and `reminder_items`.
  - Include merchant's open reminders in prompt context (`OPEN_REMINDERS`).
  - Update deterministic fallback parser with regex and phrase matchers for offline/CI resilience.

### D. Reminders Domain Service
- **`backend/app/core/reminders.py`** *(NEW)*:
  - `add_or_bump(merchant_id, item, session, source_message_id)`: SKU match or fuzzy label matching (threshold >= 80) -> increment `demand_count`, update `last_requested_at`.
  - `list_open(merchant_id, session)`: fetches open reminders sorted by demand then recency; runs lazy expiration.
  - `dismiss(reminder_id, session)`: sets status to `dismissed`.
  - `suggest_for(draft, session)`: returns top 5 open reminders not yet in cart, re-running SKU matching.
  - `link_to_draft(reminder_id, draft, session, line_data)`: transitions to `in_cart` and attaches line.
  - `unlink(reminder_id, session)`: resets to `open`.
  - `unlink_all_for_draft(draft_id, session)`: unlinks all items when draft is cancelled or expires.
  - `mark_ordered(draft_id, session)`: marks linked reminders as `ordered` upon order placement.
  - `expire_old(session)`: marks past `expires_at` records as `dismissed`.

### E. Agent Orchestration & State Machine
- **`backend/app/core/agent.py`**:
  - Route `remember_item`, `list_reminders`, `remove_reminder` intents.
  - On `new_order`, fetch `suggest_for(draft)` and attach `SuggestionSet` to outbound.
  - Handle callback queries:
    - Reminder toggle (`rt:<rid>:<did>:<ver>`)
    - Add all (`ra:<did>:<ver>`)
    - Skip (`rs:<did>:<ver>`)
    - Dismiss (`rd:<rid>`)
  - Ensure draft cancellations and confirmations trigger reminder lifecycle methods.
  - Handle voice patch additions referencing reminders (*"wo chai add kar do"*).
- **`backend/app/core/state.py`**:
  - Trigger `reminders.mark_ordered` in `confirm_and_place_order`.
  - Trigger `reminders.unlink_all_for_draft` in `cancel_draft` and on expiration.
- **`backend/app/core/replies.py`**:
  - Add reply builders for reminder confirmation (*"Theek hai, chai list mein hai"* / duplicate bump), reminders listing, and suggestion headers.

### F. Channel Adapters
- **`backend/app/adapters/telegram.py`**:
  - Render `SuggestionSet` as interactive inline keyboard chips (`☐ Chai (3x)` / `☑ Chai`, `[Sab add karo]`, `[Skip]`).
  - Keep all `callback_data` strictly $\le 64$ bytes using compact tokens (`rt:...`, `ra:...`, `rs:...`, `rd:...`).
  - Use `editMessageReplyMarkup` / `editMessageText` to toggle chips in place.
  - Reject stale versions with friendly re-quote.
- **`backend/app/adapters/whatsapp.py`**:
  - Format `SuggestionSet` into WhatsApp interactive list message (max 10 rows).
- **`backend/app/cli.py`**:
  - Add support for reminder utterances (e.g. `python -m app.cli say "chai yaad dila dena"`).
  - Print reminder list and suggestions in terminal.

### G. Test Suite & Documentation
- **`backend/tests/test_reminders.py`** *(NEW)*:
  - Remember vs order intent separation.
  - Duplicate bump counter (`demand_count`).
  - Full lifecycle (`open` -> `in_cart` -> `ordered`, unlinking on removal/cancellation).
  - Suggestions limit (max 5) and ordering.
  - 64-byte Telegram callback validation.
  - 30-day lazy expiry.
- **`backend/tests/golden_utterances.yaml`**:
  - Add golden test cases for `remember_item` and `list_reminders`.
- **`README.md`**:
  - Document the "Yaad Dila Dena" feature, sample voice commands, and CLI test examples.

