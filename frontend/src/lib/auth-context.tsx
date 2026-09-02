"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiRequestError, apiFetch, notifyCartChanged, refreshAccessToken, setAccessToken } from "@/lib/api";
import { markAuthInitComplete, markAuthInitStart } from "@/lib/auth-gate";
import { clearLegacyAuthStorage, type AuthScope } from "@/lib/auth-session";
import { mergeGuestCartAfterAuth } from "@/lib/cart-sync";
import type { TokenResponse, User } from "@/lib/types";

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register?: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface AuthContextValue {
  customer: SessionContextValue;
  admin: SessionContextValue & { isAdmin: boolean };
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(scope: AuthScope): Promise<User | null> {
  try {
    return await apiFetch<User>("/auth/me", { auth: true, authScope: scope });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) {
      setAccessToken(null, scope);
    }
    return null;
  }
}

async function tryRefresh(scope: AuthScope): Promise<string | null> {
  // Refresh cookies are HttpOnly — they cannot be detected via document.cookie.
  // Always attempt refresh; the backend validates the cookie and returns 401 if absent.
  const token = await refreshAccessToken(scope);
  if (!token) {
    setAccessToken(null, scope);
  }
  return token;
}

function useSession(scope: AuthScope, loginPath: string, logoutPath: string, options?: { registerPath?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe(scope);
    setUser(me);
  }, [scope]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      markAuthInitStart(scope);
      clearLegacyAuthStorage();
      try {
        const token = await tryRefresh(scope);
        // Release the gate once refresh completes so fetchMe can use apiFetch.
        // Pages still wait on isLoading until user restoration finishes.
        markAuthInitComplete(scope);
        if (cancelled) return;

        if (token) {
          const me = await fetchMe(scope);
          if (!cancelled) {
            if (scope === "customer" && me?.role === "admin") {
              setAccessToken(null, scope);
              setUser(null);
            } else if (scope === "admin" && me && me.role !== "admin") {
              setAccessToken(null, scope);
              setUser(null);
            } else {
              setUser(me);
            }
          }
        }
      } catch {
        markAuthInitComplete(scope);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      markAuthInitComplete(scope);
    };
  }, [scope, logoutPath]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<TokenResponse>(loginPath, {
        method: "POST",
        body: { email, password },
        authScope: scope,
      });
      setAccessToken(data.access_token, scope);
      if (scope === "customer") {
        await mergeGuestCartAfterAuth();
        notifyCartChanged();
      }
      const me = await fetchMe(scope);
      if (!me) throw new Error("Login failed");
      setUser(me);
      return me;
    },
    [loginPath, scope],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (scope !== "customer") throw new Error("Register is customer-only");
      const data = await apiFetch<TokenResponse>("/auth/register", {
        method: "POST",
        body: { name, email, password },
        authScope: "customer",
      });
      setAccessToken(data.access_token, "customer");
      await mergeGuestCartAfterAuth();
      notifyCartChanged();
      const me = await fetchMe("customer");
      if (!me) throw new Error("Registration failed");
      setUser(me);
      return me;
    },
    [scope],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch(logoutPath, { method: "POST", authScope: scope });
    } catch {
      // ignore
    }
    setAccessToken(null, scope);
    setUser(null);
  }, [logoutPath, scope]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register: options?.registerPath ? register : undefined,
    logout,
    refreshUser,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const customerBase = useSession("customer", "/auth/login", "/auth/logout", { registerPath: true });
  const adminBase = useSession("admin", "/auth/admin/login", "/auth/admin/logout");

  const value = useMemo<AuthContextValue>(
    () => ({
      customer: {
        user: customerBase.user,
        isLoading: customerBase.isLoading,
        isAuthenticated: customerBase.isAuthenticated,
        login: customerBase.login,
        register: customerBase.register!,
        logout: customerBase.logout,
        refreshUser: customerBase.refreshUser,
      },
      admin: {
        user: adminBase.user,
        isLoading: adminBase.isLoading,
        isAuthenticated: adminBase.isAuthenticated,
        isAdmin: adminBase.user?.role === "admin",
        login: adminBase.login,
        logout: adminBase.logout,
        refreshUser: adminBase.refreshUser,
      },
    }),
    [customerBase, adminBase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Storefront/customer authentication — never exposes admin session state. */
export function useAuth(): SessionContextValue & {
  isAdmin: false;
  register: (name: string, email: string, password: string) => Promise<User>;
} {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return {
    ...ctx.customer,
    register: ctx.customer.register!,
    isAdmin: false,
  };
}

/** Admin dashboard authentication — separate cookie and access token. */
export function useAdminAuth(): SessionContextValue & { isAdmin: boolean } {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AuthProvider");
  return ctx.admin;
}
