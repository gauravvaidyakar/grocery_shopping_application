import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { IntegrationSettingsService } from "../integration-settings/integration-settings.service";

export interface ProviderPaymentOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface ProviderPayment {
  id: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: string;
}

export interface ProviderRefund {
  id: string;
  amount: number;
  status: string;
}

export interface PaymentProvider {
  createOrder(input: {
    amountMinor: number;
    currency: string;
    receipt: string;
  }): Promise<ProviderPaymentOrder>;
  fetchPayment(providerPaymentId: string): Promise<ProviderPayment>;
  createRefund(input: {
    providerPaymentId: string;
    amountMinor: number;
    idempotencyKey: string;
  }): Promise<ProviderRefund>;
}

export function verifyRazorpaySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  constructor(private readonly settings: IntegrationSettingsService) {}

  async createOrder(input: {
    amountMinor: number;
    currency: string;
    receipt: string;
  }): Promise<ProviderPaymentOrder> {
    const payload = await this.request("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency,
        receipt: input.receipt,
      }),
    });
    return {
      id: this.requiredString(payload, "id"),
      amount: this.requiredNumber(payload, "amount"),
      currency: this.requiredString(payload, "currency"),
    };
  }

  async fetchPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const payload = await this.request(
      `/payments/${encodeURIComponent(providerPaymentId)}`,
      { method: "GET" },
    );
    return {
      id: this.requiredString(payload, "id"),
      orderId:
        typeof payload.order_id === "string" ? payload.order_id : undefined,
      amount: this.requiredNumber(payload, "amount"),
      currency: this.requiredString(payload, "currency"),
      status: this.requiredString(payload, "status"),
    };
  }

  async createRefund(input: {
    providerPaymentId: string;
    amountMinor: number;
    idempotencyKey: string;
  }): Promise<ProviderRefund> {
    const payload = await this.request(
      `/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
      {
        method: "POST",
        headers: { "X-Razorpay-Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({ amount: input.amountMinor }),
      },
    );
    return {
      id: this.requiredString(payload, "id"),
      amount: this.requiredNumber(payload, "amount"),
      status: this.requiredString(payload, "status"),
    };
  }

  private async request(
    path: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    const [key, secret] = await Promise.all([
      this.settings.get("RAZORPAY_KEY_ID"),
      this.settings.get("RAZORPAY_KEY_SECRET"),
    ]);
    if (!key || !secret) {
      throw new ServiceUnavailableException(
        "Razorpay credentials are not configured",
      );
    }
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok || !body || typeof body !== "object") {
      throw new ServiceUnavailableException("Razorpay request failed");
    }
    return body as Record<string, unknown>;
  }

  private requiredString(
    payload: Record<string, unknown>,
    key: string,
  ): string {
    if (typeof payload[key] !== "string") {
      throw new ServiceUnavailableException("Invalid Razorpay response");
    }
    return payload[key];
  }

  private requiredNumber(
    payload: Record<string, unknown>,
    key: string,
  ): number {
    if (typeof payload[key] !== "number") {
      throw new ServiceUnavailableException("Invalid Razorpay response");
    }
    return payload[key];
  }
}
