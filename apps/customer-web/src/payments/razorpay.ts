import { ApiError } from '../api/errors';
import type { PaymentSession } from '../api/types';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string; reason?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', listener: (response: RazorpayFailureResponse) => void): void;
}

interface RazorpayConstructor {
  new(options: Record<string, unknown>): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export type RazorpayOutcome =
  | { kind: 'SUCCESS'; providerOrderId: string; providerPaymentId: string; providerSignature: string }
  | { kind: 'FAILED'; message: string }
  | { kind: 'CANCELLED' };

async function loadRazorpay(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return window.Razorpay;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
  await new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    const onLoad = () => resolve();
    const onError = () => reject(new ApiError('The secure payment window could not be loaded. Check your connection and try again.', 0, 'PAYMENT_SDK_LOAD_FAILED'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = RAZORPAY_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  if (!window.Razorpay) throw new ApiError('Razorpay checkout is unavailable.', 0, 'PAYMENT_SDK_UNAVAILABLE');
  return window.Razorpay;
}

export async function openRazorpayCheckout(session: PaymentSession): Promise<RazorpayOutcome> {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: RazorpayOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    const checkout = new Razorpay({
      key: session.publicKey,
      amount: session.amountMinor,
      currency: session.currency,
      order_id: session.providerOrderId,
      name: 'Vishwaneed',
      description: session.description,
      prefill: { name: session.customer.name, email: session.customer.email, contact: session.customer.mobile },
      theme: { color: '#174b2c' },
      retry: { enabled: true },
      modal: { ondismiss: () => finish({ kind: 'CANCELLED' }) },
      handler: (response: RazorpaySuccessResponse) => finish({ kind: 'SUCCESS', providerOrderId: response.razorpay_order_id, providerPaymentId: response.razorpay_payment_id, providerSignature: response.razorpay_signature }),
    });
    checkout.on('payment.failed', (response) => finish({ kind: 'FAILED', message: response.error?.description ?? response.error?.reason ?? 'The payment was not completed.' }));
    checkout.open();
  });
}
