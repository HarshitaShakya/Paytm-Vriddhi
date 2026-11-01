from decimal import Decimal
import pytest
from app.core.pricing import LineRequest, calculate_pricing, apply_scheme

def test_scheme_buy_n_get_m_free():
    scheme_json = '{"buy_qty": 10, "free_qty": 1, "free_unit": "bori"}'
    free_qty, disc, desc = apply_scheme(Decimal("10"), Decimal("500.00"), scheme_json)
    assert free_qty == Decimal("1")
    assert disc == Decimal("0.00")
    assert "1 free" in desc

    # 25 ordered -> 2 free
    free_qty2, _, _ = apply_scheme(Decimal("25"), Decimal("500.00"), scheme_json)
    assert free_qty2 == Decimal("2")

def test_scheme_flat_discount():
    scheme_json = '{"buy_qty": 5, "flat_discount_rs": 25.0}'
    free_qty, disc, desc = apply_scheme(Decimal("5"), Decimal("2000.00"), scheme_json)
    assert free_qty == Decimal("0.00")
    assert disc == Decimal("25.00")

def test_option_a_single_supplier_selection(db_session):
    # 4 peti oil + 2 katta sugar
    requests = [
        LineRequest(sku_id="sku_bail_kolhu_1l", quantity=Decimal("4"), unit="peti"),
        LineRequest(sku_id="sku_madhur_sugar_50kg", quantity=Decimal("2"), unit="katta")
    ]
    pricing = calculate_pricing(requests, "cash", db_session)
    opt_a = pricing["option_a"]
    assert opt_a is not None
    assert opt_a["can_fulfill_all"] is True
    # Prices:
    # Shree Ganesh: Oil 4x4200=16800, Sugar 2x2120=4240, Delivery 100 -> Total 21140 (reliability 9.2)
    # Raj Traders: Oil 4x4140=16560, Sugar 2x2150=4300, Delivery 120 -> Total 20980 (reliability 8.7)
    # Price difference is ₹160 (< 1% of 20980 = ₹209.80).
    # Within 1% margin, Shree Ganesh is preferred due to higher reliability (9.2 vs 8.7)!
    assert opt_a["grand_total"] == 21140.0
    assert opt_a["supplier_name"] == "Shree Ganesh Foods"

def test_out_of_stock_skips_supplier(db_session):
    # Arhar dal is OUT OF STOCK at Shree Ganesh Foods in seed data
    requests = [
        LineRequest(sku_id="sku_tata_arhar_dal_50kg", quantity=Decimal("1"), unit="bori"),
        LineRequest(sku_id="sku_madhur_sugar_50kg", quantity=Decimal("1"), unit="katta")
    ]
    pricing = calculate_pricing(requests, "cash", db_session)
    opt_a = pricing["option_a"]
    assert opt_a is not None
    # Shree Ganesh cannot be Option A because dal is out of stock!
    assert opt_a["supplier_name"] != "Shree Ganesh Foods"

def test_split_basket_detection(db_session):
    # Request items where different suppliers have large price divergence
    requests = [
        LineRequest(sku_id="sku_bail_kolhu_1l", quantity=Decimal("10"), unit="peti"),
        LineRequest(sku_id="sku_madhur_sugar_50kg", quantity=Decimal("10"), unit="katta")
    ]
    pricing = calculate_pricing(requests, "cash", db_session)
    opt_b = pricing["option_b"]
    assert opt_b is not None
    assert opt_b["type"] == "split_basket"
    assert len(opt_b["lines"]) == 2
