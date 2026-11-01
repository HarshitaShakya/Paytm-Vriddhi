from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class ActionButton(BaseModel):
    label: str                  # e.g. "Order Confirm Karein"
    action: str                 # "confirm", "add_item", "edit", "cancel", "reminder_toggle", "reminder_add_all", "reminder_skip"
    payload: Dict[str, Any]     # {"draft_id": "d_123", "version": 2}

class SuggestionItem(BaseModel):
    reminder_id: str
    label: str
    demand_count: int = 1
    selected: bool = False
    sku_id: Optional[str] = None
    qty: Optional[float] = None
    unit: Optional[str] = None

class SuggestionSet(BaseModel):
    title: str = "Yaad Dila Dena"
    items: List[SuggestionItem] = []
    actions: List[str] = ["add_all", "skip"]
    draft_id: Optional[str] = None
    draft_version: Optional[int] = None

class InboundMessage(BaseModel):
    channel: Literal["web", "telegram", "whatsapp"] = "web"
    sender_id: str              # Unique user ID / phone / chat_id
    message_id: str             # Channel message ID for idempotency
    text: Optional[str] = None
    audio_bytes: Optional[bytes] = None
    mime_type: Optional[str] = None
    callback_data: Optional[str] = None # When user clicks an inline button
    merchant_id: str = "m_sharma_kirana"

class OutboundMessage(BaseModel):
    recipient_id: str
    display_text: str           # Roman Hinglish text for screen
    speech_text: Optional[str] = None # Text for TTS voice note
    image_bytes: Optional[bytes] = None # Pillow rendered bill PNG
    image_filename: Optional[str] = "bill.png"
    voice_bytes: Optional[bytes] = None # Synthesized OGG/Opus audio
    buttons: List[ActionButton] = []
    suggestions: Optional[SuggestionSet] = None
    draft_id: Optional[str] = None
    draft_version: Optional[int] = None
    order_id: Optional[str] = None


