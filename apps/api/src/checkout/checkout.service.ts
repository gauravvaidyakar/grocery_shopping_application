import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaymentMethod,
  Prisma,
  ProductStatus,
  VendorStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { ShippingService } from "../shipments/shipments.service";
export interface QuoteItemSnapshot {
  cartItemId: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  vendorId: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  gstRate: string;
  productType: "RAW_COMMODITY" | "VALUE_ADDED";
  weightGrams: number;
  inventoryId: string;
  inventoryVersion: number;
}
export interface QuoteVendorSnapshot {
  vendorId: string;
  vendorName: string;
  shippingMinor: number;
  shippingProvider: string;
  shippingServiceCode: string;
  shippingDevelopment: boolean;
  productSubtotalMinor: number;
  estimatedDays?: number;
  items: QuoteItemSnapshot[];
}
export interface CheckoutSnapshot {
  addressId: string;
  paymentMethod: PaymentMethod;
  productSubtotalMinor: number;
  totalShippingMinor: number;
  payableTotalMinor: number;
  currency: "INR";
  vendors: QuoteVendorSnapshot[];
}
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingService,
    private readonly config: ConfigService,
  ) {}
  async validate(
    userId: string,
    addressId: string,
    paymentMethod: PaymentMethod,
  ) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: {
        cart: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    vendor: true,
                    inventory: true,
                    images: { orderBy: { sortOrder: "asc" } },
                  },
                },
              },
            },
          },
        },
        addresses: { where: { id: addressId } },
      },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    const address = customer.addresses[0];
    if (!address) throw new NotFoundException("Delivery address not found");
    if (!customer.cart || customer.cart.items.length === 0)
      throw new BadRequestException("Cart is empty");
    const grouped = new Map<string, QuoteItemSnapshot[]>();
    for (const line of customer.cart.items) {
      const product = line.product;
      if (product.status !== ProductStatus.APPROVED)
        throw new BadRequestException(
          `${product.name} is not approved for sale`,
        );
      if (product.vendor.status !== VendorStatus.APPROVED)
        throw new BadRequestException(
          `${product.vendor.businessName} is not active`,
        );
      if (!product.inventory)
        throw new BadRequestException(
          `${product.name} has no inventory record`,
        );
      const available = product.inventory.quantity - product.inventory.reserved;
      if (available < line.quantity)
        throw new ConflictException(`${product.name} has insufficient stock`);
      if (!line.unitPriceSnapshot.equals(product.price))
        throw new ConflictException(
          `${product.name} price changed; update the cart to accept the current price`,
        );
      const unitPriceMinor = product.price
        .mul(100)
        .toDecimalPlaces(0)
        .toNumber();
      const item: QuoteItemSnapshot = {
        cartItemId: line.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        imageUrl: product.images[0]?.url ?? "",
        vendorId: product.vendorId,
        quantity: line.quantity,
        unitPriceMinor,
        lineTotalMinor: unitPriceMinor * line.quantity,
        gstRate: product.gstRate.toString(),
        productType: product.productType,
        weightGrams: product.weightGrams,
        inventoryId: product.inventory.id,
        inventoryVersion: product.inventory.version,
      };
      grouped.set(product.vendorId, [
        ...(grouped.get(product.vendorId) ?? []),
        item,
      ]);
    }
    const vendors = await Promise.all(
      [...grouped.entries()].map(
        async ([vendorId, items]): Promise<QuoteVendorSnapshot> => {
          const vendor = customer.cart!.items.find(
            (line) => line.product.vendorId === vendorId,
          )!.product.vendor;
          if (!vendor.pickupPincode)
            throw new BadRequestException(
              `${vendor.businessName} has no pickup pincode`,
            );
          const rate = await this.shipping.quote({
            originPincode: vendor.pickupPincode,
            destinationPincode: address.pincode,
            weightGrams: items.reduce(
              (sum, item) => sum + item.weightGrams * item.quantity,
              0,
            ),
            cod: paymentMethod === PaymentMethod.COD,
          });
          return {
            vendorId,
            vendorName: vendor.businessName,
            shippingMinor: rate.amountMinor,
            shippingProvider: rate.provider,
            shippingServiceCode: rate.serviceCode,
            shippingDevelopment: rate.development,
            productSubtotalMinor: items.reduce(
              (sum, item) => sum + item.lineTotalMinor,
              0,
            ),
            ...(rate.estimatedDays
              ? { estimatedDays: rate.estimatedDays }
              : {}),
            items,
          };
        },
      ),
    );
    const productSubtotalMinor = vendors.reduce(
      (sum, vendor) => sum + vendor.productSubtotalMinor,
      0,
    );
    const totalShippingMinor = vendors.reduce(
      (sum, vendor) => sum + vendor.shippingMinor,
      0,
    );
    const snapshot: CheckoutSnapshot = {
      addressId,
      paymentMethod,
      productSubtotalMinor,
      totalShippingMinor,
      payableTotalMinor: productSubtotalMinor + totalShippingMinor,
      currency: "INR",
      vendors,
    };
    const expiresAt = new Date(
      Date.now() +
        this.config.get<number>("CHECKOUT_QUOTE_TTL_MINUTES", 10) * 60_000,
    );
    const quote = await this.prisma.checkoutQuote.create({
      data: {
        customerId: customer.id,
        addressId,
        productSubtotal: new Prisma.Decimal(productSubtotalMinor).div(100),
        totalShipping: new Prisma.Decimal(totalShippingMinor).div(100),
        payableTotal: new Prisma.Decimal(snapshot.payableTotalMinor).div(100),
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    return {
      quoteId: quote.id,
      addressId,
      vendors: vendors.map((vendor) => ({
        vendor: {
          id: vendor.vendorId,
          name: vendor.vendorName,
          location: "",
          rating: 0,
          productCount: 0,
        },
        items: vendor.items.map((item) => ({
          id: item.cartItemId,
          quantity: item.quantity,
          product: {
            id: item.productId,
            slug: item.productSlug,
            name: item.productName,
            images: [item.imageUrl],
            price: { amount: item.unitPriceMinor / 100, currency: "INR" },
            availableQuantity: item.quantity,
          },
          currentUnitPrice: {
            amount: item.unitPriceMinor / 100,
            currency: "INR",
          },
        })),
        productSubtotal: {
          amount: vendor.productSubtotalMinor / 100,
          currency: "INR",
        },
        shipping: { amount: vendor.shippingMinor / 100, currency: "INR" },
        estimatedDelivery: new Date(
          Date.now() + (vendor.estimatedDays ?? 5) * 86_400_000,
        ).toISOString(),
      })),
      productSubtotal: { amount: productSubtotalMinor / 100, currency: "INR" },
      totalShipping: { amount: totalShippingMinor / 100, currency: "INR" },
      payableTotal: {
        amount: snapshot.payableTotalMinor / 100,
        currency: "INR",
      },
      expiresAt: expiresAt.toISOString(),
    };
  }
}
