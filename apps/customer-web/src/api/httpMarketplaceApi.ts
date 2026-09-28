import { HttpClient } from "./httpClient";
import type {
  Address,
  AddressInput,
  AuthSession,
  Cart,
  CancelOrderItemInput,
  Category,
  CheckoutSummary,
  Complaint,
  CustomerNotification,
  CreateComplaintInput,
  CreateOrderInput,
  CreateReturnInput,
  CreateReviewInput,
  CustomerProfile,
  CustomerProfileInput,
  CustomerAuthResult,
  CustomerOtpChallenge,
  HomeHeroSlide,
  LoginInput,
  MarketplaceApi,
  OrderConfirmation,
  MasterOrder,
  OrderQuery,
  PaymentRecord,
  PaymentMethod,
  PaymentSession,
  PasswordResetRequestResult,
  PasswordResetOtpResult,
  Paginated,
  Product,
  ProductQuery,
  PublicReview,
  RegisterInput,
  ResetPasswordInput,
  ReturnRequest,
  Review,
  RazorpayVerificationInput,
  Shipment,
  VerificationOtpResult,
} from "./types";

function productQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export class HttpMarketplaceApi implements MarketplaceApi {
  private readonly client: HttpClient;

  constructor(baseUrl: string) {
    this.client = new HttpClient(baseUrl);
  }

  async getHomeHeroSlides(): Promise<HomeHeroSlide[]> {
    const slides = await this.client.get<HomeHeroSlide[]>("/home-hero-slides");
    return slides.map((slide) => ({
      ...slide,
      imageUrl: this.assetUrl(slide.imageUrl) ?? slide.imageUrl,
    }));
  }

  async getCategories(): Promise<Category[]> {
    const categories = await this.client.get<Category[]>("/categories");
    return categories.map((category) => ({
      ...category,
      imageUrl: this.assetUrl(category.imageUrl),
    }));
  }

  private assetUrl(value?: string | null): string | undefined {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
    // Keep API-owned assets same-origin so Vite can proxy them locally and
    // Vercel can cache immutable, content-hashed images at the edge.
    return value;
  }

  async getProducts(query: ProductQuery): Promise<Paginated<Product>> {
    const envelope = await this.client.getEnvelope<Product[]>(
      `/products${productQueryString(query)}`,
    );
    return {
      items: envelope.data,
      meta: envelope.meta ?? {
        page: 1,
        limit: envelope.data.length,
        total: envelope.data.length,
        totalPages: 1,
      },
    };
  }

  getProduct(idOrSlug: string): Promise<Product> {
    return this.client.get(`/products/${encodeURIComponent(idOrSlug)}`);
  }

  getProductReviews(productId: string): Promise<PublicReview[]> {
    return this.client.get(
      `/products/${encodeURIComponent(productId)}/reviews`,
    );
  }

  login(input: LoginInput): Promise<CustomerAuthResult> {
    return this.client.post("/auth/login", input);
  }

  register(input: RegisterInput): Promise<CustomerAuthResult> {
    return this.client.post("/auth/register", input);
  }

  logout(): Promise<void> {
    return this.client.post("/auth/logout");
  }

  forgotPassword(emailOrMobile: string): Promise<PasswordResetRequestResult> {
    return this.client.post("/auth/forgot-password", { emailOrMobile });
  }

  resetPassword(input: ResetPasswordInput): Promise<void> {
    return this.client.post("/auth/reset-password", input);
  }

  resendCustomerOtp(challengeToken: string): Promise<CustomerOtpChallenge> {
    return this.client.post("/auth/customer/otp/resend", { challengeToken });
  }

  verifyCustomerOtp(challengeToken: string, accessToken: string): Promise<AuthSession> {
    return this.client.post("/auth/customer/otp/verify", { challengeToken, accessToken });
  }

  verifyPasswordResetOtp(challengeToken: string, accessToken: string): Promise<PasswordResetOtpResult> {
    return this.client.post("/auth/customer/password-reset/verify-otp", { challengeToken, accessToken });
  }

  requestVerificationOtp(): Promise<VerificationOtpResult> {
    return this.client.post("/auth/request-verification-otp");
  }

  verifyOtp(code: string): Promise<VerificationOtpResult> {
    return this.client.post("/auth/verify-otp", { code });
  }

  getCart(): Promise<Cart> {
    return this.client.get("/cart");
  }

  addCartItem(productId: string, quantity: number): Promise<Cart> {
    return this.client.post("/cart/items", { productId, quantity });
  }

  updateCartItem(itemId: string, quantity: number): Promise<Cart> {
    return this.client.patch(`/cart/items/${encodeURIComponent(itemId)}`, {
      quantity,
    });
  }

  removeCartItem(itemId: string): Promise<Cart> {
    return this.client.delete(`/cart/items/${encodeURIComponent(itemId)}`);
  }

  refreshCart(): Promise<Cart> {
    return this.client.get("/cart");
  }

  getCustomerProfile(): Promise<CustomerProfile> {
    return this.client.get("/customers/me");
  }

  updateCustomerProfile(input: CustomerProfileInput): Promise<CustomerProfile> {
    return this.client.patch("/customers/me", input);
  }

  getAddresses(): Promise<Address[]> {
    return this.client.get("/customers/me/addresses");
  }

  createAddress(input: AddressInput): Promise<Address> {
    return this.client.post("/customers/me/addresses", input);
  }

  updateAddress(id: string, input: AddressInput): Promise<Address> {
    return this.client.patch(
      `/customers/me/addresses/${encodeURIComponent(id)}`,
      input,
    );
  }

  deleteAddress(id: string): Promise<void> {
    return this.client.delete(
      `/customers/me/addresses/${encodeURIComponent(id)}`,
    );
  }

  validateCheckout(
    addressId: string,
    paymentMethod: PaymentMethod,
  ): Promise<CheckoutSummary> {
    return this.client.post("/checkout/validate", { addressId, paymentMethod });
  }

  createOrder(input: CreateOrderInput): Promise<OrderConfirmation> {
    return this.client.post("/orders", input);
  }

  createPayment(masterOrderId: string): Promise<PaymentSession> {
    return this.client.post("/payments/create", { masterOrderId });
  }

  verifyPayment(input: RazorpayVerificationInput): Promise<PaymentRecord> {
    return this.client.post("/payments/verify", input);
  }

  getPaymentStatus(paymentId: string): Promise<PaymentRecord> {
    return this.client.get(`/payments/${encodeURIComponent(paymentId)}/status`);
  }

  async getOrders(query: OrderQuery): Promise<Paginated<MasterOrder>> {
    const envelope = await this.client.getEnvelope<MasterOrder[]>(
      `/orders${productQueryString(query)}`,
    );
    return {
      items: envelope.data,
      meta: envelope.meta ?? {
        page: 1,
        limit: envelope.data.length,
        total: envelope.data.length,
        totalPages: 1,
      },
    };
  }

  getOrder(orderId: string): Promise<MasterOrder> {
    return this.client.get(`/orders/${encodeURIComponent(orderId)}`);
  }

  getShipmentTracking(shipmentId: string): Promise<Shipment> {
    return this.client.get(
      `/shipments/${encodeURIComponent(shipmentId)}/tracking`,
    );
  }

  cancelOrderItem(
    orderId: string,
    itemId: string,
    input: CancelOrderItemInput,
  ): Promise<MasterOrder> {
    return this.client.post(
      `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/cancel`,
      input,
    );
  }

  createReturn(
    orderId: string,
    itemId: string,
    input: CreateReturnInput,
  ): Promise<ReturnRequest> {
    const body = new FormData();
    body.set("reason", input.reason);
    body.set("resolution", input.resolution);
    input.attachments?.forEach((file) => body.append("attachments", file));
    return this.client.postForm(
      `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/return`,
      body,
    );
  }

  createReview(productId: string, input: CreateReviewInput): Promise<Review> {
    const body = new FormData();
    body.set('orderItemId', input.orderItemId);
    body.set('rating', String(input.rating));
    body.set('comment', input.comment);
    input.imageUrls?.forEach((url) => body.append('imageUrls', url));
    input.imageFiles?.forEach((file) => body.append('images', file));
    return this.client.postForm(`/products/${encodeURIComponent(productId)}/reviews`, body);
  }

  updateReview(reviewId: string, input: Omit<CreateReviewInput, "orderItemId">): Promise<Review> {
    const body = new FormData();
    body.set('rating', String(input.rating));
    body.set('comment', input.comment);
    input.imageUrls?.forEach((url) => body.append('imageUrls', url));
    input.imageFiles?.forEach((file) => body.append('images', file));
    return this.client.patchForm(`/reviews/${encodeURIComponent(reviewId)}`, body);
  }

  reportReview(reviewId: string, reason?: string): Promise<{ reported: boolean; referenceNumber: string }> {
    return this.client.post(`/reviews/${encodeURIComponent(reviewId)}/report`, { reason });
  }

  getComplaints(): Promise<Complaint[]> {
    return this.client.get("/complaints");
  }

  getComplaint(complaintId: string): Promise<Complaint> {
    return this.client.get(`/complaints/${encodeURIComponent(complaintId)}`);
  }

  createComplaint(input: CreateComplaintInput): Promise<Complaint> {
    const body = new FormData();
    body.set("subject", input.subject);
    body.set("category", input.category);
    body.set("message", input.message);
    if (input.relatedOrderId) body.set("relatedOrderId", input.relatedOrderId);
    if (input.relatedOrderItemId)
      body.set("relatedOrderItemId", input.relatedOrderItemId);
    input.attachments?.forEach((file) => body.append("attachments", file));
    return this.client.postForm("/complaints", body);
  }

  addComplaintMessage(
    complaintId: string,
    message: string,
  ): Promise<Complaint> {
    return this.client.post(
      `/complaints/${encodeURIComponent(complaintId)}/messages`,
      { message },
    );
  }

  getNotifications(): Promise<CustomerNotification[]> {
    return this.client.get("/notifications");
  }
}
