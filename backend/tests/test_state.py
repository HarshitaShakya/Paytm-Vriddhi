import json
from decimal import Decimal
import pytest
from app.core.state import DraftManager
from app.core.pricing import LineRequest, calculate_pricing

def test_draft_lifecycle_and_stale_confirmation_rejection(db_session):
    merchant_id = "m_sharma_kirana"
    
    # 1. Create Draft
    draft = DraftManager.get_or_create_draft(merchant_id, db_session)
    assert draft.state == "DRAFTING"
    assert draft.version == 1

    # 2. Update Draft lines -> version 2, state QUOTED
    requests = [
        LineRequest(sku_id="sku_bail_kolhu_1l", quantity=Decimal("4"), unit="peti"),
        LineRequest(sku_id="sku_madhur_sugar_50kg", quantity=Decimal("2"), unit="katta")
    ]
    pricing = calculate_pricing(requests, "cash", db_session)
    lines_data = [
        {"sku_id": "sku_bail_kolhu_1l", "quantity": 4, "unit": "peti"},
        {"sku_id": "sku_madhur_sugar_50kg", "quantity": 2, "unit": "katta"}
    ]
    draft = DraftManager.update_draft_lines(draft, lines_data, pricing, "cash", db_session)
    assert draft.state == "QUOTED"
    assert draft.version == 2

    # 3. User edits draft (e.g. changes quantity) -> version 3
    lines_data_v3 = [
        {"sku_id": "sku_bail_kolhu_1l", "quantity": 5, "unit": "peti"},
        {"sku_id": "sku_madhur_sugar_50kg", "quantity": 2, "unit": "katta"}
    ]
    draft = DraftManager.update_draft_lines(draft, lines_data_v3, pricing, "cash", db_session)
    assert draft.state == "QUOTED"
    assert draft.version == 3

    # 4. Attempt to confirm with STALE version 2 -> MUST BE REJECTED
    ok, order, msg = DraftManager.confirm_and_place_order(draft, claimed_version=2, session=db_session)
    assert ok is False
    assert order is None
    assert "STALE_CONFIRMATION" in msg
    assert draft.state == "QUOTED"  # State unchanged

    # 5. Confirm with MATCHING version 3 -> MUST BE ACCEPTED
    ok, order, msg = DraftManager.confirm_and_place_order(draft, claimed_version=3, session=db_session)
    assert ok is True
    assert order is not None
    assert order.status == "PLACED"
    assert draft.state == "PLACED"
    assert order.total_amount > Decimal("0.00")

def test_cancel_draft(db_session):
    merchant_id = "m_sharma_kirana"
    draft = DraftManager.get_or_create_draft(merchant_id, db_session)
    cancelled = DraftManager.cancel_draft(draft, db_session)
    assert cancelled.state == "CANCELLED"

