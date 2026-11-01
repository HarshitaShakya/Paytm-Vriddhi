import os
import re
import json
import logging
import yaml
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from app.core.units import parse_quantity, normalize_unit

logger = logging.getLogger(__name__)

PROMPT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "nlu_system.md")
if not os.path.exists(PROMPT_FILE):
    # Try alternate root-level prompts
    PROMPT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "prompts", "nlu_system.md")

class ParsedItem(BaseModel):
    raw_phrase: str
    name_guess: str
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    spoken_qty_word: Optional[str] = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)

class NluResult(BaseModel):
    transcript_roman: str
    detected_language: Literal["hi", "en", "hinglish", "other"] = "hinglish"
    intent: Literal[
        "new_order", "add_items", "remove_items", "change_quantity",
        "replace_item", "change_supplier", "set_payment_mode",
        "confirm", "cancel", "ask_price", "repeat_last_order",
        "status", "greeting", "remember_item", "list_reminders", "remove_reminder", "unclear"
    ] = "new_order"
    items: List[ParsedItem] = []
    reminder_items: List[ParsedItem] = []
    supplier_mention: Optional[str] = None
    payment_mode: Optional[Literal["cash", "credit_7d"]] = None
    needs_clarification: bool = False
    clarifying_question_hinglish: Optional[str] = None
    overall_confidence: float = Field(default=0.9, ge=0.0, le=1.0)

def load_system_prompt() -> str:
    if os.path.exists(PROMPT_FILE):
        with open(PROMPT_FILE, "r", encoding="utf-8") as f:
            return f.read()
    return "You are Munim, an Indian kirana procurement assistant. Return strict JSON."

CONFIRM_PHRASES_FILE = os.path.join(os.path.dirname(__file__), "confirm_phrases.yaml")
_CONFIRM_PHRASES = None

def get_confirm_phrases() -> List[str]:
    global _CONFIRM_PHRASES
    if _CONFIRM_PHRASES is None:
        if os.path.exists(CONFIRM_PHRASES_FILE):
            try:
                with open(CONFIRM_PHRASES_FILE, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    _CONFIRM_PHRASES = data.get("confirm_phrases", [])
            except Exception:
                _CONFIRM_PHRASES = []
        if not _CONFIRM_PHRASES:
            _CONFIRM_PHRASES = [
                "order kar do", "order place kar do", "place kar do", "kar do",
                "haan", "ha", "theek hai", "ok", "confirm", "bhej do",
                "haan bhej do", "theek hai bhej do", "pakka karo", "chalega"
            ]
    return _CONFIRM_PHRASES

# ─────────────────────────────────────────────────────────────────────────────
# DETERMINISTIC FALLBACK PARSER (Zero-Cost / Offline / CI Engine)
# ─────────────────────────────────────────────────────────────────────────────
KNOWN_SUPPLIERS = [
    ("Shree Ganesh Foods", ["shree ganesh foods", "shree ganesh", "ganesh foods"]),
    ("Raj Traders", ["raj traders", "raj trader", "raj"]),
    ("Malwa Fresh Co.", ["malwa fresh co", "malwa fresh", "malwa"])
]

def fallback_parse(
    utterance: str,
    current_draft_items: Optional[List[Dict[str, Any]]] = None,
    open_reminders: Optional[List[Dict[str, Any]]] = None
) -> NluResult:
    """
    Deterministic regex/rule-based fallback parser that mimics the Gemini NLU contract
    for offline environments, CI tests, or API rate-limit resilience.
    """
    clean = utterance.strip()
    lower = clean.lower()

    # 0. Check Start / Greeting / Help commands
    if lower.startswith("/") or lower in ("start", "help") or re.search(r'^(namaste|namaskar|ram ram|hello|hi|hey|pranam|नमस्ते|प्रणाम|राम राम)\b', lower):
        return NluResult(
            transcript_roman=clean,
            detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
            intent="greeting",
            items=[],
            reminder_items=[],
            supplier_mention=None,
            payment_mode=None,
            overall_confidence=0.98
        )

    # 1. Check Supplier mention
    supplier_found = None
    for canonical_name, aliases in KNOWN_SUPPLIERS:
        for al in aliases:
            if re.search(r'\b' + re.escape(al) + r'\b', lower):
                supplier_found = canonical_name
                break
        if supplier_found:
            break

    # 2. Check Payment Mode
    payment_mode = None
    if re.search(r'\b(udhari|udhaar|credit|7 day|7 din|baad mein)\b', lower):
        payment_mode = "credit_7d"
    elif re.search(r'\b(cash|rokad|nagad|cod)\b', lower):
        payment_mode = "cash"

    # 2b. Check List Reminders Query (Roman & Devanagari)
    if re.search(r'(reminder\s*list|list\s*reminder|yaad\s*ki\s*list|yaad\s*dila\s*dena\s*list|kya\s*yaad|kya\s*note|kya\s*likha|dikhao.*reminder|batao.*reminder|reminder.*dikhao|list.*reminder|'
                 r'याद\s*दिलाने\s*वाले|रिमाइंडर\s*लिस्ट|रिमाइंडर|क्या\s*याद|क्या\s*नोट|लिस्ट\s*दिखाओ|दिखाओ.*लिस्ट)', lower):
        return NluResult(
            transcript_roman=clean,
            detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
            intent="list_reminders",
            items=[],
            reminder_items=[],
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.98
        )

    # 2c. Check Remove Reminder ("chai list se hata do", "list se chai hata do", "list se hata do", "लिस्ट से हटा दो")
    is_list_remove = bool(re.search(
        r'(?:list\s*(?:se|mein\s*se)|reminder\s*(?:se|mein\s*se)|लिस्ट\s*(?:से|में\s*से)|रिमाइंडर\s*(?:से|में\s*से)|yaad\s*mat\s*rakh|याद\s*मत\s*रख)',
        lower
    )) and bool(re.search(
        r'(?:hata|nikal|delete|remove|clear|हटा|निकाल|डिलीट)',
        lower
    ))
    if is_list_remove:
        clean_target = re.sub(
            r'(?:list\s*(?:se|mein\s*se)|reminder\s*(?:se|mein\s*se)|लिस्ट\s*(?:से|में\s*से)|रिमाइंडर\s*(?:से|में\s*से)|yaad\s*mat\s*rakh|याद\s*मत\s*रख|hata\s*do|nikal\s*do|delete\s*kar\s*do|remove\s*kar\s*do|हटा\s*दो|निकाल\s*दो|हटाओ|निकालो|hata|nikal|delete|remove|bhaiya|aur|please|ye|yeh|wo|woh|wali|ko|kripya|कृपया|भैया|प्लीज|ये|यह|वो|वह|को)',
            ' ',
            clean,
            flags=re.IGNORECASE
        ).strip()
        clean_target = re.sub(r'\s+', ' ', clean_target).strip()
        
        reminder_items = []
        if clean_target:
            reminder_items = [ParsedItem(raw_phrase=clean_target, name_guess=clean_target, confidence=0.95)]
        return NluResult(
            transcript_roman=clean,
            detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
            intent="remove_reminder",
            items=[],
            reminder_items=reminder_items,
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.95
        )

    # 2d. Check Remember Intent (Roman Hinglish & Devanagari Hindi)
    # e.g. "chai yaad dila dena", "मुझे प्याज याद दिला देना", "मुझे आलू याद दिला देना अगली बार में कुछ भी ऑर्डर", "atta note kar lo"
    is_remember = bool(re.search(
        r'(yaad\s*dila\s*dena|yaad\s*dila\s*do|yaad\s*dila|yaad\s*rakhna|yaad\s*rakh|yaad\s*karwana|note\s*kar\s*lo|note\s*karna|note\s*kar|likh\s*lo|likh\s*lena|agli\s*baar|next\s*order|agle\s*order|customer\s*maang|grahak\s*maang|list\s*mein\s*daal|remind|'
        r'याद\s*दिला\s*देना|याद\s*दिला\s*दो|याद\s*दिलाना|याद\s*दिला\s*दीजिए|याद\s*दिला|याद\s*रखना|याद\s*रखो|याद\s*रखिएगा|नोट\s*कर\s*लो|नोट\s*करो|नोट\s*कर\s*लीजिए|लिख\s*लो|लिख\s*लेना|लिख\s*लीजिए|अगली\s*बार|अगले\s*आर्डर|कस्टमर\s*मांग|ग्राहक\s*मांग|लिस्ट\s*में\s*डाल|याद)',
        lower
    ))
    if is_remember:
        # Strip remember trigger phrases and common conversational filler
        clean_item_str = re.sub(
            r'(yaad\s*dila\s*dena|yaad\s*dila\s*do|yaad\s*dila|yaad\s*rakhna|yaad\s*rakh\s*lo|yaad\s*karwana|note\s*kar\s*lo|note\s*karna|note\s*kar\s*lena|likh\s*lo|likh\s*lena|agli\s*baar\s*mein\s*kuch\s*bhi\s*order|agli\s*baar\s*mangwana|agli\s*baar\s*yaad|next\s*order\s*mein|agle\s*order\s*mein|customer\s*maang\s*raha\s*tha|grahak\s*maang\s*raha\s*tha|list\s*mein\s*daal\s*do|list\s*mein\s*likh\s*lo|list\s*mein|kuch\s*bhi\s*order|bhi|aur|bhaiya|please|ye\s*wali|yeh\s*wali|wo\s*wali|woh\s*wali|mujhe|hume|'
            r'याद\s*दिला\s*देना|याद\s*दिला\s*दो|याद\s*दिलाना|याद\s*दिला|याद\s*रखना|याद\s*रखो|याद\s*रखिएगा|नोट\s*कर\s*लो|नोट\s*करो|लिख\s*लो|लिख\s*लेना|अगली\s*बार\s*में\s*कुछ\s*भी\s*ऑर्डर|अगली\s*बार\s*में|अगली\s*बार|अगले\s*आर्डर\s*में|अगले\s*आर्डर|कुछ\s*भी\s*ऑर्डर|ऑर्डर|मुझे|हमे|कृपया|भैया|प्लीज|भी|और|ये|यह|वो|वह)',
            ' ',
            clean,
            flags=re.IGNORECASE
        ).strip()
        clean_item_str = re.sub(r'\s+', ' ', clean_item_str).strip()

        # Check if qty & unit present in clean_item_str, e.g. "5 packet maggi", "2 peti parle-g"
        qty_unit_match = re.search(r'(\d+(?:\.\d+)?|aadha|dedh|dhai|sava|paune|ek|do|teen|chaar|paanch|chhe|saat|aath|nau|das)\s+([a-zA-Z\u0900-\u097F]+)\s+(.+)', clean_item_str)
        if qty_unit_match:
            q_str = qty_unit_match.group(1).strip()
            u_str = qty_unit_match.group(2).strip()
            p_name = qty_unit_match.group(3).strip()
            qty_val, raw_num = parse_quantity(q_str)
            norm_u = normalize_unit(u_str) or u_str
            p_item = ParsedItem(
                raw_phrase=clean_item_str,
                name_guess=p_name,
                quantity=float(qty_val) if qty_val else None,
                unit=norm_u,
                spoken_qty_word=raw_num or q_str,
                confidence=0.95
            )
        else:
            p_name = clean_item_str.strip() or "grocery item"
            p_item = ParsedItem(
                raw_phrase=clean_item_str or clean,
                name_guess=p_name,
                confidence=0.95
            )
        return NluResult(
            transcript_roman=clean,
            detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
            intent="remember_item",
            items=[],
            reminder_items=[p_item],
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.95
        )

    # 2e. Check Contextual Reminder selection ("wo chai add kar do", "wo atta jod do")
    rem_select_match = re.search(r'(?:wo|woh|wohi)\s+([a-zA-Z\u0900-\u097F\s]+?)\s+(?:add\s*kar\s*do|daal\s*do|jod\s*do|shamil\s*karo)', lower)
    if rem_select_match:
        target_name = rem_select_match.group(1).strip()
        target_name = re.sub(r'\b(wali|bhaiya|aur|please)\b', '', target_name).strip()
        resolved_name = target_name
        if open_reminders:
            for r in open_reminders:
                lbl = r.get("label", "")
                if target_name in lbl.lower() or lbl.lower() in target_name:
                    resolved_name = lbl
                    break
        return NluResult(
            transcript_roman=clean,
            detected_language="hinglish",
            intent="add_items",
            items=[ParsedItem(raw_phrase=f"wo {target_name}", name_guess=resolved_name, quantity=1.0, confidence=0.95)],
            reminder_items=[],
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.95
        )

    # 3. Check Explicit Confirmations (YAML-backed phrases + item disambiguation)
    confirm_phrases = get_confirm_phrases()
    is_confirm_phrase = any(cp in lower for cp in confirm_phrases) or bool(re.search(r'\b(haan|ha|theek hai|thik hai|ok|confirm|chalega|हाँ|हा|ठीक है|कर दो)\b', lower))
    if is_confirm_phrase and not any(k in lower for k in ["hata", "badha", "badha do", "change", "cancel", "ruko", "yaad", "note", "likh"]):
        # Disambiguation: if the utterance contains items -> new_order/add_items (never confirm)
        has_commodity = bool(re.search(r'\b(oil|tel|chini|dal|pyaaz|aloo|chai|atta|namak|doodh|sabun|maggi|biscuit|चीनी|दाल|तेल|प्याज|आलू|चाय|आटा|नमक)\b', lower))
        has_qty_unit = bool(re.search(r'(\d+(?:\.\d+)?|aadha|dedh|dhai|sava|paune|\b(ek|do|teen|chaar|paanch|chhe|saat|aath|nau|das)\b)\s+(peti|katta|bori|kg|kilo|packet|dabba|litre|लीटर|किलो|बोरी|कट्टा|पेटी|पैकेट)', lower))
        has_items = has_commodity or has_qty_unit
        if not has_items:
            # If no items AND a QUOTED draft exists AND overall_confidence >= 0.85 -> confirm
            if current_draft_items and len(current_draft_items) > 0:
                return NluResult(
                    transcript_roman=clean,
                    detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
                    intent="confirm",
                    items=[],
                    supplier_mention=supplier_found,
                    payment_mode=payment_mode,
                    overall_confidence=0.98
                )
            else:
                # If no QUOTED draft -> ask "Kaunsa order? Bill dobara bhejoon?"
                return NluResult(
                    transcript_roman=clean,
                    detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
                    intent="confirm",
                    items=[],
                    needs_clarification=True,
                    clarifying_question_hinglish="Kaunsa order? Bill dobara bhejoon?",
                    supplier_mention=supplier_found,
                    payment_mode=payment_mode,
                    overall_confidence=0.95
                )

    # 4. Check Explicit Cancellations
    if re.search(r'\b(ruko|cancel|mat bhejo|rehne do|band karo|nahi chahiye|रुको|कैंसिल|रहने दो|मत भेजो)\b', lower):
        return NluResult(
            transcript_roman=clean,
            detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
            intent="cancel",
            items=[],
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.98
        )

    # 5. Check Contextual Item Removal from Bill ("tel hata do", "pyaaz hata do", "bill se chini nikal do", "hata do")
    is_bill_remove = bool(re.search(
        r'(?:hata\s*do|nikal\s*do|remove\s*kar\s*do|delete\s*kar\s*do|hatao|nikalo|mat\s*bhejo|हटा\s*दो|निकाल\s*दो|हटाओ|निकालो|मत\s*भेजो)',
        lower
    ))
    if is_bill_remove and not is_list_remove:
        clean_bill_target = re.sub(
            r'(?:bill\s*(?:se|mein\s*se)|बिल\s*(?:से|में\s*से)|hata\s*do|nikal\s*do|remove\s*kar\s*do|delete\s*kar\s*do|hatao|nikalo|mat\s*bhejo|हटा\s*दो|निकाल\s*दो|हटाओ|निकालो|मत\s*भेजो|bhaiya|aur|please|ye|yeh|wo|woh|wali|ko|kripya|कृपया|भैया|प्लीज|ये|यह|वो|वह|को)',
            ' ',
            clean,
            flags=re.IGNORECASE
        ).strip()
        clean_bill_target = re.sub(r'\s+', ' ', clean_bill_target).strip()

        items = []
        if clean_bill_target:
            items = [ParsedItem(raw_phrase=clean_bill_target, name_guess=clean_bill_target, confidence=0.95)]
        elif current_draft_items and len(current_draft_items) == 1:
            name = current_draft_items[0].get('name') or current_draft_items[0].get('name_guess', '')
            items = [ParsedItem(raw_phrase="hata do", name_guess=name, confidence=0.95)]

        return NluResult(
            transcript_roman=clean,
            detected_language="hi" if re.search(r'[\u0900-\u097F]', clean) else "hinglish",
            intent="remove_items",
            items=items,
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.95
        )

    # 6. Check Contextual Quantity Change ("chini 2 katta kar do")
    is_order_intent = bool(re.search(r'\b(order\s*kar\s*do|order\s*place|order\s*karo|mangwa\s*do|bhej\s*do)\b', lower))
    change_match = None
    if not is_order_intent:
        change_match = re.search(r'([a-zA-Z\s]+?)\s+(\d+(?:\.\d+)?|aadha|dedh|derh|dhai|sava|paune|\b(?:ek|do|teen|chaar|char|paanch|chhe|saat|aath|nau|das|bees)\b)\s+([a-zA-Z]+)?\s*(?:kar\s*do|karo|rakho)', lower)
    if change_match:
        prod_name = change_match.group(1).strip()
        qty_str = change_match.group(2).strip()
        unit_str = change_match.group(3).strip() if change_match.group(3) else None
        
        qty_val, raw_num = parse_quantity(qty_str)
        norm_u = normalize_unit(unit_str) if unit_str else None
        
        return NluResult(
            transcript_roman=clean,
            detected_language="hinglish",
            intent="change_quantity",
            items=[ParsedItem(
                raw_phrase=f"{prod_name} {qty_str} {unit_str or ''}".strip(),
                name_guess=prod_name,
                quantity=float(qty_val) if qty_val else None,
                unit=norm_u,
                spoken_qty_word=raw_num or qty_str,
                confidence=0.95
            )],
            supplier_mention=supplier_found,
            payment_mode=payment_mode,
            overall_confidence=0.95
        )

    # 7. Standard Multi-item Order Extraction
    # Normalize homophones
    normalized_text = clean
    homophone_map = [
        (r'\bpetty\b', 'peti'),
        (r'\bcutter\b', 'katta'),
        (r'\bcutters\b', 'katta')
    ]
    for pattern, rep in homophone_map:
        normalized_text = re.sub(pattern, rep, normalized_text, flags=re.IGNORECASE)

    # Split on clauses ("aur", "and", "evam", "tatha", "और", ",")
    segments = re.split(r'\b(?:aur|and|evam|tatha|,)\b|(?:\s+और\s+|\s+तथा\s+|\s+एवं\s+|,)', normalized_text, flags=re.IGNORECASE)
    items: List[ParsedItem] = []

    qty_regex = r'(\d+(?:\.\d+)?|aadha|dedh|derh|dhai|sava|paune|ek|do|teen|chaar|char|paanch|chhe|saat|aath|nau|das|bees|आधा|डेढ़|ढाई|सवा|पौन|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|बीस)'

    for seg in segments:
        s = seg.strip()
        if not s:
            continue
        
        # Remove conversational filler words (Hinglish + Devanagari)
        s_clean = re.sub(
            r'\b(bhaiya|order\s*place\s*kar\s*do|order\s*kar\s*do|order\s*karo|place\s*kar\s*do|mangwa\s*do|bhej\s*do|chahiye|de\s*do|kar\s*do|hume|humko|please|udhari\s*par|cash\s*par|se)\b|(?:\bभैया\b|\bभेज\s*दो\b|\bऑर्डर\s*कर\s*दो\b|\bमंगवा\s*दो\b|\bचाहिए\b|\bदे\s*दो\b|\bकर\s*दो\b|\bकृपया\b)',
            '',
            s,
            flags=re.IGNORECASE
        ).strip()
        if not s_clean:
            continue

        # Pattern A: Quantity + Unit + Item (e.g. "4 peti Bail Kolhu tel", "5 किलो आलू", "10 kg aloo")
        match = re.search(rf'{qty_regex}\s+([a-zA-Z\u0900-\u097F]+)\s+(.+)', s_clean, re.IGNORECASE)
        if match:
            qty_word, unit_candidate, prod_name = match.groups()
            qty_val, _ = parse_quantity(qty_word)
            norm_unit = normalize_unit(unit_candidate)
            brand = "Bail Kolhu" if "bail kolhu" in prod_name.lower() or "बैल कोल्हू" in prod_name else ("Tata" if "tata" in prod_name.lower() or "टाटा" in prod_name else None)
            
            items.append(ParsedItem(
                raw_phrase=s_clean,
                name_guess=prod_name.strip(),
                brand=brand,
                quantity=float(qty_val) if qty_val is not None else 1.0,
                unit=norm_unit,
                spoken_qty_word=qty_word,
                confidence=0.95
            ))
            continue

        # Pattern B: Item + Quantity + Unit (e.g. "tel 4 peti", "chini 2 katta", "आलू 5 किलो")
        match_rev = re.search(rf'(.+?)\s+{qty_regex}\s+([a-zA-Z\u0900-\u097F]+)', s_clean, re.IGNORECASE)
        if match_rev:
            prod_name, qty_word, unit_candidate = match_rev.groups()
            qty_val, _ = parse_quantity(qty_word)
            norm_unit = normalize_unit(unit_candidate)
            brand = "Bail Kolhu" if "bail kolhu" in prod_name.lower() or "बैल कोल्हू" in prod_name else ("Tata" if "tata" in prod_name.lower() or "टाटा" in prod_name else None)
            
            items.append(ParsedItem(
                raw_phrase=s_clean,
                name_guess=prod_name.strip(),
                brand=brand,
                quantity=float(qty_val) if qty_val is not None else 1.0,
                unit=norm_unit,
                spoken_qty_word=qty_word,
                confidence=0.95
            ))
            continue

        # Pattern C: Quantity + Item without unit (e.g. "5 aloo", "10 pyaaz", "5 आलू", "10 प्याज")
        match_c = re.search(rf'{qty_regex}\s+(.+)', s_clean, re.IGNORECASE)
        if match_c:
            qty_word, prod_name = match_c.groups()
            qty_val, _ = parse_quantity(qty_word)
            brand = "Bail Kolhu" if "bail kolhu" in prod_name.lower() or "बैल कोल्हू" in prod_name else ("Tata" if "tata" in prod_name.lower() or "टाटा" in prod_name else None)
            items.append(ParsedItem(
                raw_phrase=s_clean,
                name_guess=prod_name.strip(),
                brand=brand,
                quantity=float(qty_val) if qty_val is not None else 1.0,
                unit=None,
                spoken_qty_word=qty_word,
                confidence=0.90
            ))
            continue

        # Pattern D: Single item name alone (e.g. "chai" after "chai bhej do", "sugar", "atta")
        if (
            s_clean
            and not s_clean.startswith("/")
            and len(s_clean) >= 2
            and not any(k in s_clean.lower() for k in ["theek", "shree", "raj", "malwa", "start", "help", "cancel", "confirm"])
        ):
            items.append(ParsedItem(
                raw_phrase=s_clean,
                name_guess=s_clean,
                quantity=1.0,
                confidence=0.90
            ))
            continue

    return NluResult(
        transcript_roman=clean,
        detected_language="hinglish",
        intent="new_order" if items else "unclear",
        items=items,
        supplier_mention=supplier_found,
        payment_mode=payment_mode,
        needs_clarification=(len(items) == 0 and not supplier_found),
        clarifying_question_hinglish="Bhaiya, kaunsa item aur kitni quantity chahiye?" if not items else None,
        overall_confidence=0.95 if items else 0.5
    )

# ─────────────────────────────────────────────────────────────────────────────
# GEMINI API CALL WITH STRUCTURED OUTPUT & FALLBACK
# ─────────────────────────────────────────────────────────────────────────────
def parse_with_gemini(
    utterance: str,
    current_draft_items: Optional[List[Dict[str, Any]]] = None,
    open_reminders: Optional[List[Dict[str, Any]]] = None
) -> NluResult:
    """
    Calls Gemini API with temperature: 0 and strict JSON schema output.
    Gracefully falls back to fallback_parse on error, rate-limit, or missing key.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model_name = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash").strip()

    # If no real API key configured, use high-speed deterministic fallback
    if not api_key or api_key.startswith("your_") or api_key == "dummy":
        return fallback_parse(utterance, current_draft_items, open_reminders)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key, transport="rest")

        system_instruction = load_system_prompt()
        context_str = ""
        if current_draft_items:
            context_str += f"\nCURRENT_DRAFT_ITEMS: {json.dumps(current_draft_items)}\n"
        if open_reminders:
            context_str += f"\nOPEN_REMINDERS: {json.dumps(open_reminders)}\n"

        prompt = f"{context_str}Shopkeeper Utterance: \"{utterance}\"\nReturn ONLY the JSON object conforming to the NluResult schema."

        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_instruction,
            generation_config={
                "temperature": 0.0,
                "response_mime_type": "application/json"
            }
        )

        response = model.generate_content(prompt, request_options={"timeout": 5.0})
        text = response.text.strip()
        
        # Clean any accidental markdown codeblock wrappers
        if text.startswith("```"):
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)

        data = json.loads(text)
        res = NluResult(**data)

        # Code Invariant: If intent is confirm without draft -> enforce clarification
        if res.intent == "confirm" and not (current_draft_items and len(current_draft_items) > 0):
            res.needs_clarification = True
            if not res.clarifying_question_hinglish:
                res.clarifying_question_hinglish = "Kaunsa order? Bill dobara bhejoon?"

        return res

    except Exception as e:
        logger.warning(f"Gemini API parse failed ({e}), switching to deterministic fallback.")
        return fallback_parse(utterance, current_draft_items, open_reminders)

