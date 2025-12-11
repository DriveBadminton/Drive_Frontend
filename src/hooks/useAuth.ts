"use client";

import { useState, useEffect, useCallback } from "react";
import { User, getCurrentUser, logout as logoutApi } from "@/lib/auth";

// 🔧 임시 테스트 모드 (백엔드 없이 테스트할 때 true로 변경)
const MOCK_MODE = true;

// Mock 사용자 데이터
const MOCK_USER: User = {
  id: "mock-user-1",
  email: "test@example.com",
  name: "테스트 사용자",
  profileImage: undefined,
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 정보 가져오기
  const fetchUser = useCallback(async () => {
    setIsLoading(true);

    if (MOCK_MODE) {
      // Mock 모드: localStorage에서 로그인 상태 확인
      const isLoggedIn = localStorage.getItem("mock_logged_in") === "true";
      setUser(isLoggedIn ? MOCK_USER : null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    if (MOCK_MODE) {
      // Mock 모드: localStorage에서 로그인 상태 제거
      localStorage.removeItem("mock_logged_in");
      setUser(null);
      return true;
    }

    const success = await logoutApi();
    if (success) {
      setUser(null);
    }
    return success;
  }, []);

  // Mock 로그인 (테스트용)
  const mockLogin = useCallback(() => {
    if (MOCK_MODE) {
      localStorage.setItem("mock_logged_in", "true");
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
    logout,
    refetch: fetchUser,
    mockLogin, // 테스트용 로그인 함수
  };
}
