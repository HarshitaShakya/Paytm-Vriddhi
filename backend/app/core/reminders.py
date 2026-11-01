import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlmodel import Session, select
from rapidfuzz import fuzz

from app.db.models import Reminder, Draft, SKU
from app.core.nlu import ParsedItem
from app.core.matching import match_sku

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def expire_old(session: Session) -> int:
    """
    Lazy cleanup: marks open reminders past expires_at as dismissed.
    Returns count of expired reminders.
    """
    now = utc_now()
    statement = select(Reminder).where(
        Reminder.status == "open",
        Reminder.expires_at < now
    )
    expired_list = session.exec(statement).all()
    count = len(expired_list)
    for rem in expired_list:
        rem.status = "dismissed"
        session.add(rem)
    if count > 0:
        session.commit()
    return count

def add_or_bump(
    merchant_id: str,
    item: ParsedItem,
    session: Session,
    source_message_id: Optional[str] = None
) -> Tuple[Reminder, bool]:
    """
    Attempts SKU match. If an open reminder for this merchant has the same sku_id
    or a fuzzy label match >= 80, increments demand_count and updates last_requested_at.
    Otherwise, inserts a new Reminder record.
    Returns: (reminder, was_duplicate)
    """
    expire_old(session)

    # 1. Try SKU match
    matched = match_sku(item.name_guess, session)
    matched_sku_id = matched.sku.id if matched else None
    canonical_label = matched.sku.name if matched else item.name_guess.strip().title()

    # 2. Check open reminders for this merchant
    open_reminders = session.exec(
        select(Reminder).where(
            Reminder.merchant_id == merchant_id,
            Reminder.status == "open"
        )
    ).all()

    target_reminder: Optional[Reminder] = None

    # Check for exact SKU match
    if matched_sku_id:
        for r in open_reminders:
            if r.sku_id == matched_sku_id:
                target_reminder = r
                break

    # If no SKU match, check fuzzy label match >= 80
    if not target_reminder:
        query_text = (matched.sku.name if matched else item.name_guess).lower()
        best_score = 0.0
        best_r = None
        for r in open_reminders:
            score = max(
                fuzz.token_set_ratio(query_text, r.label_roman.lower()),
                fuzz.WRatio(query_text, r.label_roman.lower())
            )
            if score > best_score:
                best_score = score
                best_r = r
        if best_score >= 80.0 and best_r:
            target_reminder = best_r

    # 3. Duplicate bump or insert
    now = utc_now()
    if target_reminder:
        target_reminder.demand_count += 1
        target_reminder.last_requested_at = now
        # Update details if previously missing
        if matched_sku_id and not target_reminder.sku_id:
            target_reminder.sku_id = matched_sku_id
            target_reminder.label_roman = matched.sku.name
        if item.quantity is not None and target_reminder.qty is None:
            target_reminder.qty = Decimal(str(item.quantity))
        if item.unit and not target_reminder.unit:
            target_reminder.unit = item.unit
        session.add(target_reminder)
        session.commit()
        session.refresh(target_reminder)
        return target_reminder, True
    else:
        new_id = f"rem_{uuid.uuid4().hex[:8]}"
        qty_dec = Decimal(str(item.quantity)) if item.quantity is not None else None
        unit_str = item.unit or (matched.sku.standard_unit if matched else None)
        brand_str = (matched.sku.brand if matched else item.brand)

        rem = Reminder(
            id=new_id,
            merchant_id=merchant_id,
            label_roman=canonical_label,
            sku_id=matched_sku_id,
            brand=brand_str,
            qty=qty_dec,
            unit=unit_str,
            status="open",
            demand_count=1,
            created_at=now,
            last_requested_at=now,
            expires_at=now + timedelta(days=30),
            source_message_id=source_message_id
        )
        session.add(rem)
        session.commit()
        session.refresh(rem)
        return rem, False

def list_open(merchant_id: str, session: Session) -> List[Reminder]:
    """
    Returns open reminders for a merchant, sorted by demand_count desc then last_requested_at desc.
    """
    expire_old(session)
    statement = select(Reminder).where(
        Reminder.merchant_id == merchant_id,
        Reminder.status == "open"
    ).order_by(
        Reminder.demand_count.desc(),
        Reminder.last_requested_at.desc()
    )
    return session.exec(statement).all()

def dismiss(reminder_id: str, session: Session) -> bool:
    """Marks a reminder as dismissed."""
    rem = session.get(Reminder, reminder_id)
    if rem:
        rem.status = "dismissed"
        session.add(rem)
        session.commit()
        return True
    return False

def suggest_for(draft: Draft, session: Session, max_items: int = 5) -> List[Reminder]:
    """
    Returns up to max_items open reminders not already in the draft and not dismissed.
    Sorted by demand_count then recency. Re-runs SKU matching for unlinked reminders.
    """
    expire_old(session)

    # Parse current draft lines to identify items already in cart
    existing_sku_ids = set()
    existing_names = set()
    if draft.lines_json:
        try:
            lines = json.loads(draft.lines_json)
            for l in lines:
                if l.get("sku_id"):
                    existing_sku_ids.add(l["sku_id"])
                if l.get("name"):
                    existing_names.add(l["name"].lower())
        except Exception:
            pass

    # Query open reminders for merchant
    candidates = session.exec(
        select(Reminder).where(
            Reminder.merchant_id == draft.merchant_id,
            Reminder.status == "open"
        ).order_by(
            Reminder.demand_count.desc(),
            Reminder.last_requested_at.desc()
        )
    ).all()

    suggestions: List[Reminder] = []
    for r in candidates:
        # Skip if already linked to this draft
        if r.linked_draft_id == draft.id:
            continue
        # Skip if item already present in draft lines
        if r.sku_id and r.sku_id in existing_sku_ids:
            continue
        if r.label_roman.lower() in existing_names:
            continue

        # Re-run SKU matching if sku_id is unlinked
        if not r.sku_id:
            match = match_sku(r.label_roman, session, threshold=90.0)
            if match:
                r.sku_id = match.sku.id
                if not r.unit:
                    r.unit = match.sku.standard_unit
                session.add(r)
                session.commit()
                session.refresh(r)
                if r.sku_id in existing_sku_ids:
                    continue

        suggestions.append(r)
        if len(suggestions) >= max_items:
            break

    return suggestions

def link_to_draft(reminder_id: str, draft: Draft, session: Session) -> Optional[Reminder]:
    """
    Marks reminder as in_cart linked to draft.
    """
    rem = session.get(Reminder, reminder_id)
    if rem:
        rem.status = "in_cart"
        rem.linked_draft_id = draft.id
        session.add(rem)
        session.commit()
        session.refresh(rem)
        return rem
    return None

def unlink(reminder_id: str, session: Session) -> Optional[Reminder]:
    """
    Resets reminder back to open and removes draft linkage.
    """
    rem = session.get(Reminder, reminder_id)
    if rem:
        rem.status = "open"
        rem.linked_draft_id = None
        rem.linked_line_id = None
        session.add(rem)
        session.commit()
        session.refresh(rem)
        return rem
    return None

def unlink_all_for_draft(draft_id: str, session: Session) -> int:
    """
    Unlinks all reminders linked to a draft (when cancelled or expired).
    """
    linked = session.exec(
        select(Reminder).where(
            Reminder.linked_draft_id == draft_id,
            Reminder.status == "in_cart"
        )
    ).all()
    count = len(linked)
    for rem in linked:
        rem.status = "open"
        rem.linked_draft_id = None
        rem.linked_line_id = None
        session.add(rem)
    if count > 0:
        session.commit()
    return count

def mark_ordered(draft_id: str, session: Session) -> int:
    """
    On CONFIRMED/PLACED, marks linked reminders as ordered.
    """
    linked = session.exec(
        select(Reminder).where(
            Reminder.linked_draft_id == draft_id,
            Reminder.status == "in_cart"
        )
    ).all()
    count = len(linked)
    for rem in linked:
        rem.status = "ordered"
        session.add(rem)
    if count > 0:
        session.commit()
    return count
