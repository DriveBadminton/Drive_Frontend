"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AccountStatusResponse,
  User,
  getCurrentUser,
  logout as logoutApi,
  getAccessToken,
} from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<AccountStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    setIsLoading(true);

    // 액세스 토큰이 없으면 API 호출하지 않음 (비로그인 상태)
    const token = getAccessToken();
    if (!token || !token.trim()) {
      console.log("[useAuth] No access token, skipping user fetch");
      setUser(null);
      setAccountStatus(null);
      setIsLoading(false);
      return;
    }

    console.log("[useAuth] Access token found:", {
      hasToken: !!token,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + "...",
    });

    try {
      console.log("[useAuth] fetchUser 호출 - /users/me 요청 시작");
      const userData = await getCurrentUser();
      console.log("[useAuth] fetchUser 완료 - 사용자 데이터:", userData);

      // 사용자 데이터가 null이고 토큰이 있었다면, 토큰이 유효하지 않을 수 있음
      if (!userData && token) {
        console.warn(
          "[useAuth] 토큰이 있지만 사용자 데이터를 가져오지 못함 - 토큰이 만료되었거나 유효하지 않을 수 있음"
        );
        // 토큰 제거는 하지 않음 (네트워크 문제일 수도 있으므로)
        // 하지만 사용자 상태는 null로 설정
      }

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
      console.error("[useAuth] fetchUser error:", error);
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
