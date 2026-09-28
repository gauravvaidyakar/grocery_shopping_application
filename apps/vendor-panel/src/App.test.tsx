import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { Layout } from "./components/Layout";
describe("vendor route protection", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });
  it("redirects unauthenticated vendors to sign in", async () => {
    render(
      <MemoryRouter initialEntries={["/orders"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
  });
  it("offers vendor registration", async () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", {
        name: "Start selling with Vishwaneed",
      }),
    ).toBeInTheDocument();
  });

  it("offers a vendor forgot-password flow", async () => {
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Reset vendor password" }),
    ).toBeInTheDocument();
  });

  it("changes the authenticated vendor password and requires sign-in again", async () => {
    localStorage.setItem(
      "vishwaneed.vendor.session",
      JSON.stringify({
        accessToken: "vendor-access",
        refreshToken: "vendor-refresh",
        user: { id: "vendor", email: "vendor@example.com", role: "VENDOR" },
      }),
    );
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.endsWith("/auth/vendor/change-password")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                message: "Password changed successfully. Please sign in again.",
                requiresReauthentication: true,
              },
              message: "Success",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/auth/logout"))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText("Current password"), {
      target: { value: "CurrentPass1" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewVendorPass2" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewVendorPass2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText("Password changed successfully. Please sign in again."),
    ).toBeInTheDocument();
    expect(localStorage.getItem("vishwaneed.vendor.session")).toBeNull();
    const changeRequest = fetchMock.mock.calls.find(([input]) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return url.endsWith("/auth/vendor/change-password");
    });
    expect(changeRequest?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          currentPassword: "CurrentPass1",
          newPassword: "NewVendorPass2",
          confirmNewPassword: "NewVendorPass2",
        }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it("opens and closes the responsive navigation", () => {
    localStorage.setItem(
      "vishwaneed.vendor.session",
      JSON.stringify({
        accessToken: "vendor-access",
        refreshToken: "vendor-refresh",
        user: {
          id: "vendor",
          email: "vendor@example.com",
          role: "VENDOR",
        },
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

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
