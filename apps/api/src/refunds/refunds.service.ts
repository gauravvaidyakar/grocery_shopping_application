import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, RefundMethod, RefundStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { RazorpayPaymentProvider } from "../payments/payment-provider";
import { completeRefundFinancials } from "./refund-engine";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RazorpayPaymentProvider,
    private readonly notifications: NotificationsService,
  ) {}

  list() {
    return this.prisma.refund.findMany({
      include: {
        masterOrder: true,
        vendorOrder: true,
        orderItem: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.refund.findUniqueOrThrow({
      where: { id },
      include: {
        masterOrder: true,
        vendorOrder: true,
        orderItem: true,
        payment: true,
      },
    });
  }

  async process(id: string) {
    const refund = await this.prisma.refund.findUniqueOrThrow({
      where: { id },
      include: { payment: true },
    });
    if (refund.status === RefundStatus.COMPLETED) return refund;
    if (refund.status === RefundStatus.PROCESSING) return refund;
    if (!refund.payment) {
      throw new BadRequestException("Refund has no source payment");
    }
    if (refund.method === RefundMethod.BANK_TRANSFER) {
      const updated = await this.prisma.refund.update({
        where: { id },
        data: { status: RefundStatus.PROCESSING },
      });
      void this.notifications.notifyRefundStatus(updated.id);
      return updated;
    }
    if (!refund.payment.providerPaymentId) {
      throw new BadRequestException("Source payment is not provider verified");
    }
    const providerRefund = await this.provider.createRefund({
      providerPaymentId: refund.payment.providerPaymentId,
      amountMinor: Math.round(refund.amount.toNumber() * 100),
      idempotencyKey: refund.idempotencyKey,
    });
    if (providerRefund.amount !== Math.round(refund.amount.toNumber() * 100)) {
      throw new BadRequestException("Provider refund amount mismatch");
    }
    const pending = await this.prisma.refund.update({
      where: { id },
      data: {
        providerReference: providerRefund.id,
        status: RefundStatus.PROCESSING,
      },
    });
    if (providerRefund.status === "processed") return this.complete(id, providerRefund.id);
    void this.notifications.notifyRefundStatus(pending.id);
    return pending;
  }

  async completeBankTransfer(id: string, providerReference: string) {
    const refund = await this.prisma.refund.findUniqueOrThrow({
      where: { id },
    });
    if (refund.method !== RefundMethod.BANK_TRANSFER) {
      throw new BadRequestException(
        "Only bank transfer refunds use this action",
      );
    }
    return this.complete(id, providerReference);
  }

  async complete(id: string, providerReference?: string) {
    const completed = await this.prisma.$transaction(
      async (tx) => {
        return completeRefundFinancials(tx, id, providerReference);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    void this.notifications.notifyRefundStatus(completed.id);
    return completed;
  }
}
