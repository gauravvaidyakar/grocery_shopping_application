import type { CustomerOtpChallenge, Msg91OtpConfiguration } from '../api/types';

type WidgetCallback = (data: unknown) => void;

declare global {
  interface Window {
    initSendOTP?: (configuration: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success?: WidgetCallback, failure?: WidgetCallback) => void;
    retryOtp?: (channel: null, success?: WidgetCallback, failure?: WidgetCallback, requestId?: string) => void;
    verifyOtp?: (otp: string, success?: WidgetCallback, failure?: WidgetCallback, requestId?: string) => void;
  }
}

const SDK_PRIMARY = 'https://verify.msg91.com/otp-provider.js';
const SDK_FALLBACK = 'https://verify.phone91.com/otp-provider.js';
const sendPromises = new Map<string, Promise<string | undefined>>();
let configuredKey = '';

function errorMessage(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'description']) {
      if (typeof record[key] === 'string' && record[key]) return record[key];
    }
  }
  return 'MSG91 could not complete OTP verification. Please try again.';
}

function findValue(value: unknown, keys: string[]): string | undefined {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key]) return record[key];
  }
  for (const key of ['data', 'result', 'response']) {
    const nested = findValue(record[key], keys);
    if (nested) return nested;
  }
  return undefined;
}

function loadScript(source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);
    if (existing) {
      if (window.initSendOTP) resolve();
      else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load MSG91 OTP service.')), { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load MSG91 OTP service.')), { once: true });
    document.head.appendChild(script);
  });
}

async function initialize(config: Msg91OtpConfiguration): Promise<void> {
  if (!window.initSendOTP) {
    try {
      await loadScript(SDK_PRIMARY);
    } catch {
      await loadScript(SDK_FALLBACK);
    }
  }
  if (!window.initSendOTP) throw new Error('MSG91 OTP service did not initialize.');
  const key = `${config.widgetId}:${config.tokenAuth}:${config.identifier}`;
  if (configuredKey === key && window.sendOtp) return;
  window.initSendOTP({
    widgetId: config.widgetId,
    tokenAuth: config.tokenAuth,
    identifier: config.identifier,
    exposeMethods: true,
    success: () => undefined,
    failure: () => undefined,
  });
  configuredKey = key;
  await new Promise((resolve) => window.setTimeout(resolve, 100));
}

export function startMsg91Otp(challenge: CustomerOtpChallenge): Promise<string | undefined> {
  const existing = sendPromises.get(challenge.challengeToken);
  if (existing) return existing;
  const operation = initialize(challenge.otp).then(() => new Promise<string | undefined>((resolve, reject) => {
    if (!window.sendOtp) return reject(new Error('MSG91 send OTP method is unavailable.'));
    window.sendOtp(
      challenge.otp.identifier,
      (data) => resolve(findValue(data, ['reqId', 'requestId', 'request_id'])),
      (error) => reject(new Error(errorMessage(error))),
    );
  }));
  sendPromises.set(challenge.challengeToken, operation);
  operation.catch(() => sendPromises.delete(challenge.challengeToken));
  return operation;
}

export async function resendMsg91Otp(challenge: CustomerOtpChallenge, requestId?: string): Promise<string | undefined> {
  await initialize(challenge.otp);
  return new Promise((resolve, reject) => {
    if (!window.retryOtp) return reject(new Error('MSG91 resend OTP method is unavailable.'));
    window.retryOtp(
      null,
      (data) => resolve(findValue(data, ['reqId', 'requestId', 'request_id']) ?? requestId),
      (error) => reject(new Error(errorMessage(error))),
      requestId,
    );
  });
}

export async function verifyMsg91Otp(challenge: CustomerOtpChallenge, code: string, requestId?: string): Promise<string> {
  await initialize(challenge.otp);
  return new Promise((resolve, reject) => {
    if (!window.verifyOtp) return reject(new Error('MSG91 verify OTP method is unavailable.'));
    window.verifyOtp(
      code,
      (data) => {
        const token = findValue(data, ['access-token', 'accessToken', 'token', 'jwt']);
        if (!token) reject(new Error('MSG91 did not return a verification token.'));
        else resolve(token);
      },
      (error) => reject(new Error(errorMessage(error))),
      requestId,
    );
  });
}
