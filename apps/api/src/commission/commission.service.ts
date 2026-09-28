import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { VendorsService } from "../vendors/vendors.service";
import type { CommissionRuleDto } from "./commission.dto";
@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}
  rules() {
    return this.prisma.commissionRule.findMany({
      include: { category: true },
      orderBy: { effectiveFrom: "desc" },
    });
  }
  create(input: CommissionRuleDto) {
    if (!input.categoryId && !input.productType)
      throw new BadRequestException("Category or product type is required");
    return this.prisma.commissionRule.create({
      data: {
        categoryId: input.categoryId,
        productType: input.productType,
        percentage: new Prisma.Decimal(input.percentage),
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo
          ? new Date(input.effectiveTo)
          : undefined,
        isActive: input.isActive ?? true,
      },
    });
  }
  async vendorTransactions(userId: string) {
    return this.prisma.commissionTransaction.findMany({
      where: { vendorId: await this.vendors.getVendorId(userId) },
      include: { orderItem: true, rule: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
