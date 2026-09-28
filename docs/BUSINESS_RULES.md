# VISHWANEED — BUSINESS RULES

## 1. COMMISSION

Commission is category/product-type based.

### Raw / Commodity Food

Commission:
14%

### Value-Added Food

Commission:
18%

Commission is NOT vendor-specific.

Commission must be configurable.

Do NOT hardcode:

14

or

18

inside business logic.

Use configurable commission rules.

Recommended model:

CommissionRule

Fields may include:

- id
- categoryId/productType
- percentage
- effectiveFrom
- effectiveTo
- status
- createdAt
- updatedAt

Commission is calculated at vendor-order/item level.

Example:

Raw product:

₹1,000 × 14% = ₹140

Value-added product:

₹1,000 × 18% = ₹180

---

# 2. SETTLEMENT

Settlement is individual-order based.

There is NO:

- Weekly settlement
- Monthly settlement

Each eligible vendor order is settled separately.

Settlement eligibility:

deliveredAt + 7 days

Example:

deliveredAt:
2026-09-10

settlementEligibleAt:
2026-09-17

VendorOrder must support:

- deliveredAt
- settlementEligibleAt
- settlementStatus
- settledAt
- settlementAmount

Recommended settlement states:

PENDING
ELIGIBLE
PROCESSING
SETTLED
FAILED
ON_HOLD

Settlement amount must be calculated by backend.

---

# 3. SHIPPING

Customer pays shipping separately.

Shipping is NOT included in product price.

Shipping is vendor-wise.

Each vendor order can have its own shipping charge.

Initial shipping provider:

Shiprocket

Shipping calculation must be performed by backend/provider integration.

Potential inputs:

- Origin pincode
- Destination pincode
- Weight
- Dimensions
- Shipment type

Backend must store final shipping amount.

Frontend must display the backend-provided shipping amount.

---

# 4. PAYMENT

Payment provider:

Razorpay

Supported payment methods:

- Prepaid
- COD

Marketplace architecture should support:

Razorpay Route

Payment must be verified server-side.

Frontend payment success is not sufficient to mark an order as paid.

Payment records must support:

- Provider
- Provider order ID
- Provider payment ID
- Amount
- Currency
- Status
- Method
- Metadata
- Verification timestamp

---

# 5. RAZORPAY ROUTE

Razorpay Route is used for marketplace vendor/Vishwaneed split architecture.

Keep Razorpay-specific logic inside:

PaymentService
→ RazorpayPaymentProvider

Route implementation must be designed so vendor payouts and Vishwaneed commission can be reconciled.

---

# 6. COD

COD is supported.

COD order status must not be treated as prepaid payment success.

COD collection must be tracked separately.

---

# 7. REFUNDS

Prepaid refund:

RAZORPAY

COD refund:

BANK TRANSFER

Refund must support:

- Full refund
- Partial refund

Refund should reference:

- Master order
- Vendor order
- Order item
- Payment
- Refund reason

Refund statuses may include:

PENDING
PROCESSING
COMPLETED
FAILED

---

# 8. GST

Product price shown to customer is GST-inclusive.

Example:

Customer sees:

₹118

If that displayed price already includes 18% GST, the system must NOT calculate:

₹118 + 18% GST

again.

Tax information must still be stored for:

- Invoice
- Accounting
- Reporting
- Tax records

---

# 9. INVOICES

Vendor creates invoice for products sold to customer.

Vishwaneed creates separate commission invoice to vendor.

Do not combine the vendor sales invoice and Vishwaneed commission invoice into one conceptual invoice.

---

# 10. KYC

Required vendor documents:

1. PAN
2. Aadhaar
3. GST Certificate
4. FSSAI License
5. Bank Details
6. Cancelled Cheque
7. Business Registration Proof

FSSAI:

MANDATORY FOR ALL FOOD VENDORS

Sensitive documents must have restricted access.

---

# 11. VENDOR APPROVAL

Required sequence:

Vendor registration
→ Documents submitted
→ Document verification
→ Physical inspection
→ Inspection checklist
→ Admin decision

Possible outcomes:

APPROVED
PENDING
REJECTED

Approval must be auditable.

---

# 12. VENDOR SUSPENSION

Suspension conditions:

- License expired
- License suspended
- Counterfeit product
- Repeated quality complaints
- Agreement breach

Suspension must store a reason.

---

# 13. MULTI-VENDOR CART

A single cart may contain products from multiple vendors.

Example:

Vendor A:
Product A

Vendor B:
Product B

Vendor C:
Product C

Checkout remains one customer checkout.

Backend splits it into vendor orders.

---

# 14. ORDER STRUCTURE

Required hierarchy:

MASTER ORDER
    |
    +-- VENDOR ORDER A
    |       |
    |       +-- ORDER ITEM
    |       +-- ORDER ITEM
    |
    +-- VENDOR ORDER B
            |
            +-- ORDER ITEM

Master order represents customer checkout.

Vendor order represents the vendor-specific fulfillment/financial unit.

Order item represents individual product quantity.

---

# 15. MULTIPLE SHIPMENTS

Each vendor order gets its own shipment.

One master order may have:

Shipment A
Shipment B
Shipment C

Each shipment has:

- Carrier/provider
- Shipment ID
- AWB
- Tracking URL
- Status
- Timestamps

---

# 16. PARTIAL CANCELLATION

A vendor may cancel an individual item if stock is unavailable.

Do NOT cancel unrelated vendor items.

Example:

Vendor B has:

Product X — available
Product Y — unavailable

Only Product Y may be cancelled.

---

# 17. PARTIAL REFUND

If an item is cancelled:

Refund only the affected item amount.

If an item is returned:

Refund only the applicable returned item amount.

Do not automatically refund the entire master order.

---

# 18. RETURNS

Return window:

7 days from delivery date.

Return eligibility must be calculated by backend using the actual delivery timestamp/date.

Do not rely on frontend date calculations for authorization.

---

# 19. REPLACEMENT

For eligible quality issues:

Customer can choose:

REPLACEMENT

or

REFUND

Replacement must be represented as a separate process/state.

---

# 20. REVIEWS

Only customers with a valid purchase should be allowed to review the corresponding product.

Review should be associated with:

- Customer
- Product
- Vendor
- Order
- Order Item

---

# 21. COMPLAINTS

Complaints can be related to:

- Product
- Vendor
- Order
- Shipment
- Quality
- Delivery

Complaint system supports:

- Status
- Messages
- Attachments
- Resolution

---

# 22. WHATSAPP

Provider:

Interakt

Architecture:

NotificationService
→ WhatsAppProvider
→ InteraktProvider

Templates:

- Order confirmation
- Payment confirmation
- COD reminder
- Dispatched
- Tracking
- Out for delivery
- Delivered
- Vendor notification

Vishwaneed pays messaging charges.

---

# 23. CONFIGURATION

The following must be configurable:

- Commission percentages
- Settlement days
- Return window
- Vendor statuses
- Shipping rules
- Tax configuration
- Notification templates
- Other marketplace policies

Avoid magic numbers.

For example:

Do NOT write:

settlementDate = deliveredAt + 7 days

directly in multiple places.

Instead use configuration:

SETTLEMENT_DAYS = 7

---

# 24. BUSINESS RULE PRIORITY

When business rules conflict:

1. Explicit current business decision
2. Approved project documentation
3. Existing production implementation
4. Developer assumption

Developers must NOT invent business rules silently.

If a required business rule is unclear:

- Stop the affected implementation
- Document the ambiguity
- Ask Project Manager
- Implement a configurable abstraction where possible