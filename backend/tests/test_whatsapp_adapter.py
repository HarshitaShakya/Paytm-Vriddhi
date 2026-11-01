import hmac
import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.adapters.whatsapp import (
    verify_signature,
    build_whatsapp_interactive_payload
)
from app.core.schemas import OutboundMessage, ActionButton

client = TestClient(app)

def test_whatsapp_challenge_verification_success():
    res = client.get("/webhook/whatsapp", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "paytm_vriddhi_webhook_secret",
        "hub.challenge": "987654321"
    })
    assert res.status_code == 200
    assert res.text == "987654321"

def test_whatsapp_challenge_verification_failure():
    res = client.get("/webhook/whatsapp", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_secret_token",
        "hub.challenge": "987654321"
    })
    assert res.status_code == 403

def test_verify_signature_logic():
    secret = "my_meta_app_secret_123"
    body = b'{"object": "whatsapp_business_account"}'
    
    # Generate valid signature
    valid_hash = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    valid_header = f"sha256={valid_hash}"

    assert verify_signature(body, valid_header, secret) is True

    # Tampered body
    tampered_body = b'{"object": "tampered"}'
    assert verify_signature(tampered_body, valid_header, secret) is False

    # Invalid header format
    assert verify_signature(body, "invalid_header", secret) is False

def test_build_whatsapp_interactive_payload():
    out = OutboundMessage(
        recipient_id="919826011234",
        display_text="Bhaiya, aapka draft bill taiyar hai. Total ₹20,720.",
        buttons=[
            ActionButton(label="✓ Confirm Order", action="confirm", payload={"draft_id": "d_1", "version": 2}),
            ActionButton(label="+ Add Item", action="add_item", payload={"draft_id": "d_1", "version": 2}),
            ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": "d_1", "version": 2})
        ]
    )

    payload = build_whatsapp_interactive_payload(
        to_phone="919826011234",
        outbound=out,
        media_url="https://example.com/bill.png"
    )

    assert payload["messaging_product"] == "whatsapp"
    assert payload["to"] == "919826011234"
    assert payload["type"] == "interactive"
    interactive = payload["interactive"]
    assert interactive["type"] == "button"
    assert interactive["header"]["type"] == "image"
    assert interactive["header"]["image"]["link"] == "https://example.com/bill.png"
    assert len(interactive["action"]["buttons"]) == 3
    assert interactive["action"]["buttons"][0]["reply"]["title"] == "✓ Confirm Order"

def test_whatsapp_webhook_post_text_message():
    update_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550012345",
                                "phone_number_id": "100654321"
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "Kirana Merchant"},
                                    "wa_id": "919826012345"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "919826012345",
                                    "id": "wamid.HBgLOTE5ODI2MDEyMzQ1FQIAEhgg",
                                    "timestamp": "1730355600",
                                    "text": {
                                        "body": "4 peti Bail Kolhu tel aur 2 katta chini"
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    raw_json = json.dumps(update_payload).encode("utf-8")
    res = client.post(
        "/webhook/whatsapp",
        content=raw_json,
        headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["processed_messages"] == 1
    assert data["sender"] == "919826012345"

