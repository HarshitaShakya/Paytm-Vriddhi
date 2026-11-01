import asyncio
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.tts import synthesize_voice_note, synthesize_speech_sync

client = TestClient(app)

def test_tts_voice_synthesis_sync():
    sample_speech = "नमस्ते भैया, आपका आर्डर तैयार है। कुल इक्कीस हज़ार एक सौ चालीस रुपये।"
    audio_bytes = synthesize_speech_sync(sample_speech)
    assert audio_bytes is not None
    assert len(audio_bytes) > 2000
    # Should be OggS (libopus) or MP3
    assert audio_bytes.startswith(b"OggS") or audio_bytes.startswith(b"ID3") or audio_bytes.startswith(b"\xff")

def test_tts_empty_returns_none():
    assert synthesize_speech_sync("") is None
    assert synthesize_speech_sync("   ") is None

def test_tts_api_endpoint():
    res = client.get("/api/tts", params={"text": "नमस्ते मुनीम जी"})
    assert res.status_code == 200
    assert len(res.content) > 1000
    assert res.headers["content-type"] == "audio/ogg"

