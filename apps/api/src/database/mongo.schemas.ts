import { randomUUID } from "node:crypto";
import { Schema, type Connection, type Model } from "mongoose";

export const collectionNames = {
  user: "users", verificationOtp: "verificationOtps", passwordResetToken: "passwordResetTokens",
  customerProfile: "customerProfiles", vendor: "vendors", vendorDocument: "vendorDocuments",
  vendorInspection: "vendorInspections", vendorBankAccount: "vendorBankAccounts",
  vendorStatusHistory: "vendorStatusHistory", category: "categories", homeHeroSlide: "homeHeroSlides",
  product: "products", productImage: "productImages", inventory: "inventory",
  inventoryTransaction: "inventoryTransactions", address: "addresses", cart: "carts", cartItem: "cartItems",
  checkoutQuote: "checkoutQuotes", masterOrder: "masterOrders", vendorOrder: "vendorOrders",
  orderItem: "orderItems", payment: "payments", shipment: "shipments", commissionRule: "commissionRules",
  commissionTransaction: "commissionTransactions", vendorLedger: "vendorLedgers", settlement: "settlements",
  settlementItem: "settlementItems", refund: "refunds", returnRequest: "returnRequests",
  replacement: "replacements", review: "reviews", complaint: "complaints",
  complaintMessage: "complaintMessages", notification: "notifications", auditLog: "auditLogs",
  integrationSetting: "integrationSettings", providerEvent: "providerEvents", session: "sessions",
  complaintAttachment: "complaintAttachments", vendorInvoice: "vendorInvoices",
  commissionInvoice: "commissionInvoices",
} as const;

export type RepositoryName = keyof typeof collectionNames;

const stringFields: Partial<Record<RepositoryName, string[]>> = {
  user: ["email", "mobile", "passwordHash", "role", "status", "refreshTokenHash"],
  verificationOtp: ["userId", "codeHash", "purpose"], passwordResetToken: ["userId", "tokenHash"],
  customerProfile: ["userId", "firstName", "lastName"],
  vendor: ["userId", "businessName", "legalName", "ownerName", "businessEmail", "businessMobile", "gstin", "panNumber", "fssaiNumber", "pickupPincode", "status", "suspensionReason", "suspensionDetails"],
  vendorDocument: ["vendorId", "type", "originalName", "storageKey", "mimeType", "documentNumber", "status", "rejectionReason", "verifiedById"],
  vendorInspection: ["vendorId", "inspectorId", "location", "remarks", "status"],
  vendorBankAccount: ["vendorId", "accountHolderName", "accountNumberEncrypted", "accountNumberLast4", "ifsc", "bankName", "branchName", "status"],
  vendorStatusHistory: ["vendorId", "fromStatus", "toStatus", "reason", "actorId"],
  category: ["parentId", "name", "slug", "description", "imageUrl", "imageMimeType"],
  homeHeroSlide: ["eyebrow", "title", "description", "ctaLabel", "ctaHref", "imageUrl", "imageMimeType", "imageAlt"],
  product: ["vendorId", "categoryId", "name", "slug", "description", "productType", "ingredients", "status", "rejectionReason"],
  productImage: ["productId", "url", "altText"], inventory: ["productId"],
  inventoryTransaction: ["inventoryId", "type", "referenceType", "referenceId", "notes"],
  address: ["customerId", "label", "recipientName", "mobile", "line1", "line2", "landmark", "city", "state", "pincode", "country"],
  cart: ["customerId"], cartItem: ["cartId", "productId"], checkoutQuote: ["customerId", "addressId", "currency"],
  masterOrder: ["orderNumber", "customerId", "checkoutQuoteId", "deliveryAddressId", "status", "paymentMethod", "currency", "idempotencyKey"],
  vendorOrder: ["vendorOrderNumber", "masterOrderId", "vendorId", "status", "settlementStatus"],
  orderItem: ["vendorOrderId", "productId", "productName", "sku", "productType", "status", "cancellationReason"],
  payment: ["masterOrderId", "provider", "providerOrderId", "providerPaymentId", "method", "currency", "status", "idempotencyKey", "failureReason"],
  shipment: ["vendorOrderId", "provider", "idempotencyKey", "providerShipmentId", "awb", "trackingUrl", "status"],
  commissionRule: ["categoryId", "productType"], commissionTransaction: ["vendorId", "vendorOrderId", "orderItemId", "ruleId"],
  vendorLedger: ["vendorId", "vendorOrderId", "type", "direction", "referenceType", "referenceId", "description"],
  settlement: ["vendorId", "reference", "status", "providerReference", "failureReason"], settlementItem: ["settlementId", "vendorOrderId"],
  refund: ["masterOrderId", "vendorOrderId", "orderItemId", "paymentId", "method", "reason", "status", "providerReference", "idempotencyKey", "failureReason"],
  returnRequest: ["orderItemId", "customerId", "reason", "resolution", "status"],
  replacement: ["orderItemId", "reason", "status", "replacementOrderReference", "trackingReference"],
  review: ["customerId", "productId", "orderItemId", "comment", "status"],
  complaint: ["referenceNumber", "customerId", "masterOrderId", "vendorOrderId", "orderItemId", "vendorId", "shipmentId", "category", "subject", "description", "status", "resolution"],
  complaintMessage: ["complaintId", "authorId", "authorRole", "message"],
  notification: ["userId", "dedupeKey", "channel", "templateKey", "status", "providerReference", "failureReason"],
  auditLog: ["actorId", "action", "entityType", "entityId", "ipAddress", "userAgent"],
  integrationSetting: ["key", "encryptedValue", "valueHint", "updatedById"], providerEvent: ["provider", "eventId", "eventType", "failureReason"],
  session: ["userId", "tokenHash"], complaintAttachment: ["complaintId", "storageKey", "originalName", "mimeType"],
  vendorInvoice: ["invoiceNumber", "vendorOrderId", "vendorId", "currency"], commissionInvoice: ["invoiceNumber", "vendorOrderId", "vendorId", "currency"],
};

const booleanFields: Partial<Record<RepositoryName, string[]>> = {
  customerProfile: ["marketingOptIn"], vendorInspection: ["documentsVerified", "premisesVerified", "qualityVerified"],
  vendorBankAccount: ["isPrimary"], category: ["isActive"], homeHeroSlide: ["isActive"], address: ["isDefault"],
  orderItem: ["cancellable"], commissionRule: ["isActive"], vendorInvoice: ["gstInclusive"], commissionInvoice: ["gstInclusive"],
};

const mixedFields: Partial<Record<RepositoryName, string[]>> = {
  vendor: ["businessAddress"], vendorInspection: ["checklist", "evidence"], product: ["specifications"],
  checkoutQuote: ["snapshot"], masterOrder: ["deliveryAddressSnapshot"], payment: ["metadata"], shipment: ["statusHistory"],
  returnRequest: ["evidence"], review: ["images"], complaint: ["attachments"], complaintMessage: ["attachments"],
  notification: ["payload"], auditLog: ["previousValue", "newValue"], providerEvent: ["payload"],
  vendorInvoice: ["lineItems"], commissionInvoice: ["lineItems"],
};

const bufferFields: Partial<Record<RepositoryName, string[]>> = {
  category: ["imageData"], homeHeroSlide: ["imageData"],
};

const decimalFields: Partial<Record<RepositoryName, string[]>> = {
  product: ["price", "mrp", "gstRate", "lengthCm", "widthCm", "heightCm"],
  cartItem: ["unitPriceSnapshot"], checkoutQuote: ["productSubtotal", "totalShipping", "payableTotal"],
  masterOrder: ["productSubtotal", "totalShipping", "payableTotal"],
  vendorOrder: ["productSubtotal", "shippingAmount", "orderTotal", "settlementAmount"],
  orderItem: ["unitPrice", "gstRate", "lineTotal"], payment: ["amount"],
  commissionRule: ["percentage"], commissionTransaction: ["baseAmount", "percentage", "amount"],
  vendorLedger: ["amount", "balanceAfter"], settlement: ["amount"],
  settlementItem: ["grossAmount", "commissionAmount", "refundAmount", "settlementAmount"], refund: ["amount"],
  vendorInvoice: ["subtotal", "gstAmount", "total"], commissionInvoice: ["taxableAmount", "gstAmount", "total", "gstRate"],
};

const numberFields: Partial<Record<RepositoryName, string[]>> = {
  verificationOtp: ["attempts"], vendorDocument: ["sizeBytes"], category: ["sortOrder"],
  homeHeroSlide: ["sortOrder"], product: ["weightGrams"], productImage: ["sortOrder"],
  inventory: ["quantity", "reserved", "lowStockThreshold", "version"],
  inventoryTransaction: ["quantity", "balanceAfter"], cartItem: ["quantity"],
  orderItem: ["quantity"], review: ["rating"], complaintAttachment: ["sizeBytes"],
};

const dateFields: Partial<Record<RepositoryName, string[]>> = {
  user: ["emailVerifiedAt", "mobileVerifiedAt", "lastLoginAt"], verificationOtp: ["expiresAt", "consumedAt"],
  passwordResetToken: ["expiresAt", "usedAt"], vendor: ["approvedAt", "suspendedAt"], product: ["approvedAt"],
  vendorDocument: ["expiresAt", "verifiedAt"], vendorInspection: ["scheduledAt", "inspectedAt"],
  checkoutQuote: ["expiresAt", "consumedAt"], masterOrder: ["placedAt"],
  vendorOrder: ["deliveredAt", "settlementEligibleAt", "settledAt"], payment: ["verifiedAt"],
  shipment: ["estimatedDelivery", "shippedAt", "deliveredAt"], commissionRule: ["effectiveFrom", "effectiveTo"],
  settlement: ["processedAt", "settledAt"], refund: ["processedAt"],
  returnRequest: ["requestedAt", "resolvedAt"], notification: ["sentAt"], providerEvent: ["processedAt"],
  session: ["expiresAt", "revokedAt", "lastUsedAt"], vendorInvoice: ["issuedAt"], commissionInvoice: ["issuedAt"],
};

const defaults: Partial<Record<RepositoryName, Record<string, unknown>>> = {
  user: { status: "ACTIVE" }, verificationOtp: { purpose: "ACCOUNT_VERIFICATION", attempts: 0 },
  customerProfile: { marketingOptIn: false }, vendor: { status: "REGISTERED" },
  vendorDocument: { status: "PENDING" }, vendorInspection: { status: "SCHEDULED", documentsVerified: false, premisesVerified: false, qualityVerified: false },
  vendorBankAccount: { isPrimary: true, status: "PENDING" }, category: { isActive: true, sortOrder: 0 },
  homeHeroSlide: { isActive: true, sortOrder: 0 }, product: { status: "DRAFT" }, productImage: { sortOrder: 0 },
  inventory: { quantity: 0, reserved: 0, lowStockThreshold: 5, version: 0 }, address: { country: "India", isDefault: false },
  checkoutQuote: { currency: "INR" }, masterOrder: { status: "PENDING", currency: "INR" },
  vendorOrder: { status: "PENDING", settlementStatus: "PENDING" }, orderItem: { status: "PENDING", cancellable: true },
  payment: { currency: "INR", status: "CREATED" }, shipment: { status: "PENDING" }, commissionRule: { isActive: true },
  settlement: { status: "PENDING" }, refund: { status: "PENDING" }, returnRequest: { status: "REQUESTED" },
  replacement: { status: "REQUESTED" }, review: { status: "PENDING" }, complaint: { status: "OPEN", attachments: [] },
  complaintMessage: { attachments: [] }, notification: { status: "QUEUED" },
};

type IndexEntry = [string[], boolean];

const indexes: Partial<Record<RepositoryName, IndexEntry[]>> = {
  user: [[['email'], true], [['mobile'], true], [['role', 'status'], false]],
  verificationOtp: [[['userId', 'purpose', 'expiresAt'], false]], passwordResetToken: [[['tokenHash'], true], [['userId', 'expiresAt'], false]],
  customerProfile: [[['userId'], true], [['lastName', 'firstName'], false]],
  vendor: [[['userId'], true], [['gstin'], true], [['status', 'createdAt'], false], [['businessName'], false]],
  vendorDocument: [[['storageKey'], true], [['vendorId', 'type'], true], [['vendorId', 'status'], false]],
  vendorInspection: [[['vendorId', 'status'], false], [['inspectorId', 'scheduledAt'], false]],
  vendorBankAccount: [[['vendorId', 'isPrimary'], false]], vendorStatusHistory: [[['vendorId', 'createdAt'], false]],
  category: [[['slug'], true], [['parentId', 'isActive', 'sortOrder'], false]], homeHeroSlide: [[['isActive', 'sortOrder'], false]],
  product: [[['slug'], true], [['vendorId', 'status'], false], [['categoryId', 'productType', 'status'], false], [['status', 'createdAt'], false], [['name'], false]],
  productImage: [[['productId', 'sortOrder'], false]], inventory: [[['productId'], true]],
  inventoryTransaction: [[['type', 'referenceType', 'referenceId'], true], [['inventoryId', 'createdAt'], false], [['referenceType', 'referenceId'], false]],
  address: [[['customerId', 'isDefault'], false]], cart: [[['customerId'], true]], cartItem: [[['cartId', 'productId'], true], [['productId'], false]],
  checkoutQuote: [[['customerId', 'expiresAt'], false]], masterOrder: [[['orderNumber'], true], [['checkoutQuoteId'], true], [['idempotencyKey'], true], [['customerId', 'placedAt'], false], [['status', 'createdAt'], false]],
  vendorOrder: [[['vendorOrderNumber'], true], [['masterOrderId', 'vendorId'], true], [['masterOrderId'], false], [['vendorId', 'status', 'createdAt'], false]],
  orderItem: [[['vendorOrderId', 'status'], false], [['productId'], false]],
  payment: [[['providerOrderId'], true], [['providerPaymentId'], true], [['idempotencyKey'], true], [['masterOrderId', 'status'], false]],
  shipment: [[['vendorOrderId'], true], [['idempotencyKey'], true], [['providerShipmentId'], true], [['awb'], true], [['status', 'updatedAt'], false]],
  commissionRule: [[['productType', 'categoryId', 'isActive', 'effectiveFrom'], false]], commissionTransaction: [[['orderItemId'], true], [['vendorId', 'createdAt'], false]],
  vendorLedger: [[['vendorId', 'type', 'referenceType', 'referenceId'], true], [['vendorId', 'createdAt'], false], [['referenceType', 'referenceId'], false]],
  settlement: [[['reference'], true], [['vendorId', 'status', 'createdAt'], false]], settlementItem: [[['settlementId', 'vendorOrderId'], true], [['vendorOrderId'], true]],
  refund: [[['providerReference'], true], [['idempotencyKey'], true], [['masterOrderId', 'status'], false], [['orderItemId'], false]],
  returnRequest: [[['orderItemId'], true], [['customerId', 'status', 'requestedAt'], false]], replacement: [[['orderItemId'], true]],
  review: [[['orderItemId'], true], [['productId', 'status', 'createdAt'], false], [['customerId', 'createdAt'], false]],
  complaint: [[['referenceNumber'], true], [['customerId', 'status', 'createdAt'], false], [['vendorId', 'status', 'createdAt'], false]],
  complaintMessage: [[['complaintId', 'createdAt'], false]], notification: [[['dedupeKey'], true], [['userId', 'status', 'createdAt'], false]],
  auditLog: [[['entityType', 'entityId', 'createdAt'], false], [['actorId', 'createdAt'], false]], integrationSetting: [[['key'], true], [['updatedById', 'updatedAt'], false]],
  providerEvent: [[['provider', 'eventId'], true], [['provider', 'processedAt'], false]], session: [[['tokenHash'], true], [['userId', 'expiresAt', 'revokedAt'], false]],
  complaintAttachment: [[['complaintId', 'createdAt'], false]], vendorInvoice: [[['invoiceNumber'], true], [['vendorOrderId'], true]], commissionInvoice: [[['invoiceNumber'], true], [['vendorOrderId'], true]],
};

export const declaredMongoIndexCount = Object.values(indexes).reduce(
  (total, collectionIndexes) => total + (collectionIndexes?.length ?? 0),
  0,
);

function decimalTransform(value: unknown): unknown {
  if (value && typeof value === "object" && "$numberDecimal" in value) return Number((value as { $numberDecimal: string }).$numberDecimal);
  if (Array.isArray(value)) return value.map(decimalTransform);
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) (value as Record<string, unknown>)[key] = decimalTransform(nested);
  }
  return value;
}

export function createMongoModels(connection: Connection): Record<RepositoryName, Model<any>> {
  const result = {} as Record<RepositoryName, Model<any>>;
  for (const [name, collection] of Object.entries(collectionNames) as Array<[RepositoryName, string]>) {
    const definition: Record<string, any> = { _id: { type: String, default: randomUUID } };
    for (const field of stringFields[name] ?? []) definition[field] = String;
    for (const field of booleanFields[name] ?? []) definition[field] = Boolean;
    for (const field of mixedFields[name] ?? []) definition[field] = Schema.Types.Mixed;
    for (const field of bufferFields[name] ?? []) definition[field] = Buffer;
    for (const field of numberFields[name] ?? []) definition[field] = Number;
    for (const field of decimalFields[name] ?? []) definition[field] = Schema.Types.Decimal128;
    for (const field of dateFields[name] ?? []) definition[field] = Date;
    for (const [field, value] of Object.entries(defaults[name] ?? {})) {
      const inferred = Array.isArray(value) ? [Schema.Types.Mixed] : typeof value === "boolean" ? Boolean : typeof value === "number" ? Number : String;
      definition[field] = { type: inferred, default: value };
    }
    const schema = new Schema(definition, { collection, strict: "throw", timestamps: true, versionKey: false, toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; return decimalTransform(ret); } }, toObject: { virtuals: true } });
    const configuredIndexes = indexes[name] ?? [];
    for (const [fields, unique] of configuredIndexes) {
      const spec = Object.fromEntries(fields.map((field: any) => [field, 1]));
      schema.index(spec, { unique, sparse: unique });
    }
    result[name] = connection.models[name] ?? connection.model(name, schema, collection);
  }
  return result;
}
