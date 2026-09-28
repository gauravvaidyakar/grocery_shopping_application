# MongoDB schema

Collections use plural camel-case names. Business entities that are queried, audited, or updated independently remain referenced documents. Small immutable snapshots such as delivery addresses, checkout snapshots, shipment status history, invoice line snapshots, and complaint attachment metadata are embedded where the API consumes them as part of an aggregate.

Core collections include users, sessions, verificationOtps, passwordResetTokens, customerProfiles, vendors, vendorDocuments, vendorInspections, vendorBankAccounts, vendorStatusHistory, categories, homeHeroSlides, products, productImages, inventory, inventoryTransactions, addresses, carts, cartItems, checkoutQuotes, masterOrders, vendorOrders, orderItems, payments, shipments, commissionRules, commissionTransactions, vendorLedgers, settlements, settlementItems, refunds, returnRequests, replacements, reviews, complaints, complaintMessages, complaintAttachments, notifications, auditLogs, integrationSettings, providerEvents, vendorInvoices, and commissionInvoices.

Important design choices:

- UUID string `_id` values preserve existing API contracts.
- Product/order/payment/ledger/refund/settlement amounts use Decimal128.
- Session documents hold hashed refresh tokens and revocation/expiry timestamps.
- Complaint attachment records allow lifecycle/audit queries while the complaint retains a presentation snapshot.
- Vendor and commission invoices are immutable order-linked snapshots.
- Vendor invoice line snapshots record gross, taxable, and extracted GST amounts
  in integer paise; their components always reconcile to the GST-inclusive total.
- Provider event compound uniqueness makes Razorpay and Shiprocket webhooks idempotent.
- Unique and compound indexes cover identities, catalogue filtering, order/payment provider references, settlement queues, notification dedupe, and audit lookup.
- Mongoose strict-throw schemas reject undeclared persistence fields to surface
  model drift during development and integration testing.
