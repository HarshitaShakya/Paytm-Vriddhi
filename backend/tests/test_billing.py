import os
import io
from decimal import Decimal
import pytest
from PIL import Image
from app.core.billing import render_bill_image
from app.core.replies import (
    number_to_hindi_words,
    build_quote_reply,
    build_order_placed_reply,
    build_stale_rejection_reply,
    build_cancel_reply
)

def test_bill_image_rendering():
    # Sample supplier plan matching calculate_pricing output
    sample_plan = {
        "option_a": {
            "supplier_id": "sup_shree_ganesh",
            "supplier_name": "Shree Ganesh Foods",
            "market": "Indore APMC",
            "reliability_score": 9.2,
            "on_time_pct": 98,
            "subtotal": 21040.0,
            "delivery_fee": 100.0,
            "grand_total": 21140.0,
            "can_fulfill_all": True,
            "lines": [
                {
                    "sku_id": "sku_bail_kolhu_1l",
                    "name": "Bail Kolhu Mustard Oil (12x1L Carton)",
                    "quantity": 4.0,
                    "unit": "peti",
                    "unit_price": 4200.0,
                    "subtotal": 16800.0,
                    "free_quantity": 0.0,
                    "discount": 0.0,
                    "final_total": 16800.0,
                    "supplier_id": "sup_shree_ganesh",
                    "supplier_name": "Shree Ganesh Foods",
                    "scheme_text": None
                },
                {
                    "sku_id": "sku_madhur_sugar_50kg",
                    "name": "Madhur Pure & Hygienic Sugar (50kg Katta)",
                    "quantity": 2.0,
                    "unit": "katta",
                    "unit_price": 2120.0,
                    "subtotal": 4240.0,
                    "free_quantity": 0.0,
                    "discount": 0.0,
                    "final_total": 4240.0,
                    "supplier_id": "sup_shree_ganesh",
                    "supplier_name": "Shree Ganesh Foods",
                    "scheme_text": None
                }
            ]
        }
    }

    png_bytes = render_bill_image(
        order_or_draft_id="d_6d686180",
        merchant_name="Sharma Kirana Store",
        supplier_plan=sample_plan,
        payment_mode="cash",
        version=2
    )

    # 1. Verify PNG header
    assert png_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    # 2. Verify with Pillow
    img = Image.open(io.BytesIO(png_bytes))
    assert img.format == "PNG"
    assert img.width == 820
    assert img.height >= 600

    # 3. Snapshot verification: save sample bill
    snapshot_path = os.path.join(os.path.dirname(__file__), "sample_bill.png")
    with open(snapshot_path, "wb") as f:
        f.write(png_bytes)
    assert os.path.exists(snapshot_path)
    assert os.path.getsize(snapshot_path) > 10000

def test_number_to_hindi_words():
    assert number_to_hindi_words(5) == "पाँच"
    assert number_to_hindi_words(50) == "पचास"
    assert number_to_hindi_words(100) == "एक सौ"
    assert "पाँच सौ" in number_to_hindi_words(547)
    assert "इक्कीस हज़ार" in number_to_hindi_words(21140)

def test_replies_builder():
    # 1. Quote Reply
    q_rep = build_quote_reply(
        items_count=2,
        supplier_name="Shree Ganesh Foods",
        total_amount=21140.0,
        savings=320.0,
        is_credit=False
    )
    assert "Shree Ganesh Foods" in q_rep.display_text
    assert "₹21,140.00" in q_rep.display_text
    assert "Shree Ganesh Foods" in q_rep.speech_text
    assert "इक्कीस हज़ार" in q_rep.speech_text

    # 2. Order Placed Reply
    p_rep = build_order_placed_reply(
        order_id="ORD-20261031-1A25FA",
        supplier_name="Shree Ganesh Foods",
        total_amount=21140.0
    )
    assert "ORD-20261031-1A25FA" in p_rep.display_text
    assert "बधाई हो भैया" in p_rep.speech_text

    # 3. Stale Rejection Reply
    s_rep = build_stale_rejection_reply(
        old_version=1,
        current_version=2,
        current_total=21140.0
    )
    assert "v1 se v2" in s_rep.display_text

    # 4. Cancel Reply
    c_rep = build_cancel_reply()
    assert "cancel" in c_rep.display_text.lower()

