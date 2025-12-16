from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text, func, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .db import Base
import enum

class OrderStatus(str, enum.Enum):
    IMPORTED = "IMPORTED"
    PAID = "PAID"
    PICKED = "PICKED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    RETURNED = "RETURNED"
    CANCELLED = "CANCELLED"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class Customer(Base):
    __tablename__ = "customers"
    id = Column(BigInteger, primary_key=True)
    shopify_customer_id = Column(BigInteger, unique=True, nullable=True)
    email = Column(Text, nullable=True)
    phone = Column(Text, nullable=True)
    first_name = Column(Text, nullable=True)
    last_name = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Address(Base):
    __tablename__ = "addresses"
    id = Column(BigInteger, primary_key=True)
    customer_id = Column(BigInteger, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    line1 = Column(Text, nullable=False)
    line2 = Column(Text, nullable=True)
    city = Column(Text, nullable=False)
    province = Column(Text, nullable=False)
    postal_code = Column(Text, nullable=False)
    country = Column(Text, nullable=False, server_default="Canada")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Product(Base):
    __tablename__ = "products"
    id = Column(BigInteger, primary_key=True)
    title = Column(Text, nullable=False)
    category = Column(Text, nullable=True)
    active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class SKU(Base):
    __tablename__ = "skus"
    id = Column(BigInteger, primary_key=True)
    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sku_code = Column(Text, nullable=False, unique=True)
    size = Column(Text, nullable=True)
    color = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False)
    cost_cents = Column(Integer, nullable=False, server_default="0")
    active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Inventory(Base):
    __tablename__ = "inventory"
    sku_id = Column(BigInteger, ForeignKey("skus.id", ondelete="CASCADE"), primary_key=True)
    qty_on_hand = Column(Integer, nullable=False, server_default="0")
    qty_reserved = Column(Integer, nullable=False, server_default="0")
    reorder_level = Column(Integer, nullable=False, server_default="0")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Order(Base):
    __tablename__ = "orders"
    id = Column(BigInteger, primary_key=True)
    shopify_order_id = Column(BigInteger, unique=True, nullable=True)
    customer_id = Column(BigInteger, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    shipping_address_id = Column(BigInteger, ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(OrderStatus, name="order_status", native_enum=False), nullable=False, default=OrderStatus.IMPORTED)
    currency = Column(Text, nullable=False, server_default="CAD")
    subtotal_cents = Column(Integer, nullable=False, server_default="0")
    shipping_cents = Column(Integer, nullable=False, server_default="0")
    tax_cents = Column(Integer, nullable=False, server_default="0")
    total_cents = Column(Integer, nullable=False, server_default="0")
    placed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(BigInteger, primary_key=True)
    order_id = Column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    sku_id = Column(BigInteger, ForeignKey("skus.id", ondelete="SET NULL"), nullable=True)
    sku_code = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    qty = Column(Integer, nullable=False)
    unit_price_cents = Column(Integer, nullable=False)
    line_total_cents = Column(Integer, nullable=False)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(BigInteger, primary_key=True)
    order_id = Column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    provider = Column(Text, nullable=False, server_default="shopify")
    reference = Column(Text, nullable=True)
    amount_cents = Column(Integer, nullable=False)
    status = Column(Enum(PaymentStatus, name="payment_status", native_enum=False), nullable=False, default=PaymentStatus.PENDING)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(BigInteger, primary_key=True)
    order_id = Column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    carrier = Column(Text, nullable=True)
    tracking_number = Column(Text, nullable=True)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Return(Base):
    __tablename__ = "returns"
    id = Column(BigInteger, primary_key=True)
    order_id = Column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(BigInteger, primary_key=True)
    shop_domain = Column(Text, nullable=False)
    topic = Column(Text, nullable=False)
    webhook_id = Column(Text, nullable=False, unique=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
