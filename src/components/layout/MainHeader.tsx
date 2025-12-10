"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <header className="flex-none sticky top-0 z-50 border-border bg-background-secondary">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
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
            className="hidden h-8 w-auto sm:block brightness-0 invert"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium text-foreground-muted lg:flex">
          {NAV_ITEMS.map((item) => {
            if (item.href) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="transition-colors hover:text-foreground"
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
                  className="transition-colors hover:text-foreground"
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
                className={`transition-colors hover:text-foreground ${
                  isActive ? "text-foreground font-semibold" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 로그인 드롭다운 */}
        <div className="hidden justify-end lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setIsLoginHovered(true)}
            onMouseLeave={() => setIsLoginHovered(false)}
          >
            <button
              className={`flex items-center justify-center rounded-lg p-2 text-foreground-muted transition-colors focus:outline-none ${
                isLoginHovered
                  ? "rounded-b-none bg-background"
                  : "hover:bg-background"
              }`}
              aria-label="로그인"
            >
              <img
                src="/user-icon.svg"
                alt="사용자"
                className="h-6 w-6 brightness-0 invert opacity-70"
              />
            </button>

            {/* 드롭다운 메뉴 */}
            <div
              className={`absolute right-0 top-full transition-all duration-200 ${
                isLoginHovered
                  ? "opacity-100 visible"
                  : "opacity-0 invisible pointer-events-none"
              }`}
            >
              <div className="w-56 rounded-lg rounded-tr-none bg-background p-2 shadow-lg ">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground-muted/10"
                >
                  <img src="/talk.png" alt="Kakao" className="h-5 w-5" />
                  카카오로 로그인
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground-muted/10"
                >
                  <img
                    src="/google-icon.svg"
                    alt="Google"
                    className="h-5 w-5"
                  />
                  구글로 로그인
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-border p-2 text-foreground-muted transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 lg:hidden"
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
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-full py-2 text-foreground-muted transition-colors hover:text-foreground focus:outline-none"
              aria-label="로그인"
              onClick={() => setIsMenuOpen(false)}
            >
              <img
                src="/user-icon.svg"
                alt="사용자"
                className="h-6 w-6 brightness-0 invert opacity-70"
              />
              <span className="font-medium">로그인</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
