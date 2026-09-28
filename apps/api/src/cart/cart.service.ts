import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProductStatus, VendorStatus } from "../database/domain.types";
import { MongoDatabaseService } from "../database/mongo-database.service";
@Injectable()
export class CartService {
  constructor(private readonly database: MongoDatabaseService) {}
  private async cartId(userId: string) {
    const customer = await this.database.customerProfile.findUnique({
      where: { userId },
      include: { cart: true },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    if (customer.cart) return customer.cart.id;
    return (
      await this.database.cart.create({ data: { customerId: customer.id } })
    ).id;
  }
  async get(userId: string) {
    const cart = await this.database.cart.findUniqueOrThrow({
      where: { id: await this.cartId(userId) },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: true,
                category: true,
                images: { orderBy: { sortOrder: "asc" } },
                inventory: true,
              },
            },
          },
        },
      },
    });
    const groups = new Map<
      string,
      { vendor: object; items: unknown[]; subtotal: number }
    >();
    for (const line of cart.items) {
      const available = Math.max(
        0,
        (line.product.inventory?.quantity ?? 0) -
          (line.product.inventory?.reserved ?? 0),
      );
      const issue =
        line.product.status !== ProductStatus.APPROVED ||
        line.product.vendor.status !== VendorStatus.APPROVED ||
        available === 0
          ? "OUT_OF_STOCK"
          : line.quantity > available
            ? "QUANTITY_UNAVAILABLE"
            : undefined;
      const price = line.product.price;
      const previousPrice = line.unitPriceSnapshot;
      const priceChanged = line.unitPriceSnapshot !== line.product.price;
      const item = {
        id: line.id,
        product: {
          id: line.product.id,
          slug: line.product.slug,
          name: line.product.name,
          images: line.product.images.map((i: any) => i.url),
          weight: `${line.product.weightGrams} g`,
          price: { amount: price, currency: "INR" },
          availableQuantity: available,
        },
        quantity: line.quantity,
        currentUnitPrice: { amount: price, currency: "INR" },
        ...(priceChanged
          ? { previousUnitPrice: { amount: previousPrice, currency: "INR" } }
          : {}),
        issue: issue ?? (priceChanged ? "PRICE_CHANGED" : undefined),
      };
      const group = groups.get(line.product.vendorId) ?? {
        vendor: {
          id: line.product.vendor.id,
          name: line.product.vendor.businessName,
          location: line.product.vendor.pickupPincode ?? "",
          rating: 0,
          productCount: 0,
        },
        items: [],
        subtotal: 0,
      };
      group.items.push(item);
      group.subtotal += price * line.quantity;
      groups.set(line.product.vendorId, group);
    }
    const result = [...groups.values()].map((g: any) => ({
      ...g,
      productSubtotal: { amount: g.subtotal, currency: "INR" },
    }));
    return {
      groups: result,
      itemCount: cart.items.reduce((s: any, i: any) => s + i.quantity, 0),
      productSubtotal: {
        amount: result.reduce((s: any, g: any) => s + g.subtotal, 0),
        currency: "INR",
      },
      refreshedAt: new Date().toISOString(),
    };
  }
  async add(userId: string, productId: string, quantity: number) {
    const cartId = await this.cartId(userId);
    const product = await this.database.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.APPROVED,
        vendor: { status: VendorStatus.APPROVED },
      },
      include: { inventory: true },
    });
    const available =
      (product?.inventory?.quantity ?? 0) - (product?.inventory?.reserved ?? 0);
    if (!product) throw new BadRequestException("Product is unavailable");
    const existing = await this.database.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (available < nextQuantity)
      throw new BadRequestException(
        "Product is unavailable in the requested quantity",
      );
    await this.database.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity, unitPriceSnapshot: product.price },
      update: { quantity: { increment: quantity } },
    });
    return this.get(userId);
  }
  async update(userId: string, itemId: string, quantity: number) {
    const cartId = await this.cartId(userId);
    const item = await this.database.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { product: { include: { inventory: true, vendor: true } } },
    });
    if (!item) throw new NotFoundException("Cart item not found");
    if (
      item.product.status !== ProductStatus.APPROVED ||
      item.product.vendor.status !== VendorStatus.APPROVED
    )
      throw new BadRequestException("Product or vendor is no longer available");
    const available =
      (item.product.inventory?.quantity ?? 0) -
      (item.product.inventory?.reserved ?? 0);
    if (quantity > available)
      throw new BadRequestException(
        "Requested quantity exceeds available stock",
      );
    await this.database.cartItem.update({
      where: { id: itemId },
      data: { quantity, unitPriceSnapshot: item.product.price },
    });
    return this.get(userId);
  }
  async remove(userId: string, itemId: string) {
    const cartId = await this.cartId(userId);
    const result = await this.database.cartItem.deleteMany({
      where: { id: itemId, cartId },
    });
    if (!result.count) throw new NotFoundException("Cart item not found");
    return this.get(userId);
  }
  async clear(userId: string) {
    await this.database.cartItem.deleteMany({
      where: { cartId: await this.cartId(userId) },
    });
  }
}
