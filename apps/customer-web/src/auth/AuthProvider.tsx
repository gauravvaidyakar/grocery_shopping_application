import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { marketplaceApi } from '../api';
import type { AuthSession, CustomerAuthResult, LoginInput, RegisterInput } from '../api/types';
import { AUTH_EXPIRED_EVENT, sessionStorage } from './sessionStorage';

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login(input: LoginInput): Promise<CustomerAuthResult>;
  register(input: RegisterInput): Promise<CustomerAuthResult>;
  completeOtp(session: AuthSession): Promise<void>;
  logout(): Promise<void>;
  updateCustomer(customer: AuthSession['customer']): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isSession(result: CustomerAuthResult): result is AuthSession {
  return 'accessToken' in result;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(() => sessionStorage.get());

  useEffect(() => {
    const handleExpired = () => {
      queryClient.removeQueries({ queryKey: ['customer-cart'] });
      setSession(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    async login(input) {
      const next = await marketplaceApi.login(input);
      if (isSession(next)) {
        sessionStorage.set(next);
        setSession(next);
        await queryClient.invalidateQueries({ queryKey: ['customer-cart'] });
      }
      return next;
    },
    async register(input) {
      const next = await marketplaceApi.register(input);
      if (isSession(next)) {
        sessionStorage.set(next);
        setSession(next);
        await queryClient.invalidateQueries({ queryKey: ['customer-cart'] });
      }
      return next;
    },
    async completeOtp(next) {
      sessionStorage.set(next);
      setSession(next);
      await queryClient.invalidateQueries({ queryKey: ['customer-cart'] });
    },
    async logout() {
      try {
        await marketplaceApi.logout();
      } finally {
        sessionStorage.clear();
        queryClient.removeQueries({ queryKey: ['customer-cart'] });
        setSession(null);
      }
    },
    updateCustomer(customer) {
      setSession((current) => {
        if (!current) return current;
        const next = { ...current, customer };
        sessionStorage.set(next);
        return next;
      });
    },
  }), [queryClient, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
