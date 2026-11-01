import json
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional, Tuple
from sqlmodel import Session, select
from app.db.models import SKU, Supplier, SupplierPrice

def to_decimal(val: Any) -> Decimal:
    """Safely converts float, int, str to Decimal with 2 decimal places."""
    if isinstance(val, Decimal):
        return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class LineRequest:
    def __init__(self, sku_id: str, quantity: Decimal, unit: str):
        self.sku_id = sku_id
        self.quantity = quantity
        self.unit = unit

class LineCalculation:
    def __init__(
        self,
        sku_id: str,
        name: str,
        quantity: Decimal,
        unit: str,
        unit_price: Decimal,
        subtotal: Decimal,
        free_quantity: Decimal,
        discount: Decimal,
        final_total: Decimal,
        supplier_id: str,
        supplier_name: str,
        scheme_text: Optional[str] = None
    ):
        self.sku_id = sku_id
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.unit_price = unit_price
        self.subtotal = subtotal
        self.free_quantity = free_quantity
        self.discount = discount
        self.final_total = final_total
        self.supplier_id = supplier_id
        self.supplier_name = supplier_name
        self.scheme_text = scheme_text

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sku_id": self.sku_id,
            "name": self.name,
            "quantity": float(self.quantity),
            "unit": self.unit,
            "unit_price": float(self.unit_price),
            "subtotal": float(self.subtotal),
            "free_quantity": float(self.free_quantity),
            "discount": float(self.discount),
            "final_total": float(self.final_total),
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier_name,
            "scheme_text": self.scheme_text
        }

def apply_scheme(qty: Decimal, unit_price: Decimal, scheme_json: Optional[str]) -> Tuple[Decimal, Decimal, Optional[str]]:
    """
    Returns (free_quantity, discount_amount, scheme_description)
    """
    if not scheme_json:
        return Decimal("0.00"), Decimal("0.00"), None
    
    try:
        scheme = json.loads(scheme_json)
    except Exception:
        return Decimal("0.00"), Decimal("0.00"), None

    free_qty = Decimal("0.00")
    discount = Decimal("0.00")
    desc = []

    buy_qty = Decimal(str(scheme.get("buy_qty", 0)))
    if buy_qty > Decimal("0") and qty >= buy_qty:
        times = qty // buy_qty

        # 1. Free goods (e.g. buy 10 get 1 free)
        if "free_qty" in scheme and scheme["free_qty"] > 0:
            free_units = times * Decimal(str(scheme["free_qty"]))
            free_qty += free_units
            desc.append(f"Scheme: {int(free_units)} free on {int(qty)} {scheme.get('free_unit', 'unit')}")

        # 2. Flat cash discount
        if "flat_discount_rs" in scheme and scheme["flat_discount_rs"] > 0:
            flat_disc = times * Decimal(str(scheme["flat_discount_rs"]))
            discount += flat_disc
            desc.append(f"Scheme: ₹{flat_disc} flat discount")

        # 3. Percentage discount
        if "discount_pct" in scheme and scheme["discount_pct"] > 0:
            pct = Decimal(str(scheme["discount_pct"])) / Decimal("100")
            pct_disc = (qty * unit_price) * pct
            discount += pct_disc
            desc.append(f"Scheme: {scheme['discount_pct']}% volume discount")

    return free_qty, discount.quantize(Decimal("0.01")), "; ".join(desc) if desc else None

class SupplierQuoteOption:
    def __init__(
        self,
        supplier: Supplier,
        lines: List[LineCalculation],
        subtotal: Decimal,
        delivery_fee: Decimal,
        min_order_shortfall: Decimal,
        grand_total: Decimal,
        can_fulfill_all: bool,
        missing_skus: List[str]
    ):
        self.supplier = supplier
        self.lines = lines
        self.subtotal = subtotal
        self.delivery_fee = delivery_fee
        self.min_order_shortfall = min_order_shortfall
        self.grand_total = grand_total
        self.can_fulfill_all = can_fulfill_all
        self.missing_skus = missing_skus

    def to_dict(self) -> Dict[str, Any]:
        return {
            "supplier_id": self.supplier.id,
            "supplier_name": self.supplier.name,
            "market": self.supplier.market,
            "reliability_score": self.supplier.reliability_score,
            "on_time_pct": self.supplier.on_time_pct,
            "subtotal": float(self.subtotal),
            "delivery_fee": float(self.delivery_fee),
            "min_order_shortfall": float(self.min_order_shortfall),
            "grand_total": float(self.grand_total),
            "can_fulfill_all": self.can_fulfill_all,
            "lines": [l.to_dict() for l in self.lines]
        }

def calculate_pricing(
    requests: List[LineRequest],
    payment_mode: str,
    session: Session
) -> Dict[str, Any]:
    """
    Main pricing engine function:
    Computes Option A (Best Single Supplier) and Option B (Best Split Basket).
    All calculations use Decimal.
    """
    if not requests:
        return {
            "option_a": None,
            "option_b": None,
            "recommended": "A",
            "unlisted_items": []
        }

    skus = {s.id: s for s in session.exec(select(SKU)).all()}
    suppliers = {sup.id: sup for sup in session.exec(select(Supplier)).all()}
    all_prices = session.exec(select(SupplierPrice)).all()

    # Index prices by (sku_id, supplier_id)
    price_map: Dict[Tuple[str, str], SupplierPrice] = {
        (p.sku_id, p.supplier_id): p for p in all_prices
    }

    # Verify which items exist in catalog
    valid_requests = []
    unlisted_items = []
    for r in requests:
        if r.sku_id in skus:
            valid_requests.append(r)
        else:
            unlisted_items.append(r.sku_id)

    if not valid_requests:
        return {
            "option_a": None,
            "option_b": None,
            "recommended": "A",
            "unlisted_items": unlisted_items
        }

    # ─────────────────────────────────────────────────────────────
    # OPTION A: Per-Supplier Fulfilment
    # ─────────────────────────────────────────────────────────────
    supplier_options: List[SupplierQuoteOption] = []

    for sup_id, sup in suppliers.items():
        lines: List[LineCalculation] = []
        can_fulfill_all = True
        missing = []
        subtotal = Decimal("0.00")

        for req in valid_requests:
            sp = price_map.get((req.sku_id, sup_id))
            if not sp or not sp.in_stock:
                can_fulfill_all = False
                missing.append(req.sku_id)
                continue
            
            unit_price = sp.credit_price if payment_mode == "credit_7d" else sp.cash_price
            line_sub = (req.quantity * unit_price).quantize(Decimal("0.01"))
            free_qty, disc, scheme_desc = apply_scheme(req.quantity, unit_price, sp.scheme_json)
            final_line = line_sub - disc

            subtotal += final_line
            lines.append(LineCalculation(
                sku_id=req.sku_id,
                name=skus[req.sku_id].name,
                quantity=req.quantity,
                unit=req.unit,
                unit_price=unit_price,
                subtotal=line_sub,
                free_quantity=free_qty,
                discount=disc,
                final_total=final_line,
                supplier_id=sup_id,
                supplier_name=sup.name,
                scheme_text=scheme_desc
            ))

        delivery_fee = sup.delivery_fee
        shortfall = max(Decimal("0.00"), sup.min_order - subtotal)
        grand_total = subtotal + delivery_fee

        supplier_options.append(SupplierQuoteOption(
            supplier=sup,
            lines=lines,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            min_order_shortfall=shortfall,
            grand_total=grand_total,
            can_fulfill_all=can_fulfill_all,
            missing_skus=missing
        ))

    # Pick best single supplier
    eligible_a = [o for o in supplier_options if o.can_fulfill_all]
    best_a: Optional[SupplierQuoteOption] = None

    if eligible_a:
        # Sort by grand_total ascending
        eligible_a.sort(key=lambda o: o.grand_total)
        cheapest = eligible_a[0]
        
        # Check within 1% price threshold for higher reliability
        best_candidate = cheapest
        one_pct_margin = cheapest.grand_total * Decimal("0.01")
        for other in eligible_a[1:]:
            if (other.grand_total - cheapest.grand_total) <= one_pct_margin:
                if other.supplier.reliability_score > best_candidate.supplier.reliability_score:
                    best_candidate = other
        best_a = best_candidate

    # ─────────────────────────────────────────────────────────────
    # OPTION B: Split-Basket Optimization
    # ─────────────────────────────────────────────────────────────
    split_lines: List[LineCalculation] = []
    suppliers_used: Dict[str, List[LineCalculation]] = {}

    for req in valid_requests:
        # Find cheapest in-stock supplier for this item
        candidates = []
        for sup_id, sup in suppliers.items():
            sp = price_map.get((req.sku_id, sup_id))
            if sp and sp.in_stock:
                u_price = sp.credit_price if payment_mode == "credit_7d" else sp.cash_price
                l_sub = (req.quantity * u_price).quantize(Decimal("0.01"))
                f_qty, d_amt, s_txt = apply_scheme(req.quantity, u_price, sp.scheme_json)
                f_tot = l_sub - d_amt
                candidates.append((f_tot, u_price, f_qty, d_amt, s_txt, sup))

        if candidates:
            candidates.sort(key=lambda c: (c[0], -c[5].reliability_score))
            chosen = candidates[0]
            calc = LineCalculation(
                sku_id=req.sku_id,
                name=skus[req.sku_id].name,
                quantity=req.quantity,
                unit=req.unit,
                unit_price=chosen[1],
                subtotal=(req.quantity * chosen[1]).quantize(Decimal("0.01")),
                free_quantity=chosen[2],
                discount=chosen[3],
                final_total=chosen[0],
                supplier_id=chosen[5].id,
                supplier_name=chosen[5].name,
                scheme_text=chosen[4]
            )
            split_lines.append(calc)
            if chosen[5].id not in suppliers_used:
                suppliers_used[chosen[5].id] = []
            suppliers_used[chosen[5].id].append(calc)

    # Compute split basket totals
    split_subtotal = sum(l.final_total for l in split_lines)
    split_delivery_fees = sum(suppliers[sup_id].delivery_fee for sup_id in suppliers_used.keys())
    split_grand_total = split_subtotal + split_delivery_fees

    option_b_dict = None
    if len(split_lines) == len(valid_requests):
        option_b_dict = {
            "type": "split_basket",
            "suppliers_count": len(suppliers_used),
            "suppliers": [suppliers[s_id].name for s_id in suppliers_used.keys()],
            "subtotal": float(split_subtotal),
            "delivery_fees": float(split_delivery_fees),
            "grand_total": float(split_grand_total),
            "lines": [l.to_dict() for l in split_lines]
        }

    # Decide recommendation: Option B recommended only if it saves >= ₹150 over Option A
    recommended = "A"
    if best_a and option_b_dict:
        savings = best_a.grand_total - split_grand_total
        if savings >= Decimal("150.00") and len(suppliers_used) > 1:
            recommended = "B"

    return {
        "payment_mode": payment_mode,
        "option_a": best_a.to_dict() if best_a else None,
        "option_b": option_b_dict,
        "recommended": recommended,
        "unlisted_items": unlisted_items
    }
