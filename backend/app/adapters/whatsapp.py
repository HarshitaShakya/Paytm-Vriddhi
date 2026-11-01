import os
import hmac
import hashlib
import json
import logging
from typing import Dict, Any, List, Optional
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import PlainTextResponse
from sqlmodel import Session

from app.db.session import get_session
from app.core.schemas import InboundMessage, OutboundMessage, ActionButton
from app.core.agent import handle_inbound_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook")

def get_whatsapp_env() -> Dict[str, str]:
    return {
        "verify_token": os.environ.get("WHATSAPP_VERIFY_TOKEN", "paytm_vriddhi_webhook_secret"),
        "app_secret": os.environ.get("WHATSAPP_APP_SECRET", ""),
        "access_token": os.environ.get("WHATSAPP_ACCESS_TOKEN", ""),
        "phone_number_id": os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
    }

def verify_signature(raw_body: bytes, signature_header: Optional[str], app_secret: str) -> bool:
    """
    Validates X-Hub-Signature-256 HMAC-SHA256 signature from Meta Webhooks.
    """
    if not app_secret:
        # If no secret configured in development, bypass check with warning
        return True
    
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    
    expected_hash = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    claimed_hash = signature_header.split("sha256=")[1]
    return hmac.compare_digest(expected_hash, claimed_hash)

async def download_whatsapp_media(media_id: str, access_token: str) -> Optional[bytes]:
    """
    Two-step media download protocol for Meta Graph API:
    Step 1: Retrieve media download URL
    Step 2: Download binary audio stream with Bearer authorization
    """
    if not access_token:
        return None

    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Step 1: Query Graph API for media URL
        url_res = await client.get(
            f"https://graph.facebook.com/v20.0/{media_id}",
            headers=headers
        )
        if url_res.status_code != 200:
            logger.error(f"Failed to query WhatsApp media URL: {url_res.text}")
            return None
        
        media_url = url_res.json().get("url")
        if not media_url:
            return None

        # Step 2: Download raw binary stream
        dl_res = await client.get(media_url, headers=headers)
        if dl_res.status_code == 200:
            return dl_res.content
        return None

def build_whatsapp_interactive_payload(to_phone: str, outbound: OutboundMessage, media_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Constructs an interactive WhatsApp message.
    
    NOTE ON WHATSAPP API CONSTRAINTS:
    - Quick-reply buttons ('button' type) are capped at exactly 3 buttons maximum.
    - When suggestions or complex options exceed 3 items, WhatsApp requires an
      interactive 'list' message with up to 10 selectable rows across sections.
    """
    # Case A: SuggestionSet present -> Render as WhatsApp Interactive List Message (max 10 rows)
    if outbound.suggestions and outbound.suggestions.items:
        sug = outbound.suggestions
        d_id = sug.draft_id or outbound.draft_id or ""
        v_num = sug.draft_version if sug.draft_version is not None else (outbound.draft_version or 1)

        rows = []
        for s in sug.items[:8]:
            icon = "☑" if s.selected else "☐"
            rows.append({
                "id": f"rt:{s.reminder_id}:{d_id}:{v_num}"[:200],
                "title": f"{icon} {s.label}"[:24],
                "description": f"Demand: {s.demand_count}x · Qty: {s.qty or 1} {s.unit or ''}"[:72]
            })

        # Action rows for bulk selection
        rows.append({
            "id": f"ra:{d_id}:{v_num}"[:200],
            "title": "⚡ Sab Add Karo",
            "description": "Add all remembered items to draft"
        })
        rows.append({
            "id": f"rs:{d_id}:{v_num}"[:200],
            "title": "⏭ Skip Suggestions",
            "description": "Proceed to confirm current bill"
        })

        interactive_block: Dict[str, Any] = {
            "type": "list",
            "header": {
                "type": "text",
                "text": "Yaad Dila Dena"
            },
            "body": {
                "text": outbound.display_text[:1024]
            },
            "footer": {
                "text": "Paytm SmartDukaan · APMC Certified"
            },
            "action": {
                "button": "View Suggestions",
                "sections": [
                    {
                        "title": "Customer Demand Items",
                        "rows": rows[:10]  # WhatsApp list max 10 rows
                    }
                ]
            }
        }
        return {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": interactive_block
        }

    # Case B: Standard 3 Quick-Reply Buttons
    buttons = []
    # WhatsApp Cloud API supports max 3 reply buttons per interactive message
    for btn in outbound.buttons[:3]:
        callback_id = f"{btn.action}:{btn.payload.get('draft_id', '')}:{btn.payload.get('version', '')}"
        buttons.append({
            "type": "reply",
            "reply": {
                "id": callback_id[:256],
                "title": btn.label[:20]  # Max 20 chars
            }
        })

    interactive_block: Dict[str, Any] = {
        "type": "button",
        "body": {
            "text": outbound.display_text[:1024]
        },
        "footer": {
            "text": "Paytm SmartDukaan · APMC Certified"
        },
        "action": {
            "buttons": buttons
        }
    }

    # If media URL is available for the bill image, add image header
    if media_url:
        interactive_block["header"] = {
            "type": "image",
            "image": {
                "link": media_url
            }
        }

    return {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "interactive",
        "interactive": interactive_block
    }

# ─────────────────────────────────────────────────────────────────────────────
# WEBHOOK VERIFICATION (GET /webhook/whatsapp)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/whatsapp")
def whatsapp_verify_challenge(request: Request):
    """
    Handles Meta Webhook Challenge Verification.
    Meta sends: hub.mode, hub.challenge, hub.verify_token
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    env = get_whatsapp_env()

    if mode == "subscribe" and token == env["verify_token"]:
        logger.info("WhatsApp webhook challenge verified successfully.")
        return PlainTextResponse(content=challenge, status_code=200)

    logger.warning("WhatsApp webhook challenge failed: token mismatch.")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

# ─────────────────────────────────────────────────────────────────────────────
# WEBHOOK INGEST (POST /webhook/whatsapp)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    """
    Receives WhatsApp Cloud API webhook notifications.
    Validates HMAC-SHA256 signature, processes messages, and invokes core agent.
    """
    raw_body = await request.body()
    env = get_whatsapp_env()

    # 1. HMAC-SHA256 Signature Verification
    if not verify_signature(raw_body, x_hub_signature_256, env["app_secret"]):
        logger.error("WhatsApp signature verification failed.")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # 2. Extract Message
    entries = payload.get("entry", [])
    if not entries:
        return {"status": "ignored", "reason": "no_entries"}

    changes = entries[0].get("changes", [])
    if not changes:
        return {"status": "ignored", "reason": "no_changes"}

    value = changes[0].get("value", {})
    messages = value.get("messages", [])
    if not messages:
        # Delivery statuses / receipts
        return {"status": "received", "type": "status_update"}

    msg = messages[0]
    sender_phone = msg.get("from")
    msg_id = msg.get("id")
    msg_type = msg.get("type")

    # 3. Handle Message Types
    inbound_text: Optional[str] = None
    inbound_audio: Optional[bytes] = None
    inbound_callback: Optional[str] = None

    if msg_type == "text":
        inbound_text = msg.get("text", {}).get("body")
    elif msg_type in ("audio", "voice"):
        audio_info = msg.get(msg_type, {})
        media_id = audio_info.get("id")
        if media_id:
            inbound_audio = await download_whatsapp_media(media_id, env["access_token"])
    elif msg_type == "interactive":
        interactive_data = msg.get("interactive", {})
        button_reply = interactive_data.get("button_reply", {})
        raw_callback = button_reply.get("id", "")
        # Parse callback format "action:draft_id:version"
        if ":" in raw_callback:
            parts = raw_callback.split(":")
            if len(parts) >= 3:
                inbound_callback = json.dumps({
                    "action": parts[0],
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                })
            else:
                inbound_callback = raw_callback
        else:
            inbound_callback = raw_callback

    inbound = InboundMessage(
        channel="whatsapp",
        sender_id=str(sender_phone),
        message_id=str(msg_id),
        text=inbound_text,
        audio_bytes=inbound_audio,
        callback_data=inbound_callback,
        merchant_id="m_sharma_kirana"
    )

    # 4. Invoke Core Agent
    outbounds = handle_inbound_message(inbound, session)

    # Note: In a live production WhatsApp environment with WHATSAPP_ACCESS_TOKEN,
    # the adapter posts the interactive payload back to:
    # https://graph.facebook.com/v20.0/{phone_number_id}/messages
    if env["access_token"] and env["phone_number_id"] and outbounds:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for out in outbounds:
                send_payload = build_whatsapp_interactive_payload(str(sender_phone), out)
                await client.post(
                    f"https://graph.facebook.com/v20.0/{env['phone_number_id']}/messages",
                    headers={"Authorization": f"Bearer {env['access_token']}"},
                    json=send_payload
                )

    return {
        "status": "ok",
        "processed_messages": len(outbounds),
        "sender": sender_phone
    }

