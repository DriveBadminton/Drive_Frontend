import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

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

  return (
    <header className="flex-none border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
          <img src="/drive-favicon.svg" alt="Drive Icon" className="h-10 w-10 sm:hidden" />
          <img src="/drive-wordmark.svg" alt="Drive Wordmark" className="hidden h-8 w-auto sm:block" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium text-gray-700 lg:flex">
          {NAV_ITEMS.map((item) => {
            if (item.href) {
              return (
                <a key={item.label} href={item.href} className="transition-colors hover:text-gray-900">
                  {item.label}
                </a>
              );
            }

            if (item.to?.startsWith("#")) {
              return (
                <a key={item.label} href={item.to} className="transition-colors hover:text-gray-900">
                  {item.label}
                </a>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to ?? "/"}
                className={({ isActive }) =>
                  `transition-colors hover:text-gray-900 ${isActive ? "text-gray-900 font-semibold" : ""}`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden w-[140px] justify-end lg:flex">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full border border-blue-500 bg-white px-5 py-2 text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="로그인"
          >
            <img src="/user-icon.svg" alt="사용자" className="h-5 w-5" />
            <span className="font-medium">로그인</span>
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 lg:hidden"
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
        <div className="border-t border-gray-100 bg-white lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-6 pt-4 sm:px-6">
            {NAV_ITEMS.map((item) => {
              if (item.href) {
                return (
                  <a
                    key={`mobile-${item.label}`}
                    href={item.href}
                    className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
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
                    className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <NavLink
                  key={`mobile-${item.label}`}
                  to={item.to ?? "/"}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${isActive ? "text-gray-900" : "text-gray-700"}`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              );
            })}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-full border border-blue-500 bg-white px-5 py-2 text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              aria-label="로그인"
              onClick={() => setIsMenuOpen(false)}
            >
              <img src="/user-icon.svg" alt="사용자" className="h-5 w-5" />
              <span className="font-medium">로그인</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
