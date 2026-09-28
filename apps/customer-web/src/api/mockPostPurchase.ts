import { ApiError } from './errors';
import { mockProducts } from './mockData';
import type {
  CancelOrderItemInput,
  Complaint,
  CreateComplaintInput,
  CreateReturnInput,
  CreateReviewInput,
  CustomerProfile,
  CustomerProfileInput,
  MasterOrder,
  Money,
  OrderItem,
  OrderQuery,
  Paginated,
  ReturnRequest,
  Review,
  Shipment,
} from './types';

const ORDERS_KEY = 'vishwaneed.mock.orders';
const PROFILE_KEY = 'vishwaneed.mock.profile';
const COMPLAINTS_KEY = 'vishwaneed.mock.complaints';

const money = (amount: number): Money => ({ amount, currency: 'INR' });
const now = () => new Date().toISOString();

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

function product(id: string) {
  const result = mockProducts.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Missing mock product ${id}`);
  return result;
}

function item(id: string, productId: string, status: OrderItem['status'], actions: OrderItem['actions']): OrderItem {
  const value = product(productId);
  return {
    id,
    productId: value.id,
    productName: value.name,
    productSlug: value.slug,
    imageUrl: value.images[0]!,
    weight: value.weight,
    quantity: 1,
    unitPrice: value.price,
    lineTotal: value.price,
    status,
    actions,
  };
}

const deliveredShipment: Shipment = {
  id: 'shipment-demo-delivered',
  provider: 'Shiprocket',
  carrier: 'Delhivery',
  awb: 'SR-DEMO-782411',
  trackingUrl: 'https://shiprocket.co/tracking',
  status: 'DELIVERED',
  statusLabel: 'Delivered',
  updatedAt: '2026-09-14T10:45:00.000Z',
  estimatedDelivery: 'Delivered on 14 September',
  events: [
    { id: 'track-1', status: 'PICKED_UP', label: 'Picked up from Kolhapur', location: 'Kolhapur, Maharashtra', occurredAt: '2026-09-10T08:30:00.000Z' },
    { id: 'track-2', status: 'IN_TRANSIT', label: 'Reached destination hub', location: 'Pune, Maharashtra', occurredAt: '2026-09-13T04:20:00.000Z' },
    { id: 'track-3', status: 'DELIVERED', label: 'Delivered to customer', location: 'Pune, Maharashtra', occurredAt: '2026-09-14T10:45:00.000Z' },
  ],
};

const activeShipment: Shipment = {
  id: 'shipment-demo-transit',
  provider: 'Shiprocket',
  carrier: 'Blue Dart',
  awb: 'SR-DEMO-901227',
  trackingUrl: 'https://shiprocket.co/tracking',
  status: 'IN_TRANSIT',
  statusLabel: 'In transit',
  updatedAt: '2026-09-16T13:15:00.000Z',
  estimatedDelivery: 'Expected by 19 September',
  events: [
    { id: 'track-4', status: 'PICKED_UP', label: 'Picked up from producer', location: 'Koraput, Odisha', occurredAt: '2026-09-15T09:10:00.000Z' },
    { id: 'track-5', status: 'IN_TRANSIT', label: 'Shipment is moving to the destination city', location: 'Nagpur, Maharashtra', occurredAt: '2026-09-16T13:15:00.000Z' },
  ],
};

function seededOrders(): MasterOrder[] {
  const jaggery = item('item-demo-jaggery', 'prod-jaggery', 'DELIVERED', { canCancel: false, canReturn: true, canReview: true, canRaiseComplaint: true });
  const pickle = item('item-demo-pickle', 'prod-mango-pickle', 'SHIPPED', { canCancel: false, canReturn: false, canReview: false, canRaiseComplaint: true, returnIneligibleReason: 'Returns become available only if the backend marks this item delivered and eligible.' });
  return [{
    masterOrderId: 'order-demo-1001',
    masterOrderNumber: 'VW-1001',
    placedAt: '2026-09-09T11:20:00.000Z',
    paymentMethod: 'PREPAID',
    paymentStatus: 'PAID',
    status: 'SHIPPED',
    productSubtotal: money(428),
    totalShipping: money(105),
    payableTotal: money(533),
    deliveryAddress: { id: 'address-home', label: 'HOME', recipientName: 'Demo Customer', mobile: '9876543210', line1: '221B, MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001', isDefault: true },
    vendorOrders: [
      { id: 'vendor-order-1001-a', vendor: product('prod-jaggery').vendor, status: 'DELIVERED', productSubtotal: money(179), shipping: money(45), orderTotal: money(224), estimatedDelivery: 'Delivered on 14 September', items: [jaggery], shipment: deliveredShipment },
      { id: 'vendor-order-1001-b', vendor: product('prod-mango-pickle').vendor, status: 'SHIPPED', productSubtotal: money(249), shipping: money(60), orderTotal: money(309), estimatedDelivery: 'Expected by 19 September', items: [pickle], shipment: activeShipment },
    ],
  }];
}

const defaultProfile: CustomerProfile = {
  id: 'customer-demo',
  name: 'Demo Customer',
  email: 'demo@example.com',
  mobile: '9876543210',
  role: 'CUSTOMER',
  createdAt: '2026-08-01T10:00:00.000Z',
  marketingOptIn: false,
};

const seededComplaints: Complaint[] = [{
  id: 'complaint-demo-1',
  referenceNumber: 'CMP-1042',
  subject: 'Delivery status clarification',
  category: 'DELIVERY',
  status: 'IN_REVIEW',
  relatedOrderId: 'order-demo-1001',
  createdAt: '2026-09-16T14:10:00.000Z',
  updatedAt: '2026-09-16T15:30:00.000Z',
  attachmentNames: [],
  messages: [
    { id: 'message-1', author: 'CUSTOMER', message: 'Please confirm the current location of the Odisha shipment.', createdAt: '2026-09-16T14:10:00.000Z' },
    { id: 'message-2', author: 'SUPPORT', message: 'We are checking the latest carrier scan and will update this complaint.', createdAt: '2026-09-16T15:30:00.000Z' },
  ],
}];

function getOrdersStore(): MasterOrder[] {
  return readJson(ORDERS_KEY, seededOrders());
}

function saveOrders(orders: MasterOrder[]): void {
  writeJson(ORDERS_KEY, orders);
}

function findOrder(orders: MasterOrder[], orderId: string): MasterOrder {
  const order = orders.find((candidate) => candidate.masterOrderId === orderId || candidate.masterOrderNumber === orderId);
  if (!order) throw new ApiError('Order not found.', 404, 'ORDER_NOT_FOUND');
  return order;
}

function findItem(order: MasterOrder, itemId: string): OrderItem {
  const result = order.vendorOrders.flatMap((vendorOrder) => vendorOrder.items).find((candidate) => candidate.id === itemId);
  if (!result) throw new ApiError('Order item not found.', 404, 'ORDER_ITEM_NOT_FOUND');
  return result;
}

export const mockPostPurchase = {
  addOrder(order: MasterOrder): void {
    saveOrders([order, ...getOrdersStore()]);
  },
  getProfile(): CustomerProfile {
    return readJson(PROFILE_KEY, defaultProfile);
  },
  updateProfile(input: CustomerProfileInput): CustomerProfile {
    const profile = { ...readJson(PROFILE_KEY, defaultProfile), ...input };
    writeJson(PROFILE_KEY, profile);
    return profile;
  },
  getOrders(query: OrderQuery): Paginated<MasterOrder> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const filtered = getOrdersStore().filter((order) => !query.status || order.status === query.status || order.vendorOrders.some((vendorOrder) => vendorOrder.status === query.status));
    return { items: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) } };
  },
  getOrder(orderId: string): MasterOrder {
    return findOrder(getOrdersStore(), orderId);
  },
  getShipment(shipmentId: string): Shipment {
    const shipment = getOrdersStore().flatMap((order) => order.vendorOrders).map((vendorOrder) => vendorOrder.shipment).find((candidate) => candidate?.id === shipmentId);
    if (!shipment) throw new ApiError('Shipment tracking is not available.', 404, 'SHIPMENT_NOT_FOUND');
    return shipment;
  },
  cancelItem(orderId: string, itemId: string, input: CancelOrderItemInput): MasterOrder {
    const orders = getOrdersStore();
    const order = findOrder(orders, orderId);
    const orderItem = findItem(order, itemId);
    if (!orderItem.actions.canCancel) throw new ApiError(orderItem.actions.cancellationReason ?? 'This item is not cancellable.', 409, 'ITEM_NOT_CANCELLABLE');
    orderItem.status = 'CANCELLED';
    orderItem.actions.canCancel = false;
    orderItem.actions.canReturn = false;
    const vendorOrder = order.vendorOrders.find((candidate) => candidate.items.some((candidateItem) => candidateItem.id === itemId));
    if (vendorOrder?.items.every((candidate) => candidate.status === 'CANCELLED')) vendorOrder.status = 'CANCELLED';
    order.status = order.vendorOrders.every((candidate) => candidate.status === 'CANCELLED') ? 'CANCELLED' : 'PARTIALLY_CANCELLED';
    orderItem.actions.cancellationReason = input.reason;
    saveOrders(orders);
    return order;
  },
  createReturn(orderId: string, itemId: string, input: CreateReturnInput): ReturnRequest {
    const orders = getOrdersStore();
    const order = findOrder(orders, orderId);
    const orderItem = findItem(order, itemId);
    if (!orderItem.actions.canReturn) throw new ApiError(orderItem.actions.returnIneligibleReason ?? 'This item is not return eligible.', 409, 'ITEM_NOT_RETURNABLE');
    const request: ReturnRequest = { id: crypto.randomUUID(), resolution: input.resolution, reason: input.reason, status: 'REQUESTED', requestedAt: now(), attachmentNames: input.attachments?.map((file) => file.name) ?? [], statusMessage: 'The marketplace team will review this request.' };
    orderItem.returnRequest = request;
    orderItem.status = input.resolution === 'REFUND' ? 'RETURN_REQUESTED' : 'REPLACEMENT_REQUESTED';
    orderItem.actions.canReturn = false;
    saveOrders(orders);
    return request;
  },
  createReview(productId: string, input: CreateReviewInput): Review {
    const orders = getOrdersStore();
    const orderItem = orders.flatMap((order) => order.vendorOrders).flatMap((vendorOrder) => vendorOrder.items).find((candidate) => candidate.id === input.orderItemId && candidate.productId === productId);
    if (!orderItem || !orderItem.actions.canReview) throw new ApiError('This purchase is not eligible for review.', 409, 'REVIEW_NOT_ELIGIBLE');
    const review: Review = { id: crypto.randomUUID(), productId, orderItemId: input.orderItemId, rating: input.rating, comment: input.comment, images: input.imageUrls ?? [], status: 'PENDING_MODERATION', submittedAt: now() };
    orderItem.review = review;
    orderItem.actions.canReview = false;
    saveOrders(orders);
    return review;
  },
  updateReview(reviewId: string, input: Omit<CreateReviewInput, 'orderItemId'>): Review {
    const orders = getOrdersStore();
    const item = orders.flatMap((order) => order.vendorOrders).flatMap((vendorOrder) => vendorOrder.items).find((candidate) => candidate.review?.id === reviewId);
    if (!item?.review) throw new ApiError('Review not found.', 404, 'REVIEW_NOT_FOUND');
    item.review = { ...item.review, rating: input.rating, comment: input.comment, images: input.imageUrls ?? [], status: 'PENDING_MODERATION' };
    saveOrders(orders);
    return item.review;
  },
  getComplaints(): Complaint[] {
    return readJson(COMPLAINTS_KEY, seededComplaints);
  },
  getComplaint(complaintId: string): Complaint {
    const result = readJson(COMPLAINTS_KEY, seededComplaints).find((candidate) => candidate.id === complaintId || candidate.referenceNumber === complaintId);
    if (!result) throw new ApiError('Complaint not found.', 404, 'COMPLAINT_NOT_FOUND');
    return result;
  },
  createComplaint(input: CreateComplaintInput): Complaint {
    const complaints = readJson(COMPLAINTS_KEY, seededComplaints);
    const complaint: Complaint = { id: crypto.randomUUID(), referenceNumber: `CMP-${String(Date.now()).slice(-6)}`, subject: input.subject, category: input.category, status: 'OPEN', relatedOrderId: input.relatedOrderId, relatedOrderItemId: input.relatedOrderItemId, createdAt: now(), updatedAt: now(), attachmentNames: input.attachments?.map((file) => file.name) ?? [], messages: [{ id: crypto.randomUUID(), author: 'CUSTOMER', message: input.message, createdAt: now() }] };
    complaints.unshift(complaint);
    writeJson(COMPLAINTS_KEY, complaints);
    return complaint;
  },
  addComplaintMessage(complaintId: string, message: string): Complaint {
    const complaints = readJson(COMPLAINTS_KEY, seededComplaints);
    const complaint = complaints.find((candidate) => candidate.id === complaintId);
    if (!complaint) throw new ApiError('Complaint not found.', 404, 'COMPLAINT_NOT_FOUND');
    complaint.messages.push({ id: crypto.randomUUID(), author: 'CUSTOMER', message, createdAt: now() });
    complaint.updatedAt = now();
    writeJson(COMPLAINTS_KEY, complaints);
    return complaint;
  },
};
