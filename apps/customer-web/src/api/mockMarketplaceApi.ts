import { ApiError } from './errors';
import { mockCategories, mockProducts } from './mockData';
import { mockPostPurchase } from './mockPostPurchase';
import type {
  Address,
  AddressInput,
  AuthSession,
  Cart,
  CartLine,
  CartVendorGroup,
  CheckoutSummary,
  CreateOrderInput,
  LoginInput,
  MarketplaceApi,
  Money,
  OrderConfirmation,
  Paginated,
  Product,
  ProductQuery,
  RegisterInput,
} from './types';

interface StoredCartLine {
  id: string;
  productId: string;
  quantity: number;
}

const CART_KEY = 'vishwaneed.mock.cart';
const ADDRESS_KEY = 'vishwaneed.mock.addresses';
const money = (amount: number): Money => ({ amount, currency: 'INR' });
const wait = async (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 140));

const defaultAddresses: Address[] = [
  { id: 'address-home', label: 'HOME', recipientName: 'Demo Customer', mobile: '9876543210', line1: '221B, MG Road', line2: 'Near Central Library', city: 'Pune', state: 'Maharashtra', pincode: '411001', isDefault: true },
  { id: 'address-work', label: 'WORK', recipientName: 'Demo Customer', mobile: '9876543210', line1: 'Tech Park, Hinjewadi', city: 'Pune', state: 'Maharashtra', pincode: '411057', isDefault: false },
];

function readJson<T>(key: string, fallback: T): T {
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getStoredCart(): StoredCartLine[] {
  return readJson<StoredCartLine[]>(CART_KEY, []);
}

function buildCart(): Cart {
  const lines: CartLine[] = getStoredCart().flatMap((stored) => {
    const product = mockProducts.find((candidate) => candidate.id === stored.productId);
    if (!product) return [];
    return [{
      id: stored.id,
      product,
      quantity: stored.quantity,
      currentUnitPrice: product.price,
      issue: product.stockStatus === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' as const : undefined,
    }];
  });

  const groupsByVendor = new Map<string, CartLine[]>();
  lines.forEach((line) => {
    const current = groupsByVendor.get(line.product.vendor.id) ?? [];
    current.push(line);
    groupsByVendor.set(line.product.vendor.id, current);
  });

  const groups: CartVendorGroup[] = Array.from(groupsByVendor.values()).map((items) => ({
    vendor: items[0]!.product.vendor,
    items,
    productSubtotal: money(items.reduce((total, item) => total + item.currentUnitPrice.amount * item.quantity, 0)),
  }));

  return {
    groups,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    productSubtotal: money(groups.reduce((total, group) => total + group.productSubtotal.amount, 0)),
    refreshedAt: new Date().toISOString(),
  };
}

export function createMockMarketplaceApi(): MarketplaceApi {
  let lastQuote: CheckoutSummary | null = null;

  return {
    async getHomeHeroSlides() {
      await wait();
      return [];
    },
    async getCategories() {
      await wait();
      return mockCategories;
    },
    async getProducts(query: ProductQuery): Promise<Paginated<Product>> {
      await wait();
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.max(1, query.limit ?? 8);
      const search = query.search?.trim().toLowerCase();
      let items = mockProducts.filter((product) =>
        (!search || `${product.name} ${product.vendor.name} ${product.categoryName}`.toLowerCase().includes(search)) &&
        (!query.category || product.categoryId === query.category || product.categoryName.toLowerCase() === query.category.toLowerCase()) &&
        (!query.vendorId || product.vendor.id === query.vendorId) &&
        (!query.productType || product.productType === query.productType) &&
        (query.minPrice === undefined || product.price.amount >= query.minPrice) &&
        (query.maxPrice === undefined || product.price.amount <= query.maxPrice) &&
        (!query.available || product.stockStatus !== 'OUT_OF_STOCK') &&
        (!query.featured || product.featured) &&
        (!query.bestSeller || product.bestSeller),
      );

      items = [...items].sort((a, b) => {
        if (query.sort === 'PRICE_ASC') return a.price.amount - b.price.amount;
        if (query.sort === 'PRICE_DESC') return b.price.amount - a.price.amount;
        if (query.sort === 'NEWEST') return b.id.localeCompare(a.id);
        return b.rating - a.rating;
      });
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return { items: items.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages } };
    },
    async getProduct(idOrSlug: string) {
      await wait();
      const product = mockProducts.find((candidate) => candidate.id === idOrSlug || candidate.slug === idOrSlug);
      if (!product) throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
      return product;
    },
    async getProductReviews() {
      await wait();
      return [];
    },
    async login(input: LoginInput): Promise<AuthSession> {
      await wait();
      if (!input.password) throw new ApiError('Password is required.', 422, 'VALIDATION_ERROR');
      return { accessToken: 'mock-customer-access-token', customer: { id: 'customer-demo', name: 'Demo Customer', email: input.emailOrMobile.includes('@') ? input.emailOrMobile : undefined, mobile: input.emailOrMobile.includes('@') ? undefined : input.emailOrMobile, role: 'CUSTOMER' } };
    },
    async register(input: RegisterInput) {
      await wait();
      return { verificationRequired: true as const, challengeToken: 'mock-account-challenge', maskedDestination: `******${input.mobile.slice(-4)}`, message: 'Verification code sent securely', expiresInMinutes: 5, resendAfterSeconds: 30, otp: { provider: 'MSG91_WIDGET' as const, widgetId: 'mock-widget', tokenAuth: 'mock-token', identifier: `91${input.mobile}` } };
    },
    async logout() {
      await wait();
    },
    async forgotPassword() {
      await wait();
      return { message: 'If the account exists, a verification code will be sent securely.', challengeToken: 'mock-reset-challenge', maskedDestination: '******3210', resendAfterSeconds: 30, otp: { provider: 'MSG91_WIDGET' as const, widgetId: 'mock-widget', tokenAuth: 'mock-token', identifier: '919876543210' } };
    },
    async resetPassword() {
      await wait();
    },
    async resendCustomerOtp(challengeToken: string) {
      await wait();
      return { verificationRequired: true, challengeToken, maskedDestination: '******3210', message: 'A new verification code was sent securely', expiresInMinutes: 5, resendAfterSeconds: 30, otp: { provider: 'MSG91_WIDGET' as const, widgetId: 'mock-widget', tokenAuth: 'mock-token', identifier: '919876543210' } };
    },
    async verifyCustomerOtp(_challengeToken: string, code: string): Promise<AuthSession> {
      await wait();
      if (code !== '123456') throw new ApiError('Verification code is invalid or expired', 400, 'INVALID_OTP');
      return { accessToken: 'mock-customer-access-token', refreshToken: 'mock-refresh-token', customer: { id: 'customer-demo', name: 'Demo Customer', mobile: '9876543210', mobileVerified: true, role: 'CUSTOMER' } };
    },
    async verifyPasswordResetOtp(_challengeToken: string, code: string) {
      await wait();
      if (code !== '123456') throw new ApiError('Verification code is invalid or expired', 400, 'INVALID_OTP');
      return { message: 'Verification successful', resetToken: 'mock-reset-token' };
    },
    async requestVerificationOtp() {
      await wait();
      return { message: "Verification code sent securely" };
    },
    async verifyOtp(code: string) {
      await wait();
      if (code !== "123456") throw new ApiError("Verification code is invalid or expired", 400, "INVALID_OTP");
      return { message: "Mobile number verified successfully", verified: true };
    },
    async getCart() {
      await wait();
      return buildCart();
    },
    async addCartItem(productId: string, quantity: number) {
      await wait();
      const product = mockProducts.find((candidate) => candidate.id === productId);
      if (!product) throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
      if (product.stockStatus === 'OUT_OF_STOCK') throw new ApiError('This product is currently out of stock.', 409, 'OUT_OF_STOCK');
      const stored = getStoredCart();
      const existing = stored.find((line) => line.productId === productId);
      if (existing) existing.quantity = Math.min(product.availableQuantity, existing.quantity + quantity);
      else stored.push({ id: crypto.randomUUID(), productId, quantity: Math.min(product.availableQuantity, quantity) });
      writeJson(CART_KEY, stored);
      return buildCart();
    },
    async updateCartItem(itemId: string, quantity: number) {
      await wait();
      const stored = getStoredCart();
      const line = stored.find((candidate) => candidate.id === itemId);
      if (!line) throw new ApiError('Cart item not found.', 404, 'CART_ITEM_NOT_FOUND');
      const product = mockProducts.find((candidate) => candidate.id === line.productId);
      if (!product) throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
      line.quantity = Math.max(1, Math.min(product.availableQuantity, quantity));
      writeJson(CART_KEY, stored);
      return buildCart();
    },
    async removeCartItem(itemId: string) {
      await wait();
      writeJson(CART_KEY, getStoredCart().filter((line) => line.id !== itemId));
      return buildCart();
    },
    async refreshCart() {
      await wait();
      return buildCart();
    },
    async getCustomerProfile() {
      await wait();
      return mockPostPurchase.getProfile();
    },
    async updateCustomerProfile(input) {
      await wait();
      return mockPostPurchase.updateProfile(input);
    },
    async getAddresses() {
      await wait();
      return readJson<Address[]>(ADDRESS_KEY, defaultAddresses);
    },
    async createAddress(input: AddressInput) {
      await wait();
      const addresses = readJson<Address[]>(ADDRESS_KEY, defaultAddresses);
      if (input.isDefault) addresses.forEach((address) => { address.isDefault = false; });
      const address: Address = { ...input, id: crypto.randomUUID() };
      addresses.push(address);
      writeJson(ADDRESS_KEY, addresses);
      return address;
    },
    async updateAddress(id: string, input: AddressInput) {
      await wait();
      const addresses = readJson<Address[]>(ADDRESS_KEY, defaultAddresses);
      const index = addresses.findIndex((address) => address.id === id);
      if (index < 0) throw new ApiError('Address not found.', 404, 'ADDRESS_NOT_FOUND');
      if (input.isDefault) addresses.forEach((address) => { address.isDefault = false; });
      const address: Address = { ...input, id };
      addresses[index] = address;
      writeJson(ADDRESS_KEY, addresses);
      return address;
    },
    async deleteAddress(id: string) {
      await wait();
      writeJson(ADDRESS_KEY, readJson<Address[]>(ADDRESS_KEY, defaultAddresses).filter((address) => address.id !== id));
    },
    async validateCheckout(addressId: string) {
      await wait();
      const address = readJson<Address[]>(ADDRESS_KEY, defaultAddresses).find((candidate) => candidate.id === addressId);
      if (!address) throw new ApiError('Select a valid delivery address.', 422, 'INVALID_ADDRESS');
      const cart = buildCart();
      if (!cart.itemCount) throw new ApiError('Your cart is empty.', 422, 'EMPTY_CART');
      if (cart.groups.some((group) => group.items.some((item) => item.issue))) throw new ApiError('Resolve cart availability issues before checkout.', 409, 'CART_REQUIRES_REFRESH');
      const vendors = cart.groups.map((group, index) => ({
        ...group,
        shipping: money(45 + index * 15),
        estimatedDelivery: index === 0 ? '3-5 business days' : '4-6 business days',
      }));
      const totalShipping = money(vendors.reduce((total, group) => total + group.shipping.amount, 0));
      lastQuote = {
        quoteId: `dev-quote-${Date.now()}`,
        addressId,
        vendors,
        productSubtotal: cart.productSubtotal,
        totalShipping,
        payableTotal: money(cart.productSubtotal.amount + totalShipping.amount),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
      return lastQuote;
    },
    async createOrder(input: CreateOrderInput): Promise<OrderConfirmation> {
      await wait();
      if (!lastQuote || lastQuote.quoteId !== input.quoteId || lastQuote.addressId !== input.addressId) throw new ApiError('Checkout quote is missing or expired.', 409, 'QUOTE_EXPIRED');
      if (input.paymentMethod === 'PREPAID') throw new ApiError('Prepaid checkout requires Developer 2 payment-session and verification APIs.', 501, 'PAYMENT_PROVIDER_UNAVAILABLE');
      const placedAt = new Date().toISOString();
      const suffix = String(Date.now()).slice(-6);
      const confirmation: OrderConfirmation = {
        masterOrderId: `DEV-${suffix}`,
        masterOrderNumber: `DEV-${suffix}`,
        paymentMethod: 'COD',
        paymentStatus: 'COD_PENDING',
        status: 'CONFIRMED',
        productSubtotal: lastQuote.productSubtotal,
        totalShipping: lastQuote.totalShipping,
        payableTotal: lastQuote.payableTotal,
        placedAt,
        deliveryAddress: readJson<Address[]>(ADDRESS_KEY, defaultAddresses).find((address) => address.id === input.addressId)!,
        vendorOrders: lastQuote.vendors.map((group, index) => ({
          id: `DEV-${suffix}-${index + 1}`,
          vendor: group.vendor,
          status: 'CONFIRMED',
          productSubtotal: group.productSubtotal,
          shipping: group.shipping,
          orderTotal: money(group.productSubtotal.amount + group.shipping.amount),
          estimatedDelivery: group.estimatedDelivery,
          items: group.items.map((line) => ({ id: `DEV-ITEM-${line.id}`, productId: line.product.id, productName: line.product.name, productSlug: line.product.slug, imageUrl: line.product.images[0]!, weight: line.product.weight, quantity: line.quantity, unitPrice: line.currentUnitPrice, lineTotal: money(line.currentUnitPrice.amount * line.quantity), status: 'CONFIRMED', actions: { canCancel: true, canReturn: false, canReview: false, canRaiseComplaint: true, returnIneligibleReason: 'The backend has not marked this item delivered and return eligible.' } })),
        })),
      };
      mockPostPurchase.addOrder(confirmation);
      writeJson(CART_KEY, []);
      lastQuote = null;
      return confirmation;
    },
    async createPayment() {
      await wait();
      throw new ApiError('Razorpay checkout requires Developer 2 payment creation and verification APIs.', 501, 'PAYMENT_PROVIDER_UNAVAILABLE');
    },
    async verifyPayment() {
      await wait();
      throw new ApiError('Payment verification is unavailable in the development adapter.', 501, 'PAYMENT_VERIFICATION_UNAVAILABLE');
    },
    async getPaymentStatus() {
      await wait();
      throw new ApiError('Payment status is unavailable in the development adapter.', 501, 'PAYMENT_STATUS_UNAVAILABLE');
    },
    async getOrders(query) {
      await wait();
      return mockPostPurchase.getOrders(query);
    },
    async getOrder(orderId) {
      await wait();
      return mockPostPurchase.getOrder(orderId);
    },
    async getShipmentTracking(shipmentId) {
      await wait();
      return mockPostPurchase.getShipment(shipmentId);
    },
    async cancelOrderItem(orderId, itemId, input) {
      await wait();
      return mockPostPurchase.cancelItem(orderId, itemId, input);
    },
    async createReturn(orderId, itemId, input) {
      await wait();
      return mockPostPurchase.createReturn(orderId, itemId, input);
    },
    async createReview(productId, input) {
      await wait();
      return mockPostPurchase.createReview(productId, input);
    },
    updateReview(reviewId, input) {
      return Promise.resolve(mockPostPurchase.updateReview(reviewId, input));
    },
    reportReview() {
      return Promise.resolve({ reported: true, referenceNumber: `CMP-${Date.now()}-REVIEW` });
    },
    async getComplaints() {
      await wait();
      return mockPostPurchase.getComplaints();
    },
    async getComplaint(complaintId) {
      await wait();
      return mockPostPurchase.getComplaint(complaintId);
    },
    async createComplaint(input) {
      await wait();
      return mockPostPurchase.createComplaint(input);
    },
    async addComplaintMessage(complaintId, message) {
      await wait();
      return mockPostPurchase.addComplaintMessage(complaintId, message);
    },
    async getNotifications() {
      await wait();
      return [];
    },
  };
}
