from decimal import Decimal
import pytest
from app.core.units import (
    parse_spoken_number,
    parse_quantity,
    normalize_unit,
    is_pack_unit,
    requires_pack_confirmation
)

def test_fraction_parsing():
    assert parse_spoken_number("aadha") == Decimal("0.5")
    assert parse_spoken_number("half") == Decimal("0.5")
    assert parse_spoken_number("आधा") == Decimal("0.5")
    assert parse_spoken_number("dedh") == Decimal("1.5")
    assert parse_spoken_number("derh") == Decimal("1.5")
    assert parse_spoken_number("डेढ़") == Decimal("1.5")
    assert parse_spoken_number("dhai") == Decimal("2.5")
    assert parse_spoken_number("ढाई") == Decimal("2.5")
    assert parse_spoken_number("sava") == Decimal("1.25")
    assert parse_spoken_number("paune") == Decimal("0.75")

def test_hindi_numbers():
    assert parse_spoken_number("ek") == Decimal("1")
    assert parse_spoken_number("do") == Decimal("2")
    assert parse_spoken_number("teen") == Decimal("3")
    assert parse_spoken_number("chaar") == Decimal("4")
    assert parse_spoken_number("paanch") == Decimal("5")
    assert parse_spoken_number("chhe") == Decimal("6")
    assert parse_spoken_number("saat") == Decimal("7")
    assert parse_spoken_number("aath") == Decimal("8")
    assert parse_spoken_number("nau") == Decimal("9")
    assert parse_spoken_number("das") == Decimal("10")
    assert parse_spoken_number("bees") == Decimal("20")
    assert parse_spoken_number("pachaas") == Decimal("50")
    assert parse_spoken_number("sau") == Decimal("100")
    assert parse_spoken_number("चार") == Decimal("4")
    assert parse_spoken_number("दस") == Decimal("10")

def test_compound_quantities():
    qty, _ = parse_quantity("sava do")
    assert qty == Decimal("2.25")

    qty, _ = parse_quantity("paune teen")
    assert qty == Decimal("2.75")

    qty, _ = parse_quantity("aadha")
    assert qty == Decimal("0.5")

    qty, _ = parse_quantity("4")
    assert qty == Decimal("4")

def test_unit_normalization():
    assert normalize_unit("kilo") == "kg"
    assert normalize_unit("kilogram") == "kg"
    assert normalize_unit("किलो") == "kg"
    assert normalize_unit("cutter") == "katta"
    assert normalize_unit("कट्ठा") == "katta" or normalize_unit("कट्टा") == "katta"
    assert normalize_unit("petty") == "peti"
    assert normalize_unit("carton") == "peti"
    assert normalize_unit("bora") == "bori"
    assert normalize_unit("pkt") == "packet"
    assert normalize_unit("ltr") == "litre"

def test_pack_unit_fraction_check():
    # Integer pack units should NOT require confirmation
    assert not requires_pack_confirmation(Decimal("4"), "peti")
    assert not requires_pack_confirmation(Decimal("2"), "katta")
    assert not requires_pack_confirmation(Decimal("3"), "bori")
    
    # Fractional pack units MUST require confirmation
    assert requires_pack_confirmation(Decimal("2.5"), "peti")
    assert requires_pack_confirmation(Decimal("1.5"), "bori")
    assert requires_pack_confirmation(Decimal("0.5"), "katta")
    
    # Non-pack units (like kg) should NOT require confirmation for fractions
    assert not requires_pack_confirmation(Decimal("0.5"), "kg")
    assert not requires_pack_confirmation(Decimal("2.5"), "kg")

