# QBridge athleisure OMS MVP (Python + SQL) for Shopify

This repo is a minimal back-office OMS:
- Shopify storefront handles checkout
- OMS handles inventory, order status, fulfillment workflow, and basic reporting

## 1) Prereqs
- Docker + Docker Compose

## 2) Setup
1. Copy env template:
   - `cp .env.example .env`
2. Update `.env` with:
   - `ADMIN_API_KEY`
   - `SHOPIFY_WEBHOOK_SECRET`
   - (optional for later) `SHOPIFY_ADMIN_ACCESS_TOKEN`

## 3) Run
- `docker compose up --build`

API will be at:
- http://localhost:8000
Docs:
- http://localhost:8000/docs

## 4) Create a SKU (Admin)
Use header:
- `x-admin-key: <ADMIN_API_KEY>`

POST `/admin/skus`
```json
{
  "product_title": "Core Leggings",
  "category": "Leggings",
  "sku_code": "LEG-CORE-BLK-S",
  "size": "S",
  "color": "Black",
  "price_cents": 6500,
  "cost_cents": 2500,
  "qty_on_hand": 50,
  "reorder_level": 10
}
```

## 5) Shopify webhooks (MVP)
Create webhooks in Shopify Admin:
- orders/create   -> `POST https://<your-domain>/webhooks/shopify/orders-create`
- orders/paid     -> `POST https://<your-domain>/webhooks/shopify/orders-paid`

This code verifies `X-Shopify-Hmac-Sha256` using `SHOPIFY_WEBHOOK_SECRET`.

## 6) Next upgrades (Phase 1.1)
- Add an admin UI (simple web dashboard)
- Add orders/cancelled handler to release reserved inventory
- Add a shipments endpoint and push fulfillment updates back to Shopify
