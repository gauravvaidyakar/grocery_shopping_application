# VISHWANEED — PROJECT CONTEXT

## 1. PROJECT NAME

Vishwaneed

## 2. PROJECT TYPE

Vishwaneed is a multi-vendor marketplace platform connecting rural producers, food vendors, and customers.

The platform allows multiple independent vendors to sell products through one marketplace.

The system has three primary applications/panels:

1. Customer Website
2. Vendor Panel
3. Admin Panel

The platform must support a complete marketplace lifecycle:

Vendor Registration
→ KYC
→ Physical Inspection
→ Admin Approval
→ Product Creation
→ Product Approval
→ Customer Discovery
→ Cart
→ Multi-Vendor Checkout
→ Payment
→ Master Order
→ Vendor Orders
→ Separate Shipments
→ Delivery
→ Return/Replacement/Refund
→ Commission
→ Settlement
→ Reviews/Complaints

---

# 3. INITIAL PRODUCT CATEGORIES

Initial marketplace categories include:

- Food Products
- Millets
- Millet-based Products
- Jaggery

The category system must be configurable so additional categories can be added later.

Products must support classification such as:

- RAW_COMMODITY
- VALUE_ADDED

Commission calculation depends on product/category classification.

---

# 4. APPLICATIONS

## 4.1 CUSTOMER WEBSITE

The customer website is the public marketplace.

Customers can:

- Register
- Login
- Verify OTP
- Manage profile
- Manage addresses
- Browse categories
- Search products
- Filter products
- Sort products
- View product details
- Add products to cart
- Purchase products from multiple vendors
- Checkout
- Select address
- View vendor-wise shipping
- Make payment
- Place COD orders
- View order confirmation
- View orders
- Track shipments
- Cancel eligible items
- Request returns
- Request replacement
- Request refunds
- Submit reviews
- Raise complaints
- Receive notifications

The customer must be able to purchase products from multiple vendors in a single checkout.

---

# 5. CUSTOMER ORDER EXPERIENCE

A customer may have:

Vendor A product
+
Vendor B product
+
Vendor C product

inside one cart.

The customer sees one checkout experience.

The backend creates:

MASTER ORDER
├── VENDOR ORDER A
│   ├── ORDER ITEM
│   └── ORDER ITEM
├── VENDOR ORDER B
│   └── ORDER ITEM
└── VENDOR ORDER C
    └── ORDER ITEM

Each vendor order can have:

- Its own status
- Its own shipment
- Its own tracking/AWB
- Its own cancellation
- Its own return
- Its own refund
- Its own commission
- Its own settlement

The customer still sees the overall purchase as one master order.

---

# 6. VENDOR PANEL

Vendors can:

- Register
- Submit business information
- Submit KYC documents
- Submit bank details
- View KYC status
- Complete inspection process
- Manage approved profile information
- Add products
- Edit products
- Upload product images
- Manage inventory
- View product approval status
- View orders
- Process orders
- Pack orders
- View shipments
- View AWB/tracking information
- View sales
- View commissions
- View ledger
- View settlements
- View reviews
- View complaints
- View relevant reports

Vendor data must be isolated.

A vendor must never be able to access another vendor's:

- Products
- Orders
- Inventory
- Customer order data beyond what is required
- Financial records
- KYC documents
- Reviews
- Complaints

---

# 7. ADMIN PANEL

Administrators can manage the marketplace.

Admin capabilities include:

- Dashboard
- Customer management
- Vendor management
- Vendor KYC
- Vendor documents
- Physical inspection
- Inspection checklist
- Vendor approval
- Vendor rejection
- Vendor suspension
- Vendor status history
- Product approval
- Product rejection
- Categories
- Orders
- Payments
- Shipments
- Refunds
- Returns
- Replacements
- Commission rules
- Vendor ledger
- Settlements
- Reviews
- Complaints
- Reports
- Audit logs
- System configuration

Admin actions affecting vendors, products, orders, payments, refunds, commissions, and settlements should be auditable.

---

# 8. VENDOR KYC

Vendor registration requires:

- PAN
- Aadhaar
- GST Certificate
- FSSAI License
- Bank Details
- Cancelled Cheque
- Business Registration Proof

FSSAI is compulsory for all food vendors.

KYC documents must not be publicly accessible.

KYC files must use secure storage and controlled access.

The database should store document metadata/reference rather than exposing sensitive files directly.

---

# 9. VENDOR APPROVAL PROCESS

Vendor workflow:

SUBMITTED
→ DOCUMENT VERIFICATION
→ PHYSICAL INSPECTION
→ INSPECTION CHECKLIST
→ APPROVED / PENDING / REJECTED

Physical inspection must support:

- Inspector
- Inspection date
- Inspection location
- Checklist
- Remarks
- Evidence/photos
- Documents verified
- Premises verified
- Quality verified
- Inspection status

Vendor status must be recorded historically.

---

# 10. VENDOR SUSPENSION

A vendor may be suspended because of:

- License expiry
- License suspension
- Counterfeit products
- Repeated quality complaints
- Agreement breach

Suspension must record:

- Status
- Reason
- Admin/user responsible
- Timestamp
- Audit information

---

# 11. PRODUCT MANAGEMENT

A vendor can create products.

Product information may include:

- Product name
- Description
- Category
- Product type
- Vendor
- Price
- MRP
- GST rate
- Weight
- Length
- Width
- Height
- Stock
- Images
- Ingredients
- Specifications

Product approval is required before a product becomes publicly purchasable.

Product lifecycle:

DRAFT
→ SUBMITTED
→ APPROVED / REJECTED
→ PUBLISHED

Only approved/published products can appear in the customer marketplace.

---

# 12. PRODUCT CLASSIFICATION

Products must support:

RAW_COMMODITY
VALUE_ADDED

Initial commission rules:

RAW/COMMODITY FOOD = 14%
VALUE-ADDED FOOD = 18%

Commission percentages must NOT be hardcoded in application logic.

They must be configurable.

---

# 13. SHIPPING

Shipping is separate from the product price.

The customer pays shipping.

Shipping must be displayed separately during checkout.

Shipping is calculated vendor-wise.

If a cart contains products from multiple vendors:

Vendor A → Shipping A
Vendor B → Shipping B
Vendor C → Shipping C

The backend must calculate and store the final shipping amount.

Shiprocket is the initial logistics provider.

Shipping calculation should use Shiprocket's applicable calculation mechanism based on information such as:

- Pickup pincode
- Delivery pincode
- Weight
- Dimensions where applicable
- Shipment information

The system must store:

- Shiprocket shipment/order identifiers
- AWB
- Tracking information
- Tracking URL
- Shipment status

The customer must be able to see tracking information.

---

# 14. PAYMENT

Primary payment provider:

Razorpay

Marketplace payment architecture should support:

- Prepaid payment
- COD
- Razorpay Route
- Vendor/Vishwaneed payment split
- Payment verification
- Webhooks
- Refunds
- Reconciliation
- Idempotency

Payment success must NEVER be trusted solely from the frontend.

The backend must verify payment status.

---

# 15. RAZORPAY ROUTE

Razorpay Route is intended for marketplace payment splitting between Vishwaneed and vendors.

The architecture should isolate Razorpay-specific implementation:

PaymentService
→ RazorpayPaymentProvider

The rest of the application must not depend directly on Razorpay SDK-specific implementation details.

---

# 16. COD

Cash on Delivery is supported.

COD orders must be tracked separately from prepaid orders.

COD payment/refund lifecycle must be supported.

---

# 17. REFUNDS

Prepaid refund:

→ Razorpay

COD refund:

→ Bank Transfer

Refunds must be recorded.

Refund information should include:

- Amount
- Type
- Status
- Reference
- Processed timestamp
- Related order/item
- Payment information

Refunds must support partial refunds.

---

# 18. GST

Customer-facing product prices are GST-inclusive.

The customer should see one final GST-inclusive product price.

The system must not add GST twice.

GST/tax information should still be retained for:

- Invoices
- Accounting
- Reporting
- Tax records

---

# 19. INVOICING

Vendor generates invoice for its products sold to the customer.

Vishwaneed generates a separate commission invoice to the vendor.

The system should maintain the relationship between:

Customer Order
→ Vendor Order
→ Vendor Invoice
→ Vishwaneed Commission Invoice

---

# 20. COMMISSION

Commission is category/product-type based.

Initial rules:

RAW/COMMODITY FOOD:
14%

VALUE-ADDED FOOD:
18%

Commission is calculated at vendor-order/item level.

Example:

Vendor A sells raw/commodity product:

Product value = ₹1,000
Commission = 14%
Commission = ₹140

Vendor B sells value-added product:

Product value = ₹1,000
Commission = 18%
Commission = ₹180

Total commission:

₹140 + ₹180 = ₹320

Commission rules must be configurable.

---

# 21. VENDOR SETTLEMENT

Settlement is NOT weekly.

Settlement is NOT monthly.

Each vendor order is individually settled.

Settlement becomes eligible 7 days after delivery.

Example:

Delivered:
10 September

Settlement eligible:
17 September

Vendor order should maintain:

- deliveredAt
- settlementEligibleAt
- settlementStatus
- settledAt
- settlementAmount

Settlement must be traceable back to:

Vendor Order
→ Commission
→ Ledger
→ Settlement
→ Settlement Item

---

# 22. MULTI-VENDOR SHIPPING

Every vendor gets a separate shipment.

Example:

Master Order #1001

Vendor A:
Shipment A
AWB A

Vendor B:
Shipment B
AWB B

Vendor C:
Shipment C
AWB C

Customers must be able to track each shipment independently.

---

# 23. ORDER CANCELLATION

Vendor partial cancellation is supported.

If a vendor cannot fulfill one product because stock is unavailable, that item can be cancelled without cancelling the entire master order.

Example:

Master Order:

Vendor A:
- Product A — fulfilled

Vendor B:
- Product B — stock unavailable → cancelled

Vendor C:
- Product C — fulfilled

Only the affected item/vendor order should be cancelled.

---

# 24. PARTIAL REFUNDS

Partial refunds are supported.

If one item is cancelled or returned:

Only the applicable item amount should be refunded.

The entire master order should NOT automatically be refunded.

Refund calculation must be performed by backend business logic.

---

# 25. RETURNS

Return window:

7 days from delivery date.

Returns must be item/vendor-order aware.

A return should store:

- Order item
- Customer
- Reason
- Request date
- Status
- Evidence/photos where applicable
- Resolution

---

# 26. REPLACEMENT

Replacement is supported.

For quality issues:

Customer can choose:

1. Replacement
2. Refund

Replacement must have its own lifecycle/status.

---

# 27. REVIEWS

Customers can review purchased products.

Reviews should be associated with:

- Customer
- Order
- Order item
- Product
- Vendor

Only eligible customers should be allowed to submit reviews for purchased products.

---

# 28. COMPLAINTS

Customers can raise complaints.

Complaints may relate to:

- Product
- Vendor
- Order
- Shipment
- Quality
- Delivery
- Other marketplace issues

Complaint system should support:

- Complaint
- Messages
- Attachments
- Status
- Admin/vendor handling
- Resolution

---

# 29. WHATSAPP NOTIFICATIONS

Initial WhatsApp provider:

Interakt

Notification architecture:

NotificationService
→ WhatsAppProvider
→ InteraktWhatsAppProvider

Do not tightly couple business logic to Interakt.

Required notification templates include:

- Order confirmation
- Payment confirmation
- COD reminder
- Order dispatched
- Tracking information
- Out for delivery
- Delivered
- Vendor notification

Vishwaneed pays WhatsApp messaging charges.

---

# 30. CORE ORDER LIFECYCLE

Recommended lifecycle:

PENDING
→ CONFIRMED
→ PROCESSING
→ PACKED
→ SHIPPED
→ DELIVERED

Possible alternate states:

CANCELLED
RETURN_REQUESTED
RETURNED
REFUND_PENDING
REFUNDED
REPLACEMENT_REQUESTED
REPLACED

The backend must enforce valid state transitions.

---

# 31. IMPORTANT BUSINESS PRINCIPLE

The backend is the source of truth for:

- Product price
- Stock
- Discounts
- Shipping
- GST
- Order totals
- Commission
- Refunds
- Settlement

The frontend must never be trusted for authoritative financial calculations.

---

# 32. INITIAL TECHNICAL DIRECTION

Recommended architecture:

Frontend:
- React
- TypeScript
- Vite
- React Router
- MUI
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod

Backend:
- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- JWT

Architecture style:

MODULAR MONOLITH

Do not build microservices initially.

The system should be modular internally so services can be extracted later if necessary.

---

# 33. RECOMMENDED REPOSITORY STRUCTURE

vishwaneed/

├── apps/
│   ├── customer-web/
│   ├── vendor-panel/
│   ├── admin-panel/
│   └── api/
│
├── packages/
│   ├── types/
│   ├── validation/
│   ├── ui/
│   └── config/
│
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── BUSINESS_RULES.md
│   ├── PRODUCTION_RULES.md
│   ├── API_SPEC.md
│   ├── ORDER_FLOW.md
│   ├── DATABASE_DESIGN.md
│   └── INTEGRATION_PLAN.md
│
├── infrastructure/
├── docker/
├── .github/
├── AGENTS.md
├── package.json
└── README.md

---

# 34. DEVELOPMENT PRIORITY

Priority order:

1. Project foundation
2. Authentication
3. RBAC
4. Vendor registration/KYC
5. Vendor approval
6. Product management
7. Product approval
8. Customer marketplace
9. Cart
10. Multi-vendor checkout
11. Orders
12. Payments
13. Shipments
14. Commission
15. Vendor ledger
16. Settlement
17. Returns/refunds
18. Reviews/complaints
19. Notifications
20. Reporting
21. Hardening/testing

---

# 35. MVP TARGET

The first 2–3 day development sprint should produce a working production-grade core architecture and end-to-end marketplace flow.

The minimum critical demonstration should be:

Vendor A registers
→ KYC
→ Admin approves
→ Vendor A creates product
→ Admin approves product

Vendor B registers
→ KYC
→ Admin approves
→ Vendor B creates product
→ Admin approves product

Customer:
→ Views products
→ Adds Vendor A + Vendor B products to cart
→ Checks out
→ Payment/COD
→ Master Order created
→ Vendor Order A created
→ Vendor Order B created
→ Separate shipments created
→ Tracking available

Financial flow:
→ Commission calculated
→ Vendor ledger updated
→ Delivery recorded
→ Settlement eligibility calculated for 7 days later

---

# 36. IMPORTANT UNRESOLVED BUSINESS DECISION

The development team must NOT invent a rule for how shipping charges are handled when an individual vendor item is cancelled or returned.

The following needs explicit business confirmation:

- Whether the corresponding vendor shipping charge is refunded when that vendor's entire shipment is cancelled
- How shipping is handled when only one item from a vendor order is cancelled
- How shipping discounts/free-shipping thresholds, if introduced later, are allocated across vendors

Until confirmed, isolate this logic behind a configurable shipping/refund policy rather than hardcoding assumptions.