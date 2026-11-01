import csv
import os
from decimal import Decimal
from datetime import datetime, timedelta, timezone
import yaml
from sqlmodel import Session, select
from app.db.session import engine, init_db
from app.db.models import Merchant, Supplier, SKU, SkuAlias, SupplierPrice

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def seed_database(target_engine=None):
    use_engine = target_engine or engine
    init_db(use_engine)
    with Session(use_engine) as session:
        # 1. Seed Merchants
        existing_m = session.exec(select(Merchant)).first()
        if not existing_m:
            merchants = [
                Merchant(id="m_sharma_kirana", name="Sharma Kirana Store", phone="+91 98260 12345", pin_code="452001"),
                Merchant(id="m_gupta_provision", name="Gupta Provision Store", phone="+91 98260 54321", pin_code="452002"),
                Merchant(id="m_verma_general", name="Verma General Store", phone="+91 98260 99887", pin_code="452003")
            ]
            session.add_all(merchants)
            session.commit()

        # 2. Seed Suppliers
        existing_s = session.exec(select(Supplier)).first()
        if not existing_s:
            suppliers = [
                Supplier(
                    id="sup_shree_ganesh",
                    name="Shree Ganesh Foods",
                    market="Indore APMC",
                    phone="+91 98260 11234",
                    reliability_score=9.2,
                    on_time_pct=98,
                    min_order=Decimal("2000.00"),
                    delivery_fee=Decimal("100.00"),
                    credit_days=7
                ),
                Supplier(
                    id="sup_raj_traders",
                    name="Raj Traders",
                    market="Dewas Mandi",
                    phone="+91 98265 99881",
                    reliability_score=8.7,
                    on_time_pct=91,
                    min_order=Decimal("1500.00"),
                    delivery_fee=Decimal("120.00"),
                    credit_days=7
                ),
                Supplier(
                    id="sup_malwa_fresh",
                    name="Malwa Fresh Co.",
                    market="Ujjain Mandi",
                    phone="+91 98270 44556",
                    reliability_score=8.1,
                    on_time_pct=86,
                    min_order=Decimal("1000.00"),
                    delivery_fee=Decimal("150.00"),
                    credit_days=7
                )
            ]
            session.add_all(suppliers)
            session.commit()

        # 3. Seed SKUs (sync all from CSV)
        catalog_file = os.path.join(DATA_DIR, "seed_catalog.csv")
        if os.path.exists(catalog_file):
            existing_skus = set(s.id for s in session.exec(select(SKU)).all())
            with open(catalog_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row["id"] not in existing_skus:
                        sku = SKU(
                            id=row["id"],
                            category=row["category"],
                            name=row["name"],
                            brand=row["brand"],
                            pack_size=row["pack_size"],
                            standard_unit=row["standard_unit"],
                            pack_multiplier=float(row["pack_multiplier"])
                        )
                        session.add(sku)
                        existing_skus.add(row["id"])
            session.commit()

        # 4. Seed Aliases from YAML (upsert / sync missing aliases)
        aliases_file = os.path.join(DATA_DIR, "aliases_hinglish.yaml")
        if os.path.exists(aliases_file):
            existing_aliases = set(a.alias.lower() for a in session.exec(select(SkuAlias)).all())
            with open(aliases_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                for item in data.get("commodities", []):
                    sku_id = item["id"]
                    for i, alias in enumerate(item.get("aliases", [])):
                        clean_al = alias.strip().lower()
                        if clean_al not in existing_aliases:
                            session.add(SkuAlias(
                                sku_id=sku_id,
                                alias=clean_al,
                                is_primary=(i == 0)
                            ))
                            existing_aliases.add(clean_al)
            session.commit()

        # 5. Seed Supplier Prices (sync / update from CSV)
        prices_file = os.path.join(DATA_DIR, "seed_prices.csv")
        if os.path.exists(prices_file):
            now_utc = datetime.now(timezone.utc)
            existing_prices = {(p.sku_id, p.supplier_id): p for p in session.exec(select(SupplierPrice)).all()}
            with open(prices_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    key = (row["sku_id"], row["supplier_id"])
                    if key in existing_prices:
                        p = existing_prices[key]
                        p.cash_price = Decimal(row["cash_price"])
                        p.credit_price = Decimal(row["credit_price"])
                        p.scheme_json = row["scheme_json"] if row["scheme_json"] else None
                        p.in_stock = (row["in_stock"] == "1")
                        session.add(p)
                    else:
                        price = SupplierPrice(
                            sku_id=row["sku_id"],
                            supplier_id=row["supplier_id"],
                            unit=row["unit"],
                            cash_price=Decimal(row["cash_price"]),
                            credit_price=Decimal(row["credit_price"]),
                            scheme_json=row["scheme_json"] if row["scheme_json"] else None,
                            in_stock=(row["in_stock"] == "1"),
                            valid_until=now_utc + timedelta(days=30)
                        )
                        session.add(price)
                        existing_prices[key] = price
            session.commit()

if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully!")
