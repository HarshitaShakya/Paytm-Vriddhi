import os
import sys
import json
import logging

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from typing import Dict, Any, List, Optional
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlmodel import Session

# Load .env file automatically
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

from app.db.session import get_session
from app.core.schemas import InboundMessage, OutboundMessage, ActionButton
from app.core.agent import handle_inbound_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook")

def get_bot_token() -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    return token

def get_telegram_api_url() -> str:
    token = get_bot_token()
    return f"https://api.telegram.org/bot{token}"

def get_telegram_file_url(file_path: str) -> str:
    token = get_bot_token()
    return f"https://api.telegram.org/file/bot{token}/{file_path}"

async def download_telegram_file(file_id: str) -> Optional[bytes]:
    """Downloads voice file from Telegram servers given a file_id."""
    token = get_bot_token()
    if not token or token.startswith("your_"):
        return None
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Get file path
        res = await client.get(f"{get_telegram_api_url()}/getFile", params={"file_id": file_id})
        if res.status_code != 200:
            logger.error(f"Failed to getFile from Telegram: {res.text}")
            return None
        
        file_path = res.json().get("result", {}).get("file_path")
        if not file_path:
            return None
        
        # 2. Download file
        download_url = get_telegram_file_url(file_path)
        dl_res = await client.get(download_url)
        if dl_res.status_code == 200:
            return dl_res.content
        return None

def build_inline_keyboard(
    buttons: List[ActionButton],
    suggestions: Optional[Any] = None,
    draft_id: Optional[str] = None,
    draft_version: Optional[int] = None
) -> Dict[str, Any]:
    """
    Converts ActionButtons and SuggestionSet to Telegram InlineKeyboardMarkup.
    Strictly guarantees each callback_data string is <= 64 bytes.
    """
    inline_keyboard = []

    # 1. Render Suggestion chips if present
    if suggestions and getattr(suggestions, "items", None):
        d_id = getattr(suggestions, "draft_id", None) or draft_id or ""
        v_num = getattr(suggestions, "draft_version", None)
        if v_num is None:
            v_num = draft_version or 1

        for s in suggestions.items:
            icon = "☑" if s.selected else "☐"
            label = f"{icon} {s.label}" if s.selected else f"{icon} {s.label} ({s.demand_count}x)"
            # Format: "rt:<rid>:<did>:<ver>" strictly <= 64 bytes
            cb_data = f"rt:{s.reminder_id}:{d_id}:{v_num}"
            inline_keyboard.append([{
                "text": label[:32],
                "callback_data": cb_data[:64]
            }])

        # Action chips: [Sab add karo] [Skip]
        action_row = [
            {"text": "⚡ Sab add karo", "callback_data": f"ra:{d_id}:{v_num}"[:64]},
            {"text": "⏭ Skip", "callback_data": f"rs:{d_id}:{v_num}"[:64]}
        ]
        inline_keyboard.append(action_row)

    # 2. Render standard ActionButtons (e.g. Confirm, Cancel, Auto-Place)
    row = []
    for btn in buttons:
        act_key = "ap" if btn.action == "auto_place_now" else ("c" if btn.action == "confirm" else btn.action)
        payload_str = json.dumps({"action": btn.action, **btn.payload})
        if len(payload_str.encode("utf-8")) > 64:
            payload_str = f"{act_key}:{btn.payload.get('draft_id', '')}:{btn.payload.get('version', '')}"
        
        row.append({
            "text": btn.label,
            "callback_data": payload_str[:64]
        })
        if len(row) == 2:
            inline_keyboard.append(row)
            row = []
    if row:
        inline_keyboard.append(row)

    return {"inline_keyboard": inline_keyboard}

async def send_telegram_outbound(chat_id: str, out: OutboundMessage):
    """Sends outbound message (photo with caption + inline buttons, or voice note) to Telegram."""
    token = get_bot_token()
    if not token or token.startswith("your_"):
        logger.info(f"[Telegram Mock Send] Chat: {chat_id} | Text: {out.display_text}")
        return
    
    # Synthesize voice note if speech_text is provided
    if not out.voice_bytes and out.speech_text:
        try:
            from app.core.tts import synthesize_voice_note
            out.voice_bytes = await synthesize_voice_note(out.speech_text)
        except Exception as e:
            logger.warning(f"Voice note synthesis skipped: {e}")

    api_url = get_telegram_api_url()
    reply_markup = build_inline_keyboard(out.buttons, out.suggestions, out.draft_id, out.draft_version)

    async with httpx.AsyncClient(timeout=20.0) as client:
        # 1. If Bill Image exists, sendPhoto with caption and inline buttons
        if out.image_bytes:
            files = {
                "photo": ("bill.png", out.image_bytes, "image/png")
            }
            data = {
                "chat_id": chat_id,
                "caption": out.display_text[:1024]
            }
            if reply_markup.get("inline_keyboard"):
                data["reply_markup"] = json.dumps(reply_markup)
            
            res = await client.post(f"{api_url}/sendPhoto", data=data, files=files)
            if res.status_code != 200:
                logger.error(f"Telegram sendPhoto error: {res.text}")
        else:
            # Send standard text message
            payload = {
                "chat_id": chat_id,
                "text": out.display_text
            }
            if reply_markup.get("inline_keyboard"):
                payload["reply_markup"] = reply_markup
            await client.post(f"{api_url}/sendMessage", json=payload)

        # 2. If voice note audio exists, sendVoice
        if out.voice_bytes:
            v_files = {
                "voice": ("reply.ogg", out.voice_bytes, "audio/ogg")
            }
            v_data = {
                "chat_id": chat_id
            }
            await client.post(f"{api_url}/sendVoice", data=v_data, files=v_files)

async def process_telegram_update(update: Dict[str, Any], session: Session) -> List[OutboundMessage]:
    """Parses a Telegram update dictionary, invokes agent core, and dispatches responses."""
    inbound: Optional[InboundMessage] = None
    chat_id: Optional[str] = None

    # Case A: Callback Query (Inline Button Click)
    if "callback_query" in update:
        cq = update["callback_query"]
        callback_id = cq.get("id")
        raw_data = cq.get("data", "")
        chat_id = str(cq.get("message", {}).get("chat", {}).get("id"))
        msg_id = f"tg_cb_{callback_id}"

        # Parse compressed callback format e.g. "rt:rem_1:d_2:1", "ra:d_2:1", "rs:d_2:1", "rd:rem_1", "confirm:d_123:2"
        callback_payload = raw_data
        if ":" in raw_data and not raw_data.startswith("{"):
            parts = raw_data.split(":")
            if parts[0] == "rt" and len(parts) >= 4:
                callback_payload = json.dumps({
                    "action": "reminder_toggle",
                    "reminder_id": parts[1],
                    "draft_id": parts[2],
                    "version": int(parts[3]) if parts[3].isdigit() else parts[3]
                })
            elif parts[0] == "ra" and len(parts) >= 3:
                callback_payload = json.dumps({
                    "action": "reminder_add_all",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                })
            elif parts[0] == "rs" and len(parts) >= 3:
                callback_payload = json.dumps({
                    "action": "reminder_skip",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                })
            elif parts[0] == "rd" and len(parts) >= 2:
                callback_payload = json.dumps({
                    "action": "dismiss_reminder",
                    "reminder_id": parts[1]
                })
            elif parts[0] in ("c", "confirm") and len(parts) >= 3:
                callback_payload = json.dumps({
                    "action": "confirm",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                })
            elif len(parts) >= 3:
                callback_payload = json.dumps({
                    "action": parts[0],
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                })

        inbound = InboundMessage(
            channel="telegram",
            sender_id=chat_id,
            message_id=msg_id,
            callback_data=callback_payload,
            merchant_id="m_sharma_kirana"
        )

        # Acknowledge callback query
        token = get_bot_token()
        if token and not token.startswith("your_"):
            async with httpx.AsyncClient() as client:
                await client.post(f"{get_telegram_api_url()}/answerCallbackQuery", json={"callback_query_id": callback_id})

    # Case B: Message (Text or Voice)
    elif "message" in update:
        msg = update["message"]
        chat_id = str(msg.get("chat", {}).get("id"))
        tg_msg_id = str(msg.get("message_id"))
        msg_id = f"tg_msg_{tg_msg_id}"

        if "voice" in msg:
            voice_info = msg["voice"]
            file_id = voice_info.get("file_id")
            audio_bytes = await download_telegram_file(file_id) if file_id else None
            
            inbound = InboundMessage(
                channel="telegram",
                sender_id=chat_id,
                message_id=msg_id,
                audio_bytes=audio_bytes,
                mime_type="audio/ogg",
                merchant_id="m_sharma_kirana"
            )
        elif "text" in msg:
            inbound = InboundMessage(
                channel="telegram",
                sender_id=chat_id,
                message_id=msg_id,
                text=msg.get("text"),
                merchant_id="m_sharma_kirana"
            )

    if not inbound or not chat_id:
        return []

    # Execute Agent Core
    outbounds = handle_inbound_message(inbound, session)

    # Dispatch to Telegram
    for out in outbounds:
        await send_telegram_outbound(chat_id, out)

    return outbounds

@router.post("/telegram")
async def telegram_webhook(request: Request, session: Session = Depends(get_session)):
    """FastAPI endpoint receiving Telegram Webhook updates."""
    try:
        update = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON update")

    outbounds = await process_telegram_update(update, session)
    return {"status": "ok", "responses_count": len(outbounds)}

# ─────────────────────────────────────────────────────────────────────────────
# STANDALONE POLLING RUNNER FOR ZERO-COST LOCAL TESTING
# ─────────────────────────────────────────────────────────────────────────────
async def run_telegram_polling():
    """Runs long-polling loop against Telegram Bot API (No webhook or public IP needed)."""
    token = get_bot_token()
    if not token or token.startswith("your_"):
        print("❌ TELEGRAM_BOT_TOKEN not set in environment. Set it in .env to use Telegram bot.")
        return

    from app.db.session import engine
    from app.core.autoplace import poll_and_execute_overdue_autoplaces
    print(f"🚀 Starting Telegram Bot polling with token: {token[:6]}...{token[-4:]}")

    offset = 0
    api_url = get_telegram_api_url()

    async with httpx.AsyncClient(timeout=35.0) as client:
        # Delete any active webhook first
        await client.post(f"{api_url}/deleteWebhook")
        
        while True:
            try:
                # Scan overdue auto-places
                with Session(engine) as session:
                    overdues = poll_and_execute_overdue_autoplaces(session)
                    for d_id, ord_id in overdues:
                        logger.info(f"Auto-placed order {ord_id} from polling loop for draft {d_id}")

                res = await client.get(f"{api_url}/getUpdates", params={"offset": offset, "timeout": 25})
                if res.status_code == 200:
                    data = res.json()
                    updates = data.get("result", [])
                    for up in updates:
                        offset = up["update_id"] + 1
                        try:
                            with Session(engine) as session:
                                await process_telegram_update(up, session)
                        except Exception as e:
                            logger.error(f"Error processing telegram update {up.get('update_id')}: {e}", exc_info=True)
                            print(f"❌ Error processing update: {e}")
            except Exception as e:
                logger.error(f"Polling error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_telegram_polling())

