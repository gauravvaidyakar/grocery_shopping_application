# Vishwaneed API

NestJS modular-monolith API for Vishwaneed. PostgreSQL is the system of record and Prisma owns the relational schema and migrations.

## Local setup

1. Install PostgreSQL 15 or newer and create an empty `vishwaneed` database.
2. Copy `.env.example` to `.env` and replace every secret/example credential.
3. Run `npm run prisma:generate --workspace @vishwaneed/api`.
4. Run `npm run prisma:migrate --workspace @vishwaneed/api`.
5. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then run `npm run prisma:seed --workspace @vishwaneed/api`.
6. Run `npm run dev:api` from the repository root.

The API is served at `http://localhost:4000/api/v1`. Swagger is served at `http://localhost:4000/api/docs`.

## Transaction flow

1. `POST /api/v1/checkout/validate` creates a short-lived backend-priced quote grouped by vendor.
2. `POST /api/v1/orders` consumes that quote once and reserves inventory atomically.
3. Prepaid orders use `POST /api/v1/payments/create`; stock is committed only after verified capture (customer verification or signed webhook). COD orders commit stock at confirmation but remain a distinct pending COD payment.
4. Each vendor creates and tracks its own shipment. Signed Shiprocket webhooks update shipment/vendor-order state independently.
5. Delivery starts the configured return and settlement clocks. Settlement refresh creates one settlement per eligible vendor order.

Development shipping and WhatsApp providers are explicitly identified in stored records. Production requires database, JWT, encryption, and CORS configuration at startup. Razorpay, Shiprocket, and Interakt credentials can be stored after deployment through the administrator System configuration page; environment variables remain a fallback.

For real WhatsApp delivery, set `WHATSAPP_PROVIDER=INTERAKT`, provide
`INTERAKT_API_KEY`, keep `INTERAKT_API_URL` pointed at Interakt's send-template
endpoint, and map every `WHATSAPP_TEMPLATE_*` value in `.env.example` to an
approved/synchronised Interakt template. Vendors must save a WhatsApp mobile
number under **Profile, KYC & inspection → WhatsApp contact**. Development mode
only creates simulated `DEV-WHATSAPP-*` provider references and does not deliver
messages to a handset.

KYC files are private. `PRIVATE_UPLOAD_DIR` must point to durable, non-public storage and must not be served as static files. In production, replace local disk with a private S3/R2 adapter while retaining authorization checks.

## Day 1 verification flow

1. Register a vendor with `POST /api/v1/auth/register` and `role: "VENDOR"`.
2. Complete the vendor profile and bank account, upload every KYC document, then call `POST /api/v1/vendor/kyc/submit`.
3. As admin, verify each document and the bank account, create/update an inspection, then approve the vendor.
4. As vendor, create and submit a product.
5. As admin, approve the product.
6. Fetch it anonymously from `GET /api/v1/products` or `GET /api/v1/products/:id`.

Only approved products belonging to approved vendors are returned by public catalogue endpoints.
