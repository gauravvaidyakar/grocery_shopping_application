import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { VendorsService } from "../vendors/vendors.service";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}
  async list(userId: string) {
    const vendorId = await this.vendors.getVendorId(userId);
    return this.prisma.inventory.findMany({
      where: { product: { vendorId } },
      include: { product: { select: { id: true, name: true, status: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }
  async adjust(
    userId: string,
    productId: string,
    adjustment: number,
    reason: string,
  ) {
    const vendorId = await this.vendors.getVendorId(userId);
    return this.prisma.$transaction(
      async (tx) => {
        const inventory = await tx.inventory.findFirst({
          where: { productId, product: { vendorId } },
        });
        if (!inventory) throw new NotFoundException("Inventory not found");
        const next = inventory.quantity + adjustment;
        if (next < inventory.reserved || next < 0)
          throw new BadRequestException(
            "Adjustment would reduce stock below reserved quantity",
          );
        const result = await tx.inventory.updateMany({
          where: { id: inventory.id, version: inventory.version },
          data: { quantity: next, version: { increment: 1 } },
        });
        if (result.count !== 1)
          throw new BadRequestException(
            "Inventory changed concurrently; retry the adjustment",
          );
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: "ADJUSTMENT",
            quantity: adjustment,
            balanceAfter: next,
            notes: reason,
          },
        });
        return tx.inventory.findUniqueOrThrow({ where: { id: inventory.id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async history(userId: string, productId: string) {
    const vendorId = await this.vendors.getVendorId(userId);
    const inventory = await this.prisma.inventory.findFirst({ where: { productId, product: { vendorId } } });
    if (!inventory) throw new NotFoundException("Inventory not found");
    return this.prisma.inventoryTransaction.findMany({
      where: { inventoryId: inventory.id },
      orderBy: { createdAt: "desc" },
    });
  }
}
