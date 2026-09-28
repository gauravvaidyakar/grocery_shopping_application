export interface Envelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: PageMeta | Record<string, unknown>;
}
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email?: string; mobile?: string; role: string };
}
const key = "vishwaneed.admin.session";
const rawBase: unknown = import.meta.env.VITE_API_BASE_URL;
const base = typeof rawBase === "string" && rawBase ? rawBase : "/api/v1";
function isAdminSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<Session>;
  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === "string" &&
    session.refreshToken.length > 0 &&
    Boolean(session.user) &&
    session.user?.role === "ADMIN" &&
    typeof session.user.id === "string"
  );
}
export const sessions = {
  get: (): Session | null => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (isAdminSession(value)) return value;
      localStorage.removeItem(key);
      return null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  },
  set: (value: Session) => {
    if (!isAdminSession(value)) throw new Error("Invalid administrator session");
    localStorage.setItem(key, JSON.stringify(value));
  },
  clear: () => localStorage.removeItem(key),
};
let refreshing: Promise<boolean> | null = null;
function isPageMeta(value: unknown): value is PageMeta {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<PageMeta>;
  return (
    typeof meta.page === "number" &&
    typeof meta.limit === "number" &&
    typeof meta.total === "number" &&
    typeof meta.totalPages === "number"
  );
}
async function refresh() {
  const session = sessions.get();
  if (!session) return false;
  try {
    const response = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      sessions.clear();
      return false;
    }
    const payload = (await response.json()) as Envelope<Session>;
    sessions.set(payload.data);
    return true;
  } catch {
    sessions.clear();
    return false;
  }
}
async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = sessions.get()?.accessToken;
  const isForm = init.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error("Network request failed. Check that the API is running.");
  }
  if (response.status === 401 && retry && token) {
    refreshing ??= refresh().finally(() => (refreshing = null));
    if (await refreshing) return request<T>(path, init, false);
  }
  if (response.status === 401 && token) {
    sessions.clear();
    window.dispatchEvent(new Event("admin:expired"));
    throw new Error("Your administrator session expired. Please sign in again.");
  }
  const payload = (await response
    .json()
    .catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  if (Array.isArray(payload.data) && isPageMeta(payload.meta))
    return { data: payload.data, meta: payload.meta } as T;
  return payload.data;
}
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  download: async (path: string, filename: string) => {
    const token = sessions.get()?.accessToken;
    const response = await fetch(`${base}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 401) {
      sessions.clear();
      window.dispatchEvent(new Event("admin:expired"));
      throw new Error("Your administrator session expired. Please sign in again.");
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | Envelope<unknown>
        | null;
      throw new Error(payload?.message ?? `Download failed (${response.status})`);
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
};
export const money = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};
export const assetUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/assets/")) return value;
  if (/^https?:\/\//i.test(base)) return new URL(value, base).toString();
  return value;
};
