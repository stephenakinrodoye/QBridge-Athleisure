-- QBridge OMS MVP (Canada-only) - PostgreSQL schema
-- Notes:
-- - All timestamps are UTC (timestamptz)
-- - Money is stored as integer cents to avoid floating point issues
-- - Shopify IDs are stored as BIGINT where applicable

CREATE TABLE IF NOT EXISTS customers (
  id              BIGSERIAL PRIMARY KEY,
  shopify_customer_id BIGINT UNIQUE,
  email           TEXT,
  phone           TEXT,
  first_name      TEXT,
  last_name       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  line1           TEXT NOT NULL,
  line2           TEXT,
  city            TEXT NOT NULL,
  province        TEXT NOT NULL,
  postal_code     TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'Canada',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  category        TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skus (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code        TEXT NOT NULL UNIQUE,
  size            TEXT,
  color           TEXT,
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents      INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  sku_id          BIGINT PRIMARY KEY REFERENCES skus(id) ON DELETE CASCADE,
  qty_on_hand     INTEGER NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  qty_reserved    INTEGER NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE order_status AS ENUM (
  'IMPORTED', 'PAID', 'PICKED', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'
);

CREATE TABLE IF NOT EXISTS orders (
  id                 BIGSERIAL PRIMARY KEY,
  shopify_order_id   BIGINT UNIQUE,
  customer_id        BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  shipping_address_id BIGINT REFERENCES addresses(id) ON DELETE SET NULL,
  status             order_status NOT NULL DEFAULT 'IMPORTED',
  currency           TEXT NOT NULL DEFAULT 'CAD',
  subtotal_cents     INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  shipping_cents     INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  tax_cents          INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents        INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  placed_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku_id          BIGINT REFERENCES skus(id) ON DELETE SET NULL,
  sku_code        TEXT, -- denormalized for audit / if sku deleted
  title           TEXT,
  qty             INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
);

CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE IF NOT EXISTS payments (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'shopify',
  reference       TEXT,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  status          payment_status NOT NULL DEFAULT 'PENDING',
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier         TEXT,
  tracking_number TEXT,
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS returns (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook idempotency (prevents double-processing)
CREATE TABLE IF NOT EXISTS webhook_events (
  id              BIGSERIAL PRIMARY KEY,
  shop_domain     TEXT NOT NULL,
  topic           TEXT NOT NULL,
  webhook_id      TEXT NOT NULL UNIQUE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
