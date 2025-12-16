from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timezone
import json
import uuid

from .config import settings
from .db import get_db
from . import models
from .schemas import SKUCreate, SKUOut, InventoryAdjust, OrderOut
from .shopify import verify_shopify_hmac, money_to_cents
from .pdf import build_packing_slip

app = FastAPI(title="QBridge OMS MVP", version="0.1.0")

def require_admin(request: Request):
    key = request.headers.get("x-admin-key")
    if key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
def health():
    return {"ok": True, "env": settings.app_env}

# --------- SKUs / Inventory ---------

@app.post("/admin/skus", dependencies=[Depends(require_admin)], response_model=SKUOut)
def create_sku(payload: SKUCreate, db: Session = Depends(get_db)):
    # Create product (idempotent by title for MVP)
    product = db.scalar(select(models.Product).where(models.Product.title == payload.product_title))
    if not product:
        product = models.Product(title=payload.product_title, category=payload.category)
        db.add(product)
        db.flush()

    existing = db.scalar(select(models.SKU).where(models.SKU.sku_code == payload.sku_code))
    if existing:
        raise HTTPException(status_code=409, detail="SKU already exists")

    sku = models.SKU(
        product_id=product.id,
        sku_code=payload.sku_code,
        size=payload.size,
        color=payload.color,
        price_cents=payload.price_cents,
        cost_cents=payload.cost_cents,
        active=True
    )
    db.add(sku)
    db.flush()

    inv = models.Inventory(
        sku_id=sku.id,
        qty_on_hand=max(0, payload.qty_on_hand),
        qty_reserved=0,
        reorder_level=max(0, payload.reorder_level)
    )
    db.add(inv)
    db.commit()

    return SKUOut(
        sku_code=sku.sku_code, size=sku.size, color=sku.color,
        price_cents=sku.price_cents, qty_on_hand=inv.qty_on_hand,
        qty_reserved=inv.qty_reserved, reorder_level=inv.reorder_level
    )

@app.post("/admin/inventory/adjust", dependencies=[Depends(require_admin)])
def adjust_inventory(payload: InventoryAdjust, db: Session = Depends(get_db)):
    sku = db.scalar(select(models.SKU).where(models.SKU.sku_code == payload.sku_code))
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    inv = db.get(models.Inventory, sku.id)
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory row missing")

    new_on_hand = inv.qty_on_hand + payload.delta_on_hand
    new_reserved = inv.qty_reserved + payload.delta_reserved
    if new_on_hand < 0 or new_reserved < 0:
        raise HTTPException(status_code=400, detail="Inventory cannot go negative")

    inv.qty_on_hand = new_on_hand
    inv.qty_reserved = new_reserved
    inv.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "sku_code": payload.sku_code, "qty_on_hand": inv.qty_on_hand, "qty_reserved": inv.qty_reserved}

# --------- Orders ---------

@app.get("/admin/orders", dependencies=[Depends(require_admin)])
def list_orders(status: str | None = None, db: Session = Depends(get_db)):
    q = select(models.Order).order_by(models.Order.created_at.desc()).limit(200)
    if status:
        q = q.where(models.Order.status == status)
    orders = db.scalars(q).all()
    return [{
        "id": o.id,
        "shopify_order_id": o.shopify_order_id,
        "status": o.status.value if hasattr(o.status, "value") else str(o.status),
        "total_cents": o.total_cents,
        "created_at": o.created_at
    } for o in orders]

@app.get("/admin/orders/{order_id}", dependencies=[Depends(require_admin)], response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    items = db.scalars(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
    return OrderOut(
        id=order.id,
        shopify_order_id=order.shopify_order_id,
        status=order.status.value if hasattr(order.status,"value") else str(order.status),
        total_cents=order.total_cents,
        placed_at=order.placed_at,
        created_at=order.created_at,
        items=[{
            "sku_code": it.sku_code,
            "title": it.title,
            "qty": it.qty,
            "unit_price_cents": it.unit_price_cents,
            "line_total_cents": it.line_total_cents
        } for it in items]
    )

@app.post("/admin/orders/{order_id}/status", dependencies=[Depends(require_admin)])
def set_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        status_enum = models.OrderStatus(status)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid status")

    order.status = status_enum
    db.commit()
    return {"ok": True, "order_id": order_id, "status": status_enum.value}

@app.get("/admin/orders/{order_id}/packing-slip.pdf", dependencies=[Depends(require_admin)])
def packing_slip(order_id: int, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    addr = db.get(models.Address, order.shipping_address_id) if order.shipping_address_id else None
    items = db.scalars(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()

    ship_to = {
        "name": "",
        "line1": addr.line1 if addr else "",
        "line2": addr.line2 if addr else "",
        "city": addr.city if addr else "",
        "province": addr.province if addr else "",
        "postal_code": addr.postal_code if addr else "",
        "country": addr.country if addr else "Canada",
    }
    pdf_bytes = build_packing_slip(order.id, ship_to, [{
        "qty": it.qty, "sku_code": it.sku_code or "", "title": it.title or ""
    } for it in items])

    return StreamingResponse(iter([pdf_bytes]), media_type="application/pdf", headers={
        "Content-Disposition": f"inline; filename=packing-slip-{order.id}.pdf"
    })

# --------- Shopify Webhooks ---------
# Webhook topics recommended for MVP:
# - orders/create
# - orders/paid
# - orders/cancelled
# - orders/fulfilled (optional; you can also manage shipping manually in OMS)

@app.post("/webhooks/shopify/orders-create")
async def shopify_orders_create(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    hmac_header = request.headers.get("x-shopify-hmac-sha256", "")
    webhook_id = request.headers.get("x-shopify-webhook-id") or str(uuid.uuid4())
    shop_domain = request.headers.get("x-shopify-shop-domain", settings.shopify_shop_domain) or "unknown"
    topic = request.headers.get("x-shopify-topic", "orders/create")

    if not verify_shopify_hmac(raw, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # idempotency
    exists = db.scalar(select(models.WebhookEvent).where(models.WebhookEvent.webhook_id == webhook_id))
    if exists:
        return {"ok": True, "duplicate": True}

    payload = json.loads(raw.decode("utf-8"))

    # Canada-only enforcement (soft fail: store but mark for review)
    ship = payload.get("shipping_address") or {}
    if (ship.get("country") or "").lower() not in ("canada", "ca"):
        # Still record the webhook to avoid replay storms
        db.add(models.WebhookEvent(shop_domain=shop_domain, topic=topic, webhook_id=webhook_id))
        db.commit()
        return {"ok": True, "ignored": True, "reason": "Non-Canada shipping address"}

    # Customer upsert (minimal)
    cust = payload.get("customer") or {}
    customer = None
    if cust.get("id"):
        customer = db.scalar(select(models.Customer).where(models.Customer.shopify_customer_id == int(cust["id"])))
    if not customer:
        customer = models.Customer(
            shopify_customer_id=int(cust["id"]) if cust.get("id") else None,
            email=cust.get("email"),
            phone=cust.get("phone"),
            first_name=cust.get("first_name"),
            last_name=cust.get("last_name"),
        )
        db.add(customer)
        db.flush()

    # Address
    addr = models.Address(
        customer_id=customer.id,
        line1=ship.get("address1") or "",
        line2=ship.get("address2"),
        city=ship.get("city") or "",
        province=ship.get("province") or "",
        postal_code=ship.get("zip") or "",
        country="Canada",
    )
    db.add(addr)
    db.flush()

    # Order (idempotent by shopify_order_id)
    shopify_order_id = int(payload["id"])
    existing_order = db.scalar(select(models.Order).where(models.Order.shopify_order_id == shopify_order_id))
    if existing_order:
        db.add(models.WebhookEvent(shop_domain=shop_domain, topic=topic, webhook_id=webhook_id))
        db.commit()
        return {"ok": True, "duplicate_order": True, "order_id": existing_order.id}

    subtotal = money_to_cents(payload.get("subtotal_price"))
    total = money_to_cents(payload.get("total_price"))
    tax = money_to_cents(payload.get("total_tax"))
    shipping_cents = money_to_cents(payload.get("total_shipping_price_set", {}).get("shop_money", {}).get("amount"))

    placed_at = payload.get("created_at")
    placed_dt = None
    if placed_at:
        try:
            placed_dt = datetime.fromisoformat(placed_at.replace("Z", "+00:00"))
        except Exception:
            placed_dt = None

    order = models.Order(
        shopify_order_id=shopify_order_id,
        customer_id=customer.id,
        shipping_address_id=addr.id,
        status=models.OrderStatus.IMPORTED,
        currency=payload.get("currency") or "CAD",
        subtotal_cents=subtotal,
        shipping_cents=shipping_cents,
        tax_cents=tax,
        total_cents=total,
        placed_at=placed_dt,
    )
    db.add(order)
    db.flush()

    # Items + reserve inventory (reserve only; decrement on-hand when PAID)
    for li in payload.get("line_items") or []:
        sku_code = li.get("sku") or None
        qty = int(li.get("quantity") or 0)
        price = money_to_cents(li.get("price"))
        title = li.get("title")

        db.add(models.OrderItem(
            order_id=order.id,
            sku_id=None,
            sku_code=sku_code,
            title=title,
            qty=qty,
            unit_price_cents=price,
            line_total_cents=price * qty
        ))

        if sku_code and qty > 0:
            sku = db.scalar(select(models.SKU).where(models.SKU.sku_code == sku_code))
            if sku:
                inv = db.get(models.Inventory, sku.id)
                if inv and inv.qty_on_hand - inv.qty_reserved >= qty:
                    inv.qty_reserved += qty

    db.add(models.WebhookEvent(shop_domain=shop_domain, topic=topic, webhook_id=webhook_id))
    db.commit()
    return {"ok": True, "order_id": order.id}

@app.post("/webhooks/shopify/orders-paid")
async def shopify_orders_paid(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    hmac_header = request.headers.get("x-shopify-hmac-sha256", "")
    webhook_id = request.headers.get("x-shopify-webhook-id") or str(uuid.uuid4())
    shop_domain = request.headers.get("x-shopify-shop-domain", settings.shopify_shop_domain) or "unknown"
    topic = request.headers.get("x-shopify-topic", "orders/paid")

    if not verify_shopify_hmac(raw, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    exists = db.scalar(select(models.WebhookEvent).where(models.WebhookEvent.webhook_id == webhook_id))
    if exists:
        return {"ok": True, "duplicate": True}

    payload = json.loads(raw.decode("utf-8"))
    shopify_order_id = int(payload["id"])
    order = db.scalar(select(models.Order).where(models.Order.shopify_order_id == shopify_order_id))
    if not order:
        # Create flow not received yet; safe no-op
        db.add(models.WebhookEvent(shop_domain=shop_domain, topic=topic, webhook_id=webhook_id))
        db.commit()
        return {"ok": True, "ignored": True, "reason": "order_not_found"}

    # Move RESERVED -> ON_HAND decrement (simple)
    if order.status in (models.OrderStatus.IMPORTED,):
        items = db.scalars(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
        for it in items:
            if it.sku_code and it.qty > 0:
                sku = db.scalar(select(models.SKU).where(models.SKU.sku_code == it.sku_code))
                if sku:
                    inv = db.get(models.Inventory, sku.id)
                    if inv:
                        # Ensure we do not go negative
                        inv.qty_reserved = max(0, inv.qty_reserved - it.qty)
                        inv.qty_on_hand = max(0, inv.qty_on_hand - it.qty)

        order.status = models.OrderStatus.PAID

        # Payment record
        db.add(models.Payment(
            order_id=order.id,
            provider="shopify",
            reference=str(shopify_order_id),
            amount_cents=money_to_cents(payload.get("total_price")),
            status=models.PaymentStatus.PAID,
            paid_at=datetime.now(timezone.utc)
        ))

    db.add(models.WebhookEvent(shop_domain=shop_domain, topic=topic, webhook_id=webhook_id))
    db.commit()
    return {"ok": True, "order_id": order.id, "status": "PAID"}
