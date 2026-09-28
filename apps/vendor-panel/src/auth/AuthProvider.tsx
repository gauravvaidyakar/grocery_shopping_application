import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, sessionStore, type Session } from "../api/client";
interface AuthValue {
  session: Session | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Session["user"]) => void;
}
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(sessionStore.get());
  useEffect(() => {
    const expire = () => setSession(null);
    window.addEventListener("vendor:auth-expired", expire);
    return () => window.removeEventListener("vendor:auth-expired", expire);
  }, []);
  const accept = useCallback((next: Session) => {
    if (next.user.role !== "VENDOR") {
      sessionStore.clear();
      throw new Error("This account is not a vendor account.");
    }
    sessionStore.set(next);
    setSession(next);
  }, []);
  const value = useMemo<AuthValue>(
    () => ({
      session,
      login: async (identifier, password) =>
        accept(
          await api.post<Session>("/auth/login", {
            emailOrMobile: identifier,
            password,
          }),
        ),
      register: async (input) =>
        accept(
          await api.post<Session>("/auth/register", {
            ...input,
            role: "VENDOR",
          }),
        ),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          sessionStore.clear();
          setSession(null);
        }
      },
      updateUser: (user) => {
        setSession((current) => {
          if (!current) return current;
          const next = { ...current, user };
          sessionStore.set(next);
          return next;
        });
      },
    }),
    [session, accept],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
