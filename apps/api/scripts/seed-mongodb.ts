import "dotenv/config";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { ProductType, Role } from "../src/database/domain.types";
import { createMongoModels } from "../src/database/mongo.schemas";

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DATABASE;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!uri || databaseName !== "grocery_web_application") {
    throw new Error("MONGODB_URI and MONGODB_DATABASE=grocery_web_application are required");
  }
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required for seeding");
  }

  const connection = await mongoose.createConnection(uri, { dbName: databaseName }).asPromise();
  try {
    const models = createMongoModels(connection);
    await Promise.all(Object.values(models).map((model) => model.createIndexes()));
    await models.user.updateOne(
      { email: adminEmail.toLowerCase() },
      { $setOnInsert: { _id: randomUUID(), email: adminEmail.toLowerCase(), passwordHash: await hash(adminPassword, 12), role: Role.ADMIN, status: "ACTIVE" } },
      { upsert: true },
    );
    for (const [name, slug] of [
      ["Food Products", "food-products"],
      ["Millets", "millets"],
      ["Millet-based Products", "millet-based-products"],
      ["Jaggery", "jaggery"],
    ] as const) {
      await models.category.updateOne({ slug }, { $set: { name, isActive: true }, $setOnInsert: { _id: randomUUID(), slug } }, { upsert: true });
    }
    for (const [productType, percentage] of [
      [ProductType.RAW_COMMODITY, 14],
      [ProductType.VALUE_ADDED, 18],
    ] as const) {
      await models.commissionRule.updateOne(
        { productType, categoryId: null, isActive: true },
        {
          $setOnInsert: {
            _id: randomUUID(),
            productType,
            categoryId: null,
            percentage,
            effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
            isActive: true,
          },
        },
        { upsert: true },
      );
    }
  } finally {
    await connection.close();
  }
}

void seed();

