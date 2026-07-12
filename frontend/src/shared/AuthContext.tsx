// File: frontend/src/shared/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, registerUnauthorizedHandler } from "./api";
import { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    registerUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me")
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        // A 401 here just means "not logged in yet" — not an app error.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      setUser(res.data.user);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Login failed. Please try again.";
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {
      // Even if the request fails (e.g. already expired), clear local state.
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
