import json
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select

from app.core.schemas import InboundMessage, OutboundMessage, ActionButton, SuggestionItem, SuggestionSet
from app.core.nlu import parse_with_gemini, NluResult
from app.core.units import parse_quantity, normalize_unit, requires_pack_confirmation
from app.core.matching import match_sku
from app.core.pricing import LineRequest, calculate_pricing
from app.core.billing import render_bill_image
from app.core.state import DraftManager
from app.core.replies import (
    build_quote_reply,
    build_order_placed_reply,
    build_stale_rejection_reply,
    build_cancel_reply,
    build_clarification_reply,
    build_reminder_saved_reply,
    build_reminders_list_reply,
    build_reminder_removed_reply
)
from app.core.reminders import (
    add_or_bump,
    list_open,
    dismiss,
    suggest_for,
    link_to_draft,
    unlink,
    unlink_all_for_draft,
    mark_ordered
)
from app.db.models import MessageLog, Merchant, Draft, Reminder, SKU

logger = logging.getLogger(__name__)

def handle_inbound_message(inbound: InboundMessage, session: Session) -> List[OutboundMessage]:
    """
    Channel-Agnostic Core Agent Orchestrator:
    handle(InboundMessage) -> list[OutboundMessage]
    
    Adheres strictly to:
    1. Idempotency (message_log UNIQUE external_message_id)
    2. Ephemeral audio privacy (purge immediately after transcribe)
    3. LLM understands; Code computes (Pydantic NLU -> Decimal pricing)
    4. Versioned Draft confirmation safety
    5. "Yaad Dila Dena" Reminders lifecycle and interactive SuggestionSet
    """
    # 1. Idempotency Check
    existing_log = session.exec(
        select(MessageLog).where(MessageLog.external_message_id == inbound.message_id)
    ).first()
    if existing_log:
        logger.info(f"Duplicate message received: {inbound.message_id}. Returning cached response.")
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=existing_log.response_summary or "Message already processed.",
            speech_text=existing_log.response_summary
        )]

    # 2. Audio Processing (Transcribe & Immediately Delete)
    utterance = (inbound.text or "").strip()
    if inbound.audio_bytes:
        try:
            if not utterance:
                from app.core.audio import transcribe_audio
                mime = inbound.mime_type or "audio/ogg"
                transcription = transcribe_audio(inbound.audio_bytes, mime)
                if transcription:
                    utterance = transcription.strip()
                    logger.info(f"Transcribed audio utterance: '{utterance}'")
                else:
                    logger.warning("Audio transcription returned empty or unparseable audio.")
        finally:
            inbound.audio_bytes = None  # Privacy purge: never retain raw voice audio

    # Load Merchant
    merchant = session.exec(
        select(Merchant).where(Merchant.id == inbound.merchant_id)
    ).first()
    merchant_name = merchant.name if merchant else "Sharma Kirana Store"

    # Get Active Draft
    draft = DraftManager.get_or_create_draft(inbound.merchant_id, session)

    # Auto-place safety: If draft was in AUTO_PENDING and this message is NOT an immediate placement or cancel,
    # cancel the countdown, return to QUOTED, and bump version.
    if draft.state == "AUTO_PENDING":
        is_immediate_place = False
        if inbound.callback_data:
            cb_str = inbound.callback_data.strip()
            if any(k in cb_str for k in ["confirm", "auto_place_now", '"action": "confirm"', '"action": "auto_place_now"', "c:", "ap:"]):
                is_immediate_place = True
            elif any(k in cb_str for k in ["cancel", '"action": "cancel"', "cl:"]):
                is_immediate_place = True
        elif (inbound.text or "").strip().lower() in ("ruko", "cancel", "mat bhejo", "रुको", "कैंसिल"):
            is_immediate_place = True

        if not is_immediate_place:
            from app.core.autoplace import cancel_auto_place_countdown
            cancel_auto_place_countdown(draft, session)

    # 3. Handle Button Click Action (callback_data)
    if inbound.callback_data:
        raw_cb = inbound.callback_data.strip()
        try:
            action_data = json.loads(raw_cb)
        except Exception:
            action_data = {"action": raw_cb}

        # Normalize compact colon formats e.g. "rt:rem_123:d_456:1", "c:d_123:2"
        if ":" in raw_cb and not raw_cb.startswith("{"):
            parts = raw_cb.split(":")
            if parts[0] == "rt" and len(parts) >= 4:
                action_data = {
                    "action": "reminder_toggle",
                    "reminder_id": parts[1],
                    "draft_id": parts[2],
                    "version": int(parts[3]) if parts[3].isdigit() else parts[3]
                }
            elif parts[0] == "ra" and len(parts) >= 3:
                action_data = {
                    "action": "reminder_add_all",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                }
            elif parts[0] == "rs" and len(parts) >= 3:
                action_data = {
                    "action": "reminder_skip",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                }
            elif parts[0] == "rd" and len(parts) >= 2:
                action_data = {
                    "action": "dismiss_reminder",
                    "reminder_id": parts[1]
                }
            elif parts[0] in ("c", "confirm") and len(parts) >= 3:
                action_data = {
                    "action": "confirm",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                }
            elif parts[0] in ("ap", "auto_place_now") and len(parts) >= 3:
                action_data = {
                    "action": "auto_place_now",
                    "draft_id": parts[1],
                    "version": int(parts[2]) if parts[2].isdigit() else parts[2]
                }
            elif parts[0] in ("lr", "list_reminders"):
                action_data = {"action": "list_reminders"}
            elif parts[0] in ("so", "sample_order"):
                action_data = {"action": "sample_order"}

        action = action_data.get("action")
        claimed_version = action_data.get("version", draft.version)

        # 3a. Order Confirmation Button / Auto-Place Immediate Confirmation
        if action in ("confirm", "c", "auto_place_now", "ap"):
            source = "auto" if action in ("auto_place_now", "ap") else "manual"
            ok, order, msg = DraftManager.confirm_and_place_order(draft, claimed_version, session, source=source)
            if ok and order:
                rep = build_order_placed_reply(order.id, order.supplier_id, float(order.total_amount))
                session.add(MessageLog(
                    channel=inbound.channel,
                    external_message_id=inbound.message_id,
                    sender_id=inbound.sender_id,
                    transcript="[Button: Confirm Order]",
                    response_summary=rep.display_text
                ))
                session.commit()
                return [OutboundMessage(
                    recipient_id=inbound.sender_id,
                    display_text=rep.display_text,
                    speech_text=rep.speech_text,
                    order_id=order.id
                )]
            else:
                # Stale confirmation: re-quote
                curr_plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
                curr_tot = curr_plan.get("option_a", {}).get("grand_total", 0.0)
                rep = build_stale_rejection_reply(claimed_version, draft.version, curr_tot)
                bill_png = render_bill_image(draft.id, merchant_name, curr_plan, draft.payment_mode, draft.version)
                return [OutboundMessage(
                    recipient_id=inbound.sender_id,
                    display_text=rep.display_text,
                    speech_text=rep.speech_text,
                    image_bytes=bill_png,
                    draft_id=draft.id,
                    draft_version=draft.version,
                    buttons=[
                        ActionButton(label="✓ Updated Bill Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                        ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
                    ]
                )]

        # 3b. Cancel Draft Button
        elif action in ("cancel", "cl"):
            DraftManager.cancel_draft(draft, session)
            rep = build_cancel_reply()
            session.add(MessageLog(
                channel=inbound.channel,
                external_message_id=inbound.message_id,
                sender_id=inbound.sender_id,
                transcript="[Button: Cancel Draft]",
                response_summary=rep.display_text
            ))
            session.commit()
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text
            )]

        # 3c. Reminder Toggle (Selection / Deselection Chip)
        elif action in ("reminder_toggle", "rt"):
            reminder_id = action_data.get("reminder_id") or action_data.get("rid")
            # Safety check: Stale version validation
            if draft.version != claimed_version:
                curr_plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
                curr_tot = curr_plan.get("option_a", {}).get("grand_total", 0.0)
                rep = build_stale_rejection_reply(claimed_version, draft.version, curr_tot)
                bill_png = render_bill_image(draft.id, merchant_name, curr_plan, draft.payment_mode, draft.version)
                return [OutboundMessage(
                    recipient_id=inbound.sender_id,
                    display_text=rep.display_text,
                    speech_text=rep.speech_text,
                    image_bytes=bill_png,
                    draft_id=draft.id,
                    draft_version=draft.version,
                    buttons=[
                        ActionButton(label="✓ Updated Bill Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                        ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
                    ]
                )]

            rem = session.get(Reminder, reminder_id)
            if not rem:
                return [OutboundMessage(recipient_id=inbound.sender_id, display_text="Reminder record nahi mila bhaiya.")]

            current_lines = json.loads(draft.lines_json) if draft.lines_json else []

            if rem.status == "in_cart":
                # DESELECT: Unlink and remove from draft lines
                unlink(rem.id, session)
                current_lines = [l for l in current_lines if l.get("reminder_id") != rem.id and l.get("sku_id") != rem.sku_id]
                status_msg = f"{rem.label_roman} bill se hata diya gaya."
            else:
                # SELECT: Link to draft and add to lines
                link_to_draft(rem.id, draft, session)
                qty = float(rem.qty) if rem.qty else 1.0
                unit = rem.unit or "unit"
                sku_id = rem.sku_id
                if not sku_id:
                    m = match_sku(rem.label_roman, session)
                    if m:
                        sku_id = m.sku.id
                        unit = m.sku.standard_unit

                if sku_id:
                    ex = next((l for l in current_lines if l.get("sku_id") == sku_id), None)
                    if ex:
                        ex["quantity"] += qty
                        ex["reminder_id"] = rem.id
                    else:
                        sku_obj = session.get(SKU, sku_id)
                        name = sku_obj.name if sku_obj else rem.label_roman
                        current_lines.append({
                            "sku_id": sku_id,
                            "name": name,
                            "quantity": qty,
                            "unit": unit,
                            "reminder_id": rem.id
                        })
                else:
                    current_lines.append({
                        "sku_id": "unlisted",
                        "name": rem.label_roman,
                        "quantity": qty,
                        "unit": unit,
                        "reminder_id": rem.id,
                        "unlisted": True,
                        "note": "supplier quote needed"
                    })
                status_msg = f"{rem.label_roman} bill mein jod diya gaya."

            # Re-price with valid SKU lines
            valid_requests = [
                LineRequest(sku_id=l["sku_id"], quantity=Decimal(str(l["quantity"])), unit=l["unit"])
                for l in current_lines if l.get("sku_id") and l.get("sku_id") != "unlisted"
            ]
            pricing = calculate_pricing(valid_requests, draft.payment_mode, session)
            draft = DraftManager.update_draft_lines(draft, current_lines, pricing, draft.payment_mode, session)
            bill_png = render_bill_image(draft.id, merchant_name, pricing, draft.payment_mode, draft.version)
            opt_a = pricing.get("option_a", {})
            grand_total = opt_a.get("grand_total", 0.0)

            # Build updated suggestions state
            active_sugs = session.exec(select(Reminder).where(
                Reminder.merchant_id == draft.merchant_id,
                ((Reminder.linked_draft_id == draft.id) & (Reminder.status == "in_cart")) |
                (Reminder.status == "open")
            ).order_by(Reminder.demand_count.desc(), Reminder.last_requested_at.desc())).all()[:5]

            sug_items = [
                SuggestionItem(
                    reminder_id=r.id,
                    label=r.label_roman,
                    demand_count=r.demand_count,
                    selected=(r.status == "in_cart" and r.linked_draft_id == draft.id),
                    sku_id=r.sku_id,
                    qty=float(r.qty) if r.qty else 1.0,
                    unit=r.unit
                )
                for r in active_sugs
            ]
            suggestions_obj = SuggestionSet(
                title="Yaad Dila Dena: Pichli baar ye maanga gaya tha",
                items=sug_items,
                actions=["add_all", "skip"],
                draft_id=draft.id,
                draft_version=draft.version
            )

            disp = f"{status_msg} Naya draft total: ₹{grand_total:,.2f}."
            buttons = [
                ActionButton(label="✓ Order Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="+ Kuch Aur Jodein", action="add_item", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✎ Quantity Badlein", action="edit", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
            ]
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=disp,
                speech_text=status_msg,
                image_bytes=bill_png,
                suggestions=suggestions_obj,
                draft_id=draft.id,
                draft_version=draft.version,
                buttons=buttons
            )]

        # 3d. Reminder Add All ("Sab add karo")
        elif action in ("reminder_add_all", "ra"):
            if draft.version != claimed_version:
                curr_plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
                curr_tot = curr_plan.get("option_a", {}).get("grand_total", 0.0)
                rep = build_stale_rejection_reply(claimed_version, draft.version, curr_tot)
                bill_png = render_bill_image(draft.id, merchant_name, curr_plan, draft.payment_mode, draft.version)
                return [OutboundMessage(
                    recipient_id=inbound.sender_id,
                    display_text=rep.display_text,
                    speech_text=rep.speech_text,
                    image_bytes=bill_png,
                    draft_id=draft.id,
                    draft_version=draft.version,
                    buttons=[
                        ActionButton(label="✓ Updated Bill Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                        ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
                    ]
                )]

            sugs = suggest_for(draft, session, max_items=5)
            current_lines = json.loads(draft.lines_json) if draft.lines_json else []
            for rem in sugs:
                link_to_draft(rem.id, draft, session)
                qty = float(rem.qty) if rem.qty else 1.0
                unit = rem.unit or "unit"
                sku_id = rem.sku_id
                if not sku_id:
                    m = match_sku(rem.label_roman, session)
                    if m:
                        sku_id = m.sku.id
                        unit = m.sku.standard_unit
                if sku_id:
                    ex = next((l for l in current_lines if l.get("sku_id") == sku_id), None)
                    if ex:
                        ex["quantity"] += qty
                        ex["reminder_id"] = rem.id
                    else:
                        sku_obj = session.get(SKU, sku_id)
                        name = sku_obj.name if sku_obj else rem.label_roman
                        current_lines.append({
                            "sku_id": sku_id,
                            "name": name,
                            "quantity": qty,
                            "unit": unit,
                            "reminder_id": rem.id
                        })
                else:
                    current_lines.append({
                        "sku_id": "unlisted",
                        "name": rem.label_roman,
                        "quantity": qty,
                        "unit": unit,
                        "reminder_id": rem.id,
                        "unlisted": True,
                        "note": "supplier quote needed"
                    })

            valid_requests = [
                LineRequest(sku_id=l["sku_id"], quantity=Decimal(str(l["quantity"])), unit=l["unit"])
                for l in current_lines if l.get("sku_id") and l.get("sku_id") != "unlisted"
            ]
            pricing = calculate_pricing(valid_requests, draft.payment_mode, session)
            draft = DraftManager.update_draft_lines(draft, current_lines, pricing, draft.payment_mode, session)
            bill_png = render_bill_image(draft.id, merchant_name, pricing, draft.payment_mode, draft.version)
            opt_a = pricing.get("option_a", {})
            grand_total = opt_a.get("grand_total", 0.0)

            sug_items = [
                SuggestionItem(
                    reminder_id=r.id,
                    label=r.label_roman,
                    demand_count=r.demand_count,
                    selected=True,
                    sku_id=r.sku_id,
                    qty=float(r.qty) if r.qty else 1.0,
                    unit=r.unit
                )
                for r in sugs
            ]
            suggestions_obj = SuggestionSet(
                title="Yaad Dila Dena: Pichli baar ye maanga gaya tha",
                items=sug_items,
                actions=["add_all", "skip"],
                draft_id=draft.id,
                draft_version=draft.version
            )
            disp = f"Sabhi reminders draft bill mein jod diye gaye hain bhaiya. Naya total: ₹{grand_total:,.2f}."
            buttons = [
                ActionButton(label="✓ Order Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="+ Kuch Aur Jodein", action="add_item", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✎ Quantity Badlein", action="edit", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
            ]
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=disp,
                speech_text="सभी रिमाइंडर बिल में जोड़ दिए गए हैं।",
                image_bytes=bill_png,
                suggestions=suggestions_obj,
                draft_id=draft.id,
                draft_version=draft.version,
                buttons=buttons
            )]

        # 3e. Reminder Skip ("Skip")
        elif action in ("reminder_skip", "rs"):
            if draft.version != claimed_version:
                curr_plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
                curr_tot = curr_plan.get("option_a", {}).get("grand_total", 0.0)
                rep = build_stale_rejection_reply(claimed_version, draft.version, curr_tot)
                bill_png = render_bill_image(draft.id, merchant_name, curr_plan, draft.payment_mode, draft.version)
                return [OutboundMessage(
                    recipient_id=inbound.sender_id,
                    display_text=rep.display_text,
                    speech_text=rep.speech_text,
                    image_bytes=bill_png,
                    draft_id=draft.id,
                    draft_version=draft.version,
                    buttons=[
                        ActionButton(label="✓ Updated Bill Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                        ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
                    ]
                )]

            disp = "Theek hai bhaiya, suggestions skip kar diye. Aap bill confirm kar sakte hain."
            buttons = [
                ActionButton(label="✓ Order Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="+ Kuch Aur Jodein", action="add_item", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✎ Quantity Badlein", action="edit", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
            ]
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=disp,
                speech_text="सुझाव छोड़ दिए गए हैं।",
                draft_id=draft.id,
                draft_version=draft.version,
                buttons=buttons
            )]

        # 3f. Dismiss Reminder Chip Click
        elif action in ("dismiss_reminder", "rd"):
            reminder_id = action_data.get("reminder_id") or action_data.get("rid")
            if reminder_id:
                dismiss(reminder_id, session)
            rep = build_reminder_removed_reply("Item")
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text
            )]

        # 3g. List Reminders Button Click
        elif action in ("list_reminders", "lr"):
            open_rems = list_open(inbound.merchant_id, session)
            rep = build_reminders_list_reply(open_rems)
            buttons = []
            for r in open_rems[:6]:
                buttons.append(ActionButton(
                    label=f"✗ {r.label_roman[:16]}",
                    action="dismiss_reminder",
                    payload={"reminder_id": r.id}
                ))
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text,
                buttons=buttons
            )]

        # 3h. Sample Order Button Click
        elif action in ("sample_order", "so"):
            utterance = "2 bori sugar aur 5 peti Parle-G bhej do"

        elif action in ("add_item", "edit"):
            disp = "Bhaiya, kaunsa item badalna ya jodna hai? Bas bol kar ya likh kar bataiye."
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=disp,
                speech_text="भैया, कौनसा आइटम जोड़ना या बदलना है? बोल कर बताइए।"
            )]

    # 4. Handle Utterance with NLU
    if not utterance:
        rep = build_clarification_reply("Aawaz saaf nahi aayi bhaiya, kripya dobara bolenge?")
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text
        )]

    # Load merchant's open reminders context for conversational disambiguation
    open_rems = list_open(inbound.merchant_id, session)
    open_rems_ctx = [{"id": r.id, "label": r.label_roman, "demand_count": r.demand_count} for r in open_rems[:10]]
    current_lines = json.loads(draft.lines_json) if draft.lines_json else []

    nlu_res: NluResult = parse_with_gemini(utterance, current_lines, open_reminders=open_rems_ctx)

    # 4a. Handle Spoken Confirmation
    if nlu_res.intent == "confirm":
        # Disambiguation: If NLU flagged clarification (e.g. no quoted draft: "Kaunsa order? Bill dobara bhejoon?")
        if nlu_res.needs_clarification:
            q = nlu_res.clarifying_question_hinglish or "Kaunsa order? Bill dobara bhejoon?"
            rep = build_clarification_reply(q)
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text
            )]

        # Safety Check: Voice confirm limit threshold
        curr_plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
        curr_tot = Decimal(str(curr_plan.get("option_a", {}).get("grand_total", 0.0)))
        voice_limit = merchant.voice_confirm_limit if merchant and merchant.voice_confirm_limit else Decimal("15000.00")

        if curr_tot > voice_limit:
            limit_msg = (
                f"Bhaiya, yeh order ₹{curr_tot:,.2f} ka hai jo voice limit (₹{voice_limit:,.2f}) se jyada hai. "
                f"Kripya suraksha ke liye neeche diye gaye button se confirm karein."
            )
            bill_png = render_bill_image(draft.id, merchant_name, curr_plan, draft.payment_mode, draft.version)
            buttons = [
                ActionButton(label="✓ Updated Bill Confirm Karein", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
            ]
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=limit_msg,
                speech_text="भैया, यह बड़ा आर्डर है। कृपया नीचे दिए बटन से कन्फर्म करें।",
                image_bytes=bill_png,
                draft_id=draft.id,
                draft_version=draft.version,
                buttons=buttons
            )]

        ok, order, msg = DraftManager.confirm_and_place_order(draft, draft.version, session, source="manual")
        if ok and order:
            rep = build_order_placed_reply(order.id, order.supplier_id, float(order.total_amount))
            session.add(MessageLog(
                channel=inbound.channel,
                external_message_id=inbound.message_id,
                sender_id=inbound.sender_id,
                transcript=utterance,
                parsed_json=nlu_res.model_dump_json(),
                response_summary=rep.display_text
            ))
            session.commit()
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text,
                order_id=order.id
            )]
        else:
            curr_plan = json.loads(draft.supplier_plan_json) if draft.supplier_plan_json else {}
            curr_tot = curr_plan.get("option_a", {}).get("grand_total", 0.0)
            rep = build_stale_rejection_reply(draft.version - 1, draft.version, curr_tot)
            bill_png = render_bill_image(draft.id, merchant_name, curr_plan, draft.payment_mode, draft.version)
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text,
                image_bytes=bill_png,
                draft_id=draft.id,
                draft_version=draft.version,
                buttons=[
                    ActionButton(label="✓ Confirm Order", action="confirm", payload={"draft_id": draft.id, "version": draft.version}),
                    ActionButton(label="✗ Cancel", action="cancel", payload={"draft_id": draft.id, "version": draft.version})
                ]
            )]

    # 4b. Handle Spoken Cancellation
    if nlu_res.intent == "cancel":
        DraftManager.cancel_draft(draft, session)
        rep = build_cancel_reply()
        session.add(MessageLog(
            channel=inbound.channel,
            external_message_id=inbound.message_id,
            sender_id=inbound.sender_id,
            transcript=utterance,
            parsed_json=nlu_res.model_dump_json(),
            response_summary=rep.display_text
        ))
        session.commit()
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text
        )]

    # 4c. Handle "Yaad Dila Dena" Remember Intent (remember_item)
    if nlu_res.intent == "remember_item":
        items_to_remember = nlu_res.reminder_items or nlu_res.items
        if not items_to_remember:
            rep = build_clarification_reply("Bhaiya, kaunsa item yaad rakhna hai? Bas naam batayein.")
            return [OutboundMessage(recipient_id=inbound.sender_id, display_text=rep.display_text, speech_text=rep.speech_text)]

        last_rem = None
        was_dup = False
        for it in items_to_remember:
            rem, was_dup = add_or_bump(inbound.merchant_id, it, session, source_message_id=inbound.message_id)
            last_rem = rem

        rep = build_reminder_saved_reply(last_rem.label_roman, was_dup, last_rem.demand_count)
        session.add(MessageLog(
            channel=inbound.channel,
            external_message_id=inbound.message_id,
            sender_id=inbound.sender_id,
            transcript=utterance,
            parsed_json=nlu_res.model_dump_json(),
            response_summary=rep.display_text
        ))
        session.commit()
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text
        )]

    # 4d. Handle Query Reminders List (list_reminders)
    if nlu_res.intent == "list_reminders":
        open_rems = list_open(inbound.merchant_id, session)
        rep = build_reminders_list_reply(open_rems)
        buttons = []
        for r in open_rems[:6]:
            buttons.append(ActionButton(
                label=f"✗ {r.label_roman[:16]}",
                action="dismiss_reminder",
                payload={"reminder_id": r.id}
            ))
        session.add(MessageLog(
            channel=inbound.channel,
            external_message_id=inbound.message_id,
            sender_id=inbound.sender_id,
            transcript=utterance,
            parsed_json=nlu_res.model_dump_json(),
            response_summary=rep.display_text
        ))
        session.commit()
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text,
            buttons=buttons
        )]

    # 4e. Handle Remove Reminder (remove_reminder: "list se hata do", "pyaaz list se hata do")
    if nlu_res.intent == "remove_reminder":
        items_to_remove = nlu_res.reminder_items or nlu_res.items
        target_name = items_to_remove[0].name_guess.strip() if items_to_remove and items_to_remove[0].name_guess else ""
        open_rems = list_open(inbound.merchant_id, session)
        removed_rem = None

        if target_name:
            for r in open_rems:
                if target_name.lower() in r.label_roman.lower() or r.label_roman.lower() in target_name.lower():
                    dismiss(r.id, session)
                    removed_rem = r
                    break
            if not removed_rem:
                m_sku = match_sku(target_name, session)
                if m_sku:
                    for r in open_rems:
                        if r.sku_id == m_sku.sku.id:
                            dismiss(r.id, session)
                            removed_rem = r
                            break
            if removed_rem:
                rep = build_reminder_removed_reply(removed_rem.label_roman)
            else:
                rep = build_clarification_reply(f"'{target_name}' reminder list mein nahi mila bhaiya.")
            buttons = []
        elif len(open_rems) == 1:
            # Single open reminder and generic "list se hata do"
            dismiss(open_rems[0].id, session)
            removed_rem = open_rems[0]
            rep = build_reminder_removed_reply(removed_rem.label_roman)
            buttons = []
        elif not open_rems:
            rep = build_clarification_reply("Aapki reminder list pehle se hi khali hai bhaiya.")
            buttons = []
        else:
            # Multiple reminders and no specific name given: show list with tap-to-remove chips
            rep = build_reminders_list_reply(open_rems)
            buttons = [ActionButton(label=f"✗ {r.label_roman[:16]}", action="dismiss_reminder", payload={"reminder_id": r.id}) for r in open_rems[:6]]
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text="Kaunsa item list se hatana hai bhaiya? Button daba kar ya naam bol kar batayein.\n\n" + rep.display_text,
                speech_text="कौनसा आइटम लिस्ट से हटाना है भैया? बटन दबाएं या नाम बताएं।",
                buttons=buttons
            )]

        session.add(MessageLog(
            channel=inbound.channel,
            external_message_id=inbound.message_id,
            sender_id=inbound.sender_id,
            transcript=utterance,
            parsed_json=nlu_res.model_dump_json(),
            response_summary=rep.display_text
        ))
        session.commit()
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text,
            buttons=buttons
        )]

    # 4e2. Handle Greeting Intent (/start, namaste, hello)
    if nlu_res.intent == "greeting":
        greeting_text = (
            "Namaste bhaiya! 🙏 Main aapka smart AI Munim hoon.\n\n"
            "Aap bol kar ya likh kar:\n"
            "• Wholesale order de sakte hain (jaise: '2 bori sugar aur 5 peti Parle-G bhej do')\n"
            "• Customer ki maangi cheezein yaad dila sakte hain (jaise: 'Chai yaad dila dena')\n\n"
            "Neeche diye buttons se shuru karein ya bas bol kar bataiye:"
        )
        buttons = [
            ActionButton(label="📋 Yaad Dila Dena List", action="list_reminders", payload={}),
            ActionButton(label="📦 Sample Order", action="sample_order", payload={})
        ]
        session.add(MessageLog(
            channel=inbound.channel,
            external_message_id=inbound.message_id,
            sender_id=inbound.sender_id,
            transcript=utterance,
            parsed_json=nlu_res.model_dump_json(),
            response_summary=greeting_text
        ))
        session.commit()
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=greeting_text,
            speech_text="नमस्ते भैया! मैं आपका स्मार्ट मुनीम हूँ। बोल कर आर्डर दें या याद दिला देना कहें।",
            buttons=buttons
        )]

    # 4f. Handle Clarification / Unclear Speech
    if nlu_res.needs_clarification or nlu_res.intent == "unclear" or not nlu_res.items:
        q = nlu_res.clarifying_question_hinglish or "Aawaz saaf nahi aayi bhaiya, kripya dobara bolenge?"
        rep = build_clarification_reply(q)
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text
        )]

    # 4g. Apply Entity Operations (new_order, add_items, change_quantity, remove_items)
    new_lines = list(current_lines) if nlu_res.intent in ("add_items", "change_quantity", "remove_items") else []
    has_pack_warning = False
    removed_item_names = []

    for item in nlu_res.items:
        match = match_sku(item.name_guess, session)
        if not match:
            # Check if this item matches any open reminder label
            matching_rem = None
            for r in open_rems:
                if item.name_guess.lower() in r.label_roman.lower() or r.label_roman.lower() in item.name_guess.lower():
                    matching_rem = r
                    break
            if matching_rem and matching_rem.sku_id:
                sku_obj = session.get(SKU, matching_rem.sku_id)
                if sku_obj:
                    match = type("Obj", (), {"sku": sku_obj})()

        # Handle remove_items specifically (supports SKU match or line name match)
        if nlu_res.intent == "remove_items":
            target_sku = match.sku.id if match else None
            matched_lines = []
            for l in list(new_lines):
                if (target_sku and l.get("sku_id") == target_sku) or (item.name_guess.lower() in l.get("name", "").lower() or l.get("name", "").lower() in item.name_guess.lower()):
                    matched_lines.append(l)
            if matched_lines:
                for ml in matched_lines:
                    if ml.get("reminder_id"):
                        unlink(ml["reminder_id"], session)
                    removed_item_names.append(ml.get("name", "Item"))
                    new_lines = [l for l in new_lines if l != ml]
                continue

        if not match:
            continue

        qty = Decimal(str(item.quantity)) if item.quantity is not None else Decimal("1.0")
        unit = normalize_unit(item.unit) or match.sku.standard_unit

        if requires_pack_confirmation(qty, unit):
            has_pack_warning = True

        if nlu_res.intent == "change_quantity":
            for l in new_lines:
                if l.get("sku_id") == match.sku.id:
                    l["quantity"] = float(qty)
                    if item.unit:
                        l["unit"] = unit
        else:  # new_order or add_items
            # Check if this item corresponds to an open reminder
            rem_linked_id = None
            for r in open_rems:
                if r.sku_id == match.sku.id:
                    link_to_draft(r.id, draft, session)
                    rem_linked_id = r.id
                    break

            existing = next((l for l in new_lines if l.get("sku_id") == match.sku.id), None)
            if existing:
                existing["quantity"] += float(qty)
                if rem_linked_id:
                    existing["reminder_id"] = rem_linked_id
            else:
                line_entry = {
                    "sku_id": match.sku.id,
                    "name": match.sku.name,
                    "quantity": float(qty),
                    "unit": unit
                }
                if rem_linked_id:
                    line_entry["reminder_id"] = rem_linked_id
                new_lines.append(line_entry)

    # If remove_items was executed
    if nlu_res.intent == "remove_items":
        if removed_item_names:
            if not new_lines:
                # All items removed from draft: cancel the draft
                DraftManager.cancel_draft(draft, session)
                disp_msg = f"{', '.join(removed_item_names)} bill se hata diya gaya. Ab bill mein koi item nahi hai."
                session.add(MessageLog(
                    channel=inbound.channel,
                    external_message_id=inbound.message_id,
                    sender_id=inbound.sender_id,
                    transcript=utterance,
                    parsed_json=nlu_res.model_dump_json(),
                    response_summary=disp_msg
                ))
                session.commit()
                return [OutboundMessage(
                    recipient_id=inbound.sender_id,
                    display_text=disp_msg,
                    speech_text=f"{', '.join(removed_item_names)} बिल से हटा दिया गया है।",
                    draft_id=draft.id,
                    draft_version=draft.version
                )]
        else:
            if not current_lines:
                rep = build_clarification_reply("Bill mein abhi koi item nahi hai bhaiya.")
            else:
                names = ", ".join(l.get("name", "item") for l in current_lines)
                rep = build_clarification_reply(f"'{nlu_res.items[0].name_guess if nlu_res.items else 'Item'}' bill mein nahi mila bhaiya. Bill mein ye items hain: {names}")
            return [OutboundMessage(
                recipient_id=inbound.sender_id,
                display_text=rep.display_text,
                speech_text=rep.speech_text
            )]

    if not new_lines:
        rep = build_clarification_reply("Koi grocery item match nahi hua bhaiya. Kripya item aur quantity batayein.")
        return [OutboundMessage(
            recipient_id=inbound.sender_id,
            display_text=rep.display_text,
            speech_text=rep.speech_text
        )]

    # Compute Pricing
    line_requests = [
        LineRequest(sku_id=l["sku_id"], quantity=Decimal(str(l["quantity"])), unit=l["unit"])
        for l in new_lines if l.get("sku_id") and l.get("sku_id") != "unlisted"
    ]
    payment_mode = nlu_res.payment_mode or draft.payment_mode or "cash"
    pricing = calculate_pricing(line_requests, payment_mode, session)

    # Update Draft State Machine
    draft = DraftManager.update_draft_lines(draft, new_lines, pricing, payment_mode, session)

    # Render Certified Bill PNG
    bill_png = render_bill_image(
        order_or_draft_id=draft.id,
        merchant_name=merchant_name,
        supplier_plan=pricing,
        payment_mode=payment_mode,
        version=draft.version
    )

    opt_a = pricing.get("option_a", {})
    supplier_name = opt_a.get("supplier_name", "APMC Wholesaler")
    grand_total = opt_a.get("grand_total", 0.0)

    # Build Bilingual Reply
    if nlu_res.intent == "remove_items" and removed_item_names:
        disp_text = f"{', '.join(removed_item_names)} bill se hata diya gaya. Naya bill: ₹{grand_total:,.2f}."
        speech_text = f"{', '.join(removed_item_names)} बिल से हटा दिया गया है।"
        rep = type("Reply", (), {"display_text": disp_text, "speech_text": speech_text})()
    else:
        rep = build_quote_reply(
            items_count=len(new_lines),
            supplier_name=supplier_name,
            total_amount=grand_total,
            is_credit=(payment_mode == "credit_7d"),
            has_pack_warning=has_pack_warning
        )

    # Generate suggestions for new_order or fresh drafts
    suggestions_obj = None
    if nlu_res.intent == "new_order":
        sug_rems = suggest_for(draft, session, max_items=5)
        if sug_rems:
            sug_items = [
                SuggestionItem(
                    reminder_id=sr.id,
                    label=sr.label_roman,
                    demand_count=sr.demand_count,
                    selected=False,
                    sku_id=sr.sku_id,
                    qty=float(sr.qty) if sr.qty else 1.0,
                    unit=sr.unit
                )
                for sr in sug_rems
            ]
            suggestions_obj = SuggestionSet(
                title="Yaad Dila Dena: Pichli baar ye maanga gaya tha",
                items=sug_items,
                actions=["add_all", "skip"],
                draft_id=draft.id,
                draft_version=draft.version
            )

    # Check Auto-Place Eligibility (Opt-in safe automatic placement)
    from app.core.autoplace import eligible_for_auto_place
    is_auto_eligible, auto_reasons = eligible_for_auto_place(
        draft=draft,
        merchant=merchant,
        session=session,
        nlu_confidence=nlu_res.overall_confidence,
        has_pack_warning=has_pack_warning,
        needs_clarification=nlu_res.needs_clarification
    )

    if is_auto_eligible:
        delay = merchant.auto_place_delay_seconds if merchant and merchant.auto_place_delay_seconds else 60
        draft.state = "AUTO_PENDING"
        draft.auto_place_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
        draft.confidence_score = nlu_res.overall_confidence
        session.add(draft)
        session.commit()
        session.refresh(draft)

        countdown_display = (
            f"{rep.display_text}\n\n"
            f"⏱ {delay} second mein order apne aap place ho jayega. Rokna ho to Cancel dabayein ya 'ruko' bolein."
        )
        countdown_speech = f"{rep.speech_text} {delay} सेकंड में आर्डर अपने आप प्लेस हो जायेगा।"

        buttons = [
            ActionButton(
                label="⚡ Abhi Place Karo",
                action="auto_place_now",
                payload={"draft_id": draft.id, "version": draft.version}
            ),
            ActionButton(
                label="✗ Cancel",
                action="cancel",
                payload={"draft_id": draft.id, "version": draft.version}
            ),
            ActionButton(
                label="✎ Edit",
                action="edit",
                payload={"draft_id": draft.id, "version": draft.version}
            )
        ]
        out_display = countdown_display
        out_speech = countdown_speech
    else:
        logger.info(f"Draft {draft.id} not eligible for auto-place. Reasons: {auto_reasons}")
        out_display = rep.display_text
        out_speech = rep.speech_text
        buttons = [
            ActionButton(
                label="✓ Order Confirm Karein",
                action="confirm",
                payload={"draft_id": draft.id, "version": draft.version}
            ),
            ActionButton(
                label="+ Kuch Aur Jodein",
                action="add_item",
                payload={"draft_id": draft.id, "version": draft.version}
            ),
            ActionButton(
                label="✎ Quantity Badlein",
                action="edit",
                payload={"draft_id": draft.id, "version": draft.version}
            ),
            ActionButton(
                label="✗ Cancel",
                action="cancel",
                payload={"draft_id": draft.id, "version": draft.version}
            )
        ]

    # Log to MessageLog
    session.add(MessageLog(
        channel=inbound.channel,
        external_message_id=inbound.message_id,
        sender_id=inbound.sender_id,
        transcript=utterance,
        parsed_json=nlu_res.model_dump_json(),
        response_summary=out_display
    ))
    session.commit()

    return [OutboundMessage(
        recipient_id=inbound.sender_id,
        display_text=out_display,
        speech_text=out_speech,
        image_bytes=bill_png,
        suggestions=suggestions_obj,
        draft_id=draft.id,
        draft_version=draft.version,
        buttons=buttons
    )]
