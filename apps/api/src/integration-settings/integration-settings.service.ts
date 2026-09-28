import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FieldEncryptionService } from "../common/field-encryption.service";
import { MongoDatabaseService } from "../database/mongo-database.service";
import {
  integrationSettingKeys,
  integrationSettingMetadata,
  isIntegrationSettingKey,
  type IntegrationSettingKey,
} from "./integration-settings.constants";
import type { UpdateIntegrationSettingsDto } from "./integration-settings.dto";

@Injectable()
export class IntegrationSettingsService {
  private readonly logger = new Logger(IntegrationSettingsService.name);

  constructor(
    private readonly database: MongoDatabaseService,
    private readonly config: ConfigService,
    private readonly encryption: FieldEncryptionService,
  ) {}

  async get(key: IntegrationSettingKey): Promise<string | undefined> {
    const stored = await this.database.integrationSetting.findUnique({ where: { key } });
    if (!stored) return this.config.get<string>(key) || undefined;
    try {
      return this.encryption.decrypt(stored.encryptedValue);
    } catch (error) {
      this.logger.error(`Unable to decrypt integration setting ${key}`, error);
      throw new Error(`Stored ${key} configuration cannot be decrypted`);
    }
  }

  async has(key: IntegrationSettingKey): Promise<boolean> {
    return Boolean(await this.get(key));
  }

  async list() {
    const stored = await this.database.integrationSetting.findMany({
      where: { key: { in: [...integrationSettingKeys] } },
      select: { key: true, valueHint: true, updatedAt: true },
    });
    const byKey = new Map<string, any>(stored.map((value: any) => [value.key, value]));
    return integrationSettingKeys.map((key: IntegrationSettingKey) => {
      const databaseValue = byKey.get(key);
      const environmentValue = this.config.get<string>(key);
      return {
        key,
        ...integrationSettingMetadata[key],
        configured: Boolean(databaseValue || environmentValue),
        source: databaseValue ? "DATABASE" : environmentValue ? "ENVIRONMENT" : "NONE",
        maskedValue: databaseValue?.valueHint ?? (environmentValue ? this.mask(key, environmentValue) : null),
        updatedAt: databaseValue?.updatedAt ?? null,
      };
    });
  }

  async update(actorId: string, input: UpdateIntegrationSettingsDto) {
    const entries = Object.entries(input).filter(
      (entry): entry is [IntegrationSettingKey, string] =>
        isIntegrationSettingKey(entry[0]) && typeof entry[1] === "string" && entry[1].trim().length > 0,
    );
    if (!entries.length) return this.list();
    await this.database.transaction(async (tx: any) => {
      for (const [key, rawValue] of entries) {
        const value = rawValue.trim();
        const existing = await tx.integrationSetting.findUnique({ where: { key } });
        await tx.integrationSetting.upsert({
          where: { key },
          create: {
            key,
            encryptedValue: this.encryption.encrypt(value),
            valueHint: this.mask(key, value),
            updatedById: actorId,
          },
          update: {
            encryptedValue: this.encryption.encrypt(value),
            valueHint: this.mask(key, value),
            updatedById: actorId,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: existing ? "INTEGRATION_SETTING_UPDATED" : "INTEGRATION_SETTING_CREATED",
            entityType: "IntegrationSetting",
            entityId: key,
            previousValue: existing ? { configured: true } : null,
            newValue: { configured: true, source: "DATABASE" },
          },
        });
      }
    });
    return this.list();
  }

  async remove(actorId: string, rawKey: string) {
    if (!isIntegrationSettingKey(rawKey)) throw new NotFoundException("Integration setting not found");
    const existing = await this.database.integrationSetting.findUnique({ where: { key: rawKey } });
    if (existing) {
      await this.database.transaction(async (tx: any) => {
        await tx.integrationSetting.delete({ where: { key: rawKey } });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "INTEGRATION_SETTING_REMOVED",
            entityType: "IntegrationSetting",
            entityId: rawKey,
            previousValue: { configured: true, source: "DATABASE" },
            newValue: { configured: Boolean(this.config.get<string>(rawKey)), source: this.config.get<string>(rawKey) ? "ENVIRONMENT" : "NONE" },
          },
        });
      });
    }
    return this.list();
  }

  private mask(key: IntegrationSettingKey, value: string): string {
    if (key === "SHIPROCKET_EMAIL") {
      const [name, domain] = value.split("@");
      return domain ? `${name.slice(0, 2)}***@${domain}` : "***";
    }
    if (key === "RAZORPAY_KEY_ID") {
      return value.length > 8 ? `${value.slice(0, 4)}••••${value.slice(-4)}` : "••••";
    }
    return value.length > 4 ? `••••••••${value.slice(-4)}` : "••••••••";
  }
}
