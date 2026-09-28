# Vishwaneed customer web

Customer-facing React application for the Vishwaneed multi-vendor marketplace. The app uses a typed API boundary and can run against a development-only local adapter while the backend is being implemented.

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when you need to override the defaults.

```dotenv
VITE_API_MODE=mock
VITE_API_URL=/api/v1
```

- `VITE_API_MODE=mock` uses local catalogue, account, cart, address, quote, COD-order, order-history, tracking, return, review, and complaint responses. The UI always identifies this mode. It intentionally does not simulate a successful Razorpay payment.
- `VITE_API_MODE=http` uses the centralized HTTP adapter and `VITE_API_URL`. Do not place secrets in Vite environment variables.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Backend integration

The frontend contract is in `src/api/types.ts`; live endpoint mapping is in `src/api/httpMarketplaceApi.ts`. The cross-team endpoint checklist is in `../../docs/CUSTOMER_API_REQUIREMENTS.md`. Backend-calculated checkout quotes remain authoritative for product totals, GST-inclusive prices, vendor shipping, stock, final payable amount, refund eligibility, and refund values. Prepaid checkout stays disabled in mock mode until payment creation, verification, and status APIs are available.
