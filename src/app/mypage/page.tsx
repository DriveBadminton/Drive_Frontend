"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PageShell from "@/components/layout/PageShell";

function calcAgeGroup(birthDate?: string): string | null {
  if (!birthDate) return null;
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dob = new Date(y, mo, d);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;

  const decade = Math.floor(age / 10) * 10;
  if (decade <= 0) return null;
  return `${decade}대`;
}

export default function MyPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const displayNickname = user?.name || "사용자";
  const displayRegion =
    user?.provinceName && user?.districtName
      ? `${user.provinceName} ${user.districtName}`
      : "-";
  const displayGrade = user?.grade || "급수 없음";
  const displayAgeGroup = "-"; // TODO: birthDate가 User 타입에 추가되면 사용

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

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setProfileImage(dataUrl);
      // TODO: 프로필 이미지 업로드 API 호출
    };
    reader.readAsDataURL(file);
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
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* 프로필 이미지 */}
            <div className="relative">
              <button
                type="button"
                onClick={handleProfileImageClick}
                className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-1 ring-border transition-colors hover:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="프로필 이미지 변경"
              >
                {profileImage || user?.profileImage ? (
                  <img
                    src={profileImage || user?.profileImage || ""}
                    alt="프로필"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    className="h-12 w-12 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="hidden"
              />
              <p className="mt-2 text-xs text-foreground-muted text-center select-none">
                이미지 변경
              </p>
            </div>

            {/* 사용자 정보 */}
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-semibold text-foreground">
                {displayNickname}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 ring-1 ring-border">
                  <span className="text-foreground-muted">지역</span>
                  <span className="text-foreground">{displayRegion}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 ring-1 ring-border">
                  <span className="text-foreground-muted">연령대</span>
                  <span className="text-foreground">{displayAgeGroup}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 ring-1 ring-border">
                  <span className="text-foreground-muted">급수</span>
                  <span className="text-foreground">{displayGrade}</span>
                </div>
              </div>
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
