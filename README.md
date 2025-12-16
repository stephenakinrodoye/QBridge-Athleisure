# QBridge athleisure OMS MVP (Python + SQL) for Shopify

This project is a simple order management system built to support an online activewear brand that sells only in Canada. Customers shop and pay through a Shopify website, while this system works quietly in the background to handle operations. It keeps track of products, sizes, and colors (SKUs), manages inventory levels, records orders coming in from Shopify, and shows their status as they move from paid to packed and shipped. The goal is to make sure orders are processed correctly, inventory stays accurate, and nothing is oversold.
The system is built using Python and SQL, which makes it reliable, fast, and easy to grow over time. It gives the brand owner a clear view of daily sales, stock levels, and order progress without unnecessary complexity. By keeping the platform simple and focused only on what matters, it reduces mistakes, saves time, and allows the business to scale smoothly as order volume increases.

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
