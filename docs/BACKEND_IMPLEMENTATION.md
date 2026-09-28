# Backend implementation

## Architecture

The backend is a NestJS modular monolith in `apps/api`. It uses PostgreSQL, Prisma, DTO validation, JWT access/refresh tokens, RBAC, a standard response envelope, centralized exception handling, private document storage, Swagger, and audit logs.

Modules are separated for authentication, users, customers, addresses, vendors, vendor documents, inspections, categories, products, inventory, cart, orders, payments, shipments, commission, ledger, settlements, refunds, returns, replacements, reviews, complaints, notifications, and admin operations.

## Security boundaries

- Vendor identity is derived from the authenticated user; vendor IDs supplied by a client are not trusted for vendor-owned reads/writes.
- Customer order, shipment, review, return, complaint, address, and cart queries include customer ownership predicates.
- Admin self-registration is rejected.
- Passwords and refresh tokens are bcrypt-hashed.
- Bank account numbers are encrypted with AES-256-GCM and API responses expose only the last four digits.
- KYC documents are stored outside the public web root and downloads require vendor ownership or the admin role.
- Public catalogue queries require both an approved product and approved vendor.

## Provider boundaries

Razorpay order creation, live payment reconciliation, signature verification, idempotent webhooks, and partial refunds are isolated in the payments/refunds modules. Missing credentials produce a service-unavailable error; they never produce fake payment success.

Shiprocket rate calculation, shipment/return-order creation, and webhook status synchronization are behind a shipping provider interface. Development shipping is explicitly labelled and is selected only outside production unless deliberately configured. WhatsApp uses the same pattern with development and Interakt providers.

Production startup requires Razorpay, Shiprocket, and Interakt credentials plus webhook secrets. Provider network calls still require sandbox/UAT certification with the merchant accounts before launch.

## Business decisions still required

The existing documentation explicitly leaves shipping refunds for partial item/vendor cancellation unresolved. The backend therefore refunds only the affected item value and does not silently refund shipping. The final shipping-refund allocation policy must be approved before launch.

Settlement eligibility is enforced per vendor order at `deliveredAt + SETTLEMENT_DAYS`. Pending refunds and open returns hold eligibility. Payout completion is an explicit admin reconciliation step because the final marketplace payout/Route account rules are not specified.
