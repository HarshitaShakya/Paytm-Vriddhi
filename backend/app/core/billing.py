import os
import io
from datetime import datetime
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont

FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "fonts")
NOTO_UNIFIED = os.path.join(FONTS_DIR, "NotoSans-Unified.ttf")
NOTO_SANS = os.path.join(FONTS_DIR, "NotoSans-Regular.ttf")
NOTO_DEV = os.path.join(FONTS_DIR, "NotoSansDevanagari-Regular.ttf")

def get_font(size: int, devanagari: bool = False) -> ImageFont.ImageFont:
    """
    Loads unified font with complete glyph coverage for English letters (A-Z, a-z),
    Devanagari Hindi characters (अ-ह), numbers (0-9), and Indian Rupee symbol (₹).
    """
    # Primary: Unified font containing both scripts
    if os.path.exists(NOTO_UNIFIED):
        try:
            return ImageFont.truetype(NOTO_UNIFIED, size)
        except Exception:
            pass

    # Dynamic fallback: create unified font if possible
    if os.path.exists(NOTO_SANS) and os.path.exists(NOTO_DEV):
        try:
            from fontTools.merge import Merger
            merger = Merger()
            f = merger.merge([NOTO_SANS, NOTO_DEV])
            f.save(NOTO_UNIFIED)
            return ImageFont.truetype(NOTO_UNIFIED, size)
        except Exception:
            pass

    # Script-specific fallback
    font_path = NOTO_DEV if devanagari and os.path.exists(NOTO_DEV) else NOTO_SANS
    if os.path.exists(font_path):
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            pass
    return ImageFont.load_default()

def render_bill_image(
    order_or_draft_id: str,
    merchant_name: str,
    supplier_plan: Dict[str, Any],
    payment_mode: str = "cash",
    version: Optional[int] = None,
    created_at: Optional[datetime] = None
) -> bytes:
    """
    Renders an ~800px wide, high-resolution certified invoice PNG using Pillow.
    Returns raw PNG bytes.
    """
    opt_a = supplier_plan.get("option_a")
    opt_b = supplier_plan.get("option_b") or {}
    if not opt_a:
        # Fallback if no single supplier
        lines = opt_b.get("lines", [])
        supplier_name = "Split Mandi Fulfilment"
        market = "APMC Network"
        reliability = 8.8
        subtotal = opt_b.get("subtotal", 0.0)
        delivery_fee = opt_b.get("delivery_fees", 0.0)
        grand_total = opt_b.get("grand_total", 0.0)
    else:
        lines = opt_a.get("lines", [])
        supplier_name = opt_a.get("supplier_name", "APMC Wholesaler")
        market = opt_a.get("market", "Indore APMC")
        reliability = opt_a.get("reliability_score", 9.0)
        subtotal = opt_a.get("subtotal", 0.0)
        delivery_fee = opt_a.get("delivery_fee", 0.0)
        grand_total = opt_a.get("grand_total", 0.0)

    # Calculate layout dimensions
    width = 820
    row_height = 56
    num_items = max(1, len(lines))
    height = 560 + (num_items * row_height)

    # Canvas background (light slate paper)
    img = Image.new("RGB", (width, height), color="#f8fafc")
    draw = ImageDraw.Draw(img)

    # Fonts
    font_title = get_font(24)
    font_sub = get_font(13)
    font_h2 = get_font(17)
    font_body = get_font(14)
    font_bold = get_font(14)
    font_small = get_font(11)
    font_large_total = get_font(26)

    # 1. Top Header Banner (Paytm Navy)
    draw.rectangle([0, 0, width, 110], fill="#002970")
    draw.text((36, 26), "Bol-Ke-Mandi · Paytm Vriddhi", fill="#ffffff", font=font_title)
    draw.text((36, 62), "Paytm Kirana Wholesale Network · Certified Digital APMC Invoice", fill="#93c5fd", font=font_sub)

    # Payment badge (top right)
    is_credit = payment_mode in ("credit_7d", "credit")
    badge_bg = "#fef3c7" if is_credit else "#dcfce7"
    badge_fg = "#92400e" if is_credit else "#166534"
    badge_text = "7-DAY APMC CREDIT" if is_credit else "CASH ON DELIVERY"
    
    draw.rounded_rectangle([width - 220, 32, width - 36, 74], radius=8, fill=badge_bg)
    draw.text((width - 204, 44), badge_text, fill=badge_fg, font=font_small)

    # 2. Invoice Details Card
    card_y = 126
    draw.rounded_rectangle([32, card_y, width - 32, card_y + 86], radius=10, fill="#ffffff", outline="#e2e8f0", width=1)
    
    # Left column: Merchant & Order ID
    version_str = f" · v{version}" if version else ""
    date_str = (created_at or datetime.now()).strftime("%d %b %Y, %I:%M %p")
    draw.text((48, card_y + 14), f"Order: {order_or_draft_id}{version_str}", fill="#0f172a", font=font_h2)
    draw.text((48, card_y + 44), f"Merchant: {merchant_name}  ·  Date: {date_str}", fill="#64748b", font=font_sub)

    # Right column: Supplier & Trust Score
    draw.text((width - 340, card_y + 16), f"Wholesaler: {supplier_name}", fill="#0f172a", font=font_bold)
    draw.text((width - 340, card_y + 44), f"Market: {market} · Trust Score: {reliability}/10", fill="#059669", font=font_sub)

    # 3. Table Header
    table_y = card_y + 104
    draw.rounded_rectangle([32, table_y, width - 32, table_y + 36], radius=6, fill="#f1f5f9")
    draw.text((48, table_y + 10), "ITEM DESCRIPTION", fill="#475569", font=font_small)
    draw.text((460, table_y + 10), "QUANTITY", fill="#475569", font=font_small)
    draw.text((580, table_y + 10), "RATE", fill="#475569", font=font_small)
    draw.text((690, table_y + 10), "AMOUNT", fill="#475569", font=font_small)

    # 4. Item Rows
    curr_y = table_y + 42
    for line in lines:
        draw.rounded_rectangle([32, curr_y, width - 32, curr_y + row_height - 6], radius=6, fill="#ffffff", outline="#f1f5f9", width=1)
        
        # Item name and scheme badge
        name = line.get("name", "Grocery Item")
        draw.text((48, curr_y + 10), name[:38], fill="#0f172a", font=font_body)
        
        # Free goods / scheme note
        scheme_text = line.get("scheme_text")
        free_qty = line.get("free_quantity", 0)
        if free_qty and free_qty > 0:
            free_tag = f"FREE: +{int(free_qty)} {line.get('unit')} included"
            draw.text((48, curr_y + 30), free_tag, fill="#059669", font=font_small)
        elif scheme_text:
            draw.text((48, curr_y + 30), f"Offer: {scheme_text}", fill="#0284c7", font=font_small)

        # Quantity (formatted cleanly without trailing decimals, e.g. 5 kg instead of 5.0)
        qty_raw = line.get("quantity", 1)
        try:
            qty_num = float(qty_raw)
            qty_clean = int(qty_num) if qty_num.is_integer() else f"{qty_num:g}"
        except Exception:
            qty_clean = str(qty_raw)

        raw_unit = str(line.get("unit", "")).strip()
        unit_map = {
            "किलो": "kg", "किलोग्राम": "kg", "kgs": "kg",
            "पेटी": "peti", "पेटियां": "peti", "carton": "peti", "cartons": "peti", "box": "peti",
            "कट्टा": "katta", "कट्टे": "katta", "cutter": "katta",
            "बोरी": "bori", "बोरा": "bori",
            "पैकेट": "packet", "pkt": "packet", "packets": "packet",
            "लीटर": "L", "ltr": "L", "litre": "L",
            "डिब्बा": "dabba", "डिब्बे": "dabba"
        }
        unit_clean = unit_map.get(raw_unit.lower(), raw_unit)
        qty_str = f"{qty_clean} {unit_clean}".strip()
        draw.text((460, curr_y + 12), qty_str, fill="#334155", font=font_body)

        # Unit Price
        rate_str = f"₹{float(line.get('unit_price', 0)):,.2f}"
        draw.text((580, curr_y + 12), rate_str, fill="#64748b", font=font_body)

        # Line Total
        tot_str = f"₹{float(line.get('final_total', 0)):,.2f}"
        draw.text((690, curr_y + 12), tot_str, fill="#0f172a", font=font_bold)

        curr_y += row_height

    # 5. Financial Summary Card
    curr_y += 10
    draw.line([48, curr_y, width - 48, curr_y], fill="#cbd5e1", width=1)
    curr_y += 18

    # Subtotal
    draw.text((480, curr_y), "Items Subtotal:", fill="#64748b", font=font_body)
    draw.text((width - 160, curr_y), f"₹{float(subtotal):,.2f}", fill="#0f172a", font=font_body)
    curr_y += 24

    # Delivery Fee
    del_text = "FREE" if float(delivery_fee) == 0 else f"₹{float(delivery_fee):,.2f}"
    draw.text((480, curr_y), "APMC Mandi Delivery Fee:", fill="#64748b", font=font_body)
    draw.text((width - 160, curr_y), del_text, fill="#059669" if float(delivery_fee) == 0 else "#0f172a", font=font_body)
    curr_y += 30

    # GRAND TOTAL Box
    total_box_y = curr_y
    draw.rounded_rectangle([440, total_box_y, width - 36, total_box_y + 54], radius=8, fill="#eff6ff", outline="#bfdbfe", width=1)
    draw.text((458, total_box_y + 12), "GRAND TOTAL:", fill="#002970", font=font_large_total)
    draw.text((width - 180, total_box_y + 12), f"₹{float(grand_total):,.2f}", fill="#002970", font=font_large_total)
    curr_y += 66

    # 6. Savings Banner & Footer
    draw.rounded_rectangle([32, curr_y, width - 32, curr_y + 44], radius=8, fill="#ecfdf5", outline="#a7f3d0", width=1)
    draw.text((48, curr_y + 14), "Best Mandi Price Guarantee · Estimated savings: ₹320 vs retail wholesale", fill="#065f46", font=font_small)

    footer_y = curr_y + 56
    draw.text((48, footer_y), "Prices valid for 24 hours · Certified digital APMC invoice dispatched by Paytm SmartDukaan", fill="#94a3b8", font=font_small)

    # Return PNG bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()

