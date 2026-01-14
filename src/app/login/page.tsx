"use client";

import { getKakaoOAuthURL } from "@/lib/auth";

export default function Login() {
  const handleKakaoLogin = () => {
    // 기본 로그인 (기존 세션 사용)
    window.location.href = getKakaoOAuthURL("/");
  };

  const handleKakaoLoginWithDifferentAccount = () => {
    // 다른 계정으로 로그인 (매번 로그인 화면 표시)
    window.location.href = getKakaoOAuthURL("/", true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl justify-center px-4 pt-20 pb-24 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-background-secondary p-6 shadow-xl sm:p-8">
            {/* 로고 */}
            <div className="mb-8 flex flex-col items-center justify-center gap-4">
              <img
                src="/drive-favicon.svg"
                alt="Drive Icon"
                className="h-16 w-16"
              />
              <img
                src="/drive-wordmark.svg"
                alt="Drive Wordmark"
                className="h-8 w-auto brightness-0 invert"
              />
            </div>

            {/* 타이틀 */}
            <h1 className="text-center text-2xl font-semibold text-foreground">
              로그인
            </h1>
            <p className="mt-2 text-center text-sm text-foreground-muted">
              카카오 계정으로 간편하게 시작하세요
            </p>

            {/* 카카오 로그인 버튼 */}
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleKakaoLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-yellow-500/50 bg-[#FEE500] px-4 py-4 text-base font-semibold text-gray-900 shadow-sm transition-all hover:bg-[#FDD835] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              >
                <img src="/kakaotalk.png" alt="Kakao" className="h-6 w-6" />
                카카오로 시작하기
              </button>

              <button
                type="button"
                onClick={handleKakaoLoginWithDifferentAccount}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground-muted transition-all hover:bg-foreground-muted/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                다른 계정으로 로그인
              </button>
            </div>

            {/* 안내 문구 */}
            <p className="mt-6 text-center text-xs text-foreground-muted">
              로그인 시{" "}
              <a href="/terms" className="text-primary hover:underline">
                이용약관
              </a>{" "}
              및{" "}
              <a href="/privacy" className="text-primary hover:underline">
                개인정보처리방침
              </a>
              에 동의하게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
