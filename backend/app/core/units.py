import os
import re
from typing import Optional, Tuple
from decimal import Decimal
import yaml

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "units.yaml")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    _UNITS_CONFIG = yaml.safe_load(f)

FRACTIONS = _UNITS_CONFIG.get("fractions", {})
HINDI_NUMBERS = _UNITS_CONFIG.get("hindi_numbers", {})
UNIT_ALIASES = _UNITS_CONFIG.get("unit_aliases", {})
PACK_UNITS = set(_UNITS_CONFIG.get("pack_units", []))

# Reverse map alias -> canonical unit
_ALIAS_TO_CANONICAL = {}
for canonical, aliases in UNIT_ALIASES.items():
    _ALIAS_TO_CANONICAL[canonical.lower()] = canonical
    for a in aliases:
        _ALIAS_TO_CANONICAL[a.strip().lower()] = canonical

def normalize_unit(unit_str: Optional[str]) -> Optional[str]:
    """Normalizes any colloquial or regional unit string to canonical unit."""
    if not unit_str:
        return None
    cleaned = unit_str.strip().lower()
    return _ALIAS_TO_CANONICAL.get(cleaned, cleaned)

def parse_spoken_number(token: str) -> Optional[Decimal]:
    """Parses a single number token (digit, Hindi word, or fraction) into Decimal."""
    if not token:
        return None
    t = token.strip().lower()
    
    # 1. Direct fraction lookup
    if t in FRACTIONS:
        return Decimal(str(FRACTIONS[t]))
    
    # 2. Hindi number word lookup
    if t in HINDI_NUMBERS:
        return Decimal(str(HINDI_NUMBERS[t]))
    
    # 3. Standard digits (e.g. "4", "2.5", "10")
    try:
        val = Decimal(t)
        return val
    except Exception:
        pass
    
    return None

def parse_quantity(raw_str: str) -> Tuple[Optional[Decimal], Optional[str]]:
    """
    Parses compound quantity expressions like:
    - '4' -> (Decimal('4'), None)
    - 'dedh' -> (Decimal('1.5'), None)
    - 'dhai' -> (Decimal('2.5'), None)
    - 'sava do' -> (Decimal('2.25'), None)
    - 'paune teen' -> (Decimal('2.75'), None)
    - 'aadha' -> (Decimal('0.5'), None)
    """
    if not raw_str:
        return None, None
    
    tokens = raw_str.strip().lower().split()
    if not tokens:
        return None, None
    
    if len(tokens) == 1:
        num = parse_spoken_number(tokens[0])
        return num, tokens[0] if num is not None else None
    
    # Check compound fractions like 'sava teen' (3.25), 'paune chaar' (3.75)
    first, second = tokens[0], tokens[1]
    second_num = parse_spoken_number(second)
    if second_num is not None:
        if first in ("sava", "sawa", "सवा"):
            return second_num + Decimal("0.25"), raw_str
        if first in ("paun", "paune", "pauna", "पौन"):
            return second_num - Decimal("0.25"), raw_str
        if first in ("aadha", "half", "आधा"):
            return second_num + Decimal("0.5"), raw_str
        if first in ("dedh", "derh", "डेढ़"):
            return Decimal("1.5"), raw_str
        if first in ("dhai", "ढाई"):
            return Decimal("2.5"), raw_str

    # Default to parsing the first recognized number
    for t in tokens:
        n = parse_spoken_number(t)
        if n is not None:
            return n, t

    return None, None

def is_pack_unit(unit: str) -> bool:
    """Checks whether the unit is a wholesale sealed container/pack unit."""
    can = normalize_unit(unit)
    return can in PACK_UNITS

def requires_pack_confirmation(qty: Decimal, unit: str) -> bool:
    """
    Returns True if quantity is non-integer for pack units (e.g. 2.5 peti, 1.5 bori).
    Kirana distributors rarely split sealed cartons/sacks, so a prompt is needed.
    """
    if not is_pack_unit(unit):
        return False
    return (qty % Decimal("1")) != Decimal("0")

