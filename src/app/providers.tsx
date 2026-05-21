"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AccountStatusResponse,
  SessionUser,
  getCurrentUser,
  logout as logoutApi,
} from "@/lib/auth";
import { AUTH_EXPIRED_EVENT } from "@/lib/api";

type AuthContextValue = {
  user: SessionUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  accountStatus: AccountStatusResponse | null;
  logout: () => Promise<boolean>;
  refetch: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<AccountStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setAccountStatus(
        userData
          ? {
              status: userData.status,
              hasProfile: userData.status === "ACTIVE",
            }
          : null
      );
    } catch (error) {
      console.error("[AuthProvider] fetchUser error:", error);
      setUser(null);
      setAccountStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const success = await logoutApi();
    if (success) {
      setUser(null);
      setAccountStatus(null);
    }
    return success;
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setAccountStatus(null);
      setIsLoading(false);

      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (window.location.pathname.startsWith("/login")) {
        return;
      }

      window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading,
      accountStatus,
      logout,
      refetch: fetchUser,
    }),
    [accountStatus, fetchUser, isLoading, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
