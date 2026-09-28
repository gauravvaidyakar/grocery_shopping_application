import { ConflictException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import {
  PaymentMethod,
  Prisma,
  ProductStatus,
  ProductType,
  VendorStatus,
} from "@prisma/client";
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CheckoutService } from "../src/checkout/checkout.service";
import type { PrismaService } from "../src/database/prisma.service";
import { reserveInventory } from "../src/inventory/reservation-engine";
import { verifyRazorpaySignature } from "../src/payments/payment-provider";
import { calculateCommissionAmount } from "../src/orders/orders.service";
import type { ShippingService } from "../src/shipments/shipments.service";
import { DevelopmentShippingProvider } from "../src/shipments/shipping-provider";

function cartCustomer(
  vendorCount: number,
  overrides: {
    vendorStatus?: VendorStatus;
    productStatus?: ProductStatus;
  } = {},
) {
  return {
    id: "customer-id",
    addresses: [{ id: "address-id", pincode: "411001" }],
    cart: {
      items: Array.from({ length: vendorCount }, (_, index) => ({
        id: `cart-${index}`,
        quantity: 2,
        unitPriceSnapshot: new Prisma.Decimal(100 + index),
        product: {
          id: `product-${index}`,
          slug: `product-${index}`,
          name: `Product ${index}`,
          price: new Prisma.Decimal(100 + index),
          gstRate: new Prisma.Decimal(5),
          productType: ProductType.RAW_COMMODITY,
          weightGrams: 500,
          status: overrides.productStatus ?? ProductStatus.APPROVED,
          vendorId: `vendor-${index}`,
          vendor: {
            id: `vendor-${index}`,
            businessName: `Vendor ${index}`,
            status: overrides.vendorStatus ?? VendorStatus.APPROVED,
            pickupPincode: `40000${index}`,
          },
          inventory: {
            id: `inventory-${index}`,
            quantity: 10,
            reserved: 0,
            version: 1,
          },
          images: [],
        },
      })),
    },
  };
}

function checkoutHarness(customer: ReturnType<typeof cartCustomer>) {
  const create = vi.fn().mockResolvedValue({ id: "quote-id" });
  const prisma = {
    customerProfile: { findUnique: vi.fn().mockResolvedValue(customer) },
    checkoutQuote: { create },
  } as unknown as PrismaService;
  const shipping = {
    quote: vi.fn().mockResolvedValue({
      amountMinor: 5000,
      currency: "INR",
      provider: "TEST",
      serviceCode: "STANDARD",
      development: true,
    }),
  } as unknown as ShippingService;
  const config = {
    get: vi.fn((_key: string, fallback: unknown) => fallback),
  } as unknown as ConfigService;
  return { service: new CheckoutService(prisma, shipping, config), create };
}

describe("multi-vendor checkout", () => {
  it("parses development shipping rates loaded from environment strings", async () => {
    const config = {
      get: vi.fn((key: string) =>
        key === "DEV_SHIPPING_BASE_MINOR" ? "4000" : "2000",
      ),
    } as unknown as ConfigService;
    const provider = new DevelopmentShippingProvider(config);
    const rate = await provider.quote({
      originPincode: "444301",
      destinationPincode: "443001",
      weightGrams: 1000,
      cod: true,
    });
    expect(rate.amountMinor).toBe(6000);
    expect(typeof rate.amountMinor).toBe("number");
  });

  it.each([1, 2, 3])(
    "creates one quote with %i independent vendor groups",
    async (vendorCount) => {
      const { service, create } = checkoutHarness(cartCustomer(vendorCount));
      const quote = await service.validate(
        "user-id",
        "address-id",
        PaymentMethod.COD,
      );
      expect(quote.vendors).toHaveLength(vendorCount);
      expect(quote.totalShipping.amount).toBe(vendorCount * 50);
      expect(create).toHaveBeenCalledOnce();
      const call = create.mock.calls[0] as unknown as [
        { data: { snapshot: { vendors: unknown[] } } },
      ];
      const snapshot = call[0].data.snapshot;
      expect(snapshot.vendors).toHaveLength(vendorCount);
    },
  );

  it("rejects an inactive vendor", async () => {
    const customer = cartCustomer(1, {
      vendorStatus: VendorStatus.SUSPENDED,
    });
    const { service } = checkoutHarness(customer);
    await expect(
      service.validate("user-id", "address-id", PaymentMethod.COD),
    ).rejects.toThrow("is not active");
  });

  it("rejects an unapproved product", async () => {
    const customer = cartCustomer(1, {
      productStatus: ProductStatus.REJECTED,
    });
    const { service } = checkoutHarness(customer);
    await expect(
      service.validate("user-id", "address-id", PaymentMethod.COD),
    ).rejects.toThrow("is not approved");
  });

  it("rejects insufficient available stock", async () => {
    const customer = cartCustomer(1);
    customer.cart.items[0].product.inventory.quantity = 2;
    customer.cart.items[0].product.inventory.reserved = 1;
    const { service } = checkoutHarness(customer);
    await expect(
      service.validate("user-id", "address-id", PaymentMethod.COD),
    ).rejects.toThrow(ConflictException);
  });

  it("requires explicit acceptance after a price change", async () => {
    const customer = cartCustomer(1);
    customer.cart.items[0].product.price = new Prisma.Decimal(120);
    const { service } = checkoutHarness(customer);
    await expect(
      service.validate("user-id", "address-id", PaymentMethod.COD),
    ).rejects.toThrow("price changed");
  });
});

describe("inventory concurrency", () => {
  it("rejects a stale optimistic inventory version", async () => {
    const create = vi.fn();
    const tx = {
      inventory: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      inventoryTransaction: { create },
    } as unknown as Prisma.TransactionClient;
    await expect(
      reserveInventory(
        tx,
        { id: "inventory", version: 1, quantity: 5, reserved: 0 },
        2,
        "item",
      ),
    ).rejects.toThrow("changed concurrently");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("Razorpay signature verification", () => {
  it("accepts the exact signature and rejects tampering", () => {
    const payload = "order_1|payment_1";
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    expect(verifyRazorpaySignature(payload, signature, secret)).toBe(true);
    expect(verifyRazorpaySignature(`${payload}x`, signature, secret)).toBe(
      false,
    );
  });
});

describe("commission calculation", () => {
  it("rounds the backend commission snapshot to paise", () => {
    expect(
      calculateCommissionAmount(
        new Prisma.Decimal("999.99"),
        new Prisma.Decimal("7.5"),
      ).toString(),
    ).toBe("75");
  });
});
