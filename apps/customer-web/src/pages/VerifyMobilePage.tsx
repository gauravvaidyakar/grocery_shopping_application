import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { marketplaceApi } from '../api';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthProvider';
import { otpChallengeStorage } from '../auth/otpChallengeStorage';
import { OtpInput } from '../components/auth/OtpInput';
import { resendMsg91Otp, startMsg91Otp, verifyMsg91Otp } from '../auth/msg91OtpWidget';

export function VerifyMobilePage() {
  const { completeOtp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [challenge] = useState(() => otpChallengeStorage.get());
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(challenge?.resendAfterSeconds ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestId, setRequestId] = useState<string>();

  useEffect(() => {
    if (!challenge) return;
    let active = true;
    setLoading(true);
    setError('');
    void startMsg91Otp(challenge)
      .then((nextRequestId) => {
        if (!active) return;
        setRequestId(nextRequestId);
        setCooldown(challenge.resendAfterSeconds);
        setNotice('A verification code was sent by SMS.');
      })
      .catch((caught: unknown) => active && setError(getErrorMessage(caught)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [challenge]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (isAuthenticated) return <Navigate to="/account" replace />;
  if (!challenge) return <Navigate to="/register" replace state={{ notice: 'Create an account to request a verification code.' }} />;

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const accessToken = await verifyMsg91Otp(challenge, code, requestId);
      const session = await marketplaceApi.verifyCustomerOtp(challenge.challengeToken, accessToken);
      otpChallengeStorage.clear();
      await completeOtp(session);
      void navigate('/', { replace: true, state: { notice: 'Your account has been verified.' } });
    } catch (caught) {
      setCode('');
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const nextRequestId = await resendMsg91Otp(challenge, requestId);
      setRequestId(nextRequestId);
      setCode('');
      setCooldown(challenge.resendAfterSeconds);
      setNotice('A new verification code was sent.');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return <div className="page shell verification-page"><section className="auth-form-card otp-card">
    <ShieldCheck aria-hidden="true" />
    <span className="eyebrow">Account verification</span>
    <h1>Verify your mobile number</h1>
    <p>Enter the code sent to <strong>{challenge.maskedDestination}</strong>. The code expires in {challenge.expiresInMinutes} minutes.</p>
    <form className="stack-form" onSubmit={(event) => void verify(event)}>
      <span className="otp-label">6-digit verification code</span>
      <OtpInput value={code} onChange={setCode} disabled={loading} />
      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--primary button--full" disabled={loading || code.length !== 6}>{loading ? 'Verifying…' : 'Verify account'}</button>
      <div className="otp-resend">
        <span>Didn’t receive the code?</span>
        <button className="link-button" type="button" disabled={loading || cooldown > 0} onClick={() => void resend()}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
    <p className="otp-help"><CheckCircle2 size={16} /> Never share this code with anyone.</p>
    <Link className="back-link" to="/login">Back to sign in</Link>
  </section></div>;
}
