import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { marketplaceApi, runtimeConfig } from '../api';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthProvider';
import { otpChallengeStorage } from '../auth/otpChallengeStorage';
import { OtpInput } from '../components/auth/OtpInput';
import { FormField } from '../components/ui/FormField';
import type { CustomerOtpChallenge } from '../api/types';
import { resendMsg91Otp, startMsg91Otp, verifyMsg91Otp } from '../auth/msg91OtpWidget';

const loginSchema = z.object({ emailOrMobile: z.string().min(5, 'Enter your email or mobile number.'), password: z.string().min(8, 'Password must be at least 8 characters.') });
type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, 'Enter your full name.'),
  email: z.email('Enter a valid email address.'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  password: z.string().min(10, 'Use at least 10 characters.').regex(/[A-Z]/, 'Include an uppercase letter.').regex(/[0-9]/, 'Include a number.'),
  acceptTerms: z.boolean().refine((value) => value, 'Please accept the terms to continue.'),
});
type RegisterForm = z.infer<typeof registerSchema>;

const forgotSchema = z.object({ emailOrMobile: z.string().min(5, 'Enter your registered email or mobile number.') });
type ForgotForm = z.infer<typeof forgotSchema>;

const resetSchema = z.object({ password: z.string().min(10, 'Use at least 10 characters.').regex(/[A-Z]/, 'Include an uppercase letter.').regex(/[0-9]/, 'Include a number.'), confirmPassword: z.string() }).refine((values) => values.password === values.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
type ResetForm = z.infer<typeof resetSchema>;

function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <div className="auth-page"><section className="auth-story"><Link className="back-link back-link--light" to="/"><ArrowLeft size={17} /> Back to store</Link><div><span className="eyebrow eyebrow--light">Vishwaneed customer</span><h1>Food with roots.<br />Shopping with trust.</h1><p>Discover approved products from rural producers while keeping one simple customer checkout.</p><ul><li><CheckCircle2 /> GST-inclusive product prices</li><li><CheckCircle2 /> Multi-vendor cart</li><li><CheckCircle2 /> Backend-verified checkout</li></ul></div></section><section className="auth-panel"><div className="auth-card"><LockKeyhole className="auth-icon" aria-hidden="true" /><h2>{title}</h2><p>{intro}</p>{children}{runtimeConfig.isMock && <div className="mock-note">Development adapter: use any valid-looking credentials. No real account is created.</div>}</div></section></div>;
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; notice?: string } | null;
  const destination = locationState?.from ?? '/account';
  const [serverError, setServerError] = useState('');
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { emailOrMobile: '', password: '' } });
  if (isAuthenticated) return <Navigate to={destination} replace />;
  const submit = form.handleSubmit(async (values) => { try { setServerError(''); const result = await login(values); if ('verificationRequired' in result) { otpChallengeStorage.set(result); void navigate('/verify-account', { replace: true }); return; } void navigate(destination, { replace: true }); } catch (error) { setServerError(getErrorMessage(error)); } });
  return <AuthShell title="Welcome back" intro="Sign in to continue to your account and checkout."><form className="stack-form" onSubmit={(event) => void submit(event)} noValidate>{locationState?.notice && <p className="form-success" role="status">{locationState.notice}</p>}<FormField label="Email or mobile" autoComplete="username" registration={form.register('emailOrMobile')} error={form.formState.errors.emailOrMobile} /><FormField label="Password" type="password" autoComplete="current-password" registration={form.register('password')} error={form.formState.errors.password} />{serverError && <p className="form-error" role="alert">{serverError}</p>}<div className="form-row-between"><span>Secure customer session</span><Link to="/forgot-password">Forgot password?</Link></div><button className="button button--primary button--full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}</button></form><p className="auth-switch">New to Vishwaneed? <Link to="/register">Create an account</Link></p></AuthShell>;
}

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', mobile: '', password: '', acceptTerms: false } });
  if (isAuthenticated) return <Navigate to="/account" replace />;
  const submit = form.handleSubmit(async (values) => { try { setServerError(''); const input = { name: values.name, email: values.email, mobile: values.mobile, password: values.password }; const result = await register(input); if ('verificationRequired' in result) { otpChallengeStorage.set(result); void navigate('/verify-account', { replace: true }); return; } void navigate('/account', { replace: true }); } catch (error) { setServerError(getErrorMessage(error)); } });
  return <AuthShell title="Create your account" intro="Register as a customer to save addresses and check out."><form className="stack-form" onSubmit={(event) => void submit(event)} noValidate><FormField label="Full name" autoComplete="name" registration={form.register('name')} error={form.formState.errors.name} /><FormField label="Email" type="email" autoComplete="email" registration={form.register('email')} error={form.formState.errors.email} /><FormField label="Mobile" inputMode="numeric" autoComplete="tel" registration={form.register('mobile')} error={form.formState.errors.mobile} /><FormField label="Password" type="password" autoComplete="new-password" hint="At least 10 characters, with an uppercase letter and number." registration={form.register('password')} error={form.formState.errors.password} /><label className="checkbox-field"><input type="checkbox" {...form.register('acceptTerms')} /> I agree to the customer terms and privacy policy.</label>{form.formState.errors.acceptTerms && <small className="field-error">{form.formState.errors.acceptTerms.message}</small>}{serverError && <p className="form-error" role="alert">{serverError}</p>}<button className="button button--primary button--full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creating account…' : 'Create account'}</button></form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p></AuthShell>;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'otp' | 'password'>('request');
  const [challengeToken, setChallengeToken] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [notice, setNotice] = useState('');
  const [otpChallenge, setOtpChallenge] = useState<CustomerOtpChallenge | null>(null);
  const [requestId, setRequestId] = useState<string>();
  const form = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema), defaultValues: { emailOrMobile: '' } });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const request = form.handleSubmit(async ({ emailOrMobile }) => { try { setBusy(true); setServerError(''); const result = await marketplaceApi.forgotPassword(emailOrMobile); if (!result.otp) throw new Error(result.message); const challenge: CustomerOtpChallenge = { verificationRequired: true, challengeToken: result.challengeToken, maskedDestination: result.maskedDestination, message: result.message, expiresInMinutes: 5, resendAfterSeconds: result.resendAfterSeconds, otp: result.otp }; setChallengeToken(result.challengeToken); setMaskedDestination(result.maskedDestination); setOtpChallenge(challenge); const nextRequestId = await startMsg91Otp(challenge); setRequestId(nextRequestId); setCooldown(result.resendAfterSeconds); setNotice('A verification code was sent by SMS.'); setStep('otp'); } catch (error) { setServerError(getErrorMessage(error)); } finally { setBusy(false); } });
  const verify = async (event: React.FormEvent) => { event.preventDefault(); if (!/^\d{6}$/.test(code)) { setServerError('Enter the complete 6-digit verification code.'); return; } if (!otpChallenge) return; try { setBusy(true); setServerError(''); const accessToken = await verifyMsg91Otp(otpChallenge, code, requestId); const result = await marketplaceApi.verifyPasswordResetOtp(challengeToken, accessToken); setResetToken(result.resetToken); setStep('password'); } catch (error) { setCode(''); setServerError(getErrorMessage(error)); } finally { setBusy(false); } };
  const resend = async () => { if (!otpChallenge) return; try { setBusy(true); setServerError(''); setNotice(''); const nextRequestId = await resendMsg91Otp(otpChallenge, requestId); setRequestId(nextRequestId); setCooldown(otpChallenge.resendAfterSeconds); setCode(''); setNotice('A new verification code was sent by SMS.'); } catch (error) { setServerError(getErrorMessage(error)); } finally { setBusy(false); } };
  const updatePassword = resetForm.handleSubmit(async ({ password }) => { try { setServerError(''); await marketplaceApi.resetPassword({ token: resetToken, password }); void navigate('/login', { replace: true, state: { notice: 'Password updated. Sign in with your new password.' } }); } catch (error) { setServerError(getErrorMessage(error)); } });

  return <AuthShell title="Reset your password" intro={step === 'request' ? 'Verify your registered mobile before choosing a new password.' : step === 'otp' ? `Enter the code sent to ${maskedDestination}.` : 'Choose a strong new password for your account.'}>
    {step === 'request' && <form className="stack-form" onSubmit={(event) => void request(event)} noValidate><FormField label="Email or mobile" autoComplete="username" registration={form.register('emailOrMobile')} error={form.formState.errors.emailOrMobile} />{serverError && <p className="form-error" role="alert">{serverError}</p>}<button className="button button--primary button--full" disabled={busy}>{busy ? 'Sending…' : 'Send verification code'}</button></form>}
    {step === 'otp' && <form className="stack-form" onSubmit={(event) => void verify(event)}><span className="otp-label">6-digit verification code</span><OtpInput value={code} onChange={setCode} disabled={busy} />{notice && <p className="form-success" role="status">{notice}</p>}{serverError && <p className="form-error" role="alert">{serverError}</p>}<button className="button button--primary button--full" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify code'}</button><div className="otp-resend"><span>Didn’t receive it?</span><button className="link-button" type="button" disabled={busy || cooldown > 0} onClick={() => void resend()}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button></div></form>}
    {step === 'password' && <form className="stack-form" onSubmit={(event) => void updatePassword(event)} noValidate><FormField label="New password" type="password" autoComplete="new-password" hint="At least 10 characters, with an uppercase letter and number." registration={resetForm.register('password')} error={resetForm.formState.errors.password} /><FormField label="Confirm new password" type="password" autoComplete="new-password" registration={resetForm.register('confirmPassword')} error={resetForm.formState.errors.confirmPassword} />{serverError && <p className="form-error" role="alert">{serverError}</p>}<button className="button button--primary button--full" disabled={resetForm.formState.isSubmitting}>{resetForm.formState.isSubmitting ? 'Updating…' : 'Update password'}</button></form>}
    <p className="auth-switch"><Link to="/login">Return to sign in</Link></p>
  </AuthShell>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const token = params.get('token') ?? '';
  const form = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });
  const submit = form.handleSubmit(async ({ password }) => { try { setServerError(''); await marketplaceApi.resetPassword({ token, password }); void navigate('/login', { replace: true }); } catch (error) { setServerError(getErrorMessage(error)); } });
  return <AuthShell title="Choose a new password" intro="Enter a secure password for your customer account."><form className="stack-form" onSubmit={(event) => void submit(event)} noValidate><FormField label="New password" type="password" autoComplete="new-password" registration={form.register('password')} error={form.formState.errors.password} /><FormField label="Confirm password" type="password" autoComplete="new-password" registration={form.register('confirmPassword')} error={form.formState.errors.confirmPassword} />{!token && <p className="form-error" role="alert">The reset token is missing.</p>}{serverError && <p className="form-error" role="alert">{serverError}</p>}<button className="button button--primary button--full" disabled={!token || form.formState.isSubmitting}>Update password</button></form></AuthShell>;
}
