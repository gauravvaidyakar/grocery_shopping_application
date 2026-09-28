import type { ConfigService } from "@nestjs/config";
import { NotificationStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../src/database/prisma.service";
import type { IntegrationSettingsService } from "../src/integration-settings/integration-settings.service";
import { NotificationsService } from "../src/notifications/notifications.service";
import {
  Msg91SmsProvider,
  SmsProviderRouter,
} from "../src/notifications/sms-provider";
import type { WhatsAppProviderRouter } from "../src/notifications/whatsapp-provider";

function config(): ConfigService {
  return {
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
  } as unknown as ConfigService;
}

function sms(send = vi.fn()): SmsProviderRouter {
  return { send } as unknown as SmsProviderRouter;
}

function settings(values: Record<string, string> = {}): IntegrationSettingsService {
  return {
    get: vi.fn((key: string) => Promise.resolve(values[key])),
  } as unknown as IntegrationSettingsService;
}

describe("Notification delivery", () => {
  it("fails closed when no real SMS provider is configured", async () => {
    const provider = new SmsProviderRouter(config(), settings());
    await expect(provider.send({
      recipient: "9876543210",
      otp: "482913",
      expiresInMinutes: 5,
    })).rejects.toThrow(
      "SMS provider has not been configured",
    );
  });

  it("sends a server-generated OTP through MSG91 without putting the auth key in the URL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ type: "success", request_id: "msg91-request" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new Msg91SmsProvider(
      {
        get: vi.fn((key: string, fallback?: string) =>
          key === "MSG91_DEFAULT_COUNTRY_CODE" ? "91" : fallback,
        ),
      } as unknown as ConfigService,
      settings({
        MSG91_AUTH_KEY: "private-auth-key",
        MSG91_OTP_TEMPLATE_ID: "template-id",
      }),
    );

    await expect(provider.send({
      recipient: "+91 98765 43210",
      otp: "482913",
      expiresInMinutes: 10,
    })).resolves.toBe("msg91-request");

    const [requestUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl.searchParams.get("mobile")).toBe("919876543210");
    expect(requestUrl.searchParams.get("otp")).toBe("482913");
    expect(requestUrl.searchParams.has("authkey")).toBe(false);
    expect((init.headers as Record<string, string>).authkey).toBe("private-auth-key");
    fetchMock.mockRestore();
  });

  it("notifies the customer and every relevant vendor when an order is placed", async () => {
    const prisma = {
      masterOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: "master-order",
          orderNumber: "VWN-1",
          payableTotal: { toString: () => "580" },
          paymentMethod: "COD",
          customer: { userId: "customer-user" },
          vendorOrders: [
            {
              id: "vendor-order-a",
              vendorOrderNumber: "VWN-1-A",
              orderTotal: { toString: () => "580" },
              vendor: { userId: "vendor-user", businessName: "Vendor" },
              _count: { items: 1 },
            },
          ],
        }),
      },
    } as unknown as PrismaService;
    const service = new NotificationsService(
      prisma,
      { send: vi.fn() } as unknown as WhatsAppProviderRouter,
      config(),
      sms(),
    );
    const send = vi.spyOn(service, "sendWhatsApp").mockResolvedValue(null);

    await service.notifyOrderPlaced("master-order");

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      "customer-user",
      "order_confirmation",
      expect.objectContaining({ orderNumber: "VWN-1" }) as object,
      "order:master-order:customer:placed",
    );
    expect(send).toHaveBeenCalledWith(
      "vendor-user",
      "vendor_new_order",
      expect.objectContaining({ vendorOrderNumber: "VWN-1-A" }) as object,
      "vendor-order:vendor-order-a:vendor:placed",
    );
  });

  it("uses the vendor business mobile when the login account has no mobile", async () => {
    const send = vi.fn().mockResolvedValue("provider-reference");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "vendor-user",
          mobile: null,
          vendor: { businessMobile: "9876543210" },
        }),
      },
      notification: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "notification" }),
        update: vi.fn().mockResolvedValue({
          id: "notification",
          status: NotificationStatus.SENT,
        }),
        updateMany: vi.fn(),
      },
    } as unknown as PrismaService;
    const service = new NotificationsService(
      prisma,
      { send } as unknown as WhatsAppProviderRouter,
      config(),
      sms(),
    );

    await service.sendWhatsApp(
      "vendor-user",
      "vendor_new_order",
      { orderNumber: "VWN-1" },
      "order:1:vendor",
    );

    expect(send).toHaveBeenCalledWith(
      "vendor_new_order",
      "9876543210",
      { orderNumber: "VWN-1" },
    );
  });

  it("does not send the same lifecycle event twice", async () => {
    const send = vi.fn();
    const existing = { id: "existing", status: NotificationStatus.SENT };
    const prisma = {
      notification: { findUnique: vi.fn().mockResolvedValue(existing) },
    } as unknown as PrismaService;
    const service = new NotificationsService(
      prisma,
      { send } as unknown as WhatsAppProviderRouter,
      config(),
      sms(),
    );

    await expect(
      service.sendWhatsApp("user", "order_confirmation", {}, "order:1"),
    ).resolves.toBe(existing);
    expect(send).not.toHaveBeenCalled();
  });

  it("records a failed notification when no recipient mobile is configured", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "notification",
      status: NotificationStatus.FAILED,
    });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "vendor-user",
          mobile: null,
          vendor: { businessMobile: null },
        }),
      },
      notification: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;
    const service = new NotificationsService(
      prisma,
      { send: vi.fn() } as unknown as WhatsAppProviderRouter,
      config(),
      sms(),
    );

    await service.sendWhatsApp(
      "vendor-user",
      "vendor_new_order",
      {},
      "order:1:vendor",
    );

    expect(create).toHaveBeenCalledOnce();
    const [createInput] = create.mock.calls[0] as unknown as [
      { data: { status: NotificationStatus; failureReason: string } },
    ];
    expect(createInput.data.status).toBe(NotificationStatus.FAILED);
    expect(createInput.data.failureReason).toBe(
      "No mobile number is configured for this account",
    );
  });

  it("sends authentication content through SMS without storing the OTP", async () => {
    const sendSms = vi.fn().mockResolvedValue("sms-reference");
    const create = vi.fn().mockResolvedValue({ id: "sms-notification" });
    const update = vi.fn().mockResolvedValue({
      id: "sms-notification",
      status: NotificationStatus.SENT,
    });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ mobile: "9876543210" }),
      },
      notification: { create, update, updateMany: vi.fn() },
    } as unknown as PrismaService;
    const whatsappSend = vi.fn();
    const service = new NotificationsService(
      prisma,
      { send: whatsappSend } as unknown as WhatsAppProviderRouter,
      config(),
      sms(sendSms),
    );

    await service.sendSms(
      "customer-user",
      "customer_registration_otp",
      { expiresInMinutes: 5 },
      { otp: "482913", expiresInMinutes: 5 },
    );

    expect(sendSms).toHaveBeenCalledWith({
      recipient: "9876543210",
      otp: "482913",
      expiresInMinutes: 5,
    });
    expect(whatsappSend).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        channel: "SMS",
        payload: { expiresInMinutes: 5 },
      }) as object,
    }));
    expect(JSON.stringify(create.mock.calls)).not.toContain("482913");
  });
});
