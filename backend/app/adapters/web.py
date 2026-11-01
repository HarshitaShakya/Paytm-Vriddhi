import base64
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.session import get_session
from app.db.models import Draft, Order
from app.core.schemas import InboundMessage, OutboundMessage
from app.core.agent import handle_inbound_message

router = APIRouter(prefix="/api")

class ChatRequest(BaseModel):
    text: str
    sender_id: str = "web_user_1"
    merchant_id: str = "m_sharma_kirana"
    message_id: Optional[str] = None

class ActionRequest(BaseModel):
    action: str
    payload: Dict[str, Any]
    sender_id: str = "web_user_1"
    merchant_id: str = "m_sharma_kirana"
    message_id: Optional[str] = None

def serialize_outbound(messages: list[OutboundMessage]) -> Dict[str, Any]:
    if not messages:
        return {"success": False, "message": "No response generated"}
    
    first = messages[0]
    img_b64 = None
    if first.image_bytes:
        img_b64 = base64.b64encode(first.image_bytes).decode("utf-8")

    voice_b64 = None
    if first.voice_bytes:
        voice_b64 = base64.b64encode(first.voice_bytes).decode("utf-8")

    return {
        "success": True,
        "display_text": first.display_text,
        "speech_text": first.speech_text,
        "image_base64": img_b64,
        "voice_base64": voice_b64,
        "draft_id": first.draft_id,
        "draft_version": first.draft_version,
        "order_id": first.order_id,
        "buttons": [b.model_dump() for b in first.buttons],
        "suggestions": first.suggestions.model_dump() if first.suggestions else None
    }

@router.post("/chat")
def api_chat(req: ChatRequest, session: Session = Depends(get_session)):
    msg_id = req.message_id or f"web_txt_{uuid.uuid4().hex[:10]}"
    inbound = InboundMessage(
        channel="web",
        sender_id=req.sender_id,
        message_id=msg_id,
        text=req.text,
        merchant_id=req.merchant_id
    )
    outbound = handle_inbound_message(inbound, session)
    return serialize_outbound(outbound)

@router.post("/voice")
async def api_voice(
    file: UploadFile = File(...),
    sender_id: str = Form("web_user_1"),
    merchant_id: str = Form("m_sharma_kirana"),
    transcript_hint: Optional[str] = Form(None),
    session: Session = Depends(get_session)
):
    """
    Ingests voice notes from browser MediaRecorder (.webm / .wav).
    Transcribes, purges audio bytes immediately for privacy, and processes order.
    """
    audio_bytes = await file.read()
    msg_id = f"web_voice_{uuid.uuid4().hex[:10]}"
    
    inbound = InboundMessage(
        channel="web",
        sender_id=sender_id,
        message_id=msg_id,
        text=transcript_hint,
        audio_bytes=audio_bytes,
        mime_type=file.content_type,
        merchant_id=merchant_id
    )
    outbound = handle_inbound_message(inbound, session)
    return serialize_outbound(outbound)

@router.post("/action")
def api_action(req: ActionRequest, session: Session = Depends(get_session)):
    import json
    msg_id = req.message_id or f"web_act_{uuid.uuid4().hex[:10]}"
    callback_payload = json.dumps({"action": req.action, **req.payload})
    
    inbound = InboundMessage(
        channel="web",
        sender_id=req.sender_id,
        message_id=msg_id,
        callback_data=callback_payload,
        merchant_id=req.merchant_id
    )
    outbound = handle_inbound_message(inbound, session)
    return serialize_outbound(outbound)

@router.get("/drafts/{draft_id}/bill")
def get_draft_bill(draft_id: str, session: Session = Depends(get_session)):
    from app.core.billing import render_bill_image
    draft = session.exec(select(Draft).where(Draft.id == draft_id)).first()
    if not draft or not draft.supplier_plan_json:
        raise HTTPException(status_code=404, detail="Draft or bill plan not found")
    
    plan = json.loads(draft.supplier_plan_json)
    png_bytes = render_bill_image(
        order_or_draft_id=draft.id,
        merchant_name="Sharma Kirana Store",
        supplier_plan=plan,
        payment_mode=draft.payment_mode,
        version=draft.version
    )
    return Response(content=png_bytes, media_type="image/png")

@router.get("/orders")
def get_orders(session: Session = Depends(get_session)):
    orders = session.exec(select(Order).order_by(Order.placed_at.desc())).all()
    return [
        {
            "id": o.id,
            "draft_id": o.draft_id,
            "supplier_id": o.supplier_id,
            "total_amount": float(o.total_amount),
            "status": o.status,
            "placed_at": o.placed_at.strftime("%I:%M %p, %d %b")
        }
        for o in orders
    ]

@router.get("/tts")
async def get_tts_audio(text: str):
    from app.core.tts import synthesize_voice_note
    audio_bytes = await synthesize_voice_note(text)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="TTS synthesis failed")
    return Response(content=audio_bytes, media_type="audio/ogg")

