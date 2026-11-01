import pytest
from app.core.matching import match_sku, match_all_candidates

def test_exact_alias_matching(db_session):
    # Bail Kolhu Oil
    res = match_sku("bail kolhu tel", db_session)
    assert res is not None
    assert res.sku.id == "sku_bail_kolhu_1l"
    assert res.score >= 95.0

    # Chini / Sugar
    res = match_sku("chini", db_session)
    assert res is not None
    assert res.sku.id == "sku_madhur_sugar_50kg"

    # Arhar Dal
    res = match_sku("arhar dal", db_session)
    assert res is not None
    assert res.sku.id == "sku_tata_arhar_dal_50kg"

def test_devanagari_alias_matching(db_session):
    res = match_sku("सरसों तेल", db_session)
    assert res is not None
    assert res.sku.id == "sku_bail_kolhu_1l"

    res = match_sku("शक्कर", db_session)
    assert res is not None
    assert res.sku.id == "sku_madhur_sugar_50kg"

    res = match_sku("आलू", db_session)
    assert res is not None
    assert res.sku.id == "sku_fresh_potato_kg"

def test_fuzzy_matching_and_typos(db_session):
    # Typo: "bail kolho mustard"
    res = match_sku("bail kolho mustard", db_session)
    assert res is not None
    assert res.sku.id == "sku_bail_kolhu_1l"

    # Colloquial phrase: "madhur cheeni"
    res = match_sku("madhur cheeni", db_session)
    assert res is not None
    assert res.sku.id == "sku_madhur_sugar_50kg"

def test_unrecognized_returns_none(db_session):
    res = match_sku("xyzzy impossible item 999", db_session, threshold=70.0)
    assert res is None

