export const Role = { CUSTOMER: "CUSTOMER", VENDOR: "VENDOR", ADMIN: "ADMIN" } as const;
export type Role = (typeof Role)[keyof typeof Role];
export const UserStatus = { ACTIVE: "ACTIVE", SUSPENDED: "SUSPENDED", DISABLED: "DISABLED" } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export const VendorStatus = { REGISTERED: "REGISTERED", DOCUMENTS_SUBMITTED: "DOCUMENTS_SUBMITTED", INSPECTION: "INSPECTION", PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED", SUSPENDED: "SUSPENDED" } as const;
export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];
export const VendorSuspensionReason = { LICENSE_EXPIRED: "LICENSE_EXPIRED", LICENSE_SUSPENDED: "LICENSE_SUSPENDED", COUNTERFEIT_PRODUCT: "COUNTERFEIT_PRODUCT", REPEATED_QUALITY_COMPLAINTS: "REPEATED_QUALITY_COMPLAINTS", AGREEMENT_BREACH: "AGREEMENT_BREACH", OTHER: "OTHER" } as const;
export type VendorSuspensionReason = (typeof VendorSuspensionReason)[keyof typeof VendorSuspensionReason];
export const VendorDocumentType = { PAN: "PAN", AADHAAR: "AADHAAR", GST_CERTIFICATE: "GST_CERTIFICATE", FSSAI_LICENSE: "FSSAI_LICENSE", CANCELLED_CHEQUE: "CANCELLED_CHEQUE", BUSINESS_REGISTRATION_PROOF: "BUSINESS_REGISTRATION_PROOF", INSPECTION_EVIDENCE: "INSPECTION_EVIDENCE" } as const;
export type VendorDocumentType = (typeof VendorDocumentType)[keyof typeof VendorDocumentType];
export const VerificationStatus = { PENDING: "PENDING", VERIFIED: "VERIFIED", REJECTED: "REJECTED" } as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
export const InspectionStatus = { SCHEDULED: "SCHEDULED", IN_PROGRESS: "IN_PROGRESS", PASSED: "PASSED", FAILED: "FAILED", NEEDS_ACTION: "NEEDS_ACTION", NEEDS_REVIEW: "NEEDS_REVIEW", CANCELLED: "CANCELLED" } as const;
export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus];
export const ProductType = { RAW_COMMODITY: "RAW_COMMODITY", VALUE_ADDED: "VALUE_ADDED" } as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];
export const ProductStatus = { DRAFT: "DRAFT", PENDING_APPROVAL: "PENDING_APPROVAL", APPROVED: "APPROVED", REJECTED: "REJECTED", ARCHIVED: "ARCHIVED" } as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];
export const InventoryTransactionType = { INITIAL_STOCK: "INITIAL_STOCK", ADJUSTMENT: "ADJUSTMENT", RESERVATION: "RESERVATION", RELEASE: "RELEASE", SALE: "SALE", CANCELLATION: "CANCELLATION", RETURN: "RETURN" } as const;
export type InventoryTransactionType = (typeof InventoryTransactionType)[keyof typeof InventoryTransactionType];
export const OrderStatus = { PENDING: "PENDING", CONFIRMED: "CONFIRMED", PROCESSING: "PROCESSING", PACKED: "PACKED", SHIPPED: "SHIPPED", DELIVERED: "DELIVERED", CANCELLED: "CANCELLED", RETURN_REQUESTED: "RETURN_REQUESTED", RETURNED: "RETURNED", REFUND_PENDING: "REFUND_PENDING", REFUNDED: "REFUNDED", REPLACEMENT_REQUESTED: "REPLACEMENT_REQUESTED", REPLACED: "REPLACED" } as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const PaymentMethod = { PREPAID: "PREPAID", COD: "COD" } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PaymentStatus = { CREATED: "CREATED", PENDING: "PENDING", AUTHORIZED: "AUTHORIZED", PAID: "PAID", FAILED: "FAILED", CANCELLED: "CANCELLED", REFUND_PENDING: "REFUND_PENDING", PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED", REFUNDED: "REFUNDED" } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export const ShipmentStatus = { PENDING: "PENDING", READY_TO_SHIP: "READY_TO_SHIP", PICKED_UP: "PICKED_UP", IN_TRANSIT: "IN_TRANSIT", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED", FAILED: "FAILED", CANCELLED: "CANCELLED", RETURNED: "RETURNED" } as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];
export const LedgerEntryType = { SALE: "SALE", COMMISSION: "COMMISSION", SHIPPING: "SHIPPING", REFUND: "REFUND", SETTLEMENT: "SETTLEMENT", ADJUSTMENT: "ADJUSTMENT" } as const;
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];
export const LedgerDirection = { CREDIT: "CREDIT", DEBIT: "DEBIT" } as const;
export type LedgerDirection = (typeof LedgerDirection)[keyof typeof LedgerDirection];
export const SettlementStatus = { PENDING: "PENDING", ELIGIBLE: "ELIGIBLE", PROCESSING: "PROCESSING", SETTLED: "SETTLED", FAILED: "FAILED", ON_HOLD: "ON_HOLD" } as const;
export type SettlementStatus = (typeof SettlementStatus)[keyof typeof SettlementStatus];
export const RefundStatus = { PENDING: "PENDING", PROCESSING: "PROCESSING", COMPLETED: "COMPLETED", FAILED: "FAILED" } as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];
export const RefundMethod = { RAZORPAY: "RAZORPAY", BANK_TRANSFER: "BANK_TRANSFER" } as const;
export type RefundMethod = (typeof RefundMethod)[keyof typeof RefundMethod];
export const ReturnResolution = { REFUND: "REFUND", REPLACEMENT: "REPLACEMENT" } as const;
export type ReturnResolution = (typeof ReturnResolution)[keyof typeof ReturnResolution];
export const ReturnStatus = { REQUESTED: "REQUESTED", APPROVED: "APPROVED", REJECTED: "REJECTED", PICKUP_SCHEDULED: "PICKUP_SCHEDULED", RECEIVED: "RECEIVED", RESOLVED: "RESOLVED" } as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];
export const ReplacementStatus = { REQUESTED: "REQUESTED", APPROVED: "APPROVED", REJECTED: "REJECTED", PROCESSING: "PROCESSING", SHIPPED: "SHIPPED", DELIVERED: "DELIVERED", CANCELLED: "CANCELLED" } as const;
export type ReplacementStatus = (typeof ReplacementStatus)[keyof typeof ReplacementStatus];
export const ReviewStatus = { PENDING: "PENDING", PUBLISHED: "PUBLISHED", REJECTED: "REJECTED" } as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
export const ComplaintStatus = { OPEN: "OPEN", ASSIGNED: "ASSIGNED", IN_PROGRESS: "IN_PROGRESS", RESOLVED: "RESOLVED", CLOSED: "CLOSED" } as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];
export const ComplaintCategory = { PRODUCT: "PRODUCT", QUALITY: "QUALITY", DELIVERY: "DELIVERY", PAYMENT: "PAYMENT", RETURN: "RETURN", VENDOR: "VENDOR", OTHER: "OTHER" } as const;
export type ComplaintCategory = (typeof ComplaintCategory)[keyof typeof ComplaintCategory];
export const NotificationStatus = { QUEUED: "QUEUED", SENT: "SENT", FAILED: "FAILED" } as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];
export const VerificationOtpPurpose = { ACCOUNT_VERIFICATION: "ACCOUNT_VERIFICATION", PASSWORD_RESET: "PASSWORD_RESET" } as const;
export type VerificationOtpPurpose = (typeof VerificationOtpPurpose)[keyof typeof VerificationOtpPurpose];

export type JsonValue = unknown;
export type JsonObject = Record<string, unknown>;
export type InputJsonValue = unknown;
export type User = Record<string, any>;

export class Decimal extends Number {
  constructor(value: number | string) { super(Number(value)); }
  toNumber(): number { return Number(this.valueOf()); }
  mul(value: number | Decimal): Decimal { return new Decimal(this.toNumber() * Number(value)); }
  div(value: number | Decimal): Decimal { return new Decimal(this.toNumber() / Number(value)); }
  toDecimalPlaces(places: number): Decimal {
    const factor = 10 ** places;
    return new Decimal(Math.round((this.toNumber() + Number.EPSILON) * factor) / factor);
  }
}

export class MongoDatabaseKnownRequestError extends Error {
  constructor(public readonly code: string, public readonly meta?: Record<string, unknown>) {
    super(code);
  }
}

const DecimalClass = Decimal;

// Compatibility-only type namespace while services are moved behind Mongo repositories.
// It contains no database client and performs no persistence.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MongoData {
  export type JsonValue = unknown;
  export type JsonObject = Record<string, unknown>;
  export type InputJsonValue = unknown;
  export type TransactionClient = any;
  export type CategorySelect = any;
  export type HomeHeroSlideSelect = any;
  export type ProductSelect = any;
  export type ProductGetPayload<T = any> = T extends unknown ? any : never;
  export type ProductWhereInput = any;
  export type ProductOrderByWithRelationInput = any;
  export type MasterOrderGetPayload<T = any> = T extends unknown ? any : never;
  export type MasterOrderInclude = any;
  export type OrderItemGetPayload<T = any> = T extends unknown ? any : never;
  export type ComplaintGetPayload<T = any> = T extends unknown ? any : never;
  export type ComplaintInclude = any;
  export const Decimal = DecimalClass;
}
