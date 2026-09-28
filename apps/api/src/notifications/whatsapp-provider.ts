import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationSettingsService } from "../integration-settings/integration-settings.service";

export interface WhatsAppProvider {
  send(
    templateKey: string,
    recipient: string,
    payload: Record<string, unknown>,
  ): Promise<string>;
}

export class DevelopmentWhatsAppProvider implements WhatsAppProvider {
  send(templateKey: string, recipient: string): Promise<string> {
    return Promise.resolve(
      `DEV-WHATSAPP-${templateKey}-${recipient.slice(-4)}-${Date.now()}`,
    );
  }
}

export class InteraktWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly settings: IntegrationSettingsService,
  ) {}

  async send(
    templateKey: string,
    recipient: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const apiKey = await this.settings.get("INTERAKT_API_KEY");
    const url = this.config.get<string>("INTERAKT_API_URL");
    if (!apiKey || !url) {
      throw new ServiceUnavailableException("Interakt is not configured");
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: recipient.replace(/^\+?91/, ""),
        type: "Template",
        template: {
          name: templateKey,
          languageCode: "en",
          bodyValues: Object.values(payload).map(String),
        },
      }),
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok || !body || typeof body !== "object") {
      throw new ServiceUnavailableException("Interakt delivery failed");
    }
    const result = body as Record<string, unknown>;
    const reference = result.id ?? result.result;
    if (typeof reference !== "string") {
      throw new ServiceUnavailableException("Invalid Interakt response");
    }
    return reference;
  }
}

@Injectable()
export class WhatsAppProviderRouter implements WhatsAppProvider {
  private readonly development = new DevelopmentWhatsAppProvider();
  private readonly interakt: WhatsAppProvider;
  private readonly logger = new Logger(WhatsAppProviderRouter.name);
  private readonly production: boolean;
  private readonly configuredProvider: string;

  constructor(
    config: ConfigService,
    private readonly settings: IntegrationSettingsService,
  ) {
    this.interakt = new InteraktWhatsAppProvider(config, settings);
    this.production =
      config.get<string>("NODE_ENV", "development") === "production";
    this.configuredProvider = config
      .get<string>(
        "WHATSAPP_PROVIDER",
        this.production ? "INTERAKT" : "DEVELOPMENT",
      )
      .toUpperCase();
    if (!this.production && this.configuredProvider === "DEVELOPMENT") {
      this.logger.warn("WhatsApp is using the development simulator");
    }
  }

  async send(
    templateKey: string,
    recipient: string,
    payload: Record<string, unknown>,
  ) {
    if (this.production && this.configuredProvider === "DEVELOPMENT") {
      throw new ServiceUnavailableException(
        "The WhatsApp simulator is disabled in production",
      );
    }
    const useInterakt =
      this.configuredProvider === "INTERAKT" ||
      (await this.settings.has("INTERAKT_API_KEY"));
    const provider = useInterakt ? this.interakt : this.development;
    return provider.send(templateKey, recipient, payload);
  }
}
