"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AccountStatusResponse,
  User,
  getAccountStatus,
  getCurrentUser,
  logout as logoutApi,
} from "@/lib/auth";

// 🔧 임시 테스트 모드 (백엔드 없이 테스트할 때 true로 변경)
const MOCK_MODE = false;

// Mock 사용자 데이터
const MOCK_USER: User = {
  id: "mock-user-1",
  email: "test@example.com",
  name: "테스트 사용자",
  profileImage: undefined,
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<AccountStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    setIsLoading(true);

    if (MOCK_MODE) {
      // Mock 모드: localStorage에서 로그인 상태 확인
      const isLoggedIn = localStorage.getItem("mock_logged_in") === "true";
      setUser(isLoggedIn ? MOCK_USER : null);
      if (isLoggedIn) {
        const status =
          (localStorage.getItem("mock_user_status") as
            | "PENDING"
            | "ACTIVE"
            | null) || "PENDING";
        const hasProfile = localStorage.getItem("mock_has_profile") === "true";
        setAccountStatus({
          userId: MOCK_USER.id,
          status,
          hasProfile,
        });
      } else {
        setAccountStatus(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      if (userData) {
        const status = await getAccountStatus();
        setAccountStatus(status);
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
    if (MOCK_MODE) {
      // Mock 모드: localStorage에서 로그인 상태 제거
      localStorage.removeItem("mock_logged_in");
      localStorage.removeItem("mock_user_status");
      localStorage.removeItem("mock_has_profile");
      setUser(null);
      setAccountStatus(null);
      return true;
    }

    const success = await logoutApi();
    if (success) {
      setUser(null);
      setAccountStatus(null);
    }
    return success;
  }, []);

  // Mock 로그인 (테스트용)
  const mockLogin = useCallback(() => {
    if (MOCK_MODE) {
      localStorage.setItem("mock_logged_in", "true");
      if (!localStorage.getItem("mock_user_status")) {
        localStorage.setItem("mock_user_status", "PENDING");
        localStorage.setItem("mock_has_profile", "false");
      }
      setUser(MOCK_USER);
    }
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
    mockLogin, // 테스트용 로그인 함수
  };
}
