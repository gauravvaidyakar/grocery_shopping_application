import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, sessions, type Session } from "./api";
interface Auth {
  session: Session | null;
  login: (id: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(sessions.get());
  useEffect(() => {
    const expire = () => setSession(null);
    window.addEventListener("admin:expired", expire);
    return () => window.removeEventListener("admin:expired", expire);
  }, []);
  const value = useMemo<Auth>(
    () => ({
      session,
      login: async (id, password) => {
        const next = await api.post<Session>("/auth/login", {
          emailOrMobile: id,
          password,
        });
        if (!next.user || next.user.role !== "ADMIN") {
          sessions.clear();
          throw new Error("Administrator access is required.");
        }
        sessions.set(next);
        setSession(next);
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          sessions.clear();
          setSession(null);
        }
      },
    }),
    [session],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
