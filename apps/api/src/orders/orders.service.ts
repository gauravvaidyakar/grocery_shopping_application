import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
  VendorStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { CheckoutSnapshot } from "../checkout/checkout.service";
import { PrismaService } from "../database/prisma.service";
import {
  finalizeMasterOrder,
  releaseOrderItemInventory,
  reserveInventory,
} from "../inventory/reservation-engine";
import { VendorsService } from "../vendors/vendors.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { CreateOrderDto } from "./orders.dto";
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.SHIPPED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.RETURN_REQUESTED],
  CANCELLED: [],
  RETURN_REQUESTED: [
    OrderStatus.RETURNED,
    OrderStatus.REPLACEMENT_REQUESTED,
    OrderStatus.REFUND_PENDING,
  ],
  RETURNED: [OrderStatus.REFUND_PENDING, OrderStatus.REPLACEMENT_REQUESTED],
  REFUND_PENDING: [OrderStatus.REFUNDED],
  REFUNDED: [],
  REPLACEMENT_REQUESTED: [OrderStatus.REPLACED],
  REPLACED: [],
};

export function calculateCommissionAmount(
  baseAmount: Prisma.Decimal,
  percentage: Prisma.Decimal,
): Prisma.Decimal {
  return baseAmount.mul(percentage).div(100).toDecimalPlaces(2);
}

type CancelableOrderItem = Prisma.OrderItemGetPayload<{
  include: {
    product: { include: { inventory: true } };
    vendorOrder: { include: { masterOrder: { include: { payments: true } } } };
  };
}>;

const CUSTOMER_ORDER_INCLUDE = {
  deliveryAddress: true,
  payments: true,
  vendorOrders: {
    include: {
      vendor: true,
      shipment: true,
      items: {
        include: {
          product: {
            include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
          },
          returnRequest: true,
          replacement: true,
          review: true,
        },
      },
    },
  },
} satisfies Prisma.MasterOrderInclude;

type CustomerOrderRecord = Prisma.MasterOrderGetPayload<{
  include: typeof CUSTOMER_ORDER_INCLUDE;
}>;
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}
  async create(userId: string, input: CreateOrderDto) {
    const order = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.masterOrder.findFirst({
          where: { checkoutQuoteId: input.quoteId, customer: { userId } },
          include: CUSTOMER_ORDER_INCLUDE,
        });
        if (existing) return existing;
        const quote = await tx.checkoutQuote.findFirst({
          where: {
            id: input.quoteId,
            addressId: input.addressId,
            customer: { userId },
            consumedAt: null,
          },
        });
        if (!quote)
          throw new NotFoundException(
            "Checkout quote not found or already consumed",
          );
        if (quote.expiresAt <= new Date())
          throw new BadRequestException(
            "Checkout quote expired; validate checkout again",
          );
        const snapshot = this.parseSnapshot(quote.snapshot);
        if (snapshot.addressId !== input.addressId)
          throw new BadRequestException(
            "Checkout address does not match quote",
          );
        if (snapshot.paymentMethod !== input.paymentMethod)
          throw new BadRequestException(
            "Payment method changed; validate checkout again",
          );
        const address = await tx.address.findFirst({
          where: { id: input.addressId, customerId: quote.customerId },
        });
        if (!address) throw new NotFoundException("Delivery address not found");
        const productIds = snapshot.vendors.flatMap((vendor) =>
          vendor.items.map((item) => item.productId),
        );
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          include: { vendor: true, inventory: true },
        });
        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );
        for (const vendorGroup of snapshot.vendors)
          for (const item of vendorGroup.items) {
            const product = productMap.get(item.productId);
            if (!product || product.status !== ProductStatus.APPROVED)
              throw new BadRequestException(
                `${item.productName} is no longer approved`,
              );
            if (
              product.vendor.status !== VendorStatus.APPROVED ||
              product.vendorId !== vendorGroup.vendorId
            )
              throw new BadRequestException(
                `${vendorGroup.vendorName} is no longer active`,
              );
            if (!product.inventory)
              throw new BadRequestException(
                `${item.productName} has no inventory`,
              );
            if (
              product.price.mul(100).toDecimalPlaces(0).toNumber() !==
              item.unitPriceMinor
            )
              throw new BadRequestException(
                `${item.productName} price changed; validate checkout again`,
              );
            if (
              product.inventory.quantity - product.inventory.reserved <
              item.quantity
            )
              throw new BadRequestException(
                `${item.productName} has insufficient stock`,
              );
          }
        const orderNumber = `VWN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const initialStatus =
          input.paymentMethod === PaymentMethod.COD
            ? OrderStatus.CONFIRMED
            : OrderStatus.PENDING;
        const masterOrder = await tx.masterOrder.create({
          data: {
            orderNumber,
            customerId: quote.customerId,
            checkoutQuoteId: quote.id,
            deliveryAddressId: address.id,
            deliveryAddressSnapshot: {
              label: address.label,
              recipientName: address.recipientName,
              mobile: address.mobile,
              line1: address.line1,
              line2: address.line2,
              landmark: address.landmark,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              country: address.country,
            },
            status: initialStatus,
            paymentMethod: input.paymentMethod,
            currency: quote.currency,
            productSubtotal: quote.productSubtotal,
            totalShipping: quote.totalShipping,
            payableTotal: quote.payableTotal,
            idempotencyKey: `order:${quote.id}`,
          },
        });
        for (const [vendorIndex, vendorGroup] of snapshot.vendors.entries()) {
          const vendorOrder = await tx.vendorOrder.create({
            data: {
              vendorOrderNumber: `${orderNumber}-${String.fromCharCode(65 + vendorIndex)}`,
              masterOrderId: masterOrder.id,
              vendorId: vendorGroup.vendorId,
              status: initialStatus,
              productSubtotal: new Prisma.Decimal(
                vendorGroup.productSubtotalMinor,
              ).div(100),
              shippingAmount: new Prisma.Decimal(vendorGroup.shippingMinor).div(
                100,
              ),
              orderTotal: new Prisma.Decimal(
                vendorGroup.productSubtotalMinor + vendorGroup.shippingMinor,
              ).div(100),
            },
          });
          let commissionTotal = new Prisma.Decimal(0);
          for (const item of vendorGroup.items) {
            const product = productMap.get(item.productId)!;
            const inventory = product.inventory!;
            const orderItem = await tx.orderItem.create({
              data: {
                vendorOrderId: vendorOrder.id,
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: product.price,
                gstRate: product.gstRate,
                lineTotal: new Prisma.Decimal(item.lineTotalMinor).div(100),
                productType: product.productType,
                status: initialStatus,
                cancellable: true,
              },
            });
            await reserveInventory(tx, inventory, item.quantity, orderItem.id);
            const now = new Date();
            const rule = await tx.commissionRule.findFirst({
              where: {
                isActive: true,
                effectiveFrom: { lte: now },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
                AND: [
                  {
                    OR: [
                      { categoryId: product.categoryId },
                      { categoryId: null, productType: product.productType },
                    ],
                  },
                ],
              },
              orderBy: [{ categoryId: "desc" }, { effectiveFrom: "desc" }],
            });
            if (!rule)
              throw new BadRequestException(
                `No active commission rule for ${product.name}`,
              );
            const commissionAmount = calculateCommissionAmount(
              orderItem.lineTotal,
              rule.percentage,
            );
            commissionTotal = commissionTotal.add(commissionAmount);
            await tx.commissionTransaction.create({
              data: {
                vendorId: vendorOrder.vendorId,
                vendorOrderId: vendorOrder.id,
                orderItemId: orderItem.id,
                ruleId: rule.id,
                baseAmount: orderItem.lineTotal,
                percentage: rule.percentage,
                amount: commissionAmount,
              },
            });
          }
          await tx.vendorOrder.update({
            where: { id: vendorOrder.id },
            data: {
              settlementAmount: new Prisma.Decimal(
                vendorGroup.productSubtotalMinor,
              )
                .div(100)
                .sub(commissionTotal),
            },
          });
        }
        if (input.paymentMethod === PaymentMethod.COD) {
          await tx.payment.create({
            data: {
              masterOrderId: masterOrder.id,
              provider: "COD",
              method: PaymentMethod.COD,
              amount: masterOrder.payableTotal,
              currency: masterOrder.currency,
              status: PaymentStatus.PENDING,
              idempotencyKey: `payment:${masterOrder.id}`,
            },
          });
          await finalizeMasterOrder(tx, masterOrder.id);
        }
        await tx.cartItem.deleteMany({
          where: {
            id: {
              in: snapshot.vendors.flatMap((vendor) =>
                vendor.items.map((item) => item.cartItemId),
              ),
            },
          },
        });
        await tx.checkoutQuote.update({
          where: { id: quote.id },
          data: { consumedAt: new Date() },
        });
        return tx.masterOrder.findUniqueOrThrow({
          where: { id: masterOrder.id },
          include: CUSTOMER_ORDER_INCLUDE,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15_000,
      },
    );
    await this.notifications.notifyOrderPlaced(order.id).catch(() => undefined);
    return this.presentCustomerOrder(order);
  }

  private parseSnapshot(value: Prisma.JsonValue): CheckoutSnapshot {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !("vendors" in value) ||
      !Array.isArray(value.vendors)
    )
      throw new BadRequestException("Checkout quote snapshot is invalid");
    return value as unknown as CheckoutSnapshot;
  }
  async customerList(userId: string) {
    const orders = await this.prisma.masterOrder.findMany({
      where: { customer: { userId } },
      include: CUSTOMER_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => this.presentCustomerOrder(order));
  }
  async customerGet(userId: string, id: string) {
    const order = await this.prisma.masterOrder.findFirst({
      where: { id, customer: { userId } },
      include: CUSTOMER_ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException("Order not found");
    return this.presentCustomerOrder(order);
  }
  async vendorList(userId: string) {
    return this.prisma.vendorOrder.findMany({
      where: { vendorId: await this.vendors.getVendorId(userId) },
      include: {
        items: true,
        shipment: true,
        masterOrder: {
          select: {
            orderNumber: true,
            deliveryAddressSnapshot: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async vendorGet(userId: string, id: string) {
    const order = await this.prisma.vendorOrder.findFirst({
      where: { id, vendorId: await this.vendors.getVendorId(userId) },
      include: {
        items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } }, returnRequest: true, replacement: true } },
        shipment: true,
        commissions: true,
        refunds: true,
        masterOrder: { select: { orderNumber: true, deliveryAddressSnapshot: true, paymentMethod: true, payments: { select: { status: true } } } },
      },
    });
    if (!order) throw new NotFoundException("Vendor order not found");
    return order;
  }
  async transition(userId: string, id: string, status: OrderStatus) {
    const vendorId = await this.vendors.getVendorId(userId);
    const order = await this.prisma.vendorOrder.findFirst({
      where: { id, vendorId },
    });
    if (!order) throw new NotFoundException("Vendor order not found");
    if (!TRANSITIONS[order.status].includes(status))
      throw new BadRequestException(
        `Invalid transition from ${order.status} to ${status}`,
      );
    const deliveredAt =
      status === OrderStatus.DELIVERED ? new Date() : undefined;
    const settlementEligibleAt = deliveredAt
      ? new Date(
          deliveredAt.getTime() +
            this.config.get<number>("SETTLEMENT_DAYS", 7) * 86_400_000,
        )
      : undefined;
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorOrder.update({
        where: { id },
        data: { status, deliveredAt, settlementEligibleAt },
      });
      await tx.orderItem.updateMany({
        where: { vendorOrderId: id, status: { not: OrderStatus.CANCELLED } },
        data: {
          status,
          cancellable:
            status === OrderStatus.PENDING ||
            status === OrderStatus.CONFIRMED ||
            status === OrderStatus.PROCESSING,
        },
      });
      const remaining = await tx.vendorOrder.findMany({
        where: { masterOrderId: order.masterOrderId },
        select: { status: true },
      });
      if (remaining.every((vendorOrder) => vendorOrder.status === status)) {
        await tx.masterOrder.update({
          where: { id: order.masterOrderId },
          data: { status },
        });
      }
      return updated;
    });
    await this.notifications
      .notifyVendorOrderStatus(id, status)
      .catch(() => undefined);
    return updated;
  }
  async cancelItem(
    userId: string,
    vendorOrderId: string,
    itemId: string,
    reason: string,
  ) {
    const vendorId = await this.vendors.getVendorId(userId);
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, vendorOrderId, vendorOrder: { vendorId } },
      include: {
        product: { include: { inventory: true } },
        vendorOrder: {
          include: { masterOrder: { include: { payments: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException("Order item not found");
    const updated = await this.cancelOwnedItem(item, reason);
    await this.notifications
      .notifyItemCancelled(item.id, "VENDOR")
      .catch(() => undefined);
    return updated;
  }

  async customerCancelItem(
    userId: string,
    orderId: string,
    itemId: string,
    reason: string,
  ) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        vendorOrder: { masterOrder: { id: orderId, customer: { userId } } },
      },
      include: {
        product: { include: { inventory: true } },
        vendorOrder: {
          include: { masterOrder: { include: { payments: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException("Order item not found");
    await this.cancelOwnedItem(item, reason);
    await this.notifications
      .notifyItemCancelled(item.id, "CUSTOMER")
      .catch(() => undefined);
    return this.customerGet(userId, orderId);
  }

  private presentCustomerOrder(order: CustomerOrderRecord) {
    const money = (amount: Prisma.Decimal) => ({
      amount: amount.toNumber(),
      currency: order.currency,
    });
    const payment = order.payments[0];
    const hasCancelled = order.vendorOrders.some((vendor) =>
      vendor.items.some((item) => item.status === OrderStatus.CANCELLED),
    );
    const hasActive = order.vendorOrders.some((vendor) =>
      vendor.items.some((item) => item.status !== OrderStatus.CANCELLED),
    );
    const address = order.deliveryAddressSnapshot as Prisma.JsonObject;
    return {
      masterOrderId: order.id,
      masterOrderNumber: order.orderNumber,
      placedAt: order.placedAt.toISOString(),
      paymentMethod: order.paymentMethod,
      paymentStatus:
        order.paymentMethod === PaymentMethod.COD &&
        payment?.status === PaymentStatus.PENDING
          ? "COD_PENDING"
          : payment?.status === PaymentStatus.PENDING ||
              payment?.status === PaymentStatus.CREATED
            ? "PAYMENT_PENDING"
            : (payment?.status ?? "PAYMENT_PENDING"),
      status: hasCancelled && hasActive ? "PARTIALLY_CANCELLED" : order.status,
      productSubtotal: money(order.productSubtotal),
      totalShipping: money(order.totalShipping),
      payableTotal: money(order.payableTotal),
      deliveryAddress: {
        id: order.deliveryAddressId ?? `snapshot:${order.id}`,
        label: address.label,
        recipientName: address.recipientName,
        mobile: address.mobile,
        line1: address.line1,
        line2: address.line2,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: order.deliveryAddress?.isDefault ?? false,
      },
      vendorOrders: order.vendorOrders.map((vendorOrder) => ({
        id: vendorOrder.id,
        vendorOrderNumber: vendorOrder.vendorOrderNumber,
        vendor: {
          id: vendorOrder.vendor.id,
          name: vendorOrder.vendor.businessName,
          location: "",
          rating: 0,
          productCount: vendorOrder.items.length,
        },
        status: vendorOrder.status,
        productSubtotal: money(vendorOrder.productSubtotal),
        shipping: money(vendorOrder.shippingAmount),
        orderTotal: money(vendorOrder.orderTotal),
        items: vendorOrder.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.product.slug,
          imageUrl: item.product.images[0]?.url ?? "",
          weight: `${item.product.weightGrams} g`,
          quantity: item.quantity,
          unitPrice: money(item.unitPrice),
          lineTotal: money(item.lineTotal),
          status: item.status,
          actions: {
            canCancel: item.cancellable,
            canReturn:
              item.status === OrderStatus.DELIVERED && !item.returnRequest,
            canReview: item.status === OrderStatus.DELIVERED && !item.review,
            canRaiseComplaint: true,
            ...(item.cancellationReason
              ? { cancellationReason: item.cancellationReason }
              : {}),
          },
          ...(item.returnRequest
            ? {
                returnRequest: {
                  id: item.returnRequest.id,
                  resolution: item.returnRequest.resolution,
                  reason: item.returnRequest.reason,
                  status: item.returnRequest.status,
                  requestedAt: item.returnRequest.requestedAt.toISOString(),
                  attachmentNames: [],
                },
              }
            : {}),
          ...(item.review
            ? {
                review: {
                  id: item.review.id,
                  productId: item.review.productId,
                  orderItemId: item.review.orderItemId,
                  rating: item.review.rating,
                  comment: item.review.comment,
                  images: Array.isArray(item.review.images)
                    ? item.review.images.filter(
                        (image): image is string => typeof image === "string",
                      )
                    : [],
                  status: item.review.status,
                  submittedAt: item.review.createdAt.toISOString(),
                },
              }
            : {}),
        })),
        ...(vendorOrder.shipment
          ? { shipment: this.presentShipment(vendorOrder.shipment) }
          : {}),
      })),
    };
  }

  private presentShipment(
    shipment: NonNullable<
      CustomerOrderRecord["vendorOrders"][number]["shipment"]
    >,
  ) {
    const events = Array.isArray(shipment.statusHistory)
      ? shipment.statusHistory
      : [];
    const status =
      shipment.status === "FAILED" || shipment.status === "RETURNED"
        ? "EXCEPTION"
        : shipment.status;
    return {
      id: shipment.id,
      provider: shipment.provider,
      awb: shipment.awb ?? undefined,
      trackingUrl: shipment.trackingUrl ?? undefined,
      status,
      statusLabel: status.replaceAll("_", " "),
      updatedAt: shipment.updatedAt.toISOString(),
      estimatedDelivery: shipment.estimatedDelivery?.toISOString(),
      events: events.flatMap((event, index) => {
        if (!event || typeof event !== "object" || Array.isArray(event)) {
          return [];
        }
        const value = event;
        return [
          {
            id: `${shipment.id}:${index}`,
            status: typeof value.status === "string" ? value.status : status,
            label:
              typeof value.providerStatus === "string"
                ? value.providerStatus
                : status.replaceAll("_", " "),
            ...(typeof value.location === "string" && value.location
              ? { location: value.location }
              : {}),
            occurredAt:
              typeof value.occurredAt === "string"
                ? value.occurredAt
                : shipment.updatedAt.toISOString(),
          },
        ];
      }),
    };
  }

  private async cancelOwnedItem(item: CancelableOrderItem, reason: string) {
    const cancellableStatus =
      item.status === OrderStatus.PENDING ||
      item.status === OrderStatus.CONFIRMED ||
      item.status === OrderStatus.PROCESSING;
    if (!item.cancellable || !cancellableStatus)
      throw new BadRequestException("Item is not cancellable");
    const vendorOrderId = item.vendorOrderId;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellable: false,
          cancellationReason: reason,
        },
      });
      await releaseOrderItemInventory(tx, item, reason);
      const paidPayment = item.vendorOrder.masterOrder.payments.find(
        (payment) => payment.status === PaymentStatus.PAID,
      );
      if (paidPayment)
        await tx.refund.upsert({
          where: { idempotencyKey: `cancel:${item.id}` },
          create: {
            masterOrderId: item.vendorOrder.masterOrderId,
            vendorOrderId: item.vendorOrderId,
            orderItemId: item.id,
            paymentId: paidPayment.id,
            method: "RAZORPAY",
            amount: item.lineTotal,
            reason,
            idempotencyKey: `cancel:${item.id}`,
          },
          update: {},
        });
      const activeItems = await tx.orderItem.count({
        where: { vendorOrderId, status: { not: OrderStatus.CANCELLED } },
      });
      if (activeItems === 0)
        await tx.vendorOrder.update({
          where: { id: vendorOrderId },
          data: { status: OrderStatus.CANCELLED },
        });
      const activeVendorOrders = await tx.vendorOrder.count({
        where: {
          masterOrderId: item.vendorOrder.masterOrderId,
          status: { not: OrderStatus.CANCELLED },
        },
      });
      if (activeVendorOrders === 0)
        await tx.masterOrder.update({
          where: { id: item.vendorOrder.masterOrderId },
          data: { status: OrderStatus.CANCELLED },
        });
      return updated;
    });
  }
}
