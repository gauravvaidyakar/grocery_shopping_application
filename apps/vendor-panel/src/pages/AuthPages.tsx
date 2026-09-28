import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { z } from "zod";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or mobile number"),
  password: z.string().min(10, "Password must contain at least 10 characters"),
});
type Login = z.infer<typeof loginSchema>;
export function LoginPage() {
  const { session, login } = useAuth();
  const [error, setError] = useState("");
  const location = useLocation();
  const [storedNotice] = useState(() => {
    const value = sessionStorage.getItem("vishwaneed.vendor.auth.notice") ?? "";
    sessionStorage.removeItem("vishwaneed.vendor.auth.notice");
    return value;
  });
  const notice =
    (location.state as { notice?: string } | null)?.notice ?? storedNotice;
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Login>({ resolver: zodResolver(loginSchema) });
  if (session) return <Navigate to="/" replace />;
  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Manage products, fulfil orders and track settlements from one secure workspace."
    >
      <form
        onSubmit={(event) => void handleSubmit(async (v) => {
          try {
            setError("");
            await login(v.identifier, v.password);
            const target =
              (location.state as { from?: string } | null)?.from ?? "/";
            void navigate(target, { replace: true });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Login failed");
          }
        })(event)}
      >
        <Field label="Email or mobile" error={errors.identifier?.message}>
          <input autoComplete="username" {...register("identifier")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        <button className="primary" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in securely"}
        </button>
        <p className="auth-switch">
          <Link to="/forgot-password">Forgot password?</Link>
          <br />
          New vendor? <Link to="/register">Create a vendor account</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

const forgotSchema = z.object({
  identifier: z.string().min(3, "Enter your registered email or mobile number"),
});
type ForgotPassword = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [result, setResult] = useState<{
    message: string;
    developmentResetUrl?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const form = useForm<ForgotPassword>({ resolver: zodResolver(forgotSchema) });
  return (
    <AuthFrame
      title="Reset vendor password"
      subtitle="Enter your registered vendor email or mobile number. Reset instructions are sent securely without revealing whether an account exists."
    >
      {result ? (
        <div className="password-result" role="status">
          <h3>Request received</h3>
          <p>{result.message}</p>
          {result.developmentResetUrl && (
            <a className="primary" href={result.developmentResetUrl}>
              Open development reset link
            </a>
          )}
          <Link className="secondary" to="/login">
            Return to sign in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(event) =>
            void form.handleSubmit(async ({ identifier }) => {
              try {
                setError("");
                setResult(
                  await api.post("/auth/forgot-password", {
                    emailOrMobile: identifier,
                  }),
                );
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Request failed");
              }
            })(event)
          }
        >
          <Field label="Email or mobile" error={form.formState.errors.identifier?.message}>
            <input autoComplete="username" {...form.register("identifier")} />
          </Field>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : "Send reset instructions"}
          </button>
          <p className="auth-switch"><Link to="/login">Return to sign in</Link></p>
        </form>
      )}
    </AuthFrame>
  );
}

const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type ResetPassword = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const form = useForm<ResetPassword>({ resolver: zodResolver(resetSchema) });
  return (
    <AuthFrame
      title="Choose a new vendor password"
      subtitle="Use at least 10 characters with an uppercase letter and a number."
    >
      <form
        onSubmit={(event) =>
          void form.handleSubmit(async ({ password }) => {
            try {
              setError("");
              await api.post("/auth/reset-password", { token, password });
              void navigate("/login", {
                replace: true,
                state: { notice: "Password reset successfully. Please sign in." },
              });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Password reset failed");
            }
          })(event)
        }
      >
        <Field label="New password" error={form.formState.errors.password?.message}>
          <input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Field label="Confirm new password" error={form.formState.errors.confirmPassword?.message}>
          <input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        </Field>
        {!token && <p className="form-error" role="alert">The reset token is missing.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={!token || form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthFrame>
  );
}
const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10),
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
});
type Register = z.infer<typeof registerSchema>;
export function RegisterPage() {
  const { session, register: registerVendor } = useAuth();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const form = useForm<Register>({ resolver: zodResolver(registerSchema) });
  if (session) return <Navigate to="/" />;
  return (
    <AuthFrame
      title="Start selling with Vishwaneed"
      subtitle="Create your business account, then complete KYC and inspection from the panel."
    >
      <form
        onSubmit={(event) => void form.handleSubmit(async (v) => {
          try {
            await registerVendor({
              email: v.email,
              mobile: v.mobile,
              password: v.password,
              businessName: v.businessName,
              ownerName: v.ownerName,
              businessAddress: {
                line1: v.address,
                city: v.city,
                state: v.state,
                pincode: v.pincode,
              },
            });
            void navigate("/verify-mobile");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Registration failed");
          }
        })(event)}
      >
        <div className="form-grid">
          {(
            [
              "businessName",
              "ownerName",
              "email",
              "mobile",
              "password",
              "address",
              "city",
              "state",
              "pincode",
            ] as const
          ).map((name) => (
            <Field
              key={name}
              label={name.replace(/([A-Z])/g, " $1")}
              error={form.formState.errors[name]?.message}
            >
              <input
                type={name === "password" ? "password" : "text"}
                {...form.register(name)}
              />
            </Field>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary" disabled={form.formState.isSubmitting}>
          Create vendor account
        </button>
        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="brand light">
          <span>V</span>
          <div>
            <strong>Vishwaneed</strong>
            <small>Made in India. Made for You.</small>
          </div>
        </div>
        <div>
          <small>VENDOR PARTNERS</small>
          <h1>
            Grow local.
            <br />
            Reach India.
          </h1>
          <p>
            A trusted marketplace for rural producers and purpose-led food
            businesses.
          </p>
        </div>
      </section>
      <section className="auth-card">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
