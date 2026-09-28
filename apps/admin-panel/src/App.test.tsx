import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { AuthProvider } from "./auth";
describe("admin security", () => {
  beforeEach(() => localStorage.clear());
  it("redirects protected routes to administrator login", async () => {
    render(
      <MemoryRouter initialEntries={["/vendors"]}>
        <AuthProvider>
          <QueryClientProvider client={new QueryClient()}>
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Administrator sign in" }),
    ).toBeInTheDocument();
  });
  it("rejects a non-admin session stored in the browser", async () => {
    localStorage.setItem(
      "vishwaneed.admin.session",
      JSON.stringify({
        accessToken: "vendor-access",
        refreshToken: "vendor-refresh",
        user: { id: "vendor", role: "VENDOR" },
      }),
    );
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <QueryClientProvider client={new QueryClient()}>
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Administrator sign in" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("vishwaneed.admin.session")).toBeNull();
  });
});

const routeCases = [
  ["/", "Marketplace overview"],
  ["/vendors", "Vendors, KYC & inspections"],
  ["/products", "Product moderation"],
  ["/categories", "Categories"],
  ["/homepage", "Homepage hero"],
  ["/orders", "Master orders"],
  ["/payments", "Payments"],
  ["/shipments", "Shipments"],
  ["/commission", "Commission configuration"],
  ["/ledger", "Vendor ledger"],
  ["/settlements", "Individual-order settlements"],
  ["/refunds", "Refunds"],
  ["/returns", "Return requests"],
  ["/replacements", "Replacements"],
  ["/reviews", "Review moderation"],
  ["/complaints", "Complaints"],
  ["/notifications", "Notification events"],
  ["/reports", "Reports"],
  ["/audit", "Audit logs"],
  ["/settings", "System configuration"],
] as const;

describe("admin routes", () => {
  beforeEach(() => {
    localStorage.setItem(
      "vishwaneed.admin.session",
      JSON.stringify({
        accessToken: "admin-access",
        refreshToken: "admin-refresh",
        user: { id: "admin", email: "admin@example.com", role: "ADMIN" },
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        let data: unknown = [];
        let meta: Record<string, number> = {};
        if (url.includes("/admin/dashboard"))
          data = {
            customers: 0,
            vendors: 0,
            pendingVendors: 0,
            products: 0,
            pendingProducts: 0,
            orders: 0,
          };
        else if (url.includes("/admin/reports"))
          data = {
            sales: { _sum: { payableTotal: null }, _count: 0 },
            commission: { _sum: { amount: null }, _count: 0 },
            refunds: { _sum: { amount: null }, _count: 0 },
            settlements: { _sum: { amount: null }, _count: 0 },
          };
        else if (
          /\/admin\/(vendors|products|orders|payments|shipments|ledger|replacements|notifications|audit-logs)/.test(
            url,
          )
        ) {
          data = [];
          meta = { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data,
              meta,
              message: "Operation successful",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }),
    );
  });

  it.each(routeCases)("opens %s", async (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: heading }),
    ).toBeInTheDocument();
  });

  it("opens and closes the responsive navigation", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <QueryClientProvider
            client={new QueryClient({
              defaultOptions: { queries: { retry: false } },
            })}
          >
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Marketplace overview" });

    fireEvent.click(
      screen.getByRole("button", { name: "Open navigation menu" }),
    );
    expect(container.querySelector("aside")).toHaveClass("open");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(
      screen.getByRole("button", { name: "Close navigation overlay" }),
    );
    expect(container.querySelector("aside")).not.toHaveClass("open");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("physical inspection workflow", () => {
  beforeEach(() => {
    localStorage.setItem(
      "vishwaneed.admin.session",
      JSON.stringify({
        accessToken: "admin-access",
        refreshToken: "admin-refresh",
        user: { id: "admin", email: "admin@example.com", role: "ADMIN" },
      }),
    );
  });

  it("conducts a scheduled inspection and enables vendor approval after passing", async () => {
    let inspectionStatus = "SCHEDULED";
    let vendorStatus = "INSPECTION";
    const documents = [
      "PAN",
      "AADHAAR",
      "GST_CERTIFICATE",
      "FSSAI_LICENSE",
      "CANCELLED_CHEQUE",
      "BUSINESS_REGISTRATION_PROOF",
    ].map((type) => ({
      id: type,
      type,
      status: "VERIFIED",
      originalName: `${type}.pdf`,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.includes("/admin/inspections/inspection-1")) {
          if (typeof init?.body !== "string") throw new Error("Missing request body");
          const body = JSON.parse(init.body) as { status: string };
          inspectionStatus = body.status;
          if (body.status === "PASSED") vendorStatus = "PENDING";
          return jsonResponse({ id: "inspection-1", status: body.status });
        }
        if (url.includes("/admin/vendors/vendor-1")) {
          return jsonResponse({
            id: "vendor-1",
            businessName: "Test grocery",
            ownerName: "Owner",
            status: vendorStatus,
            createdAt: "2026-09-20T10:00:00.000Z",
            user: { email: "vendor@example.com" },
            documents,
            bankAccounts: [
              {
                id: "bank-1",
                accountHolderName: "Owner",
                bankName: "Bank",
                accountNumberLast4: "1234",
                ifsc: "BANK0001234",
                status: "VERIFIED",
              },
            ],
            inspections: [
              {
                id: "inspection-1",
                status: inspectionStatus,
                scheduledAt: "2026-09-21T10:00:00.000Z",
                location: "Vendor premises",
                documentsVerified: inspectionStatus === "PASSED",
                premisesVerified: inspectionStatus === "PASSED",
                qualityVerified: inspectionStatus === "PASSED",
              },
            ],
            statusHistory: [],
          });
        }
        return jsonResponse(
          [
            {
              id: "vendor-1",
              businessName: "Test grocery",
              ownerName: "Owner",
              status: vendorStatus,
              createdAt: "2026-09-20T10:00:00.000Z",
              user: { email: "vendor@example.com" },
              _count: { products: 0, vendorOrders: 0 },
            },
          ],
          { page: 1, limit: 20, total: 1, totalPages: 1 },
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={["/vendors"]}>
        <AuthProvider>
          <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(
      await screen.findByRole("button", { name: "Reschedule" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve vendor" })).toBeDisabled();
    expect(screen.getByText("Approval is locked")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Complete the physical inspection and mark every required check as verified.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Conduct inspection" }),
    );
    expect(await screen.findByText("Inspection result")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Documents physically verified"));
    fireEvent.click(screen.getByLabelText("Business/location verified"));
    fireEvent.click(screen.getByLabelText("Business activity verified"));
    fireEvent.click(screen.getByLabelText("Quality/compliance checked"));
    fireEvent.click(
      screen.getByRole("button", { name: "Complete inspection" }),
    );

    await waitFor(() =>
      expect(screen.getAllByText("READY")).toHaveLength(3),
    );
    expect(screen.getByRole("button", { name: "Approve vendor" })).toBeEnabled();
  });
});

function jsonResponse(data: unknown, meta: Record<string, number> = {}) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        success: true,
        data,
        meta,
        message: "Operation successful",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}
