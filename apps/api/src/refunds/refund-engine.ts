import {
  LedgerDirection,
  LedgerEntryType,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from "@prisma/client";

export async function completeRefundFinancials(
  tx: Prisma.TransactionClient,
  refundId: string,
  providerReference?: string,
) {
  const refund = await tx.refund.findUniqueOrThrow({
    where: { id: refundId },
    include: { vendorOrder: true, payment: true },
  });
  if (refund.status === RefundStatus.COMPLETED) return refund;
  const updated = await tx.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.COMPLETED,
      processedAt: new Date(),
      ...(providerReference ? { providerReference } : {}),
    },
  });
  if (refund.vendorOrder) {
    const last = await tx.vendorLedger.findFirst({
      where: { vendorId: refund.vendorOrder.vendorId },
      orderBy: { createdAt: "desc" },
    });
    const balance = (last?.balanceAfter ?? new Prisma.Decimal(0)).sub(
      refund.amount,
    );
    await tx.vendorLedger.upsert({
      where: {
        vendorId_type_referenceType_referenceId: {
          vendorId: refund.vendorOrder.vendorId,
          type: LedgerEntryType.REFUND,
          referenceType: "Refund",
          referenceId: refund.id,
        },
      },
      create: {
        vendorId: refund.vendorOrder.vendorId,
        vendorOrderId: refund.vendorOrderId,
        type: LedgerEntryType.REFUND,
        direction: LedgerDirection.DEBIT,
        amount: refund.amount,
        balanceAfter: balance,
        referenceType: "Refund",
        referenceId: refund.id,
        description: refund.reason,
      },
      update: {},
    });
  }
  if (refund.paymentId && refund.payment) {
    const aggregate = await tx.refund.aggregate({
      where: { paymentId: refund.paymentId, status: RefundStatus.COMPLETED },
      _sum: { amount: true },
    });
    const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
    await tx.payment.update({
      where: { id: refund.paymentId },
      data: {
        status: refunded.gte(refund.payment.amount)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED,
      },
    });
  }
  if (refund.orderItemId) {
    await tx.orderItem.update({
      where: { id: refund.orderItemId },
      data: { status: "REFUNDED", cancellable: false },
    });
  }
  return updated;
}
