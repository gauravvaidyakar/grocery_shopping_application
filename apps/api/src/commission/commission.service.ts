import { BadRequestException, Injectable } from "@nestjs/common";
import { MongoDatabaseService } from "../database/mongo-database.service";
import { VendorsService } from "../vendors/vendors.service";
import type { CommissionRuleDto } from "./commission.dto";
@Injectable()
export class CommissionService {
  constructor(
    private readonly database: MongoDatabaseService,
    private readonly vendors: VendorsService,
  ) {}
  rules() {
    return this.database.commissionRule.findMany({
      include: { category: true },
      orderBy: { effectiveFrom: "desc" },
    });
  }
  create(input: CommissionRuleDto) {
    if (!input.categoryId && !input.productType)
      throw new BadRequestException("Category or product type is required");
    return this.database.commissionRule.create({
      data: {
        categoryId: input.categoryId,
        productType: input.productType,
        percentage: input.percentage,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo
          ? new Date(input.effectiveTo)
          : undefined,
        isActive: input.isActive ?? true,
      },
    });
  }
  async vendorTransactions(userId: string) {
    return this.database.commissionTransaction.findMany({
      where: { vendorId: await this.vendors.getVendorId(userId) },
      include: { orderItem: true, rule: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
