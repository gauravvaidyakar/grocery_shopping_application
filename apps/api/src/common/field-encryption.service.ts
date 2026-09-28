import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

@Injectable()
export class FieldEncryptionService {
  private readonly key: Buffer;
  constructor(config: ConfigService) {
    const configured = config.getOrThrow<string>("BANK_DATA_ENCRYPTION_KEY");
    this.key = /^[a-fA-F0-9]{64}$/.test(configured)
      ? Buffer.from(configured, "hex")
      : Buffer.from(configured, "base64");
    if (this.key.length !== 32) {
      throw new Error("BANK_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes");
    }
  }
  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted.toString("base64")}`;
  }

  decrypt(value: string): string {
    const [ivValue, authTagValue, encryptedValue, ...extra] = value.split(".");
    if (!ivValue || !authTagValue || !encryptedValue || extra.length) {
      throw new Error("Encrypted value has an invalid format");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(ivValue, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTagValue, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
