# VISHWANEED — PRODUCTION DEVELOPMENT RULES

## 1. GENERAL PRINCIPLE

This is a production marketplace application.

Code must not be written as a throwaway prototype merely because the initial development sprint is 2–3 days.

Speed is important, but architecture must remain maintainable and secure.

---

# 2. TYPESCRIPT

Use TypeScript throughout the project.

Use strict typing.

Avoid:

any

unless genuinely unavoidable and documented.

Prefer:

- Interfaces
- Types
- DTOs
- Enums
- Typed API responses
- Typed service interfaces

---

# 3. ARCHITECTURE

Use a modular monolith initially.

Do NOT create microservices during the initial sprint.

Backend modules should be separated logically.

Suggested modules:

- Auth
- Users
- Customers
- Vendors
- VendorDocuments
- VendorInspections
- Categories
- Products
- Inventory
- Cart
- Addresses
- Orders
- Payments
- Shipments
- Commission
- Ledger
- Settlements
- Refunds
- Returns
- Replacements
- Reviews
- Complaints
- Notifications
- Admin

---

# 4. BACKEND SOURCE OF TRUTH

Backend is authoritative for:

- Product price
- Stock
- Discounts
- Shipping
- GST
- Order totals
- Commission
- Refunds
- Settlement

Never trust values sent by frontend for financial calculations.

---

# 5. AUTHENTICATION

Use secure authentication.

Recommended:

JWT access token
+
Refresh token

Passwords must be securely hashed.

Never store plaintext passwords.

Implement:

- Login
- Logout
- Refresh
- Password reset where required
- OTP where required
- Session/token handling

---

# 6. AUTHORIZATION

Use RBAC.

Example roles:

CUSTOMER
VENDOR
ADMIN

Potential additional admin roles can be introduced later.

Every protected API must check authorization.

Authentication alone is not sufficient.

---

# 7. VENDOR OWNERSHIP

Vendor APIs must enforce ownership.

A vendor must only access records belonging to that vendor.

Never trust:

vendorId

from the frontend.

Derive vendor identity from authenticated user/session wherever possible.

---

# 8. VALIDATION

Every API input must be validated.

Validate:

- Body
- Params
- Query
- Files
- IDs
- Enum values
- Amounts
- Quantities

Reject invalid requests consistently.

---

# 9. API DESIGN

Use consistent API structure.

Recommended response pattern:

{
  "success": true,
  "data": {},
  "message": "Success",
  "meta": {}
}

Errors should have a consistent structure.

Use correct HTTP status codes.

Examples:

200
201
400
401
403
404
409
422
500

---

# 10. PAGINATION

List APIs must support pagination where appropriate.

Recommended:

page
limit

or cursor pagination where appropriate.

Avoid returning unlimited database records.

---

# 11. FILTERING

Admin/vendor/customer listing APIs should support appropriate:

- Search
- Filtering
- Sorting
- Pagination

---

# 12. DATABASE

Use PostgreSQL.

Use Prisma ORM.

Database must use:

- Foreign keys
- Unique constraints
- Indexes
- Transactions
- Appropriate relations
- Appropriate cascading behavior

Do not duplicate business-critical data unnecessarily.

---

# 13. DATABASE TRANSACTIONS

Use transactions for critical operations.

Especially:

Checkout
Order creation
Inventory reservation
Payment/order state updates
Commission creation
Ledger updates
Refund creation
Settlement creation

---

# 14. MULTI-VENDOR CHECKOUT

Checkout must be transactional.

Flow:

Validate cart
→ Validate products
→ Validate vendors
→ Validate stock
→ Calculate prices
→ Calculate shipping
→ Calculate taxes where applicable
→ Calculate final amount
→ Create master order
→ Create vendor orders
→ Create order items
→ Reserve/decrement inventory
→ Create payment record

If a critical operation fails, the system must avoid creating an inconsistent order.

---

# 15. INVENTORY

Inventory must be protected from overselling.

Use appropriate transaction/locking strategy.

Stock changes should be traceable.

Use InventoryTransaction.

Examples:

SALE
RESERVATION
RELEASE
CANCELLATION
RETURN
ADJUSTMENT

---

# 16. PAYMENT SECURITY

Never trust frontend payment success.

Backend must:

1. Create/verify payment
2. Verify provider response/signature where applicable
3. Verify amount
4. Verify order
5. Update payment
6. Update order
7. Handle webhook

Payment operations must be idempotent.

---

# 17. WEBHOOKS

Payment and logistics webhooks must:

- Verify authenticity where provider supports it
- Be idempotent
- Handle duplicate events
- Store provider event IDs where appropriate
- Update only valid state transitions
- Log failures

---

# 18. IDEMPOTENCY

Important operations should support idempotency.

Examples:

- Payment creation
- Payment confirmation
- Refund
- Order creation
- Settlement
- Shipment creation
- Webhook processing

Repeated requests must not create duplicate financial records.

---

# 19. PROVIDER ABSTRACTION

Do not tightly couple business logic to external providers.

Payment:

PaymentService
→ RazorpayPaymentProvider

Shipping:

ShippingService
→ ShiprocketShippingProvider

Notifications:

NotificationService
→ InteraktWhatsAppProvider

This allows provider replacement later.

---

# 20. DEVELOPMENT ADAPTERS

If production credentials are unavailable during development:

Use a clearly identified development adapter/mock.

Example:

RazorpayPaymentProvider
RazorpayDevPaymentProvider

ShiprocketShippingProvider
ShiprocketDevShippingProvider

InteraktWhatsAppProvider
InteraktDevProvider

Do not pretend a fake provider is a real production integration.

---

# 21. SECURITY

Never commit:

- Passwords
- API keys
- JWT secrets
- Razorpay secrets
- Shiprocket credentials
- Interakt credentials
- Production .env files
- Private KYC files

Use environment variables/secrets management.

---

# 22. FILE UPLOAD SECURITY

Validate:

- File type
- File size
- File extension
- MIME type
- Storage path
- Access permissions

KYC documents must not be publicly exposed.

---

# 23. SENSITIVE DATA

Never expose:

- Password hashes
- JWT secrets
- API keys
- Payment secrets
- Private KYC documents
- Sensitive bank information

Only return fields necessary for the current user.

---

# 24. CORS

Configure CORS explicitly.

Do not use unrestricted production CORS.

---

# 25. RATE LIMITING

Use rate limiting for sensitive endpoints where appropriate.

Especially:

- Login
- OTP
- Password reset
- Payment-related APIs
- Public APIs vulnerable to abuse

---

# 26. ERROR HANDLING

Use centralized error handling.

Do not expose stack traces in production.

Log technical details internally.

Return safe user-facing messages.

---

# 27. LOGGING

Important operations should be logged.

Examples:

- Login failures
- Vendor approval
- Vendor suspension
- Product approval
- Payment events
- Refunds
- Settlement
- Admin actions
- Webhooks
- Integration failures

---

# 28. AUDIT LOG

Admin actions should be auditable.

AuditLog may include:

- Actor
- Action
- Entity
- Entity ID
- Previous value
- New value
- Timestamp
- IP/device information where appropriate

---

# 29. FRONTEND RULES

Frontend must handle:

- Loading
- Error
- Empty state
- Unauthorized state
- Session expiration
- Network failure
- Validation errors
- API errors
- Responsive layouts

Do not assume API always succeeds.

---

# 30. FRONTEND FINANCIAL RULE

Frontend may display calculations for UX.

However, backend values are authoritative.

Frontend must not decide:

- Final order total
- Commission
- Shipping amount
- Refund amount
- Settlement amount
- GST amount

---

# 31. UI COMPONENTS

Use reusable components.

Avoid giant components.

Prefer:

- Shared buttons
- Inputs
- Tables
- Modals
- Cards
- Status badges
- Form components
- Layout components
- API hooks

---

# 32. API URL CONFIGURATION

Never hardcode production API URLs throughout the code.

Use environment configuration.

Example:

VITE_API_URL

or equivalent environment configuration.

---

# 33. STATE MANAGEMENT

Prefer TanStack Query for server state.

Use local/component state where possible.

Do not introduce unnecessary global state.

---

# 34. FORMS

Use:

React Hook Form
+
Zod

for complex forms.

Client-side validation improves UX.

Backend validation remains mandatory.

---

# 35. ORDER STATE TRANSITIONS

Order states must have valid transitions.

Do not allow arbitrary status changes from the frontend.

Backend controls transitions.

---

# 36. COMMISSION

Commission percentages must be configurable.

No hardcoded business percentages.

Commission transactions must be traceable to:

- Vendor
- Vendor Order
- Order Item
- Commission Rule

---

# 37. SETTLEMENT

Settlement must be calculated server-side.

Settlement eligibility:

delivery timestamp + configured settlement days

Default:

7 days

Do not create settlement records prematurely.

---

# 38. SHIPPING

Shipping must be backend controlled.

Store provider identifiers.

Do not rely on frontend-generated shipping values.

---

# 39. RETURNS AND REFUNDS

Backend must validate:

- Order ownership
- Delivery status
- Return window
- Item eligibility
- Already refunded amount
- Existing return/replacement

Never allow refund amount greater than refundable amount.

---

# 40. TESTING

Critical tests include:

### Authentication

- Register
- Login
- Invalid credentials
- Token refresh
- Unauthorized access

### Authorization

- Customer cannot access admin
- Vendor cannot access another vendor
- Vendor cannot access admin data

### Inventory

- Stock validation
- Overselling prevention
- Cancellation stock release

### Checkout

- Single vendor
- Multi-vendor
- Invalid product
- Out of stock
- Price changes
- Transaction rollback

### Orders

- Master order creation
- Vendor order creation
- Partial cancellation
- Status transitions

### Payments

- Payment verification
- Invalid payment
- Duplicate webhook
- Refund

### Commission

- Raw product = 14%
- Value-added product = 18%
- Configurable rules

### Settlement

- Delivery recorded
- 7-day eligibility
- Settlement creation
- Duplicate prevention

### Returns

- 7-day rule
- Invalid return
- Replacement
- Partial refund

---

# 41. CI/CD

CI should eventually run:

1. Install dependencies
2. Lint
3. Typecheck
4. Unit tests
5. Integration tests
6. Build

No broken build should be merged.

---

# 42. ENVIRONMENTS

Support:

Development
Staging
Production

Do not use production credentials locally.

---

# 43. CODE REVIEW

Every significant change should be reviewed.

Developers should explain:

- What changed
- Why
- Files changed
- API changes
- Database changes
- Tests
- Known limitations

---

# 44. DO NOT MODIFY UNRELATED CODE

Developers must avoid unrelated refactoring during feature work.

If another developer owns an area:

- Do not rewrite it
- Coordinate before changing it
- Clearly communicate cross-area changes

---

# 45. COMPLETION REQUIREMENT

A task is not complete merely because code was written.

A task is complete when:

- Feature implemented
- Types pass
- Lint passes
- Tests pass
- Build passes
- API integration verified
- Errors handled
- Documentation updated where required

---

# 46. REPORTING

At the end of each major task report:

1. What was implemented
2. Files changed
3. APIs added/changed
4. Database changes
5. Tests added
6. Tests executed
7. Build status
8. Known issues
9. Blockers
10. Business decisions required