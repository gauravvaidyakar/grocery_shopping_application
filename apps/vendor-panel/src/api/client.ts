export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: Record<string, unknown>;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email?: string; mobile?: string; role: string; mobileVerified?: boolean };
}
const KEY = "vishwaneed.vendor.session";
export const sessionStore = {
  get: (): Session | null => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
      return parsed as Session | null;
    } catch {
      return null;
    }
  },
  set: (value: Session) => localStorage.setItem(KEY, JSON.stringify(value)),
  clear: () => localStorage.removeItem(KEY),
};
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
const configuredBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;
const baseUrl =
  typeof configuredBaseUrl === "string" && configuredBaseUrl
    ? configuredBaseUrl
    : "/api/v1";
let refreshRequest: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const session = sessionStore.get();
  if (!session) return false;
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!response.ok) {
    sessionStore.clear();
    return false;
  }
  const payload = (await response.json()) as ApiEnvelope<Session>;
  sessionStore.set(payload.data);
  return true;
}
async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const session = sessionStore.get();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    );
  }
  if (response.status === 401 && retry && session) {
    refreshRequest ??= refresh().finally(() => {
      refreshRequest = null;
    });
    if (await refreshRequest) return request<T>(path, init, false);
    window.dispatchEvent(new Event("vendor:auth-expired"));
  }
  const payload =
    response.status === 204
      ? { success: true, data: undefined as T, message: "Success" }
      : ((await response.json().catch(() => null)) as ApiEnvelope<T> | null);
  if (!response.ok || !payload?.success)
    throw new ApiError(
      payload?.message ?? "Request failed",
      response.status,
      payload,
    );
  return payload.data;
}
async function download(path: string, name: string) {
  const token = sessionStore.get()?.accessToken;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok)
    throw new ApiError("Document download failed", response.status);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, b?: unknown) =>
    request<T>(p, {
      method: "POST",
      body: b === undefined ? undefined : JSON.stringify(b),
    }),
  patch: <T>(p: string, b: unknown) =>
    request<T>(p, { method: "PATCH", body: JSON.stringify(b) }),
  delete: <T>(p: string) => request<T>(p, { method: "DELETE" }),
  form: <T>(p: string, b: FormData) =>
    request<T>(p, { method: "POST", body: b }),
  download,
};

export interface VendorProfile {
  id: string;
  businessName: string;
  legalName?: string;
  ownerName: string;
  businessEmail?: string;
  businessMobile?: string;
  gstin?: string;
  panNumber?: string;
  fssaiNumber?: string;
  pickupPincode?: string;
  businessAddress: Record<string, string>;
  status: string;
  suspensionDetails?: string;
  documents: Array<{
    id: string;
    type: string;
    originalName: string;
    status: string;
    expiresAt?: string;
    rejectionReason?: string;
  }>;
  bankAccounts: Array<{
    id: string;
    accountHolderName: string;
    accountNumberLast4: string;
    ifsc: string;
    bankName: string;
    branchName?: string;
    status: string;
  }>;
  inspections: Array<{
    id: string;
    status: string;
    scheduledAt: string;
    inspectedAt?: string;
    location: string;
    remarks?: string;
    documentsVerified: boolean;
    premisesVerified: boolean;
    qualityVerified: boolean;
  }>;
}
export interface Product {
  id: string;
  name: string;
  description: string;
  productType: string;
  price: string | number;
  mrp?: string | number;
  gstRate: string | number;
  weightGrams: number;
  status: string;
  rejectionReason?: string;
  category: { id: string; name: string };
  images: Array<{ url: string }>;
  inventory?: Inventory;
}
export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  updatedAt: string;
  product: { id: string; name: string; status: string };
}
export interface VendorOrder {
  id: string;
  vendorOrderNumber: string;
  status: string;
  productSubtotal: string | number;
  shippingAmount: string | number;
  orderTotal: string | number;
  createdAt: string;
  deliveredAt?: string;
  settlementEligibleAt?: string;
  settlementStatus: string;
  settlementAmount?: string | number;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string | number;
    lineTotal: string | number;
    status: string;
    cancellable: boolean;
    cancellationReason?: string;
  }>;
  shipment?: {
    id: string;
    status: string;
    awb?: string;
    trackingUrl?: string;
    providerShipmentId?: string;
  };
  masterOrder: {
    orderNumber: string;
    deliveryAddressSnapshot: Record<string, string>;
    paymentMethod: string;
    payments?: Array<{ status: string }>;
  };
}
export const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value ?? 0),
  );
