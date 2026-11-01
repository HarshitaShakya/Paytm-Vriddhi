# Voice Confirm & Auto-Place Implementation Plan

## 1. Overview
Enhance the voice-order procurement agent with:
1. **Robust Voice Confirm Detection & Disambiguation**: Deterministic YAML-backed phrase matching, item presence disambiguation ("2 katta chini order kar do" vs "order place kar do"), context validation (requires existing QUOTED draft or asks "Kaunsa order? Bill dobara bhejoon?"), and merchant `voice_confirm_limit` safety guardrail requiring button click for large orders.
2. **Opt-in, Safe Auto-Place with Cancel Window**: Strict 9-point safety matrix (`eligible_for_auto_place`), `AUTO_PENDING` draft state, persistent `auto_place_at` countdown, async background poller, cancel on any user inbound message / edit / "ruko", and automated receipt dispatch with order source tagging (`auto` vs `manual`).

---

## 2. Files to Touch

### Data Models & Configuration
- `backend/app/db/models.py`:
  - `Merchant`: add `voice_confirm_limit` (Decimal, default 15000), `auto_place_enabled` (bool, default False), `auto_place_max_total` (Decimal, default 5000), `auto_place_delay_seconds` (int, default 60), `auto_place_tolerance_pct` (float, default 5.0), `usual_supplier_id` (Optional[str]).
  - `Draft`: add `auto_place_at` (Optional[datetime]), `confidence_score` (Optional[float]). State enum includes `AUTO_PENDING`.
  - `Order`: add `source` (str, default "manual").
- `backend/app/core/confirm_phrases.yaml`: New YAML configuration file with canonical Hindi, Hinglish, and English confirmation phrases.

### NLU & Prompts
- `prompts/nlu_system.md`: Add few-shot examples for voice confirm vs new order disambiguation, and clarification when no draft exists.
- `backend/app/core/nlu.py`: Load `confirm_phrases.yaml`, implement strict item presence check (if items present -> `new_order`/`add_items`, never `confirm`), require QUOTED draft in context + confidence >= 0.85 -> `confirm`, else return clarification question *"Kaunsa order? Bill dobara bhejoon?"*.

### State Machine & Auto-Place Core Service
- `backend/app/core/state.py`:
  - Update `VALID_TRANSITIONS` to support `AUTO_PENDING`.
  - Update `DraftManager.get_or_create_draft` to consider `AUTO_PENDING` drafts.
  - In `confirm_and_place_order`, support `AUTO_PENDING` state and `source` parameter (`"auto"` vs `"manual"`).
- `backend/app/core/autoplace.py`: (New Domain Service)
  - `eligible_for_auto_place(draft, merchant, nlu_res, session) -> Tuple[bool, List[str]]`:
    1. `merchant.auto_place_enabled is True`
    2. `nlu_res.overall_confidence >= 0.9`
    3. `not nlu_res.needs_clarification`
    4. Every line matched to a valid SKU above threshold
    5. No unlisted items and no fractional-pack warnings
    6. Every SKU has been previously ordered by this merchant
    7. `grand_total <= merchant.auto_place_max_total`
    8. `grand_total` within `auto_place_tolerance_pct` of last comparable confirmed order
    9. Quoted supplier equals `usual_supplier` (or merchant's top historical supplier)
  - `cancel_auto_place_countdown(draft, session)`: reverts `AUTO_PENDING` to `QUOTED`, clears `auto_place_at`, bumps draft version.
  - `execute_auto_place_for_draft(draft_id, session)`: atomic execution checking version consistency and placing order.
  - `poll_and_execute_overdue_autoplaces(session_factory)`: background polling worker loop for FastAPI lifecycle.

### Agent Orchestration & Adapters
- `backend/app/core/agent.py`:
  - When draft is in `AUTO_PENDING`, any incoming user message or edit immediately cancels countdown and reverts draft to `QUOTED`.
  - Voice confirm check against `merchant.voice_confirm_limit`: if total exceeds limit, prompt user with button confirmation.
  - If eligible for auto-place on bill quote, transition draft to `AUTO_PENDING`, set `auto_place_at = now + delay`, output caption with countdown notice and buttons `[⚡ Abhi place karo]`, `[✗ Cancel]`, `[✎ Edit]`.
  - Handle button action `"auto_place_now"` / `"ap"`.
- `backend/app/adapters/telegram.py` & `backend/app/adapters/web.py`:
  - Support auto-place receipt dispatch and callback data compression (`ap:...`).
- `backend/app/main.py`:
  - Register `asyncio` background task on FastAPI startup for auto-place polling.

### Tests
- `backend/tests/test_autoplace.py`: New comprehensive test suite:
  - 9-point eligibility matrix tests (verifying each individual condition blocking auto-place).
  - Countdown timer placement.
  - User edit / cancellation / "ruko" cancels auto-place.
  - Restart / overdue recovery places exactly once.
  - Stale version rejection.
  - Voice confirm vs new_order disambiguation ("2 katta chini order kar do" vs "order place kar do").
  - Voice confirm limit threshold safety check.
- `backend/tests/golden_utterances.yaml`: Add disambiguation golden cases.

---

## 3. Implementation Steps
1. Create `docs/AUTOPLACE_PLAN.md` (this document).
2. Create `backend/app/core/confirm_phrases.yaml`.
3. Update database models in `backend/app/db/models.py`.
4. Update state transitions in `backend/app/core/state.py`.
5. Implement `backend/app/core/autoplace.py` (eligibility checks, poller, execution).
6. Update `backend/app/core/nlu.py` and `prompts/nlu_system.md`.
7. Update `backend/app/core/agent.py` and adapters for auto-place countdown and voice limits.
8. Integrate background polling task into `backend/app/main.py` & `telegram.py`.
9. Create `backend/tests/test_autoplace.py` and run full regression suite.

