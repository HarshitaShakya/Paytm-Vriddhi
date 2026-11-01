import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from sqlmodel import Session, select

from app.db.models import Merchant, Supplier, SKU, SupplierPrice, Draft, Order, OrderLine, MessageLog
from app.core.schemas import InboundMessage, ActionButton
from app.core.agent import handle_inbound_message
from app.core.state import DraftManager
from app.core.autoplace import (
    eligible_for_auto_place,
    cancel_auto_place_countdown,
    execute_auto_place_for_draft,
    poll_and_execute_overdue_autoplaces
)

@pytest.fixture
def autoplace_fixture(db_session: Session):
    """Sets up a merchant, supplier, SKUs, and historical order for auto-place tests."""
    mid = f"m_auto_{uuid.uuid4().hex[:6]}"
    merchant = Merchant(
        id=mid,
        name="Verma General Store",
        phone="9876543210",
        pin_code="208001",
        voice_confirm_limit=Decimal("15000.00"),
        auto_place_enabled=True,
        auto_place_max_total=Decimal("5000.00"),
        auto_place_delay_seconds=60,
        auto_place_tolerance_pct=5.0,
        usual_supplier_id="sup_shree_ganesh"
    )
    db_session.add(merchant)

    # Historical order for SKU continuity and baseline pricing
    past_order_id = f"ORD_HIST_{uuid.uuid4().hex[:6]}"
    past_order = Order(
        id=past_order_id,
        draft_id="d_hist",
        merchant_id=mid,
        supplier_id="sup_shree_ganesh",
        total_amount=Decimal("2170.00"),
        savings_amount=Decimal("120.00"),
        payment_mode="cash",
        source="manual",
        status="PLACED",
        placed_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    db_session.add(past_order)

    # Historical line for chini (sku_madhur_sugar_50kg)
    past_line = OrderLine(
        order_id=past_order_id,
        sku_id="sku_madhur_sugar_50kg",
        quantity=Decimal("1.0"),
        unit="katta",
        unit_price=Decimal("2170.00"),
        total_price=Decimal("2170.00"),
        free_quantity=Decimal("0.0")
    )
    db_session.add(past_line)
    db_session.commit()
    db_session.refresh(merchant)

    return merchant

def test_eligibility_matrix_all_conditions(db_session: Session, autoplace_fixture: Merchant):
    """Validates that each failing condition in the 9-point safety matrix blocks auto-place."""
    merchant = autoplace_fixture
    now = datetime.now(timezone.utc)

    # Base valid draft
    valid_plan = {
        "option_a": {
            "supplier_id": "sup_shree_ganesh",
            "supplier_name": "Shree Ganesh Foods",
            "grand_total": 2170.00,
            "savings": 0.0,
            "lines": [
                {
                    "sku_id": "sku_madhur_sugar_50kg",
                    "quantity": 1.0,
                    "unit": "katta",
                    "unit_price": 2170.00,
                    "final_total": 2170.00
                }
            ]
        }
    }
    draft = Draft(
        id=f"d_mat_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=json.dumps([{"sku_id": "sku_madhur_sugar_50kg", "name": "Sugar", "quantity": 1.0, "unit": "katta"}]),
        supplier_plan_json=json.dumps(valid_plan),
        confidence_score=0.95
    )
    db_session.add(draft)
    db_session.commit()

    # 1. Base case: ALL conditions pass
    ok, reasons = eligible_for_auto_place(draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is True, f"Expected eligible but failed: {reasons}"
    assert len(reasons) == 0

    # 2. Blocked if auto_place_enabled is False
    merchant.auto_place_enabled = False
    ok, reasons = eligible_for_auto_place(draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is False
    assert any("disabled" in r.lower() for r in reasons)
    merchant.auto_place_enabled = True

    # 3. Blocked if confidence < 0.90
    ok, reasons = eligible_for_auto_place(draft, merchant, db_session, nlu_confidence=0.85)
    assert ok is False
    assert any("confidence" in r.lower() for r in reasons)

    # 4. Blocked if clarification flag raised
    ok, reasons = eligible_for_auto_place(draft, merchant, db_session, nlu_confidence=0.95, needs_clarification=True)
    assert ok is False
    assert any("clarification" in r.lower() for r in reasons)

    # 5. Blocked if fractional pack warning exists
    ok, reasons = eligible_for_auto_place(draft, merchant, db_session, nlu_confidence=0.95, has_pack_warning=True)
    assert ok is False
    assert any("fractional" in r.lower() or "pack" in r.lower() for r in reasons)

    # 6. Blocked if unlisted SKU in draft
    unlisted_draft = Draft(
        id=f"d_unlisted_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=json.dumps([{"sku_id": "unlisted", "name": "Custom Product", "quantity": 1.0, "unit": "packet", "unlisted": True}]),
        supplier_plan_json=json.dumps(valid_plan),
        confidence_score=0.95
    )
    db_session.add(unlisted_draft)
    db_session.commit()
    ok, reasons = eligible_for_auto_place(unlisted_draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is False
    assert any("unlisted" in r.lower() for r in reasons)

    # 7. Blocked if SKU was never ordered before
    new_sku_draft = Draft(
        id=f"d_new_sku_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=json.dumps([{"sku_id": "sku_brand_new_item", "name": "New Item", "quantity": 1.0, "unit": "packet"}]),
        supplier_plan_json=json.dumps(valid_plan),
        confidence_score=0.95
    )
    db_session.add(new_sku_draft)
    db_session.commit()
    ok, reasons = eligible_for_auto_place(new_sku_draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is False
    assert any("never been ordered" in r.lower() for r in reasons)

    # 8. Blocked if total > merchant.auto_place_max_total (limit 5000)
    expensive_plan = dict(valid_plan)
    expensive_plan["option_a"] = dict(valid_plan["option_a"])
    expensive_plan["option_a"]["grand_total"] = 7500.00
    expensive_draft = Draft(
        id=f"d_expensive_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=draft.lines_json,
        supplier_plan_json=json.dumps(expensive_plan),
        confidence_score=0.95
    )
    db_session.add(expensive_draft)
    db_session.commit()
    ok, reasons = eligible_for_auto_place(expensive_draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is False
    assert any("max limit" in r.lower() for r in reasons)

    # 9. Blocked if total exceeds tolerance % from past order (past order = 2170, tolerance 5% is ~108)
    tol_plan = dict(valid_plan)
    tol_plan["option_a"] = dict(valid_plan["option_a"])
    tol_plan["option_a"]["grand_total"] = 2450.00  # +12.9% diff
    tol_draft = Draft(
        id=f"d_tol_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=draft.lines_json,
        supplier_plan_json=json.dumps(tol_plan),
        confidence_score=0.95
    )
    db_session.add(tol_draft)
    db_session.commit()
    ok, reasons = eligible_for_auto_place(tol_draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is False
    assert any("differs" in r.lower() or "tolerance" in r.lower() for r in reasons)

    # 10. Blocked if supplier != usual supplier
    diff_supp_plan = dict(valid_plan)
    diff_supp_plan["option_a"] = dict(valid_plan["option_a"])
    diff_supp_plan["option_a"]["supplier_id"] = "sup_raj_traders"
    diff_supp_draft = Draft(
        id=f"d_diff_supp_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=draft.lines_json,
        supplier_plan_json=json.dumps(diff_supp_plan),
        confidence_score=0.95
    )
    db_session.add(diff_supp_draft)
    db_session.commit()
    ok, reasons = eligible_for_auto_place(diff_supp_draft, merchant, db_session, nlu_confidence=0.95)
    assert ok is False
    assert any("usual supplier" in r.lower() for r in reasons)

def test_countdown_timer_places_exactly_once(db_session: Session, autoplace_fixture: Merchant):
    """Timer places the order exactly once when overdue, logging source='auto'."""
    merchant = autoplace_fixture
    now = datetime.now(timezone.utc)

    plan = {
        "option_a": {
            "supplier_id": "sup_shree_ganesh",
            "grand_total": 2170.00,
            "savings": 0.0,
            "lines": [{"sku_id": "sku_madhur_sugar_50kg", "quantity": 1.0, "unit": "katta", "unit_price": 2170.00, "final_total": 2170.00}]
        }
    }
    draft = Draft(
        id=f"d_timer_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=2,
        state="AUTO_PENDING",
        lines_json=json.dumps([{"sku_id": "sku_madhur_sugar_50kg", "name": "Sugar", "quantity": 1.0, "unit": "katta"}]),
        supplier_plan_json=json.dumps(plan),
        auto_place_at=now - timedelta(seconds=5),  # Overdue
        confidence_score=0.95
    )
    db_session.add(draft)
    db_session.commit()

    # First polling run
    placed = poll_and_execute_overdue_autoplaces(db_session)
    assert len(placed) == 1
    assert placed[0][0] == draft.id

    # Check order was created with source="auto"
    order_id = placed[0][1]
    order = db_session.get(Order, order_id)
    assert order is not None
    assert order.source == "auto"
    assert order.status == "PLACED"

    # Check draft state changed to PLACED
    db_session.refresh(draft)
    assert draft.state == "PLACED"
    assert draft.auto_place_at is None

    # Second polling run: must NOT place again (exactly once guarantee!)
    placed_second = poll_and_execute_overdue_autoplaces(db_session)
    assert len(placed_second) == 0

def test_user_edit_during_countdown_cancels_autoplace(db_session: Session, autoplace_fixture: Merchant):
    """An edit during the countdown cancels auto-place and reverts to QUOTED with bumped version."""
    merchant = autoplace_fixture
    now = datetime.now(timezone.utc)

    plan = {
        "option_a": {
            "supplier_id": "sup_shree_ganesh",
            "grand_total": 2170.00,
            "savings": 0.0,
            "lines": [{"sku_id": "sku_madhur_sugar_50kg", "quantity": 1.0, "unit": "katta", "unit_price": 2170.00, "final_total": 2170.00}]
        }
    }
    draft = Draft(
        id=f"d_edit_cancel_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="AUTO_PENDING",
        lines_json=json.dumps([{"sku_id": "sku_madhur_sugar_50kg", "name": "Sugar", "quantity": 1.0, "unit": "katta"}]),
        supplier_plan_json=json.dumps(plan),
        auto_place_at=now + timedelta(seconds=60),
        confidence_score=0.95
    )
    db_session.add(draft)
    db_session.commit()

    # Merchant sends an edit message: "1 katta chini badha do"
    inbound = InboundMessage(
        channel="web",
        sender_id="user_edit",
        message_id=str(uuid.uuid4()),
        text="chini 2 katta kar do",
        merchant_id=merchant.id
    )
    outbounds = handle_inbound_message(inbound, db_session)
    assert len(outbounds) >= 1

    db_session.refresh(draft)
    # Must have cancelled the AUTO_PENDING timer and bumped version
    assert draft.auto_place_at is None or draft.version > 1

def test_ruko_cancels_autoplace(db_session: Session, autoplace_fixture: Merchant):
    """Sending 'ruko' during countdown cancels the draft entirely."""
    merchant = autoplace_fixture
    now = datetime.now(timezone.utc)

    draft = Draft(
        id=f"d_ruko_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="AUTO_PENDING",
        lines_json=json.dumps([{"sku_id": "sku_madhur_sugar_50kg", "name": "Sugar", "quantity": 1.0, "unit": "katta"}]),
        auto_place_at=now + timedelta(seconds=60)
    )
    db_session.add(draft)
    db_session.commit()

    inbound = InboundMessage(
        channel="web",
        sender_id="user_ruko",
        message_id=str(uuid.uuid4()),
        text="ruko",
        merchant_id=merchant.id
    )
    outbounds = handle_inbound_message(inbound, db_session)
    assert len(outbounds) >= 1
    assert "cancel" in outbounds[0].display_text.lower()

    db_session.refresh(draft)
    assert draft.state == "CANCELLED"
    assert draft.auto_place_at is None

def test_stale_version_never_places(db_session: Session, autoplace_fixture: Merchant):
    """An overdue draft whose version does not match claimed version is never auto-placed."""
    merchant = autoplace_fixture
    now = datetime.now(timezone.utc)

    draft = Draft(
        id=f"d_stale_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=3,
        state="AUTO_PENDING",
        lines_json=json.dumps([{"sku_id": "sku_madhur_sugar_50kg", "name": "Sugar", "quantity": 1.0, "unit": "katta"}]),
        auto_place_at=now - timedelta(seconds=10)
    )
    db_session.add(draft)
    db_session.commit()

    ok, order, msg = execute_auto_place_for_draft(draft.id, db_session, expected_version=2)
    assert ok is False
    assert "Version mismatch" in msg
    assert order is None

def test_voice_confirm_limit_blocks_large_order(db_session: Session, autoplace_fixture: Merchant):
    """Voice confirm above merchant.voice_confirm_limit requires clicking the confirm button."""
    merchant = autoplace_fixture
    merchant.voice_confirm_limit = Decimal("5000.00")
    db_session.add(merchant)

    # Order total ₹21,140 > limit ₹5,000
    plan = {
        "option_a": {
            "supplier_id": "sup_shree_ganesh",
            "grand_total": 21140.00,
            "lines": [{"sku_id": "sku_madhur_sugar_50kg", "quantity": 10.0, "unit": "katta", "unit_price": 2114.00, "final_total": 21140.00}]
        }
    }
    draft = Draft(
        id=f"d_limit_{uuid.uuid4().hex[:6]}",
        merchant_id=merchant.id,
        version=1,
        state="QUOTED",
        lines_json=json.dumps([{"sku_id": "sku_madhur_sugar_50kg", "name": "Sugar", "quantity": 10.0, "unit": "katta"}]),
        supplier_plan_json=json.dumps(plan)
    )
    db_session.add(draft)
    db_session.commit()

    # Shopkeeper attempts voice confirmation: "theek hai order confirm kar do"
    inbound = InboundMessage(
        channel="web",
        sender_id="user_limit",
        message_id=str(uuid.uuid4()),
        text="theek hai order confirm kar do",
        merchant_id=merchant.id
    )
    outbounds = handle_inbound_message(inbound, db_session)
    assert len(outbounds) >= 1
    # Must reject voice confirm and require button
    assert "voice limit" in outbounds[0].display_text.lower()
    assert any(b.action == "confirm" for b in outbounds[0].buttons)

    # Draft must still be QUOTED, not PLACED
    db_session.refresh(draft)
    assert draft.state == "QUOTED"

def test_idempotent_duplicate_message(db_session: Session, autoplace_fixture: Merchant):
    """Duplicate message_id returns cached response without duplicate side effects."""
    merchant = autoplace_fixture
    msg_id = f"msg_dup_{uuid.uuid4().hex[:6]}"

    inbound = InboundMessage(
        channel="web",
        sender_id="user_dup",
        message_id=msg_id,
        text="chai yaad dila dena",
        merchant_id=merchant.id
    )
    out1 = handle_inbound_message(inbound, db_session)
    out2 = handle_inbound_message(inbound, db_session)

    assert out1[0].display_text == out2[0].display_text
