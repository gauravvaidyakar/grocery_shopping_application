# Vishwaneed Database Transition Plan

## Decision and safety boundary

MongoDB is the system of record for all new Vishwaneed development and future
application data. The existing Render PostgreSQL database is a read-only legacy
production dependency until a separately approved cutover. This work does not
connect to, alter, migrate, reset, truncate, delete, or apply schema changes to
that PostgreSQL database. Its Render environment configuration also remains
unchanged.

No PostgreSQL data is copied automatically. A future import, if requested, must
use a separately reviewed mapping, reconciliation, dry-run, backup, and rollback
plan.

## Current PostgreSQL architecture

The deployed API currently runs commit `d787af8` and receives a PostgreSQL
`DATABASE_URL` from Render. The legacy schema is represented by the SQL files in
`apps/api/prisma/migrations`. Those files are retained only as historical
documentation and must never be executed against MongoDB or reapplied to the
production PostgreSQL database.

The legacy deployed API is a NestJS modular monolith whose domain services use
`PrismaService` for authentication, customers, vendors, catalogue, inventory, cart,
checkout, orders, payments, shipments, commission, ledger, settlements,
refunds, returns, replacements, reviews, complaints, notifications, audit logs,
and integration settings. Multi-document transactions protect order placement,
inventory reservation/release, payment webhooks, cancellations, refunds,
returns, shipments, and settlement processing.

## MongoDB architecture

The new persistence layer uses MongoDB Atlas through Mongoose.
It is a deliberate hybrid document/reference model:

- Mutable, independently queried business entities remain separate collections
  connected by stable string IDs. This avoids unbounded documents and lets
  marketplace workflows update inventory, payments, shipments, refunds, and
  settlement state independently.
- Immutable point-in-time facts are embedded as documents: delivery-address
  snapshots, checkout price/shipping snapshots, provider webhook payloads,
  inspection checklists/evidence, product specifications, audit metadata, and
  shipment status history.
- Money is stored as numeric major-unit values and calculated with explicit
  rounding at commission/refund boundaries. Currency is stored with commercial
  records. Historical order-item prices, GST rates, product names, shipping,
  and commission rates are snapshots and do not follow later catalogue edits.
- MongoDB transactions preserve cross-collection invariants. The Atlas cluster
  must therefore remain a replica set deployment, including on the free tier.
- Idempotency keys and unique compound indexes prevent duplicate orders,
  provider events, inventory movements, ledger entries, settlements, and
  refunds.

## Collections

| Area | Collections | Design notes |
| --- | --- | --- |
| Identity | `User`, `VerificationOtp`, `PasswordResetToken` | Authentication identity is separate from customer/vendor profiles; OTPs and reset tokens are hashed and expire. |
| Customer | `CustomerProfile`, `Address` | Addresses remain reusable records; orders embed an immutable delivery snapshot. |
| Vendor/KYC | `Vendor`, `VendorDocument`, `VendorInspection`, `VendorBankAccount`, `VendorStatusHistory` | KYC, encrypted bank data, inspection evidence, suspension state, pickup pincode, and audit history remain independently controlled. |
| Catalogue | `Category`, `Product`, `ProductImage`, `HomeHeroSlide` | Category hierarchy uses `parentId`; catalogue records reference vendor/category; images are ordered child records. |
| Inventory | `Inventory`, `InventoryTransaction` | One inventory record per product with quantity, reserved quantity, optimistic version, and immutable movement history. |
| Cart/checkout | `Cart`, `CartItem`, `CheckoutQuote` | One cart per customer; quotes embed vendor-wise shipping and price snapshots with expiry/consumption state. |
| Orders | `MasterOrder`, `VendorOrder`, `OrderItem` | Master order groups payment/customer totals; vendor orders split shipping and fulfillment by vendor; items retain commercial snapshots and support partial cancellation. |
| Payments/fulfillment | `Payment`, `ProviderEvent`, `Shipment` | Razorpay/COD state, webhook idempotency, Shiprocket identifiers, tracking, and status history are isolated from order documents. |
| Marketplace finance | `CommissionRule`, `CommissionTransaction`, `VendorLedger`, `Settlement`, `SettlementItem` | Effective-dated configurable commission, immutable postings, seven-day eligibility, vendor-order reconciliation, and Razorpay Route references. |
| Post-purchase | `Refund`, `ReturnRequest`, `Replacement`, `Review` | Item-level records support partial refunds, seven-day returns, replacement flows, and one review per purchased item. |
| Support/operations | `Complaint`, `ComplaintMessage`, `Notification`, `AuditLog`, `IntegrationSetting` | Support threads, delivery queues, immutable audit evidence, and encrypted provider settings are separate operational streams. |

## Important indexes and constraints

- Unique identity keys: user email/mobile, vendor GSTIN, product/category slugs,
  order numbers, checkout/order idempotency keys, provider payment/refund/event
  IDs, upload storage keys, and encrypted-setting keys.
- One-to-one constraints: customer/vendor per user, cart per customer, inventory
  per product, shipment per vendor order, commission/return/replacement/review
  per order item, and settlement membership per vendor order.
- Marketplace query indexes: vendor/status/created time, category/product type/
  status, customer/order date, vendor-order status/date, payment/refund status,
  shipment status/update time, settlement status/date, complaint status/date,
  notification status/date, and audit entity/date.
- Idempotency constraints: inventory movement reference, vendor ledger reference,
  provider event, master-order idempotency key, and settlement item.
- Expiry lookup indexes: OTP and password-reset expiry and checkout-quote expiry.
  TTL deletion is intentionally not enabled because consumed/security records
  may be needed for audit; scheduled cleanup can be added after a retention
  policy is approved.

The authoritative collection and index declarations live in
`apps/api/src/database/mongo.schemas.ts` and are applied with
`npm run mongodb:setup --workspace @vishwaneed/api` only to the new MongoDB database.

## Preserved business rules

- Raw/commodity commission defaults to 14%; value-added commission defaults to
  18%. `CommissionRule` keeps rates configurable and effective-dated.
- Settlement eligibility is seven days after delivery and is reconciled through
  vendor orders, commissions, refunds, ledger entries, and settlement items.
- Customers pay shipping separately; checkout snapshots and vendor orders store
  vendor-wise Shiprocket shipping charges.
- GST-inclusive customer prices and immutable item GST/price snapshots are
  retained for vendor sales invoices and separate Vishwaneed commission invoices.
- Razorpay prepaid payments, Razorpay Route marketplace references, COD,
  Shiprocket tracking, partial cancellation/refund, returns, replacements,
  vendor KYC/inspection, MSG91 OTP, and Interakt notifications retain their
  existing API/service boundaries.

## Environment and credential rules

- `MONGODB_URI` is backend-only and must be an Atlas `mongodb+srv://` (or local
  development `mongodb://`) connection string selecting the
  `grocery_web_application` database.
- `MONGODB_DATABASE` must be exactly `grocery_web_application`.
- Production startup rejects non-MongoDB URLs, any other database name, and any
  username other than the dedicated `grocery_web_application` database user.
- The Atlas-admin database user is never used by application code.
- Connection strings and credentials must never be committed, logged, returned
  by an API, or exposed to a frontend bundle.
- Atlas network access should allow only the API's documented outbound ranges.
  No access-list change is part of this implementation.

## Controlled transition and future migration strategy

1. Keep the current Render API and PostgreSQL `DATABASE_URL` unchanged on its
   existing deployed commit.
2. Develop and validate the MongoDB version without pushing a deployment that
   could trigger the current production service.
3. Apply the MongoDB schema/indexes and seed only to the dedicated Atlas database
   using the dedicated application user.
4. Deploy a separate candidate API or explicitly approved cutover revision with
   the MongoDB URL stored only in backend environment variables.
5. Run customer, vendor, admin, authentication, cart, order, payment, shipping,
   commission, settlement, and post-purchase smoke tests against candidate data.
6. Change frontend routing only after explicit approval and a successful cutover
   checklist. Preserve the legacy PostgreSQL service for rollback/read-only
   reference.
7. If legacy import is later approved, use repeatable export/transform/import
   jobs with ID maps, monetary reconciliation, row/document counts, duplicate
   detection, audit logs, and a dry run. Do not dual-write without a dedicated
   consistency and recovery design.

## Data that will not be migrated now

No legacy customers, credentials, vendors, KYC records, products, inventory,
carts, orders, payments, shipments, commission records, ledger entries,
settlements, refunds, returns, replacements, reviews, complaints,
notifications, provider settings, or audit logs are imported from PostgreSQL.
Only idempotent bootstrap data created directly in the new MongoDB database is
permitted: the configured administrator, initial categories, and default 14% / 18%
commission rules.

## Verification and release gate

Before any production cutover, verify MongoDB connectivity, schema/index
application, seed idempotency, API startup, customer registration/login and OTP,
vendor/KYC/inspection data, catalogue, inventory, cart, order/vendor-order
creation, commission, settlement, payments, shipment tracking, refunds/returns/
replacements, and all customer/vendor/admin APIs. The repository must also pass
MongoDB integration tests, lint, typecheck, automated tests, and production
builds. Real payments, shipments, SMS, or WhatsApp messages require separately
approved provider-side smoke tests.
