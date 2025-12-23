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

## 7) Auth Service (Register & Login Service)
This Auth Service is a standalone authentication and authorization microservice designed to support the internal staff and admin dashboard for the QBridge Athleisure Order Management System (OMS). It is not customer-facing and is intentionally restricted to company personnel such as the owner and warehouse/operations staff.

The service is built with Node.js, Express, and MongoDB and is responsible for managing staff identities, enforcing secure access control, and issuing authenticated sessions for internal tools. Public self-registration is disabled; all staff accounts are created and managed by the system owner to maintain strict operational security.

### Core Responsibilities

#### Staff Authentication

Authenticates internal users (owner, ops, viewer) using email and password.

Passwords are securely hashed using bcrypt and never stored in plaintext.

Issues signed JWTs upon successful login.

#### Session Management

JWTs are stored in HTTP-only cookies to protect against XSS attacks.

Provides login, logout, and session validation endpoints.

Supports stateless authentication suitable for microservice architectures.

#### Role-Based Access Control (RBAC)

Enforces access levels using predefined roles (owner, ops, viewer).

Restricts sensitive operations (e.g., creating staff accounts) to the owner role.

Middleware ensures protected routes are accessible only to authorized users.

#### Internal User Management

Allows the owner to create and manage staff accounts.

Supports account activation/deactivation without deleting historical data.

Designed for small, trusted internal teams rather than public users.

#### Service Isolation

Runs as a separate service alongside the Python-based OMS.

Can be queried by internal dashboards or backend services to validate sessions.

Decouples authentication concerns from business logic and order processing.

### Security Design Principles

No public signup endpoints.

Strong password requirements for staff accounts.

HTTP-only cookies to prevent token leakage.

Centralized authentication service to reduce attack surface.

Minimal data exposure in authenticated responses.

### Intended Usage

This Auth Service acts as the security gateway for:

Internal admin dashboards

Warehouse and operations tools

Protected OMS endpoints

Future internal analytics or reporting services

It ensures that only authorized staff can access operational systems while keeping authentication logic cleanly separated from order management and inventory workflows.

## 8) Identity & Access Management (iam-Service)
The IAM Service manages internal staff authentication, authorization, and employee profiles for the QBridge Athleisure OMS, enforcing role-based access control for administrators, managers, and employees.

The IAM Service provides authentication, authorization, and employee profile management for the QBridge Athleisure internal admin and warehouse dashboard.

It manages staff accounts (admin, manager, employee), enforces role-based access control, and issues secure authenticated sessions using JWTs stored in HTTP-only cookies. Public registration is disabled; employees are created and managed internally by administrators and managers.

This service is designed for internal use only and runs alongside the Python-based Order Management System (OMS).

The IAM service provides:

Authentication (login/logout/me)

Employee profiles (self-edit)

Admin/Manager employee management (CRUD)