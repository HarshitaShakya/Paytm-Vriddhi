import json
from decimal import Decimal
import pytest
from app.core.schemas import InboundMessage
from app.core.agent import handle_inbound_message
from app.db.models import Order, Draft

def test_agent_end_to_end_order_and_confirm(db_session):
    sender_id = "test_merchant_user"
    merchant_id = "m_sharma_kirana"

    # Step 1: Send Order Utterance
    inbound_order = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_001_order",
        text="4 peti Bail Kolhu tel aur 2 katta chini",
        merchant_id=merchant_id
    )

    outbounds = handle_inbound_message(inbound_order, db_session)
    assert len(outbounds) == 1
    out = outbounds[0]

    assert "Shree Ganesh Foods" in out.display_text or "Raj Traders" in out.display_text
    assert out.image_bytes is not None
    assert out.image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(out.buttons) == 4
    assert out.draft_id is not None
    assert out.draft_version is not None

    draft_id = out.draft_id
    draft_version = out.draft_version

    # Step 2: Confirm Order with Action Button
    confirm_callback = json.dumps({"action": "confirm", "draft_id": draft_id, "version": draft_version})
    inbound_confirm = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_002_confirm",
        callback_data=confirm_callback,
        merchant_id=merchant_id
    )

    outbounds_confirm = handle_inbound_message(inbound_confirm, db_session)
    assert len(outbounds_confirm) == 1
    out_c = outbounds_confirm[0]

    assert out_c.order_id is not None
    assert "Badhai ho" in out_c.display_text

    # Step 3: Test Idempotency with Duplicate Message ID
    dup_outbounds = handle_inbound_message(inbound_confirm, db_session)
    assert len(dup_outbounds) == 1
    # Returns cached summary without throwing or re-executing
    assert "Badhai ho" in dup_outbounds[0].display_text

def test_agent_cancel_flow(db_session):
    sender_id = "test_merchant_cancel"
    inbound_cancel = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id="msg_003_cancel",
        text="ruko order cancel kar do"
    )
    outbounds = handle_inbound_message(inbound_cancel, db_session)
    assert len(outbounds) == 1
    assert "cancel" in outbounds[0].display_text.lower()

