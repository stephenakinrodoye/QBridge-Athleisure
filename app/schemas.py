from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SKUCreate(BaseModel):
    product_title: str
    category: Optional[str] = None
    sku_code: str
    size: Optional[str] = None
    color: Optional[str] = None
    price_cents: int
    cost_cents: int = 0
    qty_on_hand: int = 0
    reorder_level: int = 0

class SKUOut(BaseModel):
    sku_code: str
    size: Optional[str]
    color: Optional[str]
    price_cents: int
    qty_on_hand: int
    qty_reserved: int
    reorder_level: int

class InventoryAdjust(BaseModel):
    sku_code: str
    delta_on_hand: int = 0
    delta_reserved: int = 0
    reason: Optional[str] = None

class OrderItemOut(BaseModel):
    sku_code: Optional[str]
    title: Optional[str]
    qty: int
    unit_price_cents: int
    line_total_cents: int

class OrderOut(BaseModel):
    id: int
    shopify_order_id: Optional[int]
    status: str
    total_cents: int
    placed_at: Optional[datetime]
    created_at: datetime
    items: List[OrderItemOut] = []
