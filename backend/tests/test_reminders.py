import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from sqlmodel import Session, select

from app.core.schemas import InboundMessage, SuggestionSet, SuggestionItem
from app.core.nlu import parse_with_gemini
from app.core.agent import handle_inbound_message
from app.core.reminders import (
    add_or_bump,
    list_open,
    dismiss,
    suggest_for,
    link_to_draft,
    unlink,
    unlink_all_for_draft,
    mark_ordered,
    expire_old
)
from app.core.state import DraftManager
from app.db.models import Reminder, Draft, Order
from app.adapters.telegram import build_inline_keyboard

def test_remember_vs_order_intent():
    """Validates that remember phrases map to remember_item and order phrases map to new_order."""
    res_rem = parse_with_gemini("chai yaad dila dena")
    assert res_rem.intent == "remember_item"
    assert len(res_rem.reminder_items) > 0
    assert "chai" in res_rem.reminder_items[0].name_guess.lower()

    res_rem2 = parse_with_gemini("atta note kar lo")
    assert res_rem2.intent == "remember_item"

    res_rem3 = parse_with_gemini("ye wali chai yaad dila dena")
    assert res_rem3.intent == "remember_item"

    res_order = parse_with_gemini("chai bhej do")
    assert res_order.intent == "new_order"
    assert len(res_order.items) > 0

    res_order2 = parse_with_gemini("4 peti Bail Kolhu tel bhej do")
    assert res_order2.intent == "new_order"

def test_duplicate_bump(db_session: Session):
    """Remembering the same item twice bumps demand_count to 2 instead of creating duplicate rows."""
    merchant_id = "m_sharma_kirana"

    inbound1 = InboundMessage(
        channel="web",
        sender_id="user_1",
        message_id="msg_rem_001",
        text="chai yaad dila dena",
        merchant_id=merchant_id
    )
    out1 = handle_inbound_message(inbound1, db_session)
    assert len(out1) == 1
    assert "Theek hai" in out1[0].display_text

    rems = db_session.exec(select(Reminder).where(Reminder.merchant_id == merchant_id)).all()
    assert len(rems) == 1
    assert rems[0].demand_count == 1
    assert rems[0].status == "open"

    # Second request for same item
    inbound2 = InboundMessage(
        channel="web",
        sender_id="user_1",
        message_id="msg_rem_002",
        text="ye wali chai yaad dila dena",
        merchant_id=merchant_id
    )
    out2 = handle_inbound_message(inbound2, db_session)
    assert len(out2) == 1
    assert "pehle se list mein hai" in out2[0].display_text
    assert "2nd" in out2[0].display_text

    rems_after = db_session.exec(select(Reminder).where(Reminder.merchant_id == merchant_id)).all()
    assert len(rems_after) == 1  # No duplicate row created
    assert rems_after[0].demand_count == 2

def test_reminder_lifecycle_complete(db_session: Session):
    """
    Full lifecycle test:
    open -> in_cart on select
    line removed -> open
    in_cart on select again
    draft cancelled -> open
    draft confirmed -> ordered
    """
    merchant_id = "m_sharma_kirana"
    sender_id = "test_merchant_user"

    # 1. Shopkeeper asks to remember an item
    inbound_rem = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_1",
        text="maggi note kar lo",
        merchant_id=merchant_id
    )
    handle_inbound_message(inbound_rem, db_session)
    rem = db_session.exec(select(Reminder).where(Reminder.merchant_id == merchant_id)).first()
    assert rem is not None
    assert rem.status == "open"

    # 2. Start a new order
    inbound_order = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_2",
        text="4 peti Bail Kolhu tel",
        merchant_id=merchant_id
    )
    out_order = handle_inbound_message(inbound_order, db_session)
    draft_id = out_order[0].draft_id
    draft_v1 = out_order[0].draft_version
    assert out_order[0].suggestions is not None
    assert len(out_order[0].suggestions.items) > 0

    # 3. Toggle select suggestion (status -> in_cart)
    toggle_cb = json.dumps({
        "action": "reminder_toggle",
        "reminder_id": rem.id,
        "draft_id": draft_id,
        "version": draft_v1
    })
    inbound_toggle = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_3",
        callback_data=toggle_cb,
        merchant_id=merchant_id
    )
    out_t = handle_inbound_message(inbound_toggle, db_session)
    draft_v2 = out_t[0].draft_version
    assert draft_v2 > draft_v1

    db_session.refresh(rem)
    assert rem.status == "in_cart"
    assert rem.linked_draft_id == draft_id

    # 4. Remove line by spoken utterance (status -> open)
    inbound_remove = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_4",
        text="maggi hata do",
        merchant_id=merchant_id
    )
    handle_inbound_message(inbound_remove, db_session)
    db_session.refresh(rem)
    assert rem.status == "open"

    # 5. Add back to cart via voice patch "wo maggi add kar do"
    inbound_voice_add = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_5",
        text="wo maggi add kar do",
        merchant_id=merchant_id
    )
    out_v_add = handle_inbound_message(inbound_voice_add, db_session)
    db_session.refresh(rem)
    assert rem.status == "in_cart"
    draft_v3 = out_v_add[0].draft_version

    # 6. Test Cancel Draft: returns reminder to open
    cancel_cb = json.dumps({
        "action": "cancel",
        "draft_id": draft_id,
        "version": draft_v3
    })
    inbound_cancel = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_6",
        callback_data=cancel_cb,
        merchant_id=merchant_id
    )
    handle_inbound_message(inbound_cancel, db_session)
    db_session.refresh(rem)
    assert rem.status == "open"

    # 7. Create fresh draft, add reminder, and confirm -> status becomes ordered
    inbound_fresh = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_7",
        text="2 katta chini",
        merchant_id=merchant_id
    )
    out_fresh = handle_inbound_message(inbound_fresh, db_session)
    fresh_draft_id = out_fresh[0].draft_id
    fresh_v1 = out_fresh[0].draft_version

    # Select reminder
    toggle_fresh = json.dumps({
        "action": "reminder_toggle",
        "reminder_id": rem.id,
        "draft_id": fresh_draft_id,
        "version": fresh_v1
    })
    out_sel = handle_inbound_message(InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_8",
        callback_data=toggle_fresh,
        merchant_id=merchant_id
    ), db_session)
    fresh_v2 = out_sel[0].draft_version

    # Confirm order
    confirm_cb = json.dumps({
        "action": "confirm",
        "draft_id": fresh_draft_id,
        "version": fresh_v2
    })
    out_conf = handle_inbound_message(InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_lc_9",
        callback_data=confirm_cb,
        merchant_id=merchant_id
    ), db_session)
    assert out_conf[0].order_id is not None

    db_session.refresh(rem)
    assert rem.status == "ordered"

def test_suggestions_cap_and_ordering(db_session: Session):
    """Validates that suggest_for returns max 5 open reminders ordered by demand_count desc then recency."""
    merchant_id = "m_sharma_kirana"
    now = datetime.now(timezone.utc)

    # Insert 7 open reminders with varying demand counts
    items = [
        ("Item A", 1, now - timedelta(hours=7)),
        ("Item B", 5, now - timedelta(hours=6)),
        ("Item C", 2, now - timedelta(hours=5)),
        ("Item D", 4, now - timedelta(hours=4)),
        ("Item E", 3, now - timedelta(hours=3)),
        ("Item F", 1, now - timedelta(hours=2)),
        ("Item G", 6, now - timedelta(hours=1)),
    ]
    for label, count, req_time in items:
        rem = Reminder(
            id=f"rem_{label.replace(' ', '_').lower()}",
            merchant_id=merchant_id,
            label_roman=label,
            status="open",
            demand_count=count,
            created_at=req_time,
            last_requested_at=req_time,
            expires_at=now + timedelta(days=30)
        )
        db_session.add(rem)
    db_session.commit()

    draft = DraftManager.get_or_create_draft(merchant_id, db_session)
    suggestions = suggest_for(draft, db_session, max_items=5)

    assert len(suggestions) == 5
    # Order should be highest demand first: G (6), B (5), D (4), E (3), C (2)
    labels = [s.label_roman for s in suggestions]
    assert labels == ["Item G", "Item B", "Item D", "Item E", "Item C"]

def test_stale_callback_version_rejection(db_session: Session):
    """Clicking a suggestion button with an old version returns a stale rejection and latest quote."""
    merchant_id = "m_sharma_kirana"
    sender_id = "user_stale"

    # Remember item
    handle_inbound_message(InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_stale_1",
        text="parle-g note kar lo",
        merchant_id=merchant_id
    ), db_session)
    rem = db_session.exec(select(Reminder).where(Reminder.merchant_id == merchant_id)).first()

    # Draft order (version 2 after update)
    out_order = handle_inbound_message(InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_stale_2",
        text="4 peti Bail Kolhu tel",
        merchant_id=merchant_id
    ), db_session)
    draft_id = out_order[0].draft_id
    current_ver = out_order[0].draft_version

    # Send stale callback with old version (e.g. current_ver - 1)
    stale_cb = json.dumps({
        "action": "reminder_toggle",
        "reminder_id": rem.id,
        "draft_id": draft_id,
        "version": current_ver - 1
    })
    out_stale = handle_inbound_message(InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_stale_3",
        callback_data=stale_cb,
        merchant_id=merchant_id
    ), db_session)

    assert len(out_stale) == 1
    assert "badlav hue the" in out_stale[0].display_text
    assert out_stale[0].image_bytes is not None

def test_telegram_callback_data_under_64_bytes():
    """Validates that all Telegram inline keyboard buttons strictly comply with the <= 64 byte limit."""
    sug_items = [
        SuggestionItem(reminder_id="rem_a1b2c3d4", label="Tata Tea Gold Leaf (500g)", demand_count=3, selected=False),
        SuggestionItem(reminder_id="rem_e5f6g7h8", label="Aashirvaad Shuddh Chakki Aata", demand_count=1, selected=True),
    ]
    sug_set = SuggestionSet(
        title="Yaad Dila Dena",
        items=sug_items,
        actions=["add_all", "skip"],
        draft_id="d_98765432",
        draft_version=3
    )
    action_btns = [
        {"action": "confirm", "label": "✓ Order Confirm Karein", "payload": {"draft_id": "d_98765432", "version": 3}},
        {"action": "cancel", "label": "✗ Cancel", "payload": {"draft_id": "d_98765432", "version": 3}}
    ]
    # Import ActionButton
    from app.core.schemas import ActionButton
    btns = [ActionButton(**b) for b in action_btns]

    kb = build_inline_keyboard(btns, sug_set, draft_id="d_98765432", draft_version=3)
    assert "inline_keyboard" in kb

    for row in kb["inline_keyboard"]:
        for btn in row:
            cb_bytes = btn["callback_data"].encode("utf-8")
            assert len(cb_bytes) <= 64, f"Callback data exceeds 64 bytes: '{btn['callback_data']}' ({len(cb_bytes)} bytes)"

def test_reminder_30_day_expiry(db_session: Session):
    """Validates that reminders older than 30 days are automatically dismissed upon access."""
    merchant_id = "m_sharma_kirana"
    now = datetime.now(timezone.utc)

    # Insert an expired reminder (expired 2 days ago)
    rem_expired = Reminder(
        id="rem_expired_item",
        merchant_id=merchant_id,
        label_roman="Old Seasonal Item",
        status="open",
        demand_count=1,
        created_at=now - timedelta(days=32),
        last_requested_at=now - timedelta(days=32),
        expires_at=now - timedelta(days=2)
    )
    # Insert an active reminder (expires in 28 days)
    rem_active = Reminder(
        id="rem_active_item",
        merchant_id=merchant_id,
        label_roman="Fresh Active Item",
        status="open",
        demand_count=2,
        created_at=now - timedelta(days=2),
        last_requested_at=now - timedelta(days=2),
        expires_at=now + timedelta(days=28)
    )
    db_session.add_all([rem_expired, rem_active])
    db_session.commit()

    # Query open reminders
    open_rems = list_open(merchant_id, db_session)
    open_ids = [r.id for r in open_rems]

    assert "rem_active_item" in open_ids
    assert "rem_expired_item" not in open_ids

    # Check that expired reminder status changed to dismissed
    db_session.refresh(rem_expired)
    assert rem_expired.status == "dismissed"

def test_remove_from_list_vs_remove_from_bill(db_session: Session):
    """
    Validates the critical distinction:
    - 'list se hata do' / 'chai list se hata do' -> removes from customer reminder list.
    - 'hata do' / 'tel hata do' -> removes from draft bill.
    """
    merchant_id = "m_sharma_kirana"

    # 1. Add a reminder: "chai yaad dila dena"
    inb_rem = InboundMessage(
        channel="web",
        sender_id="user_test_sep",
        message_id="msg_sep_01",
        text="chai yaad dila dena",
        merchant_id=merchant_id
    )
    handle_inbound_message(inb_rem, db_session)
    rems = list_open(merchant_id, db_session)
    assert len(rems) >= 1
    assert any("chai" in r.label_roman.lower() or "tea" in r.label_roman.lower() for r in rems)

    # 2. Add an order: "4 peti Bail Kolhu tel aur 2 katta chini bhej do"
    inb_ord = InboundMessage(
        channel="web",
        sender_id="user_test_sep",
        message_id="msg_sep_02",
        text="4 peti Bail Kolhu tel aur 2 katta chini bhej do",
        merchant_id=merchant_id
    )
    out_ord = handle_inbound_message(inb_ord, db_session)
    assert out_ord[0].image_bytes is not None

    draft = db_session.exec(select(Draft).where(Draft.merchant_id == merchant_id, Draft.state.in_(["DRAFTING", "QUOTED"]))).first()
    assert draft is not None
    lines = json.loads(draft.lines_json)
    assert len(lines) == 2

    # 3. Test 'tel hata do' -> Removes Oil from bill lines (NOT from reminder list)
    inb_bill_rm = InboundMessage(
        channel="web",
        sender_id="user_test_sep",
        message_id="msg_sep_03",
        text="tel hata do",
        merchant_id=merchant_id
    )
    out_bill_rm = handle_inbound_message(inb_bill_rm, db_session)
    assert "hata diya gaya" in out_bill_rm[0].display_text

    db_session.refresh(draft)
    lines_after_rm = json.loads(draft.lines_json)
    assert len(lines_after_rm) == 1
    assert "chini" in lines_after_rm[0]["name"].lower() or "sugar" in lines_after_rm[0]["name"].lower()

    # The reminder should STILL be open
    rems_after_bill_rm = list_open(merchant_id, db_session)
    assert any("chai" in r.label_roman.lower() or "tea" in r.label_roman.lower() for r in rems_after_bill_rm)

    # 4. Test 'chai list se hata do' -> Removes Chai from the reminders list
    inb_list_rm = InboundMessage(
        channel="web",
        sender_id="user_test_sep",
        message_id="msg_sep_04",
        text="chai list se hata do",
        merchant_id=merchant_id
    )
    out_list_rm = handle_inbound_message(inb_list_rm, db_session)
    assert "hata diya gaya" in out_list_rm[0].display_text

    rems_final = list_open(merchant_id, db_session)
    assert not any("chai" in r.label_roman.lower() or "tea" in r.label_roman.lower() for r in rems_final)

    # 5. Test removing the last remaining item from the bill ("chini hata do") -> Draft is cancelled cleanly
    inb_last_rm = InboundMessage(
        channel="web",
        sender_id="user_test_sep",
        message_id="msg_sep_05",
        text="chini hata do",
        merchant_id=merchant_id
    )
    out_last_rm = handle_inbound_message(inb_last_rm, db_session)
    assert "hata diya gaya" in out_last_rm[0].display_text
    assert "koi item nahi hai" in out_last_rm[0].display_text

    db_session.refresh(draft)
    assert draft.state == "CANCELLED"

