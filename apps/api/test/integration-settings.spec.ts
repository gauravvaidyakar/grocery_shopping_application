import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { FieldEncryptionService } from "../src/common/field-encryption.service";
import type { PrismaService } from "../src/database/prisma.service";
import { IntegrationSettingsService } from "../src/integration-settings/integration-settings.service";

const encryption = new FieldEncryptionService({
  getOrThrow: vi.fn(() => "a".repeat(64)),
} as unknown as ConfigService);

describe("integration settings", () => {
  it("encrypts persisted credentials and can decrypt them", () => {
    const encrypted = encryption.encrypt("sensitive-value");
    expect(encrypted).not.toContain("sensitive-value");
    expect(encryption.decrypt(encrypted)).toBe("sensitive-value");
  });

  it("returns only masked configuration metadata to administrators", async () => {
    const prisma = {
      integrationSetting: {
        findMany: vi.fn().mockResolvedValue([
          {
            key: "INTERAKT_API_KEY",
            valueHint: "••••••••1234",
            updatedAt: new Date("2026-09-21T12:00:00.000Z"),
          },
        ]),
      },
    } as unknown as PrismaService;
    const config = { get: vi.fn() } as unknown as ConfigService;
    const service = new IntegrationSettingsService(prisma, config, encryption);

    const result = await service.list();
    const interakt = result.find((item) => item.key === "INTERAKT_API_KEY");
    expect(interakt).toMatchObject({
      configured: true,
      source: "DATABASE",
      maskedValue: "••••••••1234",
    });
    expect(JSON.stringify(result)).not.toContain("encryptedValue");
  });

  it("stores encrypted values and audits changes without recording the secret", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({});
    const tx = {
      integrationSetting: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert,
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
      integrationSetting: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const config = { get: vi.fn() } as unknown as ConfigService;
    const service = new IntegrationSettingsService(prisma, config, encryption);

    await service.update("admin-id", { INTERAKT_API_KEY: "live-secret-value" });

    expect(upsert).toHaveBeenCalledOnce();
    const persisted = upsert.mock.calls[0]?.[0] as {
      create: { encryptedValue: string };
    };
    expect(persisted.create.encryptedValue).not.toContain("live-secret-value");
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain("live-secret-value");
  });

  it("exposes MSG91 configuration metadata without exposing its auth key", async () => {
    const prisma = {
      integrationSetting: {
        findMany: vi.fn().mockResolvedValue([
          {
            key: "MSG91_AUTH_KEY",
            valueHint: "••••••••7890",
            updatedAt: new Date("2026-09-26T12:00:00.000Z"),
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new IntegrationSettingsService(
      prisma,
      { get: vi.fn() } as unknown as ConfigService,
      encryption,
    );

    const result = await service.list();
    expect(result.find((item) => item.key === "MSG91_AUTH_KEY")).toMatchObject({
      provider: "MSG91",
      configured: true,
      maskedValue: "••••••••7890",
      secret: true,
    });
    expect(result.find((item) => item.key === "MSG91_OTP_TEMPLATE_ID")).toMatchObject({
      provider: "MSG91",
      configured: false,
      secret: false,
    });
  });
});
