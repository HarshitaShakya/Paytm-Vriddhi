import json
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlmodel import Session, select
from app.db.models import Draft, Order, OrderLine, Merchant

VALID_TRANSITIONS = {
    "IDLE": ["DRAFTING"],
    "DRAFTING": ["QUOTED", "CANCELLED"],
    "QUOTED": ["DRAFTING", "AUTO_PENDING", "CONFIRMED", "CANCELLED"],
    "AUTO_PENDING": ["QUOTED", "CONFIRMED", "PLACED", "CANCELLED"],
    "CONFIRMED": ["PLACED", "CANCELLED"],
    "PLACED": [],
    "CANCELLED": []
}

class DraftManager:
    @staticmethod
    def get_or_create_draft(merchant_id: str, session: Session) -> Draft:
        """Retrieves active (non-placed, non-cancelled) draft or creates a new one."""
        statement = select(Draft).where(
            Draft.merchant_id == merchant_id,
            Draft.state.in_(["IDLE", "DRAFTING", "QUOTED", "AUTO_PENDING"])
        ).order_by(Draft.updated_at.desc())
        
        draft = session.exec(statement).first()
        now = datetime.now(timezone.utc)

        if draft:
            # Check if expired (24h)
            if draft.expires_at and draft.expires_at < now:
                from app.core.reminders import unlink_all_for_draft
                unlink_all_for_draft(draft.id, session)
                draft.state = "CANCELLED"
                session.add(draft)
                session.commit()
                draft = None

        if not draft:
            draft_id = f"d_{uuid.uuid4().hex[:8]}"
            draft = Draft(
                id=draft_id,
                merchant_id=merchant_id,
                version=1,
                state="DRAFTING",
                lines_json="[]",
                payment_mode="cash",
                created_at=now,
                updated_at=now,
                expires_at=now + timedelta(hours=24)
            )
            session.add(draft)
            session.commit()
            session.refresh(draft)

        return draft

    @staticmethod
    def update_draft_lines(
        draft: Draft,
        lines: List[Dict[str, Any]],
        supplier_plan: Optional[Dict[str, Any]],
        payment_mode: Optional[str],
        session: Session
    ) -> Draft:
        """Updates line items in draft, bumps version, and transitions to QUOTED."""
        now = datetime.now(timezone.utc)
        draft.lines_json = json.dumps(lines)
        draft.supplier_plan_json = json.dumps(supplier_plan) if supplier_plan else None
        if payment_mode:
            draft.payment_mode = payment_mode
        
        draft.version += 1
        draft.state = "QUOTED"
        draft.auto_place_at = None
        draft.updated_at = now
        draft.expires_at = now + timedelta(hours=24)

        session.add(draft)
        session.commit()
        session.refresh(draft)
        return draft

    @staticmethod
    def cancel_draft(draft: Draft, session: Session) -> Draft:
        from app.core.reminders import unlink_all_for_draft
        unlink_all_for_draft(draft.id, session)
        draft.state = "CANCELLED"
        draft.auto_place_at = None
        draft.updated_at = datetime.now(timezone.utc)
        session.add(draft)
        session.commit()
        session.refresh(draft)
        return draft

    @staticmethod
    def confirm_and_place_order(
        draft: Draft,
        claimed_version: int,
        session: Session,
        source: str = "manual"
    ) -> Tuple[bool, Optional[Order], str]:
        """
        Validates confirmation safety rules:
        1. State must be QUOTED or AUTO_PENDING
        2. Version must match exactly
        3. Draft must not be expired
        Returns: (success, order, message)
        """
        now = datetime.now(timezone.utc)

        # 1. Check expiration
        if draft.expires_at and draft.expires_at < now:
            draft.state = "CANCELLED"
            draft.auto_place_at = None
            session.add(draft)
            session.commit()
            return False, None, "Draft bill expire ho chuka hai (24 ghante seema). Kripya naya order banayein."

        # 2. Check state
        if draft.state not in ("QUOTED", "AUTO_PENDING"):
            return False, None, f"Order confirm karne ke liye draft QUOTED ya AUTO_PENDING state mein hona chahiye, par yeh {draft.state} hai."

        # 3. Check version match (Safety rule against stale confirmations)
        if draft.version != claimed_version:
            return False, None, f"STALE_CONFIRMATION: Aapne version {claimed_version} confirm kiya, par latest draft version {draft.version} hai. Re-quoting with updated details."

        # 4. Check plan availability
        if not draft.supplier_plan_json:
            return False, None, "Supplier pricing plan uplabdh nahi hai."

        plan = json.loads(draft.supplier_plan_json)
        opt_a = plan.get("option_a")
        if not opt_a:
            return False, None, "Koi single supplier sabhi items fulfill nahi kar paya."

        # Create Order
        order_id = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        total_amt = Decimal(str(opt_a.get("grand_total", 0.0)))
        
        order = Order(
            id=order_id,
            draft_id=draft.id,
            merchant_id=draft.merchant_id,
            supplier_id=opt_a["supplier_id"],
            total_amount=total_amt,
            savings_amount=Decimal(str(opt_a.get("savings", 0.0))),
            payment_mode=draft.payment_mode,
            source=source,
            status="PLACED",
            placed_at=now
        )
        session.add(order)

        # Create Order Lines
        for line_data in opt_a.get("lines", []):
            ol = OrderLine(
                order_id=order_id,
                sku_id=line_data["sku_id"],
                quantity=Decimal(str(line_data["quantity"])),
                unit=line_data["unit"],
                unit_price=Decimal(str(line_data["unit_price"])),
                total_price=Decimal(str(line_data["final_total"])),
                free_quantity=Decimal(str(line_data.get("free_quantity", 0.0)))
            )
            session.add(ol)

        draft.state = "PLACED"
        draft.auto_place_at = None
        draft.updated_at = now
        session.add(draft)

        session.commit()
        session.refresh(order)

        # Mark linked reminders as ordered
        from app.core.reminders import mark_ordered
        mark_ordered(draft.id, session)

        return True, order, f"Order safalta se place ho gaya! Order ID: {order_id}"

