import asyncio
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.adapters.telegram import process_telegram_update, build_inline_keyboard
from app.core.schemas import ActionButton

client = TestClient(app)

def test_telegram_build_inline_keyboard():
    buttons = [
        ActionButton(label="✓ Confirm", action="confirm", payload={"draft_id": "d_1", "version": 2}),
        ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": "d_1", "version": 2})
    ]
    markup = build_inline_keyboard(buttons)
    assert "inline_keyboard" in markup
    assert len(markup["inline_keyboard"]) == 1
    row = markup["inline_keyboard"][0]
    assert len(row) == 2
    assert row[0]["text"] == "✓ Confirm"
    assert "confirm" in row[0]["callback_data"]

def test_telegram_text_update(db_session):
    update = {
        "update_id": 10001,
        "message": {
            "message_id": 42,
            "chat": {"id": 987654321},
            "text": "4 peti Bail Kolhu tel aur 2 katta chini",
            "date": 1698765432
        }
    }

    outbounds = asyncio.run(process_telegram_update(update, db_session))
    assert len(outbounds) == 1
    out = outbounds[0]
    assert out.image_bytes is not None
    assert out.image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(out.buttons) == 4
    assert out.draft_id is not None
    assert out.draft_version is not None

def test_telegram_callback_confirm_update(db_session):
    # Step 1: Create a quoted draft
    first_update = {
        "update_id": 10002,
        "message": {
            "message_id": 43,
            "chat": {"id": 987654322},
            "text": "5 kg pyaaz aur 10 kg aloo bhej do"
        }
    }
    first_out = asyncio.run(process_telegram_update(first_update, db_session))
    draft_id = first_out[0].draft_id
    version = first_out[0].draft_version

    # Step 2: User clicks inline [Confirm] button
    callback_update = {
        "update_id": 10003,
        "callback_query": {
            "id": "cb_9999",
            "message": {
                "message_id": 44,
                "chat": {"id": 987654322}
            },
            "data": f"confirm:{draft_id}:{version}"
        }
    }

    outbounds = asyncio.run(process_telegram_update(callback_update, db_session))
    assert len(outbounds) == 1
    assert outbounds[0].order_id is not None
    assert "Badhai ho" in outbounds[0].display_text

def test_telegram_webhook_route():
    update_payload = {
        "update_id": 10004,
        "message": {
            "message_id": 45,
            "chat": {"id": 12345678},
            "text": "aadha kilo chini"
        }
    }
    res = client.post("/webhook/telegram", json=update_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["responses_count"] == 1
