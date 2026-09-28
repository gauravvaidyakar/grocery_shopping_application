# Customer web API integration contract

This document records the endpoints consumed by `apps/customer-web`. All protected endpoints require a customer access token and must return the standard `{ success, data, message, meta? }` envelope from `API_SPEC.md`.

## Existing API specification endpoints consumed

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/cart` | Authoritative cart, current price/stock issues, and vendor grouping. Also used for price/stock refresh. |
| POST | `/api/v1/cart/items` | Add `{ productId, quantity }`. Returns the complete refreshed cart. |
| PATCH | `/api/v1/cart/items/:itemId` | Update `{ quantity }`. Returns the complete refreshed cart. |
| DELETE | `/api/v1/cart/items/:itemId` | Remove one line. Returns the complete refreshed cart. |
| GET/PATCH | `/api/v1/customers/me` | Read/update customer profile. |
| GET/POST/PATCH/DELETE | `/api/v1/customers/me/addresses[/:id]` | Address management. |
| POST | `/api/v1/checkout/validate` | Accepts `{ addressId }`; returns an expiring authoritative quote with vendor groups, product subtotal, vendor shipping, total shipping, and payable total. |
| POST | `/api/v1/orders` | Accepts `{ quoteId, addressId, paymentMethod }`; returns the master order with vendor orders and backend amounts. Must be idempotent. |
| GET | `/api/v1/orders` | Paginated customer master orders, optionally filtered by backend order status. |
| GET | `/api/v1/orders/:orderId` | Master order, vendor orders, items, backend action eligibility, shipments, returns, reviews, and payment status. |
| POST | `/api/v1/payments/create` | Accepts `{ masterOrderId }`; returns Razorpay public key, provider order ID, internal payment ID, amount in minor units, currency, and prefill data. Never returns a Razorpay secret. |
| POST | `/api/v1/payments/verify` | Accepts internal payment ID plus Razorpay order/payment/signature fields. Backend verifies signature, amount, ownership, and idempotency. |
| GET | `/api/v1/shipments/:shipmentId/tracking` | Shipment status, provider/carrier, AWB, tracking URL, estimate, and tracking events. |
| POST multipart | `/api/v1/orders/:orderId/items/:itemId/return` | Return or quality issue with `reason`, `resolution` (`REFUND`/`REPLACEMENT`), and optional attachments. Backend decides eligibility and amounts. |

## Required API gaps

These customer-facing endpoints are required by the implemented UI but are not defined in the current `API_SPEC.md`:

| Method | Proposed endpoint | Required behavior |
| --- | --- | --- |
| GET | `/api/v1/payments/:paymentId/status` | Authoritative payment status refresh after Razorpay success, failure, or dismissal. |
| POST | `/api/v1/orders/:orderId/items/:itemId/cancel` | Item-level customer cancellation. Accepts `{ reason }`; rejects when backend `canCancel` is false. Must not cancel unrelated items/vendor orders. |
| POST | `/api/v1/products/:productId/reviews` | Accepts `{ orderItemId, rating, comment }`; backend verifies delivered purchase eligibility. |
| GET/POST | `/api/v1/complaints` | List customer complaints / create multipart complaint with optional attachments. |
| GET | `/api/v1/complaints/:complaintId` | Complaint detail, status, messages, attachments, and related entities. |
| POST | `/api/v1/complaints/:complaintId/messages` | Add `{ message }` to an open complaint owned by the customer. |

## Required backend-owned fields

- Cart lines: `issue`, `previousUnitPrice`, `currentUnitPrice`, and current available quantity.
- Order items: `actions.canCancel`, `actions.canReturn`, `actions.canReview`, `actions.canRaiseComplaint`, plus ineligibility reasons.
- Returns/refunds/replacements: status, status message, and backend-provided refund amount when applicable.
- Vendor orders: independent status, backend product subtotal, shipping, order total, estimate, and shipment.
- Payment: backend status is authoritative. A Razorpay frontend callback or closed window never marks an order paid.

Exact TypeScript response shapes are maintained in `apps/customer-web/src/api/types.ts`.
