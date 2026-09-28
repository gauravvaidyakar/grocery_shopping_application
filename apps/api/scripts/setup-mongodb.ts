import "dotenv/config";
import mongoose from "mongoose";
import { createMongoModels } from "../src/database/mongo.schemas";

async function setup(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DATABASE;
  if (!uri || databaseName !== "grocery_web_application") {
    throw new Error("MONGODB_URI and MONGODB_DATABASE=grocery_web_application are required");
  }
  const connection = await mongoose.createConnection(uri, { dbName: databaseName }).asPromise();
  try {
    const models = createMongoModels(connection);
    await Promise.all(Object.values(models).map((model) => model.createIndexes()));
  } finally {
    await connection.close();
  }
}

void setup();
