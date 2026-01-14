"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getKakaoOAuthURL } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import Icon from "@/components/Icon";

interface NavItem {
  label: string;
  to?: string;
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "선수 및 대회 검색", to: "/home" },
  { label: "코트매니저", to: "/court_manager" },
];

export default function MainHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push("/");
    }
  };

  return (
    <header className="flex-none sticky top-0 z-50 border-border bg-background-secondary">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() => setIsMenuOpen(false)}
        >
          <img
            src="/drive-favicon.svg"
            alt="Drive Icon"
            className="h-10 w-10 sm:hidden"
          />
          <img
            src="/drive-wordmark.svg"
            alt="Drive Wordmark"
            className="hidden h-8 w-auto sm:block dark:brightness-0 dark:invert"
          />
        </Link>

        <nav
          className="hidden items-center gap-4 text-sm font-medium text-foreground-muted lg:flex"
          role="navigation"
          aria-label="메인 네비게이션"
        >
          {NAV_ITEMS.map((item, index) => {
            if (item.href) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  tabIndex={0}
                  className="transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-2 py-1"
                >
                  {item.label}
                </a>
              );
            }

            if (item.to?.startsWith("#")) {
              return (
                <a
                  key={item.label}
                  href={item.to}
                  tabIndex={0}
                  className="transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md px-2 py-1"
                >
                  {item.label}
                </a>
              );
            }

            const isActive =
              item.to === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.to || "");

            return (
              <Link
                key={item.label}
                href={item.to ?? "/"}
                tabIndex={0}
                className={`transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md px-2 py-1 ${
                  isActive ? "text-foreground font-semibold" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 테마 토글 + 로그인 드롭다운 */}
        <div className="hidden items-center gap-2 lg:flex ml-auto">
          {/* 테마 토글 버튼 */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg p-2 text-foreground-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={
              theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"
            }
          >
            {theme === "light" ? (
              <Icon name="moon" className="h-5 w-5" />
            ) : (
              <Icon name="sun" className="h-5 w-5" />
            )}
          </button>

          {/* 로그인 드롭다운 */}
          <div
            className="relative"
            onMouseEnter={() => setIsLoginHovered(true)}
            onMouseLeave={() => setIsLoginHovered(false)}
            onFocus={() => setIsLoginHovered(true)}
            onBlur={(e) => {
              // 포커스가 드롭다운 외부로 이동했을 때만 닫기
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsLoginHovered(false);
              }
            }}
          >
            <button
              tabIndex={0}
              className={`flex items-center justify-center rounded-lg p-2 text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isLoginHovered
                  ? "rounded-b-none bg-background"
                  : "hover:bg-background"
              }`}
              aria-label={isLoggedIn ? "사용자 메뉴" : "로그인 메뉴"}
              aria-expanded={isLoginHovered}
              aria-haspopup="true"
            >
              <Icon name="user-circle" className="h-6 w-6" />
            </button>

            {/* 드롭다운 메뉴 */}
            <div
              role="menu"
              aria-label={isLoggedIn ? "사용자 메뉴" : "로그인 메뉴"}
              className={`absolute right-0 top-full transition-all duration-200 ${
                isLoginHovered
                  ? "opacity-100 visible"
                  : "opacity-0 invisible pointer-events-none"
              }`}
            >
              <div className="w-56 rounded-lg rounded-tr-none bg-background p-2 shadow-lg">
                {isLoggedIn ? (
                  <>
                    {/* 로그인 상태: 마이페이지, 로그아웃 */}
                    <Link
                      href="/mypage"
                      role="menuitem"
                      tabIndex={0}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground-muted/10 focus-visible:bg-foreground-muted/10 focus-visible:outline-none"
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
                      마이페이지
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={0}
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground-muted/10 focus-visible:bg-foreground-muted/10 focus-visible:outline-none"
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
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    {/* 비로그인 상태: 소셜 로그인 */}
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={0}
                      onClick={() => {
                        // 현재 경로를 returnTo로 전달
                        const currentPath = window.location.pathname;
                        window.location.href = getKakaoOAuthURL(currentPath);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground-muted/10 focus-visible:bg-foreground-muted/10 focus-visible:outline-none"
                    >
                      <img
                        src="/kakaotalk.png"
                        alt="Kakao"
                        className="h-5 w-5"
                      />
                      카카오로 로그인
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-border p-2 text-foreground-muted transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
          aria-label="메뉴 열기"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          {isMenuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="21" y1="6" y2="6" />
              <line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-6 pt-4 sm:px-6">
            {NAV_ITEMS.map((item) => {
              if (item.href) {
                return (
                  <a
                    key={`mobile-${item.label}`}
                    href={item.href}
                    className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              }

              if (item.to?.startsWith("#")) {
                return (
                  <a
                    key={`mobile-${item.label}`}
                    href={item.to}
                    className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              }

              const isActive =
                item.to === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.to || "");

              return (
                <Link
                  key={`mobile-${item.label}`}
                  href={item.to ?? "/"}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-foreground-muted"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {/* 테마 토글 버튼 (모바일) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 py-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              {theme === "light" ? (
                <>
                  <Icon name="moon" className="h-5 w-5" />
                  <span>다크 모드로 전환</span>
                </>
              ) : (
                <>
                  <Icon name="sun" className="h-5 w-5" />
                  <span>라이트 모드로 전환</span>
                </>
              )}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-full py-2 text-foreground-muted transition-colors hover:text-foreground focus:outline-none"
              aria-label="로그인"
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon name="user-circle" className="h-6 w-6" />
              <span className="font-medium">로그인</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
