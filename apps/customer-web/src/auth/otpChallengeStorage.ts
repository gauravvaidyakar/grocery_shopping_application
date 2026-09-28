import type { CustomerOtpChallenge } from '../api/types';

const KEY = 'vishwaneed.customer.otp-challenge';

export const otpChallengeStorage = {
  get(): CustomerOtpChallenge | null {
    const value = window.sessionStorage.getItem(KEY);
    if (!value) return null;
    try {
      const challenge = JSON.parse(value) as CustomerOtpChallenge;
      return challenge.verificationRequired && challenge.challengeToken ? challenge : null;
    } catch {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
  },
  set(challenge: CustomerOtpChallenge) {
    window.sessionStorage.setItem(KEY, JSON.stringify(challenge));
  },
  clear() {
    window.sessionStorage.removeItem(KEY);
  },
};
