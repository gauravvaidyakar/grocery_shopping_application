import { sessionStorage } from '../auth/sessionStorage';
import { ApiError } from './errors';
import type { ApiEnvelope, AuthSession } from './types';

let refreshRequest: Promise<boolean> | null = null;

export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async getEnvelope<T>(path: string): Promise<ApiEnvelope<T>> {
    return this.requestEnvelope<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  }

  postForm<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  patchForm<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const payload = await this.requestEnvelope<T>(path, init);
    return payload.data;
  }

  private async refreshSession(): Promise<boolean> {
    const session = sessionStorage.get();
    if (!session?.refreshToken) return false;
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<AuthSession> | null;
      if (!response.ok || !payload?.success) return false;
      sessionStorage.set(payload.data);
      return true;
    } catch {
      return false;
    }
  }

  private async requestEnvelope<T>(path: string, init: RequestInit, allowRefresh = true): Promise<ApiEnvelope<T>> {
    const token = sessionStorage.get()?.accessToken;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
    } catch (error) {
      throw new ApiError(error instanceof Error ? `Network request failed: ${error.message}` : 'Network request failed.', 0, 'NETWORK_ERROR');
    }

    if (response.status === 401 && allowRefresh && token && path !== '/auth/refresh') {
      refreshRequest ??= this.refreshSession().finally(() => {
        refreshRequest = null;
      });
      if (await refreshRequest) return this.requestEnvelope<T>(path, init, false);
    }

    const payload = response.status === 204
      ? { success: true, data: undefined as T, message: 'Success' }
      : (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!response.ok || !payload?.success) {
      const errorPayload = payload as (ApiEnvelope<null> & { error?: { code?: string; details?: unknown } }) | null;
      if (response.status === 401) sessionStorage.expire();
      throw new ApiError(
        payload?.message ?? 'The request could not be completed.',
        response.status,
        errorPayload?.error?.code ?? 'API_ERROR',
        errorPayload?.error?.details,
      );
    }
    return payload;
  }
}
