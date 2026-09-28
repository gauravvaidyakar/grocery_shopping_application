import { UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerOtpProvider } from "../src/auth/customer-otp-provider";
import type { IntegrationSettingsService } from "../src/integration-settings/integration-settings.service";

function settings(values: Record<string, string>): IntegrationSettingsService {
  return {
    get: vi.fn((key: string) => Promise.resolve(values[key])),
  } as unknown as IntegrationSettingsService;
}

describe("MSG91 customer OTP widget provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns browser configuration without exposing the server auth key", async () => {
    const provider = new CustomerOtpProvider(settings({
      MSG91_WIDGET_ID: "widget-id",
      MSG91_WIDGET_TOKEN: "browser-token",
      MSG91_AUTH_KEY: "server-secret",
    }));

    await expect(provider.getClientConfiguration("9876543210")).resolves.toEqual({
      provider: "MSG91_WIDGET",
      widgetId: "widget-id",
      tokenAuth: "browser-token",
      identifier: "919876543210",
    });
  });

  it("verifies the one-time access token server-side and binds it to the account mobile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: "success",
      data: { identifier: "919876543210" },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new CustomerOtpProvider(settings({ MSG91_AUTH_KEY: "server-secret" }));

    await expect(provider.verifyAccessToken("verified-jwt", "9876543210")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://control.msg91.com/api/v5/widget/verifyAccessToken",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ authkey: "server-secret", "access-token": "verified-jwt" }),
      }),
    );
  });

  it("rejects a valid token issued for a different identifier", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: "success",
      data: { identifier: "919999999999" },
    }), { status: 200 })));
    const provider = new CustomerOtpProvider(settings({ MSG91_AUTH_KEY: "server-secret" }));

    await expect(provider.verifyAccessToken("verified-jwt", "9876543210"))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
