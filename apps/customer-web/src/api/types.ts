export type Currency = "INR";

export interface Money {
  amount: number;
  currency: Currency;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
}

export interface HomeHeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
}

export type ProductType = "RAW_COMMODITY" | "VALUE_ADDED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface VendorSummary {
  id: string;
  name: string;
  location: string;
  rating: number;
  productCount: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  productType: ProductType;
  vendor: VendorSummary;
  price: Money;
  mrp?: Money;
  gstInclusive: true;
  weight: string;
  dimensions?: {
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  description: string;
  ingredients?: string[];
  specifications: Record<string, string>;
  images: string[];
  stockStatus: StockStatus;
  availableQuantity: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  bestSeller: boolean;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  submittedAt: string;
  images: string[];
}

export type ProductSort = "POPULAR" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";

export interface ProductQuery {
  search?: string;
  category?: string;
  vendorId?: string;
  productType?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
  featured?: boolean;
  bestSeller?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  role: "CUSTOMER";
  mobileVerified?: boolean;
}

export interface CustomerProfile extends Customer {
  email: string;
  mobile: string;
  createdAt: string;
  marketingOptIn: boolean;
}

export interface CustomerProfileInput {
  name: string;
  email: string;
  mobile: string;
  marketingOptIn: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  customer: Customer;
}

export interface Msg91OtpConfiguration {
  provider: 'MSG91_WIDGET';
  widgetId: string;
  tokenAuth: string;
  identifier: string;
}

export interface CustomerOtpChallenge {
  verificationRequired: true;
  challengeToken: string;
  maskedDestination: string;
  message: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
  otp: Msg91OtpConfiguration;
  verified?: boolean;
}

export type CustomerAuthResult = AuthSession | CustomerOtpChallenge;

export interface LoginInput {
  emailOrMobile: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface PasswordResetRequestResult {
  message: string;
  challengeToken: string;
  maskedDestination: string;
  resendAfterSeconds: number;
  otp?: Msg91OtpConfiguration;
  developmentResetUrl?: string;
}

export interface PasswordResetOtpResult {
  message: string;
  resetToken: string;
}

export interface VerificationOtpResult {
  message: string;
  verified?: boolean;
  expiresInMinutes?: number;
}

export interface CartLine {
  id: string;
  product: Product;
  quantity: number;
  currentUnitPrice: Money;
  previousUnitPrice?: Money;
  issue?: "PRICE_CHANGED" | "OUT_OF_STOCK" | "QUANTITY_UNAVAILABLE";
}

export interface CartVendorGroup {
  vendor: VendorSummary;
  items: CartLine[];
  productSubtotal: Money;
}

export interface Cart {
  groups: CartVendorGroup[];
  itemCount: number;
  productSubtotal: Money;
  refreshedAt: string;
}

export interface Address {
  id: string;
  label: "HOME" | "WORK" | "OTHER";
  recipientName: string;
  mobile: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id">;

export interface CheckoutVendorGroup {
  vendor: VendorSummary;
  items: CartLine[];
  productSubtotal: Money;
  shipping: Money;
  estimatedDelivery: string;
}

export interface CheckoutSummary {
  quoteId: string;
  addressId: string;
  vendors: CheckoutVendorGroup[];
  productSubtotal: Money;
  totalShipping: Money;
  payableTotal: Money;
  expiresAt: string;
}

export type PaymentMethod = "COD" | "PREPAID";
export type PaymentStatus =
  | "COD_PENDING"
  | "PAYMENT_PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "PARTIALLY_CANCELLED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "REPLACEMENT_REQUESTED"
  | "REPLACED";
export type ShipmentStatus =
  | "PENDING"
  | "READY_TO_SHIP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "CANCELLED";
export type ReturnResolution = "REFUND" | "REPLACEMENT";
export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "RECEIVED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "REPLACEMENT_PENDING"
  | "REPLACED"
  | "CLOSED";
export type ReviewStatus = "PENDING_MODERATION" | "PUBLISHED" | "REJECTED";
export type ComplaintStatus =
  "OPEN" | "IN_REVIEW" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED";

export interface CreateOrderInput {
  quoteId: string;
  addressId: string;
  paymentMethod: PaymentMethod;
}

export interface OrderItemActions {
  canCancel: boolean;
  canReturn: boolean;
  canReview: boolean;
  canRaiseComplaint: boolean;
  cancellationReason?: string;
  returnIneligibleReason?: string;
}

export interface ReturnRequest {
  id: string;
  resolution: ReturnResolution;
  reason: string;
  status: ReturnStatus;
  requestedAt: string;
  refundAmount?: Money;
  statusMessage?: string;
  attachmentNames: string[];
}

export interface Review {
  id: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  submittedAt: string;
  images: string[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  weight: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  status: OrderStatus;
  actions: OrderItemActions;
  returnRequest?: ReturnRequest;
  review?: Review;
}

export interface TrackingEvent {
  id: string;
  status: ShipmentStatus;
  label: string;
  location?: string;
  occurredAt: string;
}

export interface Shipment {
  id: string;
  provider: string;
  carrier?: string;
  awb?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  statusLabel: string;
  updatedAt: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export interface VendorOrder {
  id: string;
  vendorOrderNumber?: string;
  vendor: VendorSummary;
  status: OrderStatus;
  productSubtotal: Money;
  shipping: Money;
  orderTotal: Money;
  estimatedDelivery?: string;
  items: OrderItem[];
  shipment?: Shipment;
}

export interface MasterOrder {
  masterOrderId: string;
  masterOrderNumber: string;
  placedAt: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  productSubtotal: Money;
  totalShipping: Money;
  payableTotal: Money;
  deliveryAddress: Address;
  vendorOrders: VendorOrder[];
}

export type OrderConfirmation = MasterOrder;

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface CancelOrderItemInput {
  reason: string;
}

export interface CreateReturnInput {
  reason: string;
  resolution: ReturnResolution;
  attachments?: File[];
}

export interface CreateReviewInput {
  orderItemId: string;
  rating: number;
  comment: string;
  imageUrls?: string[];
  imageFiles?: File[];
}

export interface PaymentSession {
  paymentId: string;
  masterOrderId: string;
  provider: "RAZORPAY";
  providerOrderId: string;
  publicKey: string;
  amountMinor: number;
  currency: Currency;
  customer: { name: string; email?: string; mobile?: string };
  description: string;
}

export interface RazorpayVerificationInput {
  paymentId: string;
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
}

export interface PaymentRecord {
  id: string;
  masterOrderId: string;
  provider: "RAZORPAY" | "COD";
  status: PaymentStatus;
  amount: Money;
  failureMessage?: string;
  updatedAt: string;
}

export type ComplaintCategory =
  "PRODUCT" | "QUALITY" | "DELIVERY" | "PAYMENT" | "RETURN" | "OTHER";

export interface ComplaintMessage {
  id: string;
  author: "CUSTOMER" | "SUPPORT";
  message: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  referenceNumber: string;
  subject: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  relatedOrderId?: string;
  relatedOrderItemId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ComplaintMessage[];
  attachmentNames: string[];
}

export interface CreateComplaintInput {
  subject: string;
  category: ComplaintCategory;
  message: string;
  relatedOrderId?: string;
  relatedOrderItemId?: string;
  attachments?: File[];
}

export interface CustomerNotification {
  id: string;
  channel: string;
  templateKey: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
}

export interface MarketplaceApi {
  getHomeHeroSlides(): Promise<HomeHeroSlide[]>;
  getCategories(): Promise<Category[]>;
  getProducts(query: ProductQuery): Promise<Paginated<Product>>;
  getProduct(idOrSlug: string): Promise<Product>;
  getProductReviews(productId: string): Promise<PublicReview[]>;
  login(input: LoginInput): Promise<CustomerAuthResult>;
  register(input: RegisterInput): Promise<CustomerAuthResult>;
  logout(): Promise<void>;
  forgotPassword(emailOrMobile: string): Promise<PasswordResetRequestResult>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  resendCustomerOtp(challengeToken: string): Promise<CustomerOtpChallenge>;
  verifyCustomerOtp(challengeToken: string, accessToken: string): Promise<AuthSession>;
  verifyPasswordResetOtp(challengeToken: string, accessToken: string): Promise<PasswordResetOtpResult>;
  requestVerificationOtp(): Promise<VerificationOtpResult>;
  verifyOtp(code: string): Promise<VerificationOtpResult>;
  getCart(): Promise<Cart>;
  addCartItem(productId: string, quantity: number): Promise<Cart>;
  updateCartItem(itemId: string, quantity: number): Promise<Cart>;
  removeCartItem(itemId: string): Promise<Cart>;
  refreshCart(): Promise<Cart>;
  getCustomerProfile(): Promise<CustomerProfile>;
  updateCustomerProfile(input: CustomerProfileInput): Promise<CustomerProfile>;
  getAddresses(): Promise<Address[]>;
  createAddress(input: AddressInput): Promise<Address>;
  updateAddress(id: string, input: AddressInput): Promise<Address>;
  deleteAddress(id: string): Promise<void>;
  validateCheckout(
    addressId: string,
    paymentMethod: PaymentMethod,
  ): Promise<CheckoutSummary>;
  createOrder(input: CreateOrderInput): Promise<OrderConfirmation>;
  createPayment(masterOrderId: string): Promise<PaymentSession>;
  verifyPayment(input: RazorpayVerificationInput): Promise<PaymentRecord>;
  getPaymentStatus(paymentId: string): Promise<PaymentRecord>;
  getOrders(query: OrderQuery): Promise<Paginated<MasterOrder>>;
  getOrder(orderId: string): Promise<MasterOrder>;
  getShipmentTracking(shipmentId: string): Promise<Shipment>;
  cancelOrderItem(
    orderId: string,
    itemId: string,
    input: CancelOrderItemInput,
  ): Promise<MasterOrder>;
  createReturn(
    orderId: string,
    itemId: string,
    input: CreateReturnInput,
  ): Promise<ReturnRequest>;
  createReview(productId: string, input: CreateReviewInput): Promise<Review>;
  updateReview(reviewId: string, input: Omit<CreateReviewInput, "orderItemId">): Promise<Review>;
  reportReview(reviewId: string, reason?: string): Promise<{ reported: boolean; referenceNumber: string }>;
  getComplaints(): Promise<Complaint[]>;
  getComplaint(complaintId: string): Promise<Complaint>;
  createComplaint(input: CreateComplaintInput): Promise<Complaint>;
  addComplaintMessage(complaintId: string, message: string): Promise<Complaint>;
  getNotifications(): Promise<CustomerNotification[]>;
}
