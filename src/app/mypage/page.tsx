"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PageShell from "@/components/layout/PageShell";

export default function MyPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout } = useAuth();

  const displayNickname = user?.nickname || user?.name || "사용자";
  const displayRegion =
    user?.provinceName && user?.districtName
      ? `${user.provinceName} ${user.districtName}`
      : "-";
  const displayGrade = user?.grade || "급수 없음";
  const displayGender =
    user?.gender === "MALE" ? "남성" : user?.gender === "FEMALE" ? "여성" : "-";

  // 로그인하지 않은 경우 메인 페이지로 리다이렉트
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [isLoading, isLoggedIn, router]);

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push("/");
    }
  };

  const handleEditProfile = () => {
    router.push("/account/edit?returnTo=/mypage");
  };

  // 로딩 중
  if (isLoading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  // 로그인하지 않은 경우
  if (!isLoggedIn) {
    return null;
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">마이페이지</h1>

        {/* 프로필 카드 */}
        <div className="rounded-2xl bg-background-secondary p-6 sm:p-8 ring-1 ring-border">
          {/* 닉네임 */}
          <h2 className="text-2xl font-semibold text-foreground">
            {displayNickname}
          </h2>

          {/* 사용자 정보 */}
          <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-4 py-3 ring-1 ring-border">
              <span className="text-foreground-muted">지역</span>
              <span className="text-foreground font-medium">
                {displayRegion}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-4 py-3 ring-1 ring-border">
              <span className="text-foreground-muted">성별</span>
              <span className="text-foreground font-medium">
                {displayGender}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-4 py-3 ring-1 ring-border sm:col-span-2">
              <span className="text-foreground-muted">급수</span>
              <span className="text-foreground font-medium">
                {displayGrade}
              </span>
            </div>
          </div>

          {/* 구분선 */}
          <div className="my-6 border-t border-border" />

          {/* 메뉴 */}
          <div className="space-y-2">
            <button
              onClick={handleEditProfile}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <svg
                className="h-5 w-5 text-foreground-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>정보 수정</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left text-red-500 transition-colors hover:bg-red-500/10"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
