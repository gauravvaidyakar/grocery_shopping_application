import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoDatabaseService } from "../src/database/mongo-database.service";
import { collectionNames, declaredMongoIndexCount } from "../src/database/mongo.schemas";

describe("MongoDB persistence integration", () => {
  let replicaSet: MongoMemoryReplSet;
  let connection: mongoose.Connection;
  let database: MongoDatabaseService;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
    connection = await mongoose.createConnection(replicaSet.getUri(), { dbName: "grocery_web_application" }).asPromise();
    database = new MongoDatabaseService(connection);
    await database.onModuleInit();
  }, 900_000);

  afterAll(async () => {
    if (connection) await connection.close();
    if (replicaSet) await replicaSet.stop();
  });

  it("creates every application collection and its declared indexes", async () => {
    const collections = (await connection.db!.listCollections().toArray()).map((item) => item.name);
    for (const collection of Object.values(collectionNames)) expect(collections).toContain(collection);
    const applicationIndexCount = (await Promise.all(Object.values(database.models).map((model) => model.listIndexes())))
      .reduce((total, collectionIndexes) => total + collectionIndexes.filter((index) => index.name !== "_id_").length, 0);
    expect(applicationIndexCount).toBe(declaredMongoIndexCount);
    expect((await database.models.user.listIndexes()).some((index) => index.key.email === 1 && index.unique)).toBe(true);
    expect((await database.models.product.listIndexes()).some((index) => index.key.vendorId === 1 && index.key.status === 1)).toBe(true);
  });

  it("creates nested profiles and resolves document references", async () => {
    const user = await database.user.create({
      data: { email: "customer@example.com", passwordHash: "hash", role: "CUSTOMER", customerProfile: { create: { firstName: "Asha", lastName: "Patil" } } },
      include: { customerProfile: true },
    });
    expect(user.customerProfile.userId).toBe(user.id);
    const profile = await database.customerProfile.findUnique({ where: { userId: user.id }, include: { user: true } });
    expect(profile.user.email).toBe("customer@example.com");
  });

  it("enforces unique keys as database constraints", async () => {
    await expect(database.user.create({ data: { email: "customer@example.com", passwordHash: "other", role: "CUSTOMER" } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects undeclared fields instead of silently persisting schema drift", async () => {
    await expect(database.category.create({
      data: { name: "Strict", slug: "strict", accidentalField: "not allowed" },
    })).rejects.toThrow(/strict/i);
  });

  it("rolls back multi-document work in a MongoDB transaction", async () => {
    await expect(database.transaction(async (tx) => {
      await tx.masterOrder.create({ data: { orderNumber: "ROLLBACK-1", customerId: "missing", checkoutQuoteId: "quote-rollback", deliveryAddressSnapshot: {}, productSubtotal: 100, totalShipping: 10, payableTotal: 110, idempotencyKey: "rollback-order" } });
      await tx.payment.create({ data: { masterOrderId: "rollback", provider: "TEST", amount: 110, idempotencyKey: "rollback-payment" } });
      throw new Error("rollback");
    })).rejects.toThrow("rollback");
    expect(await database.masterOrder.count({ where: { orderNumber: "ROLLBACK-1" } })).toBe(0);
    expect(await database.payment.count({ where: { idempotencyKey: "rollback-payment" } })).toBe(0);
  });

  it("uses a guarded atomic update for inventory", async () => {
    const inventory = await database.inventory.create({ data: { productId: "product-atomic", quantity: 5, reserved: 0, version: 0 } });
    const first = await database.inventory.updateMany({ where: { id: inventory.id, quantity: { gte: 4 }, version: 0 }, data: { reserved: { increment: 4 }, version: { increment: 1 } } });
    const second = await database.inventory.updateMany({ where: { id: inventory.id, quantity: { gte: 4 }, version: 0 }, data: { reserved: { increment: 4 }, version: { increment: 1 } } });
    expect(first.count).toBe(1);
    expect(second.count).toBe(0);
  });

  it("round-trips financial values through Decimal128", async () => {
    const payment = await database.payment.create({ data: { masterOrderId: "money-order", provider: "TEST", amount: 123.45, currency: "INR", idempotencyKey: "money-payment" } });
    expect(payment.amount).toBe(123.45);
  });

  it("supports relation counts, count ordering, and grouped averages", async () => {
    const vendor = await database.vendor.create({ data: { userId: "vendor-user", businessName: "Test Vendor", status: "APPROVED" } });
    const first = await database.product.create({ data: { vendorId: vendor.id, categoryId: "category-1", name: "First", slug: "first", status: "APPROVED" } });
    const second = await database.product.create({ data: { vendorId: vendor.id, categoryId: "category-1", name: "Second", slug: "second", status: "APPROVED" } });
    await database.orderItem.createMany({ data: [
      { vendorOrderId: "vo-count", productId: first.id, productName: "First", quantity: 1, unitPrice: 10, lineTotal: 10 },
      { vendorOrderId: "vo-count", productId: first.id, productName: "First", quantity: 1, unitPrice: 10, lineTotal: 10 },
      { vendorOrderId: "vo-count", productId: second.id, productName: "Second", quantity: 1, unitPrice: 10, lineTotal: 10 },
    ] });
    const ranked = await database.product.findMany({ select: { id: true }, orderBy: { orderItems: { _count: "desc" } } });
    expect(ranked.slice(0, 2).map((product) => product.id)).toEqual([first.id, second.id]);
    const withCount = await database.vendor.findUnique({ where: { id: vendor.id }, select: { id: true, _count: { select: { products: { where: { status: "APPROVED" } } } } } });
    expect(withCount._count.products).toBe(2);
    await database.review.createMany({ data: [
      { productId: first.id, customerId: "customer-1", orderItemId: "review-item-1", rating: 4, status: "PUBLISHED" },
      { productId: first.id, customerId: "customer-2", orderItemId: "review-item-2", rating: 2, status: "PUBLISHED" },
    ] });
    const ratings = await database.review.groupBy({ by: ["productId"], where: { productId: first.id }, _avg: { rating: true }, _count: { rating: true } });
    expect(ratings[0]).toMatchObject({ productId: first.id, _avg: { rating: 3 }, _count: { rating: 2 } });
  });

  it("supports inverse relation none filters used by settlement eligibility", async () => {
    const included = await database.vendorOrder.create({ data: { vendorOrderNumber: "NONE-1", masterOrderId: "mo-none", vendorId: "vendor-none", status: "DELIVERED" } });
    const excluded = await database.vendorOrder.create({ data: { vendorOrderNumber: "NONE-2", masterOrderId: "mo-none", vendorId: "vendor-none-2", status: "DELIVERED" } });
    await database.settlementItem.create({ data: { settlementId: "settlement-none", vendorOrderId: excluded.id, grossAmount: 10, commissionAmount: 1, refundAmount: 0, settlementAmount: 9 } });
    const eligible = await database.vendorOrder.findMany({ where: { id: { in: [included.id, excluded.id] }, settlementItems: { none: {} } } });
    expect(eligible.map((order) => order.id)).toEqual([included.id]);
  });

  it("persists sessions, complaint attachments, and both invoice types", async () => {
    await database.session.create({ data: { userId: "user-1", tokenHash: "token-hash", expiresAt: new Date(Date.now() + 60_000) } });
    await database.complaintAttachment.create({ data: { complaintId: "complaint-1", storageKey: "complaints/a.pdf", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10 } });
    await database.vendorInvoice.create({ data: { invoiceNumber: "VIN-1", vendorOrderId: "vo-1", subtotal: 100, gstAmount: 0, total: 100 } });
    await database.commissionInvoice.create({ data: { invoiceNumber: "CIN-1", vendorOrderId: "vo-1", taxableAmount: 14, gstAmount: 0, total: 14 } });
    expect(await database.session.count()).toBe(1);
    expect(await database.complaintAttachment.count()).toBe(1);
    expect(await database.vendorInvoice.count()).toBe(1);
    expect(await database.commissionInvoice.count()).toBe(1);
  });
});
