import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const port = 4317;
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

async function waitForApi(process: ChildProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null)
      throw new Error(`API exited before becoming ready (${process.exitCode})`);
    try {
      const response = await fetch(`${baseUrl}/categories`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("API did not become ready within 60 seconds");
}

async function main(): Promise<void> {
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const api = spawn(process.execPath, ["dist/main.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      MONGODB_URI: replicaSet.getUri(),
      MONGODB_DATABASE: "grocery_web_application",
      JWT_ACCESS_SECRET: randomBytes(32).toString("hex"),
      JWT_REFRESH_SECRET: randomBytes(32).toString("hex"),
      BANK_DATA_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      CORS_ORIGINS: "http://localhost:5173",
      CUSTOMER_WEB_URL: "http://localhost:5173",
      SMS_PROVIDER: "UNCONFIGURED",
      SHIPPING_PROVIDER: "DEVELOPMENT",
      WHATSAPP_PROVIDER: "DEVELOPMENT",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  api.stdout?.on("data", (chunk: Buffer) => { logs += chunk.toString(); });
  api.stderr?.on("data", (chunk: Buffer) => { logs += chunk.toString(); });

  try {
    await waitForApi(api);
    const registration = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role: "VENDOR",
        email: "mongo-smoke-vendor@example.com",
        password: "StrongSmokePass1",
        businessName: "Mongo Smoke Vendor",
        ownerName: "Smoke Owner",
        businessAddress: {
          line1: "1 Test Road",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
        },
      }),
    });
    if (!registration.ok)
      throw new Error(`Vendor registration failed (${registration.status}): ${await registration.text()}`);
    const payload = await registration.json() as { data?: { accessToken?: string } };
    if (!payload.data?.accessToken)
      throw new Error("Vendor registration did not return an access token");
    process.stdout.write("MongoDB API smoke passed: startup, health, transaction, and vendor registration.\n");
  } catch (error) {
    process.stderr.write(logs);
    throw error;
  } finally {
    api.kill();
    await replicaSet.stop();
  }
}

void main();
