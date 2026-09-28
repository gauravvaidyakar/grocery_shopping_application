import { beforeEach, describe, expect, it } from "vitest";
import { createMockMarketplaceApi } from "./mockMarketplaceApi";

describe("development marketplace adapter", () => {
  beforeEach(() => window.localStorage.clear());

  it("filters the catalogue by product type", async () => {
    const api = createMockMarketplaceApi();
    const result = await api.getProducts({
      productType: "RAW_COMMODITY",
      page: 1,
      limit: 20,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every((product) => product.productType === "RAW_COMMODITY"),
    ).toBe(true);
  });

  it("keeps products grouped by vendor in one cart", async () => {
    const api = createMockMarketplaceApi();
    await api.addCartItem("prod-mango-pickle", 1);
    await api.addCartItem("prod-ragi-flour", 1);
    const cart = await api.getCart();
    expect(cart.itemCount).toBe(2);
    expect(cart.groups).toHaveLength(2);
  });

  it("adds the selected product quantity and returns the refreshed cart count", async () => {
    const api = createMockMarketplaceApi();
    const cart = await api.addCartItem("prod-ragi-flour", 2);
    const line = cart.groups
      .flatMap((group) => group.items)
      .find((item) => item.product.id === "prod-ragi-flour");

    expect(line?.quantity).toBe(2);
    expect(cart.itemCount).toBe(2);
  });

  it("filters related catalogue products by seller", async () => {
    const api = createMockMarketplaceApi();
    const product = await api.getProduct("prod-ragi-flour");
    const result = await api.getProducts({ vendorId: product.vendor.id });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.vendor.id === product.vendor.id)).toBe(true);
  });

  it("creates one master order with independent vendor orders", async () => {
    const api = createMockMarketplaceApi();
    await api.addCartItem("prod-mango-pickle", 1);
    await api.addCartItem("prod-jaggery", 1);
    const quote = await api.validateCheckout("address-home", "COD");
    const order = await api.createOrder({
      quoteId: quote.quoteId,
      addressId: "address-home",
      paymentMethod: "COD",
    });
    expect(order.vendorOrders).toHaveLength(2);
    expect(order.paymentStatus).toBe("COD_PENDING");
    expect(order.payableTotal).toEqual(quote.payableTotal);
  });

  it("cancels one eligible item without cancelling the unrelated vendor order", async () => {
    const api = createMockMarketplaceApi();
    await api.addCartItem("prod-mango-pickle", 1);
    await api.addCartItem("prod-jaggery", 1);
    const quote = await api.validateCheckout("address-home", "COD");
    const order = await api.createOrder({
      quoteId: quote.quoteId,
      addressId: "address-home",
      paymentMethod: "COD",
    });
    const item = order.vendorOrders[0]!.items[0]!;
    const updated = await api.cancelOrderItem(order.masterOrderId, item.id, {
      reason: "Ordered the wrong product.",
    });
    expect(updated.status).toBe("PARTIALLY_CANCELLED");
    expect(
      updated.vendorOrders
        .flatMap((vendorOrder) => vendorOrder.items)
        .filter((candidate) => candidate.status === "CANCELLED"),
    ).toHaveLength(1);
    expect(
      updated.vendorOrders.some(
        (vendorOrder) => vendorOrder.status === "CONFIRMED",
      ),
    ).toBe(true);
  });

  it("exposes backend eligibility and independent shipment tracking", async () => {
    const api = createMockMarketplaceApi();
    const orders = await api.getOrders({ page: 1, limit: 10 });
    const order = orders.items[0]!;
    const deliveredItem = order.vendorOrders
      .flatMap((vendorOrder) => vendorOrder.items)
      .find((candidate) => candidate.status === "DELIVERED")!;
    expect(deliveredItem.actions.canReturn).toBe(true);
    expect(deliveredItem.actions.canReview).toBe(true);
    const shipments = order.vendorOrders
      .map((vendorOrder) => vendorOrder.shipment)
      .filter(Boolean);
    expect(shipments).toHaveLength(2);
    const tracking = await api.getShipmentTracking(shipments[0]!.id);
    expect(tracking.events.length).toBeGreaterThan(0);
  });
});
