import { BadRequestException, Injectable } from "@nestjs/common";
import {
  LedgerDirection,
  LedgerEntryType,
  Prisma,
  RefundStatus,
  ReturnStatus,
  SettlementStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { VendorsService } from "../vendors/vendors.service";

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}

  async vendor(userId: string) {
    return this.prisma.settlement.findMany({
      where: { vendorId: await this.vendors.getVendorId(userId) },
      include: { items: { include: { vendorOrder: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  admin() {
    return this.prisma.settlement.findMany({
      include: {
        vendor: { select: { businessName: true } },
        items: { include: { vendorOrder: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async refreshEligibility(now = new Date()) {
    return this.prisma.$transaction(
      async (tx) => {
        const eligibleOrders = await tx.vendorOrder.findMany({
          where: {
            settlementStatus: SettlementStatus.PENDING,
            settlementEligibleAt: { lte: now },
            settlementItems: { none: {} },
            refunds: {
              none: {
                status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
              },
            },
            items: {
              none: {
                returnRequest: {
                  status: {
                    in: [
                      ReturnStatus.REQUESTED,
                      ReturnStatus.APPROVED,
                      ReturnStatus.PICKUP_SCHEDULED,
                      ReturnStatus.RECEIVED,
                    ],
                  },
                },
              },
            },
          },
          include: { commissions: true, refunds: true },
        });
        const created: string[] = [];
        for (const order of eligibleOrders) {
          const commissionAmount = order.commissions.reduce(
            (sum, commission) => sum.add(commission.amount),
            new Prisma.Decimal(0),
          );
          const refundAmount = order.refunds
            .filter((refund) => refund.status === RefundStatus.COMPLETED)
            .reduce(
              (sum, refund) => sum.add(refund.amount),
              new Prisma.Decimal(0),
            );
          const settlementAmount = order.productSubtotal
            .sub(commissionAmount)
            .sub(refundAmount);
          if (settlementAmount.isNegative()) {
            throw new BadRequestException(
              `Vendor order ${order.vendorOrderNumber} has a negative settlement`,
            );
          }
          const settlement = await tx.settlement.create({
            data: {
              vendorId: order.vendorId,
              reference: `SET-${order.vendorOrderNumber}`,
              amount: settlementAmount,
              status: SettlementStatus.ELIGIBLE,
              items: {
                create: {
                  vendorOrderId: order.id,
                  grossAmount: order.productSubtotal,
                  commissionAmount,
                  refundAmount,
                  settlementAmount,
                },
              },
            },
          });
          await tx.vendorOrder.update({
            where: { id: order.id },
            data: {
              settlementStatus: SettlementStatus.ELIGIBLE,
              settlementAmount,
            },
          });
          created.push(settlement.id);
        }
        return { eligible: created.length, settlementIds: created };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async process(id: string) {
    const settlement = await this.prisma.settlement.findUniqueOrThrow({
      where: { id },
    });
    if (
      settlement.status !== SettlementStatus.ELIGIBLE &&
      settlement.status !== SettlementStatus.FAILED
    ) {
      throw new BadRequestException(
        "Settlement is not eligible for processing",
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id },
        data: { status: SettlementStatus.PROCESSING, processedAt: new Date() },
      });
      await tx.vendorOrder.updateMany({
        where: { settlementItems: { some: { settlementId: id } } },
        data: { settlementStatus: SettlementStatus.PROCESSING },
      });
      return tx.settlement.findUniqueOrThrow({ where: { id } });
    });
  }

  async complete(id: string, providerReference: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const settlement = await tx.settlement.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        });
        if (settlement.status === SettlementStatus.SETTLED) return settlement;
        if (settlement.status !== SettlementStatus.PROCESSING) {
          throw new BadRequestException("Settlement is not processing");
        }
        const last = await tx.vendorLedger.findFirst({
          where: { vendorId: settlement.vendorId },
          orderBy: { createdAt: "desc" },
        });
        const balance = (last?.balanceAfter ?? new Prisma.Decimal(0)).sub(
          settlement.amount,
        );
        await tx.vendorLedger.upsert({
          where: {
            vendorId_type_referenceType_referenceId: {
              vendorId: settlement.vendorId,
              type: LedgerEntryType.SETTLEMENT,
              referenceType: "Settlement",
              referenceId: settlement.id,
            },
          },
          create: {
            vendorId: settlement.vendorId,
            vendorOrderId: settlement.items[0]?.vendorOrderId,
            type: LedgerEntryType.SETTLEMENT,
            direction: LedgerDirection.DEBIT,
            amount: settlement.amount,
            balanceAfter: balance,
            referenceType: "Settlement",
            referenceId: settlement.id,
            description: `Payout ${providerReference}`,
          },
          update: {},
        });
        const settledAt = new Date();
        const updated = await tx.settlement.update({
          where: { id },
          data: {
            status: SettlementStatus.SETTLED,
            providerReference,
            settledAt,
            failureReason: null,
          },
        });
        await tx.vendorOrder.updateMany({
          where: { settlementItems: { some: { settlementId: id } } },
          data: {
            settlementStatus: SettlementStatus.SETTLED,
            settledAt,
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
