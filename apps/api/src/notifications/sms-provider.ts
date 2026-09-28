import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationSettingsService } from "../integration-settings/integration-settings.service";

export interface SmsDeliveryRequest {
  recipient: string;
  otp: string;
  expiresInMinutes: number;
}

export interface SmsProvider {
  send(request: SmsDeliveryRequest): Promise<string>;
}

type Msg91Response = {
  type?: unknown;
  message?: unknown;
  request_id?: unknown;
};

export class Msg91SmsProvider implements SmsProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly settings: IntegrationSettingsService,
  ) {}

  async send(request: SmsDeliveryRequest): Promise<string> {
    const [authKey, templateId] = await Promise.all([
      this.settings.get("MSG91_AUTH_KEY"),
      this.settings.get("MSG91_OTP_TEMPLATE_ID"),
    ]);
    if (!authKey || !templateId) {
      throw new ServiceUnavailableException("MSG91 is not configured");
    }

    const url = new URL(
      this.config.get<string>(
        "MSG91_API_URL",
        "https://control.msg91.com/api/v5/otp",
      ),
    );
    url.searchParams.set("template_id", templateId);
    url.searchParams.set("mobile", this.normalizeMobile(request.recipient));
    url.searchParams.set("otp", request.otp);
    url.searchParams.set("otp_length", String(request.otp.length));
    url.searchParams.set(
      "otp_expiry",
      String(Math.max(1, Math.ceil(request.expiresInMinutes))),
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        authkey: authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json().catch(() => undefined)) as
      | Msg91Response
      | undefined;
    if (!response.ok || result?.type !== "success") {
      throw new ServiceUnavailableException(
        "MSG91 rejected the OTP delivery request",
      );
    }
    const reference = result.request_id ?? result.message;
    if (typeof reference !== "string" || !reference.trim()) {
      throw new ServiceUnavailableException("MSG91 returned an invalid response");
    }
    return reference;
  }

  private normalizeMobile(value: string): string {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    const countryCode = this.config
      .get<string>("MSG91_DEFAULT_COUNTRY_CODE", "91")
      .replace(/\D/g, "");
    if (digits.length === 10) digits = `${countryCode}${digits}`;
    if (!/^\d{11,15}$/.test(digits)) {
      throw new ServiceUnavailableException(
        "The mobile number is not valid for SMS delivery",
      );
    }
    return digits;
  }
}

@Injectable()
export class SmsProviderRouter implements SmsProvider {
  private readonly provider: string;
  private readonly msg91: Msg91SmsProvider;

  constructor(
    config: ConfigService,
    settings: IntegrationSettingsService,
  ) {
    this.provider = config
      .get<string>("SMS_PROVIDER", "UNCONFIGURED")
      .toUpperCase();
    this.msg91 = new Msg91SmsProvider(config, settings);
  }

  async send(request: SmsDeliveryRequest): Promise<string> {
    if (this.provider === "MSG91") return this.msg91.send(request);
    const detail = this.provider === "UNCONFIGURED"
      ? "An SMS provider has not been configured"
      : `SMS provider ${this.provider} is not supported by this deployment`;
    throw new ServiceUnavailableException(detail);
  }
}
