# VISHWANEED — API SPECIFICATION

## 1. API PRINCIPLES

Base API:

/api/v1

All APIs must:

- Validate input
- Authenticate where required
- Authorize by role
- Return consistent responses
- Support pagination where appropriate
- Return correct HTTP status codes
- Never expose sensitive information

---

# 2. AUTH

POST /api/v1/auth/register

POST /api/v1/auth/login

POST /api/v1/auth/verify-otp

POST /api/v1/auth/customer/otp/resend

POST /api/v1/auth/customer/otp/verify

POST /api/v1/auth/customer/password-reset/verify-otp

POST /api/v1/auth/refresh

POST /api/v1/auth/logout

POST /api/v1/auth/forgot-password

POST /api/v1/auth/reset-password

---

# 3. CUSTOMER

GET /api/v1/customers/me

PATCH /api/v1/customers/me

GET /api/v1/customers/me/addresses

POST /api/v1/customers/me/addresses

PATCH /api/v1/customers/me/addresses/:id

DELETE /api/v1/customers/me/addresses/:id

---

# 4. CATEGORIES

GET /api/v1/categories

GET /api/v1/categories/:id

---

# 5. PRODUCTS

GET /api/v1/products

GET /api/v1/products/:id

GET /api/v1/products/:id/reviews

Query parameters may include:

search
category
productType
minPrice
maxPrice
sort
page
limit

---

# 6. VENDOR PRODUCTS

GET /api/v1/vendor/products

POST /api/v1/vendor/products

GET /api/v1/vendor/products/:id

PATCH /api/v1/vendor/products/:id

DELETE /api/v1/vendor/products/:id

POST /api/v1/vendor/products/:id/submit

---

# 7. VENDOR KYC

GET /api/v1/vendor/kyc

POST /api/v1/vendor/kyc/documents

PATCH /api/v1/vendor/kyc

GET /api/v1/vendor/kyc/status

PATCH /api/v1/vendor/contact

POST /api/v1/auth/vendor/change-password

Authenticated vendor password change. Requires `currentPassword`, `newPassword`
and `confirmNewPassword`. A successful change revokes the stored refresh session
and requires the vendor to sign in again.

---

# 8. VENDOR ORDERS

GET /api/v1/vendor/orders

GET /api/v1/vendor/orders/:id

PATCH /api/v1/vendor/orders/:id/status

POST /api/v1/vendor/orders/:id/cancel-item/:itemId

POST /api/v1/orders/:orderId/items/:itemId/cancel

---

# 9. CART

GET /api/v1/cart

POST /api/v1/cart/items

PATCH /api/v1/cart/items/:id

DELETE /api/v1/cart/items/:id

DELETE /api/v1/cart

---

# 10. CHECKOUT

POST /api/v1/checkout/validate

POST /api/v1/orders

GET /api/v1/orders/:id

GET /api/v1/orders

---

# 11. PAYMENT

POST /api/v1/payments/create

POST /api/v1/payments/verify

POST /api/v1/payments/webhook

GET /api/v1/payments/:id/status

POST /api/v1/payments/:id/reconcile

---

# 12. SHIPPING

POST /api/v1/shipments/vendor-orders/:id

GET /api/v1/shipments/:id/tracking

POST /api/v1/shipments/webhook/shiprocket

---

# 13. RETURNS

POST /api/v1/orders/:orderId/items/:itemId/return

GET /api/v1/returns

GET /api/v1/admin/returns

POST /api/v1/admin/returns/:id/status

GET /api/v1/returns/:id

---

# 14. REPLACEMENT

POST /api/v1/orders/:orderId/items/:itemId/replacement

GET /api/v1/replacements

GET /api/v1/replacements/:id

---

# 15. REVIEWS

POST /api/v1/products/:productId/reviews

GET /api/v1/products/:productId/reviews

PATCH /api/v1/reviews/:id

DELETE /api/v1/reviews/:id

---

# 16. COMPLAINTS

POST /api/v1/complaints

GET /api/v1/complaints

GET /api/v1/complaints/:id

POST /api/v1/complaints/:id/messages

---

# 17. ADMIN VENDORS

GET /api/v1/admin/customers

GET /api/v1/admin/vendors

GET /api/v1/admin/vendors/:id

PATCH /api/v1/admin/vendors/:id/status

POST /api/v1/admin/vendors/:id/approve

POST /api/v1/admin/vendors/:id/reject

POST /api/v1/admin/vendors/:id/suspend

---

# 18. ADMIN KYC

GET /api/v1/admin/vendor-kyc

GET /api/v1/admin/vendor-kyc/:id

POST /api/v1/admin/vendor-kyc/:id/approve

POST /api/v1/admin/vendor-kyc/:id/reject

---

# 19. ADMIN INSPECTIONS

POST /api/v1/admin/vendors/:vendorId/inspection

GET /api/v1/admin/vendors/:vendorId/inspections

PATCH /api/v1/admin/inspections/:id

---

# 20. ADMIN PRODUCTS

GET /api/v1/admin/products

GET /api/v1/admin/products/:id

POST /api/v1/admin/products/:id/approve

POST /api/v1/admin/products/:id/reject

---

# 21. ADMIN ORDERS

GET /api/v1/admin/orders

GET /api/v1/admin/orders/:id

---

# 22. ADMIN PAYMENTS

GET /api/v1/admin/payments

GET /api/v1/admin/payments/:id

---

# 23. COMMISSION

GET /api/v1/vendor/commission

GET /api/v1/vendor/commission/transactions

GET /api/v1/admin/commission/rules

POST /api/v1/admin/commission/rules

PATCH /api/v1/admin/commission/rules/:id

---

# 24. LEDGER

GET /api/v1/vendor/ledger

GET /api/v1/vendor/ledger/transactions

GET /api/v1/admin/vendors/:vendorId/ledger

---

# 25. SETTLEMENTS

GET /api/v1/vendor/settlements

GET /api/v1/vendor/settlements/:id

GET /api/v1/admin/settlements

GET /api/v1/admin/settlements/:id

POST /api/v1/admin/settlements/:id/process

POST /api/v1/admin/settlements/refresh-eligibility

POST /api/v1/admin/settlements/:id/complete

---

# 26. REFUNDS

GET /api/v1/admin/refunds

GET /api/v1/admin/refunds/:id

POST /api/v1/admin/refunds/:id/process

POST /api/v1/admin/refunds/:id/complete-bank-transfer

---

# 27. NOTIFICATIONS

GET /api/v1/notifications

---

# 28. INTEGRATION SETTINGS

Admin integration configuration (ADMIN role only):

GET /api/v1/admin/integration-settings

PATCH /api/v1/admin/integration-settings

DELETE /api/v1/admin/integration-settings/:key

The GET response contains only configured/source state and masked hints. It never
returns plaintext or encrypted credential values. PATCH accepts only the approved
Razorpay, Shiprocket, Interakt and MSG91 keys. MSG91 requires
`MSG91_AUTH_KEY`, `MSG91_WIDGET_ID`, and `MSG91_WIDGET_TOKEN`. Customer registration,
login verification, resend, and password-reset OTP use the default MSG91 OTP Widget;
the server validates the widget's one-time access token before changing authentication
state. `MSG91_OTP_TEMPLATE_ID` remains optional only for legacy server-generated SMS.
Stored values are encrypted at rest and
all changes are recorded in AuditLog without credential contents. Environment
variables remain fallback values when no database override exists.

---

# 28B. HOMEPAGE HERO CONTENT

Public:

- `GET /home-hero-slides` returns active slides with uploaded images in display order.
- `GET /home-hero-images/:filename` streams immutable, content-hashed WEBP assets.

Admin-only:

- `GET /admin/home-hero-slides`
- `POST /admin/home-hero-slides`
- `PATCH /admin/home-hero-slides/:id`
- `DELETE /admin/home-hero-slides/:id`
- `POST /admin/home-hero-slides/:id/image` using multipart field `file`
- `DELETE /admin/home-hero-slides/:id/image`

The API accepts JPG, JPEG, PNG and WEBP uploads up to 5 MB, normalizes them to
WEBP and stores them persistently in MongoDB. CTA destinations must be
internal application paths. Public responses never include stored image bytes.

---

# 29. STANDARD SUCCESS RESPONSE

{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "meta": {}
}

---

# 30. STANDARD ERROR RESPONSE

{
  "success": false,
  "data": null,
  "message": "Human readable error",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}

---

# 31. PAGINATION RESPONSE

{
  "success": true,
  "data": [],
  "message": "Success",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

---

# 32. FRONTEND/BACKEND CONTRACT

Developer 1 must consume APIs through a typed API client.

Developer 1 must NOT directly access the database.

Developer 1 must NOT duplicate backend business logic.

Developer 2 must document any API contract changes.

Breaking API changes require coordination between both developers.
