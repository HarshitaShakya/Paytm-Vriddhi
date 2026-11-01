import re
from typing import Dict, Any, Optional

HINDI_NUMS = {
    0: "शून्य", 1: "एक", 2: "दो", 3: "तीन", 4: "चार", 5: "पाँच", 6: "छह", 7: "सात", 8: "आठ", 9: "नौ", 10: "दस",
    11: "ग्यारह", 12: "बारह", 13: "तेरह", 14: "चौदह", 15: "पंद्रह", 16: "सोलह", 17: "सत्रह", 18: "अठारह", 19: "उन्नीस",
    20: "बीस", 21: "इक्कीस", 22: "बाईस", 23: "तेईस", 24: "चौबीस", 25: "पच्चीस", 26: "छब्बीस", 27: "सत्ताईस", 28: "अट्ठाईस", 29: "उनतीस",
    30: "तीस", 31: "इकत्तीस", 32: "बत्तीस", 33: "तैंतीस", 34: "चौंतीस", 35: "पैंतीस", 36: "छत्तीस", 37: "सैंतीस", 38: "अड़तीस", 39: "उनतालीस",
    40: "चालीस", 41: "इकतालीस", 42: "बयालीस", 43: "तैंतालीस", 44: "चौवालीस", 45: "पैंतालीस", 46: "छियालीस", 47: "सैंतालीस", 48: "अड़तालीस", 49: "उनचास",
    50: "पचास", 51: "इक्यावन", 52: "बावन", 53: "तिरपन", 54: "चौवन", 55: "पचपन", 56: "छप्पन", 57: "सत्तावन", 58: "अट्ठावन", 59: "उनसठ",
    60: "साठ", 61: "इकसठ", 62: "बासठ", 63: "तिरसठ", 64: "चौंसठ", 65: "पैंसठ", 66: "छियासठ", 67: "सरसठ", 68: "अड़सठ", 69: "उनहत्तर",
    70: "सत्तर", 71: "इकहत्तर", 72: "बहत्तर", 73: "तिहत्तर", 74: "चौहत्तर", 75: "पचहत्तर", 76: "छिहत्तर", 77: "सतहत्तर", 78: "अठहत्तर", 79: "उनासी",
    80: "अस्सी", 81: "इक्यासी", 82: "बयासी", 83: "तिरासी", 84: "चौरासी", 85: "पचासी", 86: "छियासी", 87: "सत्तासी", 88: "अट्ठासी", 89: "नवासी",
    90: "नब्बे", 91: "इक्यानवे", 92: "बानवे", 93: "तिरानवे", 94: "चौरानवे", 95: "पंचानवे", 96: "छियानवे", 97: "सत्तानवे", 98: "अट्ठानवे", 99: "निन्यानवे"
}

def number_to_hindi_words(num: int) -> str:
    """Converts numbers up to 10 lakhs into proper natural Hindi speech words."""
    if num in HINDI_NUMS:
        return HINDI_NUMS[num]

    res = []
    
    # Lakhs
    if num >= 100000:
        lakhs = num // 100000
        res.append(f"{HINDI_NUMS.get(lakhs, str(lakhs))} लाख")
        num %= 100000

    # Thousands
    if num >= 1000:
        thousands = num // 1000
        res.append(f"{HINDI_NUMS.get(thousands, str(thousands))} हज़ार")
        num %= 1000

    # Hundreds
    if num >= 100:
        hundreds = num // 100
        res.append(f"{HINDI_NUMS.get(hundreds, str(hundreds))} सौ")
        num %= 100

    if num > 0:
        res.append(HINDI_NUMS.get(num, str(num)))

    return " ".join(res)

class ReplyPackage:
    def __init__(self, display_text: str, speech_text: str):
        self.display_text = display_text
        self.speech_text = speech_text

    def to_dict(self) -> Dict[str, str]:
        return {
            "display_text": self.display_text,
            "speech_text": self.speech_text
        }

def build_quote_reply(
    items_count: int,
    supplier_name: str,
    total_amount: float,
    savings: float = 0.0,
    is_credit: bool = False,
    has_pack_warning: bool = False
) -> ReplyPackage:
    int_amt = int(round(total_amount))
    amt_words = number_to_hindi_words(int_amt)
    pay_mode_str = " (7-Day Credit)" if is_credit else ""
    
    # Display Text (clean Roman Hinglish)
    warning_note = " (Dhyan dein: khuli peti/bori ka rate check karein)." if has_pack_warning else ""
    disp = (
        f"Bhaiya, aapka {items_count} items ka draft bill taiyar hai. "
        f"Sabse badiya rate {supplier_name} se mila hai: Total ₹{total_amount:,.2f}{pay_mode_str}. "
        f"Confirm karein ya kuch badalna hai?{warning_note}"
    )

    # Speech Text (Devanagari for Hindi words; under 15 seconds)
    speech = (
        f"भैया, आपका {items_count} आइटम का बिल तैयार है। "
        f"सबसे अच्छा भाव {supplier_name} से मिला है। कुल {amt_words} रुपये। "
        f"क्या आर्डर कन्फर्म कर दें?"
    )

    return ReplyPackage(display_text=disp, speech_text=speech)

def build_order_placed_reply(order_id: str, supplier_name: str, total_amount: float) -> ReplyPackage:
    int_amt = int(round(total_amount))
    amt_words = number_to_hindi_words(int_amt)

    disp = (
        f"Badhai ho! Aapka order #{order_id} safalta se {supplier_name} ko bhej diya gaya hai "
        f"(Total: ₹{total_amount:,.2f}). Wholesaler ko notification chala gaya hai."
    )

    speech = (
        f"बधाई हो भैया! आपका आर्डर {supplier_name} को भेज दिया गया है। "
        f"कुल {amt_words} रुपये। माल जल्द ही रवाना होगा।"
    )

    return ReplyPackage(display_text=disp, speech_text=speech)

def build_stale_rejection_reply(old_version: int, current_version: int, current_total: float) -> ReplyPackage:
    int_amt = int(round(current_total))
    amt_words = number_to_hindi_words(int_amt)

    disp = (
        f"Bhaiya, aapke draft mein badlav hue the (v{old_version} se v{current_version}). "
        f"Naya total ₹{current_total:,.2f} hai. Kripya naye bill ko confirm karein."
    )

    speech = (
        f"भैया, आर्डर में बदलाव हुआ था। नया कुल {amt_words} रुपये है। "
        f"कृपया नए बिल को देखकर कन्फर्म करें।"
    )

    return ReplyPackage(display_text=disp, speech_text=speech)

def build_cancel_reply() -> ReplyPackage:
    disp = "Theek hai bhaiya, order draft cancel kar diya gaya hai. Jab bhi zaroorat ho, bas aawaz dein."
    speech = "ठीक है भैया, आर्डर कैंसिल कर दिया गया है। जब भी जरूरत हो, बस बोल दीजिएगा।"
    return ReplyPackage(display_text=disp, speech_text=speech)

def build_clarification_reply(question_hinglish: str) -> ReplyPackage:
    disp = question_hinglish
    speech = question_hinglish
    return ReplyPackage(display_text=disp, speech_text=speech)

def build_reminder_saved_reply(label: str, was_duplicate: bool, demand_count: int = 1) -> ReplyPackage:
    if was_duplicate:
        suffix = "nd" if demand_count == 2 else ("rd" if demand_count == 3 else "th")
        disp = f"{label} pehle se list mein hai, {demand_count}{suffix} baar maangi gayi."
        speech = f"{label} पहले से लिस्ट में है, {number_to_hindi_words(demand_count)} बार मांगा गया।"
    else:
        disp = f"Theek hai, {label} list mein hai."
        speech = f"ठीक है भैया, {label} लिस्ट में जोड़ दिया है।"
    return ReplyPackage(display_text=disp, speech_text=speech)

def build_reminders_list_reply(reminders: list) -> ReplyPackage:
    if not reminders:
        disp = "Bhaiya, abhi aapki Yaad Dila Dena list khali hai. Kuch note karwana ho toh bataiye."
        speech = "भैया, अभी याद दिलाने वाली लिस्ट खाली है।"
        return ReplyPackage(display_text=disp, speech_text=speech)

    lines = []
    for i, r in enumerate(reminders):
        lbl = getattr(r, "label_roman", str(r))
        cnt = getattr(r, "demand_count", 1)
        lines.append(f"{i+1}. {lbl} ({cnt}x maanga gaya)")

    disp = "Aapki Yaad Dila Dena List:\n" + "\n".join(lines) + "\n\n(Naye order mein ye items automatically suggest honge)."
    speech = f"आपकी याद दिलाने वाली लिस्ट में {len(reminders)} आइटम हैं।"
    return ReplyPackage(display_text=disp, speech_text=speech)

def build_reminder_removed_reply(label: str) -> ReplyPackage:
    disp = f"Theek hai bhaiya, {label} reminder list se hata diya gaya hai."
    speech = f"ठीक है भैया, {label} लिस्ट से हटा दिया गया है।"
    return ReplyPackage(display_text=disp, speech_text=speech)

