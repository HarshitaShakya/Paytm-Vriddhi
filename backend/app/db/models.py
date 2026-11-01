from datetime import datetime, timezone, timedelta
from typing import Optional
from decimal import Decimal
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def default_reminder_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=30)

def default_draft_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=24)

class Merchant(SQLModel, table=True):
    __tablename__ = "merchants"
    id: str = Field(primary_key=True)
    name: str
    phone: str
    pin_code: str
    voice_confirm_limit: Decimal = Field(default=Decimal("15000.00"))
    auto_place_enabled: bool = Field(default=False)
    auto_place_max_total: Decimal = Field(default=Decimal("5000.00"))
    auto_place_delay_seconds: int = Field(default=60)
    auto_place_tolerance_pct: float = Field(default=5.0)
    usual_supplier_id: Optional[str] = Field(default=None, foreign_key="suppliers.id", nullable=True)
    created_at: datetime = Field(default_factory=utc_now)

class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"
    id: str = Field(primary_key=True)
    name: str
    market: str
    phone: str
    reliability_score: float = Field(default=9.0)  # e.g. 9.2
    on_time_pct: int = Field(default=95)          # e.g. 98%
    min_order: Decimal = Field(default=Decimal("0.00"))
    delivery_fee: Decimal = Field(default=Decimal("0.00"))
    credit_days: int = Field(default=7)

class SKU(SQLModel, table=True):
    __tablename__ = "skus"
    id: str = Field(primary_key=True)
    category: str
    name: str
    brand: str
    pack_size: str
    standard_unit: str
    pack_multiplier: float = Field(default=1.0)

class SkuAlias(SQLModel, table=True):
    __tablename__ = "sku_aliases"
    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: str = Field(foreign_key="skus.id", index=True)
    alias: str = Field(index=True)
    is_primary: bool = Field(default=False)

class SupplierPrice(SQLModel, table=True):
    __tablename__ = "supplier_prices"
    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: str = Field(foreign_key="skus.id", index=True)
    supplier_id: str = Field(foreign_key="suppliers.id", index=True)
    unit: str
    cash_price: Decimal = Field(default=Decimal("0.00"))
    credit_price: Decimal = Field(default=Decimal("0.00"))
    scheme_json: Optional[str] = Field(default=None)
    in_stock: bool = Field(default=True)
    valid_until: datetime = Field(default_factory=utc_now)

class Draft(SQLModel, table=True):
    __tablename__ = "drafts"
    id: str = Field(primary_key=True)
    merchant_id: str = Field(foreign_key="merchants.id", index=True)
    version: int = Field(default=1)
    state: str = Field(default="DRAFTING")  # IDLE, DRAFTING, QUOTED, AUTO_PENDING, CONFIRMED, PLACED, CANCELLED
    lines_json: str = Field(default="[]")   # JSON list of draft lines
    supplier_plan_json: Optional[str] = Field(default=None) # JSON pricing options A & B
    selected_option: str = Field(default="A")
    payment_mode: str = Field(default="cash") # cash, credit_7d
    auto_place_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    confidence_score: Optional[float] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime = Field(default_factory=default_draft_expiry)

class Order(SQLModel, table=True):
    __tablename__ = "orders"
    id: str = Field(primary_key=True)
    draft_id: str = Field(foreign_key="drafts.id")
    merchant_id: str = Field(foreign_key="merchants.id", index=True)
    supplier_id: str = Field(foreign_key="suppliers.id", index=True)
    total_amount: Decimal = Field(default=Decimal("0.00"))
    savings_amount: Decimal = Field(default=Decimal("0.00"))
    payment_mode: str = Field(default="cash")
    source: str = Field(default="manual")  # "auto" or "manual"
    status: str = Field(default="PLACED")  # PLACED, DISPATCHED, DELIVERED, CANCELLED
    placed_at: datetime = Field(default_factory=utc_now)

class OrderLine(SQLModel, table=True):
    __tablename__ = "order_lines"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(foreign_key="orders.id", index=True)
    sku_id: str = Field(foreign_key="skus.id")
    quantity: Decimal = Field(default=Decimal("0.00"))
    unit: str
    unit_price: Decimal = Field(default=Decimal("0.00"))
    total_price: Decimal = Field(default=Decimal("0.00"))
    free_quantity: Decimal = Field(default=Decimal("0.00"))

class MessageLog(SQLModel, table=True):
    __tablename__ = "message_log"
    id: Optional[int] = Field(default=None, primary_key=True)
    channel: str = Field(index=True)
    external_message_id: str = Field(unique=True, index=True)
    sender_id: str = Field(index=True)
    transcript: Optional[str] = None
    parsed_json: Optional[str] = None
    response_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

class Reminder(SQLModel, table=True):
    __tablename__ = "reminders"
    id: str = Field(primary_key=True)
    merchant_id: str = Field(foreign_key="merchants.id", index=True)
    label_roman: str = Field(index=True)
    sku_id: Optional[str] = Field(default=None, foreign_key="skus.id", nullable=True, index=True)
    brand: Optional[str] = Field(default=None, nullable=True)
    qty: Optional[Decimal] = Field(default=None, nullable=True)
    unit: Optional[str] = Field(default=None, nullable=True)
    note: Optional[str] = Field(default=None, nullable=True)
    image_ref: Optional[str] = Field(default=None, nullable=True)
    status: str = Field(default="open", index=True)  # open, in_cart, ordered, dismissed
    demand_count: int = Field(default=1)
    linked_draft_id: Optional[str] = Field(default=None, foreign_key="drafts.id", nullable=True, index=True)
    linked_line_id: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=utc_now)
    last_requested_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime = Field(default_factory=default_reminder_expiry)
    source_message_id: Optional[str] = Field(default=None, nullable=True)

