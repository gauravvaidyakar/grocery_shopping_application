# Database architecture

Vishwaneed's active backend persistence is MongoDB through Mongoose. `DatabaseModule` owns the connection, schema registration, index creation, repository delegates, relation hydration, atomic updates, and MongoDB sessions. Frontend applications continue to communicate only with the NestJS API.

Runtime variables are backend-only:

- `MONGODB_URI`: Atlas or local replica-set URI. Production must authenticate as `grocery_web_application`.
- `MONGODB_DATABASE`: must be `grocery_web_application`.

The existing Render PostgreSQL service is legacy production infrastructure. It is not read, written, migrated, or used by the MongoDB code path. Legacy Prisma schema and SQL migration files remain under `apps/api/prisma` only as migration reference material.

Money is stored as BSON Decimal128 and converted to API numbers at the repository boundary. Public IDs remain UUID strings in `_id` to preserve existing API URLs and frontend contracts. Orders, payments, inventory, refunds, and settlements use MongoDB sessions for multi-document invariants; guarded inventory changes use atomic conditional updates.

Schemas run in `strict: "throw"` mode so an undeclared field fails immediately
instead of being silently stored or discarded. Product prices remain GST-inclusive;
vendor invoice snapshots extract taxable value and GST in integer paise without
changing the customer total.

Production traffic must not switch until the candidate service, integration suite, provider sandbox checks, and readiness review all pass and the owner explicitly approves cutover.
