import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { IntegrationSettingsService } from "../integration-settings/integration-settings.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  finalizeMasterOrder,
  releaseOrderItemInventory,
} from "../inventory/reservation-engine";
import { completeRefundFinancials } from "../refunds/refund-engine";
import {
  RazorpayPaymentProvider,
  verifyRazorpaySignature,
} from "./payment-provider";
import type { VerifyPaymentDto } from "./payments.dto";

type WebhookEntity = Record<string, unknown>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RazorpayPaymentProvider,
    private readonly notifications: NotificationsService,
    private readonly integrationSettings: IntegrationSettingsService,
  ) {}

  async create(userId: string, masterOrderId: string) {
    const order = await this.prisma.masterOrder.findFirst({
      where: { id: masterOrderId, customer: { userId } },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentMethod !== "PREPAID") {
      throw new BadRequestException(
        "Payment session is only available for prepaid orders",
      );
    }
    const existing = await this.prisma.payment.findFirst({
      where: {
        masterOrderId,
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.AUTHORIZED,
            PaymentStatus.PAID,
          ],
        },
      },
    });
    if (existing?.providerOrderId) {
      return this.session(
        existing.id,
        order.id,
        existing.providerOrderId,
        existing.amount.toNumber(),
        order.orderNumber,
      );
    }
    const amountMinor = Math.round(order.payableTotal.toNumber() * 100);
    const providerOrder = await this.provider.createOrder({
      amountMinor,
      currency: order.currency,
      receipt: order.orderNumber,
    });
    if (
      providerOrder.amount !== amountMinor ||
      providerOrder.currency !== order.currency
    ) {
      throw new BadRequestException(
        "Payment provider returned mismatched order values",
      );
    }
    const payment = await this.prisma.payment.create({
      data: {
        masterOrderId,
        provider: "RAZORPAY",
        providerOrderId: providerOrder.id,
        method: "PREPAID",
        amount: order.payableTotal,
        currency: order.currency,
        status: PaymentStatus.PENDING,
        idempotencyKey: `payment:${masterOrderId}`,
      },
    });
    return this.session(
      payment.id,
      order.id,
      providerOrder.id,
      payment.amount.toNumber(),
      order.orderNumber,
    );
  }

  async verify(userId: string, input: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: input.paymentId, masterOrder: { customer: { userId } } },
      include: { masterOrder: true },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === PaymentStatus.PAID)
      return this.presentPayment(payment);
    if (payment.providerOrderId !== input.providerOrderId) {
      throw new BadRequestException("Provider order does not match payment");
    }
    const secret = await this.integrationSettings.get("RAZORPAY_KEY_SECRET");
    if (
      !secret ||
      !verifyRazorpaySignature(
        `${input.providerOrderId}|${input.providerPaymentId}`,
        input.providerSignature,
        secret,
      )
    ) {
      throw new UnauthorizedException("Invalid payment signature");
    }
    const providerPayment = await this.provider.fetchPayment(
      input.providerPaymentId,
    );
    this.assertProviderPayment(payment, providerPayment);
    return this.presentPayment(
      await this.confirmPayment(payment.id, input.providerPaymentId),
    );
  }

  async reconcile(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, masterOrder: { customer: { userId } } },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === PaymentStatus.PAID || !payment.providerPaymentId) {
      return this.presentPayment(payment);
    }
    const providerPayment = await this.provider.fetchPayment(
      payment.providerPaymentId,
    );
    this.assertProviderPayment(payment, providerPayment);
    return this.presentPayment(
      await this.confirmPayment(payment.id, providerPayment.id),
    );
  }

  async status(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, masterOrder: { customer: { userId } } },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return this.presentPayment(payment);
  }

  async webhook(rawBody: Buffer, signature: string | undefined) {
    const secret = await this.integrationSettings.get("RAZORPAY_WEBHOOK_SECRET");
    if (
      !secret ||
      !signature ||
      !verifyRazorpaySignature(rawBody.toString("utf8"), signature, secret)
    ) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
    let payload: WebhookEntity;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as WebhookEntity;
    } catch {
      throw new BadRequestException("Invalid webhook payload");
    }
    const eventType = this.stringValue(payload.event, "event");
    const eventId = createHash("sha256").update(rawBody).digest("hex");
    const existing = await this.prisma.providerEvent.findUnique({
      where: { provider_eventId: { provider: "RAZORPAY", eventId } },
    });
    if (existing?.processedAt) return { accepted: true, duplicate: true };
    await this.prisma.providerEvent.upsert({
      where: { provider_eventId: { provider: "RAZORPAY", eventId } },
      create: {
        provider: "RAZORPAY",
        eventId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
      update: {},
    });
    try {
      if (eventType === "payment.captured") {
        await this.handlePaymentCaptured(payload);
      } else if (eventType === "payment.failed") {
        await this.handlePaymentFailed(payload);
      } else if (eventType === "refund.processed") {
        await this.handleRefundProcessed(payload);
      } else if (eventType === "refund.failed") {
        await this.handleRefundFailed(payload);
      }
      await this.prisma.providerEvent.update({
        where: { provider_eventId: { provider: "RAZORPAY", eventId } },
        data: { processedAt: new Date(), failureReason: null },
      });
      return { accepted: true, duplicate: false };
    } catch (error) {
      await this.prisma.providerEvent.update({
        where: { provider_eventId: { provider: "RAZORPAY", eventId } },
        data: {
          failureReason:
            error instanceof Error
              ? error.message
              : "Webhook processing failed",
        },
      });
      throw error;
    }
  }

  private async confirmPayment(paymentId: string, providerPaymentId: string) {
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        if (payment.status === PaymentStatus.PAID) return payment;
        await finalizeMasterOrder(tx, payment.masterOrderId);
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerPaymentId,
            status: PaymentStatus.PAID,
            verifiedAt: new Date(),
            failureReason: null,
          },
        });
        await tx.masterOrder.update({
          where: { id: payment.masterOrderId },
          data: { status: OrderStatus.CONFIRMED },
        });
        await tx.vendorOrder.updateMany({
          where: { masterOrderId: payment.masterOrderId },
          data: { status: OrderStatus.CONFIRMED },
        });
        await tx.orderItem.updateMany({
          where: { vendorOrder: { masterOrderId: payment.masterOrderId } },
          data: { status: OrderStatus.CONFIRMED },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifications
      .notifyPaymentStatus(updated.masterOrderId, "PAID")
      .catch(() => undefined);
    return updated;
  }

  private async handlePaymentCaptured(payload: WebhookEntity) {
    const entity = this.nestedEntity(payload, "payment");
    const providerPaymentId = this.stringValue(entity.id, "payment.id");
    const providerOrderId = this.stringValue(
      entity.order_id,
      "payment.order_id",
    );
    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId },
    });
    if (!payment) throw new NotFoundException("Webhook payment not found");
    this.assertProviderPayment(payment, {
      orderId: providerOrderId,
      amount: this.numberValue(entity.amount, "payment.amount"),
      currency: this.stringValue(entity.currency, "payment.currency"),
      status: "captured",
    });
    await this.confirmPayment(payment.id, providerPaymentId);
  }

  private async handlePaymentFailed(payload: WebhookEntity) {
    const entity = this.nestedEntity(payload, "payment");
    const providerOrderId = this.stringValue(
      entity.order_id,
      "payment.order_id",
    );
    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId },
    });
    if (!payment || payment.status === PaymentStatus.PAID) return;
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({
        where: { vendorOrder: { masterOrderId: payment.masterOrderId } },
        include: { product: { include: { inventory: true } } },
      });
      for (const item of items) {
        await releaseOrderItemInventory(
          tx,
          item,
          "Payment failed; reservation released",
        );
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            typeof entity.error_description === "string"
              ? entity.error_description
              : "Payment failed",
        },
      });
      await tx.masterOrder.update({
        where: { id: payment.masterOrderId },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.vendorOrder.updateMany({
        where: { masterOrderId: payment.masterOrderId },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.orderItem.updateMany({
        where: { vendorOrder: { masterOrderId: payment.masterOrderId } },
        data: {
          status: OrderStatus.CANCELLED,
          cancellable: false,
          cancellationReason: "Payment failed",
        },
      });
    });
    await this.notifications
      .notifyPaymentStatus(payment.masterOrderId, "FAILED")
      .catch(() => undefined);
  }

  private async handleRefundProcessed(payload: WebhookEntity) {
    const entity = this.nestedEntity(payload, "refund");
    const providerReference = this.stringValue(entity.id, "refund.id");
    const refund = await this.prisma.refund.findUnique({
      where: { providerReference },
    });
    if (!refund) return;
    await this.prisma.$transaction((tx) =>
      completeRefundFinancials(tx, refund.id, providerReference),
    );
  }

  private async handleRefundFailed(payload: WebhookEntity) {
    const entity = this.nestedEntity(payload, "refund");
    const providerReference = this.stringValue(entity.id, "refund.id");
    const refund = await this.prisma.refund.findUnique({
      where: { providerReference },
    });
    if (!refund) return;
    await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.FAILED,
        failureReason: "Provider failed refund",
      },
    });
  }

  private assertProviderPayment(
    payment: {
      providerOrderId: string | null;
      amount: Prisma.Decimal;
      currency: string;
    },
    providerPayment: {
      orderId?: string;
      amount: number;
      currency: string;
      status: string;
    },
  ) {
    if (
      providerPayment.status !== "captured" ||
      providerPayment.orderId !== payment.providerOrderId ||
      providerPayment.amount !== Math.round(payment.amount.toNumber() * 100) ||
      providerPayment.currency !== payment.currency
    ) {
      throw new BadRequestException(
        "Payment is not captured or does not match the order",
      );
    }
  }

  private nestedEntity(payload: WebhookEntity, kind: string): WebhookEntity {
    const envelope = payload.payload;
    if (!envelope || typeof envelope !== "object") {
      throw new BadRequestException("Invalid webhook payload");
    }
    const wrapped = (envelope as WebhookEntity)[kind];
    if (!wrapped || typeof wrapped !== "object") {
      throw new BadRequestException(`Webhook ${kind} entity is missing`);
    }
    const entity = (wrapped as WebhookEntity).entity;
    if (!entity || typeof entity !== "object") {
      throw new BadRequestException(`Webhook ${kind} entity is missing`);
    }
    return entity as WebhookEntity;
  }

  private stringValue(value: unknown, field: string): string {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} is missing`);
    }
    return value;
  }

  private numberValue(value: unknown, field: string): number {
    if (typeof value !== "number") {
      throw new BadRequestException(`${field} is missing`);
    }
    return value;
  }

  private async session(
    paymentId: string,
    masterOrderId: string,
    providerOrderId: string,
    amount: number,
    description: string,
  ) {
    return {
      paymentId,
      masterOrderId,
      provider: "RAZORPAY",
      providerOrderId,
      publicKey: await this.integrationSettings.get("RAZORPAY_KEY_ID"),
      amountMinor: Math.round(amount * 100),
      currency: "INR",
      customer: { name: "" },
      description,
    };
  }

  private presentPayment(payment: {
    id: string;
    masterOrderId: string;
    provider: string;
    status: PaymentStatus;
    amount: Prisma.Decimal;
    currency: string;
    failureReason: string | null;
    updatedAt: Date;
  }) {
    return {
      id: payment.id,
      masterOrderId: payment.masterOrderId,
      provider: payment.provider,
      status:
        payment.status === PaymentStatus.PENDING ||
        payment.status === PaymentStatus.CREATED
          ? "PAYMENT_PENDING"
          : payment.status,
      amount: {
        amount: payment.amount.toNumber(),
        currency: payment.currency,
      },
      failureMessage: payment.failureReason ?? undefined,
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
