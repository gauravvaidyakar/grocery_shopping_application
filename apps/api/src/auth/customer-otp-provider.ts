import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { IntegrationSettingsService } from "../integration-settings/integration-settings.service";

export interface CustomerOtpClientConfiguration {
  provider: "MSG91_WIDGET";
  widgetId: string;
  tokenAuth: string;
  identifier: string;
}

@Injectable()
export class CustomerOtpProvider {
  constructor(private readonly settings: IntegrationSettingsService) {}

  async getClientConfiguration(mobile: string): Promise<CustomerOtpClientConfiguration> {
    const [widgetId, tokenAuth] = await Promise.all([
      this.settings.get("MSG91_WIDGET_ID"),
      this.settings.get("MSG91_WIDGET_TOKEN"),
    ]);
    if (!widgetId || !tokenAuth) {
      throw new ServiceUnavailableException(
        "Customer OTP is not configured. Add the MSG91 Widget ID and client token in Admin integration settings.",
      );
    }
    return {
      provider: "MSG91_WIDGET",
      widgetId,
      tokenAuth,
      identifier: this.normalizeIndianMobile(mobile),
    };
  }

  async verifyAccessToken(accessToken: string, expectedMobile: string): Promise<void> {
    const authkey = await this.settings.get("MSG91_AUTH_KEY");
    if (!authkey) {
      throw new ServiceUnavailableException(
        "Customer OTP verification is not configured. Add the MSG91 Auth Key in Admin integration settings.",
      );
    }

    let response: Response;
    try {
      response = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authkey, "access-token": accessToken }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException("MSG91 verification service is unavailable. Please try again.");
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || this.isFailure(payload)) {
      throw new UnauthorizedException("Verification code is invalid or expired");
    }

    const expectedIdentifier = this.normalizeIndianMobile(expectedMobile);
    const verifiedIdentifier = this.findIdentifier(payload) ?? this.identifierFromJwt(accessToken);
    if (!verifiedIdentifier || this.normalizeIdentifier(verifiedIdentifier) !== expectedIdentifier) {
      throw new UnauthorizedException("OTP verification does not match this account");
    }
  }

  private normalizeIndianMobile(value: string): string {
    const digits = value.replace(/\D/g, "");
    const national = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(national)) {
      throw new ServiceUnavailableException("A valid Indian mobile number is required for OTP delivery");
    }
    return `91${national}`;
  }

  private normalizeIdentifier(value: string): string {
    return value.includes("@") ? value.trim().toLowerCase() : value.replace(/\D/g, "");
  }

  private isFailure(payload: Record<string, unknown>): boolean {
    const candidate = payload.type ?? payload.status;
    const type = typeof candidate === "string" ? candidate.toLowerCase() : "";
    return ["error", "failed", "failure", "unauthorized", "invalid"].includes(type) || payload.success === false;
  }

  private findIdentifier(value: unknown): string | undefined {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    for (const key of ["identifier", "mobile", "phone", "phoneNumber", "number"]) {
      if (typeof record[key] === "string" && record[key]) return record[key];
    }
    for (const key of ["data", "user", "result"]) {
      const nested = this.findIdentifier(record[key]);
      if (nested) return nested;
    }
    return undefined;
  }

  private identifierFromJwt(token: string): string | undefined {
    try {
      const encoded = token.split(".")[1];
      if (!encoded) return undefined;
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
      return this.findIdentifier(payload);
    } catch {
      return undefined;
    }
  }
}
