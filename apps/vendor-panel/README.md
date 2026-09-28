# Vishwaneed Vendor Panel

Responsive React and TypeScript vendor workspace integrated with the NestJS API.

## Run locally

1. Start PostgreSQL and the API.
2. Copy `.env.example` to `.env` if the API is not available through the same origin.
3. From the repository root run `npm run dev:vendor`.
4. Open `http://localhost:5174`.

The API must allow `http://localhost:5174` in `CORS_ORIGINS`.

## Security model

- Vendor identity is taken only from the access token.
- The panel never sends a vendor ID for ownership decisions.
- Private KYC downloads use an authenticated API request.
- Financial figures, status transitions, stock reservations, commission and settlements remain backend-authoritative.

## Current backend-dependent gaps

- Product media accepts the existing API's image URL array; binary product-image upload is not exposed by the API.
- Notifications can be listed but the database/API has no read/unread field or mutation.
- Password management uses the backend-authenticated vendor change-password
  endpoint and the shared expiring, single-use forgot/reset-token flow.
- Return/replacement decisions remain admin-controlled by the current API; the vendor can inspect them but cannot mutate them.
- Shiprocket and WhatsApp behavior depends on provider credentials and adapters configured in the API environment.
