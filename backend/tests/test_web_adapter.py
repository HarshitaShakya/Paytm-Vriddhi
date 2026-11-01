import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["app"] == "paytm-vriddhi-munim"

def test_api_chat_flow():
    # 1. Chat New Order
    res = client.post("/api/chat", json={
        "text": "4 peti Bail Kolhu tel aur 2 katta chini",
        "sender_id": "test_web_client",
        "merchant_id": "m_sharma_kirana"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Shree Ganesh Foods" in data["display_text"] or "Raj Traders" in data["display_text"]
    assert data["image_base64"] is not None
    assert data["draft_id"] is not None
    assert data["draft_version"] is not None
    assert len(data["buttons"]) == 4

    draft_id = data["draft_id"]
    draft_version = data["draft_version"]

    # 2. Confirm Action
    act_res = client.post("/api/action", json={
        "action": "confirm",
        "payload": {"draft_id": draft_id, "version": draft_version},
        "sender_id": "test_web_client",
        "merchant_id": "m_sharma_kirana"
    })
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert act_data["success"] is True
    assert act_data["order_id"] is not None
    assert "Badhai ho" in act_data["display_text"]

    # 3. Check Orders Endpoint
    orders_res = client.get("/api/orders")
    assert orders_res.status_code == 200
    orders = orders_res.json()
    assert len(orders) > 0
    assert any(o["id"] == act_data["order_id"] for o in orders)

def test_api_voice_endpoint():
    # Simulate sending audio bytes
    dummy_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    files = {"file": ("test_voice.wav", io.BytesIO(dummy_wav), "audio/wav")}
    data = {
        "sender_id": "test_voice_client",
        "merchant_id": "m_sharma_kirana",
        "transcript_hint": "5 kg pyaaz aur 10 kg aloo bhej do"
    }

    res = client.post("/api/voice", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["image_base64"] is not None
    assert res_data["draft_id"] is not None

