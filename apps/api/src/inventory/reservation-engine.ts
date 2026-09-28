import { ConflictException } from "@nestjs/common";
import {
  InventoryTransactionType,
  LedgerDirection,
  LedgerEntryType,
  Prisma,
} from "@prisma/client";

export async function reserveInventory(
  tx: Prisma.TransactionClient,
  inventory: {
    id: string;
    version: number;
    quantity: number;
    reserved: number;
  },
  quantity: number,
  orderItemId: string,
): Promise<void> {
  if (inventory.quantity - inventory.reserved < quantity)
    throw new ConflictException("Insufficient stock during reservation");
  const updated = await tx.inventory.updateMany({
    where: {
      id: inventory.id,
      version: inventory.version,
      quantity: { gte: inventory.reserved + quantity },
    },
    data: { reserved: { increment: quantity }, version: { increment: 1 } },
  });
  if (updated.count !== 1)
    throw new ConflictException(
      "Inventory changed concurrently; retry checkout",
    );
  await tx.inventoryTransaction.create({
    data: {
      inventoryId: inventory.id,
      type: InventoryTransactionType.RESERVATION,
      quantity,
      balanceAfter: inventory.quantity,
      referenceType: "OrderItem",
      referenceId: orderItemId,
      notes: "Order stock reservation",
    },
  });
}

export async function finalizeMasterOrder(
  tx: Prisma.TransactionClient,
  masterOrderId: string,
): Promise<void> {
  const vendorOrders = await tx.vendorOrder.findMany({
    where: { masterOrderId },
    include: {
      items: {
        include: {
          product: { include: { inventory: true } },
          commission: true,
        },
      },
    },
  });
  for (const vendorOrder of vendorOrders) {
    for (const item of vendorOrder.items) {
      if (!item.product.inventory)
        throw new ConflictException(
          "Inventory record missing during order finalization",
        );
      const existingSale = await tx.inventoryTransaction.findFirst({
        where: {
          type: InventoryTransactionType.SALE,
          referenceType: "OrderItem",
          referenceId: item.id,
        },
      });
      if (!existingSale) {
        const updated = await tx.inventory.updateMany({
          where: {
            id: item.product.inventory.id,
            quantity: { gte: item.quantity },
            reserved: { gte: item.quantity },
          },
          data: {
            quantity: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            "Reserved inventory could not be finalized",
          );
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: item.product.inventory.id,
            type: InventoryTransactionType.SALE,
            quantity: -item.quantity,
            balanceAfter: item.product.inventory.quantity - item.quantity,
            referenceType: "OrderItem",
            referenceId: item.id,
            notes: "Order inventory committed",
          },
        });
      }
      const commissionAmount = item.commission?.amount ?? new Prisma.Decimal(0);
      let balance =
        (
          await tx.vendorLedger.findFirst({
            where: { vendorId: vendorOrder.vendorId },
            orderBy: { createdAt: "desc" },
          })
        )?.balanceAfter ?? new Prisma.Decimal(0);
      const earningExists = await tx.vendorLedger.findFirst({
        where: {
          vendorId: vendorOrder.vendorId,
          type: LedgerEntryType.SALE,
          referenceType: "OrderItem",
          referenceId: item.id,
        },
      });
      if (!earningExists) {
        balance = balance.add(item.lineTotal);
        await tx.vendorLedger.create({
          data: {
            vendorId: vendorOrder.vendorId,
            vendorOrderId: vendorOrder.id,
            type: LedgerEntryType.SALE,
            direction: LedgerDirection.CREDIT,
            amount: item.lineTotal,
            balanceAfter: balance,
            referenceType: "OrderItem",
            referenceId: item.id,
            description: `Sale for ${item.productName}`,
          },
        });
      }
      const commissionExists = await tx.vendorLedger.findFirst({
        where: {
          vendorId: vendorOrder.vendorId,
          type: LedgerEntryType.COMMISSION,
          referenceType: "OrderItem",
          referenceId: item.id,
        },
      });
      if (!commissionExists && commissionAmount.gt(0)) {
        balance = balance.sub(commissionAmount);
        await tx.vendorLedger.create({
          data: {
            vendorId: vendorOrder.vendorId,
            vendorOrderId: vendorOrder.id,
            type: LedgerEntryType.COMMISSION,
            direction: LedgerDirection.DEBIT,
            amount: commissionAmount,
            balanceAfter: balance,
            referenceType: "OrderItem",
            referenceId: item.id,
            description: `Marketplace commission for ${item.productName}`,
          },
        });
      }
    }
    const commissionTotal = vendorOrder.items.reduce(
      (sum, item) => sum.add(item.commission?.amount ?? 0),
      new Prisma.Decimal(0),
    );
    await tx.vendorOrder.update({
      where: { id: vendorOrder.id },
      data: {
        settlementAmount: vendorOrder.productSubtotal.sub(commissionTotal),
      },
    });
  }
}

export async function releaseOrderItemInventory(
  tx: Prisma.TransactionClient,
  item: {
    id: string;
    quantity: number;
    product: {
      inventory: { id: string; quantity: number; reserved: number } | null;
    };
  },
  reason: string,
): Promise<void> {
  const inventory = item.product.inventory;
  if (!inventory) return;
  const sale = await tx.inventoryTransaction.findFirst({
    where: {
      type: InventoryTransactionType.SALE,
      referenceType: "OrderItem",
      referenceId: item.id,
    },
  });
  const release = await tx.inventoryTransaction.findFirst({
    where: {
      type: sale
        ? InventoryTransactionType.CANCELLATION
        : InventoryTransactionType.RELEASE,
      referenceType: "OrderItem",
      referenceId: item.id,
    },
  });
  if (release) return;
  if (sale) {
    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: { increment: item.quantity },
        version: { increment: 1 },
      },
    });
    await tx.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        type: InventoryTransactionType.CANCELLATION,
        quantity: item.quantity,
        balanceAfter: inventory.quantity + item.quantity,
        referenceType: "OrderItem",
        referenceId: item.id,
        notes: reason,
      },
    });
  } else {
    const updated = await tx.inventory.updateMany({
      where: { id: inventory.id, reserved: { gte: item.quantity } },
      data: {
        reserved: { decrement: item.quantity },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new ConflictException(
        "Inventory reservation could not be released",
      );
    await tx.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        type: InventoryTransactionType.RELEASE,
        quantity: item.quantity,
        balanceAfter: inventory.quantity,
        referenceType: "OrderItem",
        referenceId: item.id,
        notes: reason,
      },
    });
  }
}
