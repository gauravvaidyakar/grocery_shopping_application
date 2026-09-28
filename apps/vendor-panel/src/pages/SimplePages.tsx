import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, KeyRound, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { AsyncState, Status } from "../components/AsyncState";
import { Field } from "./AuthPages";
import { PageHead } from "./DashboardPage";
interface Notification {
  id: string;
  templateKey: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
export function NotificationsPage() {
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/notifications"),
  });
  return (
    <>
      <PageHead
        eyebrow="Updates"
        title="Notifications"
        subtitle="KYC, orders, shipments, complaints and settlement delivery events."
      />
      <AsyncState
        loading={query.isLoading}
        error={query.error}
        empty={!query.data?.length}
        onRetry={() => void query.refetch()}
      >
        <div className="notification-list">
          {query.data?.map((n) => (
            <article className="card" key={n.id}>
              <Bell />
              <div>
                <strong>{n.templateKey.replaceAll("_", " ")}</strong>
                <p>
                  {Object.entries(n.payload)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </p>
                <small>{new Date(n.createdAt).toLocaleString("en-IN")}</small>
              </div>
              <Status value={n.status} />
            </article>
          ))}
        </div>
      </AsyncState>
    </>
  );
}

interface VerificationResult {
  verified: boolean;
  expiresInMinutes?: number;
  developmentOtp?: string;
}

export function VerifyMobilePage() {
  const navigate = useNavigate();
  const { session, updateUser } = useAuth();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const requestOtp = useMutation({
    mutationFn: () => api.post<VerificationResult>("/auth/request-verification-otp"),
    onSuccess: (result) => {
      if (result.verified && session) {
        updateUser({ ...session.user, mobileVerified: true });
        void navigate("/profile", { replace: true });
        return;
      }
      setDevelopmentOtp(result.developmentOtp ?? "");
      setSent(true);
    },
  });
  const verifyOtp = useMutation({
    mutationFn: () => api.post<VerificationResult>("/auth/verify-otp", { code }),
    onSuccess: () => {
      if (session) updateUser({ ...session.user, mobileVerified: true });
      void navigate("/profile", { replace: true });
    },
  });
  const error = requestOtp.error ?? verifyOtp.error;
  const busy = requestOtp.isPending || verifyOtp.isPending;
  return (
    <>
      <PageHead eyebrow="Account verification" title="Verify mobile number" subtitle="Confirm your business mobile for account and order notifications." />
      <section className="card security-form">
        <Shield />
        <div>
          <h2>One-time verification code</h2>
          <p>The code is delivered to the mobile number registered with your vendor account.</p>
          {!sent ? (
            <button className="primary" type="button" disabled={busy} onClick={() => requestOtp.mutate()}>{busy ? "Sending…" : "Send verification code"}</button>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); if (/^\d{6}$/.test(code)) verifyOtp.mutate(); }}>
              <Field label="6-digit verification code">
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
              </Field>
              {developmentOtp && <p className="success">Development code: {developmentOtp}</p>}
              <button className="primary" disabled={busy || !/^\d{6}$/.test(code)}>{busy ? "Verifying…" : "Verify mobile"}</button>
              <button className="secondary" type="button" disabled={busy} onClick={() => requestOtp.mutate()}>Send a new code</button>
            </form>
          )}
          {error && <p className="form-error" role="alert">{error instanceof Error ? error.message : "Verification failed"}</p>}
        </div>
      </section>
    </>
  );
}
export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const schema = z
    .object({
      currentPassword: z.string().min(1, "Enter your current password"),
      newPassword: z
        .string()
        .min(10, "Use at least 10 characters")
        .regex(/[A-Z]/, "Include an uppercase letter")
        .regex(/[0-9]/, "Include a number"),
      confirmNewPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmNewPassword, {
      message: "Passwords do not match",
      path: ["confirmNewPassword"],
    })
    .refine((values) => values.currentPassword !== values.newPassword, {
      message: "Use a password different from your current password",
      path: ["newPassword"],
    });
  type PasswordForm = z.infer<typeof schema>;
  const form = useForm<PasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  const changePassword = useMutation({
    mutationFn: (values: PasswordForm) =>
      api.post<{ message: string; requiresReauthentication: true }>(
        "/auth/vendor/change-password",
        values,
      ),
    onSuccess: async (result) => {
      form.reset();
      sessionStorage.setItem("vishwaneed.vendor.auth.notice", result.message);
      try {
        await logout();
      } catch {
        // The password endpoint already revoked the refresh session. The auth
        // provider clears local state in its finally block even if logout is
        // unreachable, so the vendor is still forced to authenticate again.
      }
      void navigate("/login", {
        replace: true,
        state: { notice: result.message },
      });
    },
  });
  return (
    <>
      <PageHead
        eyebrow="Account"
        title="Security settings"
        subtitle="Your session uses short-lived access tokens and refresh-token rotation through the backend."
      />
      <div className="dashboard-grid">
        <section className="card">
          <Shield />
          <h2>Session security</h2>
          <p className="muted">
            Unauthorized and expired sessions are refreshed once, then safely
            returned to sign-in when refresh is rejected.
          </p>
        </section>
        <section className="card security-card">
          <KeyRound />
          <h2>Password management</h2>
          <p className="muted">
            Changing your password revokes the current refresh session and
            requires you to sign in again.
          </p>
          <form
            className="security-form"
            noValidate
            onSubmit={(event) =>
              void form.handleSubmit((values) =>
                changePassword.mutateAsync(values),
              )(event)
            }
          >
            <Field
              label="Current password"
              error={form.formState.errors.currentPassword?.message}
            >
              <input
                type="password"
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
            </Field>
            <Field
              label="New password"
              error={form.formState.errors.newPassword?.message}
            >
              <input
                type="password"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
            </Field>
            <Field
              label="Confirm new password"
              error={form.formState.errors.confirmNewPassword?.message}
            >
              <input
                type="password"
                autoComplete="new-password"
                {...form.register("confirmNewPassword")}
              />
            </Field>
            <small className="password-hint">
              At least 10 characters, including an uppercase letter and a
              number.
            </small>
            {changePassword.error && (
              <p className="form-error" role="alert">
                {changePassword.error.message}
              </p>
            )}
            <button className="primary" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Changing password…" : "Change password"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
