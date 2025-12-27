"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AccountStatusResponse,
  User,
  getCurrentUser,
  logout as logoutApi,
} from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<AccountStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    setIsLoading(true);

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      if (userData && userData.status) {
        setAccountStatus({
          userId: userData.id,
          status: userData.status,
          hasProfile: userData.status === "ACTIVE",
        });
      } else {
        setAccountStatus(null);
      }
    } catch (error) {
      setUser(null);
      setAccountStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    const success = await logoutApi();
    if (success) {
      setUser(null);
      setAccountStatus(null);
    }
    return success;
  }, []);

  // 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoggedIn: !!user,
    isLoading,
    accountStatus,
    logout,
    refetch: fetchUser,
  };
}
