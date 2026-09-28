# Vishwaneed requirements audit

Source reviewed: `vishwaneed_marketplace_requirements.pdf` (4 pages, 12 sections). This file records implementation evidence and deliberately separates stated requirements from policy decisions that the document says still require confirmation.

## Coverage matrix

| Requirement area | Status | Implementation evidence / remaining decision |
| --- | --- | --- |
| Multi-vendor marketplace and configurable categories | Implemented | Approved vendor/product catalogue, category management, master/vendor order split, product-type/category commission rules. |
| Customer, vendor and admin applications | Implemented | Separate TypeScript workspaces with role-protected routing and server-side RBAC. |
| Customer registration, login, logout and password reset | Implemented | JWT access/refresh sessions, password reset, mobile OTP verification, session expiry handling. OTP delivery uses the configured WhatsApp provider and stores only a bcrypt hash. |
| Customer profile and addresses | Implemented | Profile CRUD plus add/edit/delete/default checkout addresses. |
| Home discovery | Implemented | Categories, new arrivals, best sellers, featured regional vendors, promotional content and offer products. |
| Catalogue and PDP | Implemented | Search, category/vendor/type/price/availability filters, sorting, pagination, responsive product cards, images, seller, price/MRP/GST-inclusive display, weight, stock and related products. |
| Cart and checkout | Implemented | Backend cart, vendor grouping, quantity/stock/price refresh, address, vendor-wise shipping, backend quote, one checkout and payment method. |
| Coupon discounts | Policy blocked | No approved coupon model, eligibility, funding, stacking, expiry or refund-allocation rules are defined. The UI must not invent a discount. |
| Orders, vendor splits and tracking | Implemented | One MasterOrder with independent VendorOrders, item cancellation, Shiprocket shipment/AWB/tracking and customer order status. |
| Reviews and trust | Implemented | Delivered-item eligibility, rating/comment, up to three review image URLs, edit with re-moderation, report-to-complaint workflow, admin moderation and vendor read-only visibility. |
| Complaints | Implemented | Product/quality/delivery/payment/return/other categories, attachments, messages, admin/vendor ownership and status workflow. |
| Vendor onboarding and KYC | Implemented | Registration, business/bank/tax data, protected documents, verification states, inspection checklist and admin approval gate. |
| Vendor dashboard | Implemented | Product, stock, order, return, sales, commission, net-settlement, review and complaint metrics sourced from backend records. |
| Product/inventory/vendor orders | Implemented | Approval workflow, images/specifications, transactional inventory, ownership checks, valid order transitions and item-level cancellation. |
| Admin dashboard and operations | Implemented | Vendor/customer/product/order/payment/shipment/commission/ledger/settlement/refund/return/replacement/review/complaint/configuration areas and expanded backend metrics. |
| Payments/refunds/reconciliation | Implemented | Razorpay order creation/signature verification/webhooks/status refresh, payment history, backend refund amounts and reconciliation/admin views. |
| Commission/ledger/settlements | Implemented | Backend rules and immutable financial records; delivered-plus-seven-day settlement eligibility remains backend-authoritative. |
| WhatsApp notifications | Implemented | Order, payment, vendor processing, item cancellation, shipment, delivery, return, complaint conversation/status and refund status events. Provider failures remain visible in notification audit records. |
| Responsive and accessibility basics | Implemented | Desktop/tablet/mobile layouts, responsive navigation/tables/forms, labels, semantic controls, keyboard/focus states, loading/empty/error/retry handling. |
| Security | Implemented | Password hashing, token rotation/revocation, role/ownership enforcement, private KYC storage, encrypted bank data, validation, CORS/rate limits and audit records. |

## Confirm before implementing

The source document explicitly identifies these as business-policy decisions. They must be approved rather than guessed:

- coupon eligibility, stacking, funding and refund allocation;
- final commission exceptions and settlement schedule overrides;
- production Razorpay account/webhook policy;
- Shiprocket serviceability, shipping charge and reverse-logistics policy;
- final KYC list, quality checklist and expiry enforcement rules;
- cancellation, return, replacement and refund windows/exceptions;
- GST invoicing ownership, numbering and document format;
- approved Interakt template names/languages and consent rules;
- exact MVP scope and deferred categories.

## Verification gate

Every change covered by this audit must pass Prisma generation, lint, TypeScript checks, automated tests, production builds and the responsive browser audit before release. Production integrations additionally require valid provider credentials and webhook URLs; code-level success cannot substitute for provider-side account approval.
