import json
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Tuple, List, Optional, Dict, Any
from sqlmodel import Session, select

from app.db.models import Draft, Merchant, Order, OrderLine, SKU, Supplier
from app.core.state import DraftManager
from app.core.units import requires_pack_confirmation, normalize_unit

logger = logging.getLogger(__name__)

def eligible_for_auto_place(
    draft: Draft,
    merchant: Merchant,
    session: Session,
    nlu_confidence: Optional[float] = None,
    has_pack_warning: bool = False,
    needs_clarification: bool = False
) -> Tuple[bool, List[str]]:
    """
    Evaluates whether a quoted draft is eligible for safe, opt-in Auto-Place.
    Returns: (is_eligible, list_of_blocking_reasons)
    
    Strict 9-Point Safety Invariant:
    1. Opt-in: merchant.auto_place_enabled is True
    2. NLU overall_confidence >= 0.90
    3. No clarification flags raised during parsing
    4. Every line matched to a known SKU with score above threshold
    5. No unlisted items and no fractional-pack warnings
    6. Every SKU has been previously ordered by this merchant
    7. Order total <= merchant.auto_place_max_total (default 5,000)
    8. Order total within auto_place_tolerance_pct (default 5%) of last comparable confirmed order
    9. Supplier equals merchant's usual supplier
    """
    reasons = []

    # 1. Opt-in enabled
    if not merchant.auto_place_enabled:
        reasons.append("Auto-place is disabled in merchant settings.")

    # 2. High NLU confidence
    conf = nlu_confidence if nlu_confidence is not None else (draft.confidence_score or 0.0)
    if conf < 0.90:
        reasons.append(f"NLU confidence ({conf:.2f}) is below safe auto-place threshold (0.90).")

    # 3. No clarification flags
    if needs_clarification:
        reasons.append("Order required clarification.")

    # Parse draft lines
    lines: List[Dict[str, Any]] = json.loads(draft.lines_json) if draft.lines_json else []
    if not lines:
        reasons.append("Draft has no line items.")

    # 4 & 5. Every line matched, no unlisted, no pack warning
    if has_pack_warning:
        reasons.append("Draft contains fractional pack warnings (khuli peti/bori).")

    for l in lines:
        sku_id = l.get("sku_id")
        if not sku_id or sku_id == "unlisted" or l.get("unlisted"):
            reasons.append(f"Item '{l.get('name', 'unknown')}' is unlisted or lacks catalog SKU.")
            break
        # Check pack unit fraction
        qty = Decimal(str(l.get("quantity", 1.0)))
        unit = normalize_unit(l.get("unit", ""))
        if requires_pack_confirmation(qty, unit):
            reasons.append(f"Item '{l.get('name')}' has fractional pack quantity ({qty} {unit}).")
            break

    # 6. Every SKU was ordered by this merchant before
    past_order_skus = set(
        session.exec(
            select(OrderLine.sku_id)
            .join(Order, Order.id == OrderLine.order_id)
            .where(Order.merchant_id == merchant.id, Order.status == "PLACED")
        ).all()
    )
    for l in lines:
        sku_id = l.get("sku_id")
        if sku_id and sku_id not in past_order_skus:
            reasons.append(f"SKU '{sku_id}' ({l.get('name')}) has never been ordered before by this merchant.")
            break

    # Extract pricing plan
    plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
    opt_a = plan.get("option_a", {})
    grand_total = Decimal(str(opt_a.get("grand_total", 0.0)))
    supplier_id = opt_a.get("supplier_id")

    if grand_total <= Decimal("0.00"):
        reasons.append("Draft pricing total is zero.")

    # 7. Total <= max_total
    max_tot = merchant.auto_place_max_total or Decimal("5000.00")
    if grand_total > max_tot:
        reasons.append(f"Total ₹{grand_total:,.2f} exceeds auto-place max limit of ₹{max_tot:,.2f}.")

    # 8. Within tolerance_pct of last comparable confirmed order
    past_orders = session.exec(
        select(Order)
        .where(Order.merchant_id == merchant.id, Order.status == "PLACED")
        .order_by(Order.placed_at.desc())
    ).all()

    if not past_orders:
        reasons.append("No historical confirmed orders exist to compare baseline pricing.")
    else:
        # Find the most recent order with identical or comparable basket
        draft_sku_set = {l.get("sku_id") for l in lines if l.get("sku_id")}
        comparable_order = None
        for po in past_orders:
            po_lines = session.exec(select(OrderLine).where(OrderLine.order_id == po.id)).all()
            po_sku_set = {pol.sku_id for pol in po_lines}
            if po_sku_set == draft_sku_set:
                comparable_order = po
                break

        # If no identical basket, compare against most recent order
        target_ref_order = comparable_order or past_orders[0]
        ref_amt = Decimal(str(target_ref_order.total_amount))
        tol_pct = Decimal(str(merchant.auto_place_tolerance_pct or 5.0))
        if ref_amt > Decimal("0.00"):
            diff_pct = abs(grand_total - ref_amt) / ref_amt * Decimal("100.0")
            if diff_pct > tol_pct:
                reasons.append(
                    f"Total ₹{grand_total:,.2f} differs by {diff_pct:.1f}% from past order ₹{ref_amt:,.2f} "
                    f"(tolerance is ±{tol_pct}%)."
                )

    # 9. Supplier equals usual supplier
    usual_supp = merchant.usual_supplier_id
    if not usual_supp and past_orders:
        # Infer most frequently ordered supplier
        supp_counts: Dict[str, int] = {}
        for po in past_orders:
            supp_counts[po.supplier_id] = supp_counts.get(po.supplier_id, 0) + 1
        usual_supp = max(supp_counts, key=supp_counts.get) if supp_counts else None

    if usual_supp and supplier_id != usual_supp:
        reasons.append(f"Supplier '{supplier_id}' is not the merchant's usual supplier ('{usual_supp}').")
    elif not usual_supp and not merchant.usual_supplier_id:
        reasons.append("Merchant has no established usual supplier history.")

    is_eligible = (len(reasons) == 0)
    return is_eligible, reasons

def cancel_auto_place_countdown(draft: Draft, session: Session) -> bool:
    """
    Cancels an active AUTO_PENDING countdown and returns draft to QUOTED state.
    Bumps version to ensure safety.
    """
    if draft.state == "AUTO_PENDING":
        draft.state = "QUOTED"
        draft.auto_place_at = None
        draft.version += 1
        draft.updated_at = datetime.now(timezone.utc)
        session.add(draft)
        session.commit()
        session.refresh(draft)
        logger.info(f"Auto-place countdown cancelled for draft {draft.id}. Returned to QUOTED v{draft.version}.")
        return True
    return False

def execute_auto_place_for_draft(
    draft_id: str,
    session: Session,
    expected_version: Optional[int] = None
) -> Tuple[bool, Optional[Order], str]:
    """
    Executes auto-placement of an AUTO_PENDING draft whose countdown timer has arrived.
    Validates draft state, version, and expiry.
    """
    draft = session.exec(select(Draft).where(Draft.id == draft_id)).first()
    if not draft:
        return False, None, "Draft not found."

    if draft.state != "AUTO_PENDING":
        return False, None, f"Draft is in {draft.state} state, not AUTO_PENDING."

    now = datetime.now(timezone.utc)
    if draft.auto_place_at and draft.auto_place_at > now:
        return False, None, "Auto-place timer has not yet arrived."

    if expected_version is not None and draft.version != expected_version:
        return False, None, f"Version mismatch: draft is v{draft.version}, expected v{expected_version}."

    # Place order with source="auto"
    ok, order, msg = DraftManager.confirm_and_place_order(
        draft=draft,
        claimed_version=draft.version,
        session=session,
        source="auto"
    )
    return ok, order, msg

def poll_and_execute_overdue_autoplaces(session: Session) -> List[Tuple[str, str]]:
    """
    Scans for overdue AUTO_PENDING drafts and executes placement.
    Called by periodic poller loop and on system restart.
    Returns: List of (draft_id, order_id)
    """
    now = datetime.now(timezone.utc)
    overdue_drafts = session.exec(
        select(Draft).where(
            Draft.state == "AUTO_PENDING",
            Draft.auto_place_at <= now
        )
    ).all()

    placed_orders = []
    for d in overdue_drafts:
        ok, order, msg = execute_auto_place_for_draft(d.id, session, expected_version=d.version)
        if ok and order:
            logger.info(f"Auto-placed order {order.id} for draft {d.id} (Merchant: {d.merchant_id})")
            placed_orders.append((d.id, order.id))
        else:
            logger.warning(f"Failed to auto-place draft {d.id}: {msg}")

    return placed_orders

