// src/pages/Home.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [revealTournaments, setRevealTournaments] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tournamentsSectionRef = useRef<HTMLElement | null>(null);

  const navLinks = [
    { href: "#", label: "공지 사항" },
    { href: "#", label: "회사 소개" },
    { href: "#tournaments", label: "대회 일정" },
    { href: "#finished-tournaments", label: "대회 기록" },
    { href: "#", label: "선수 검색" },
    { href: "#", label: "클럽 찾기" },
    { href: "#", label: "구장 예약" },
  ];

  const tournamentSections = [
    { id: "current-tournaments", title: "진행 중인 대회" },
    { id: "upcoming-tournaments", title: "예정된 대회" },
    { id: "finished-tournaments", title: "종료된 대회" },
  ];

  const placeholderCards = Array.from({ length: 5 }, (_, index) => index);

  useEffect(() => {
    const el = tournamentsSectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          setRevealTournaments(true);
        }
      },
      { threshold: [0, 0.2, 0.5] }
    );
    io.observe(el);

    return () => io.disconnect();
  }, []);
  return (
    <section className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/drive-favicon.svg" alt="Drive Icon" className="h-10 w-10 sm:hidden" />
            <img
              src="/drive-wordmark.svg"
              alt="Drive Wordmark"
              className="hidden h-8 w-auto sm:block"
            />
          </a>

          <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium text-gray-700 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-gray-900"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden w-[140px] justify-end lg:flex">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-full border border-blue-500 bg-white px-5 py-2 text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              aria-label="로그인"
            >
              <img src="/user-icon.svg" alt="사용자" className="h-5 w-5 text-blue-600" />
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              {navLinks.map((link) => (
                <a
                  key={`mobile-${link.label}`}
                  href={link.href}
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-full border border-blue-500 bg-white px-5 py-2 text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                aria-label="로그인"
                onClick={() => setIsMenuOpen(false)}
              >
                <img src="/user-icon.svg" alt="사용자" className="h-5 w-5 text-blue-600" />
                <span className="font-medium">로그인</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
        {/*로고*/}
        <img src="/drive-logo.svg" alt="Drive Logo" className="h-24 w-auto sm:h-32 lg:h-44" />
        {/*검색창*/}
        <div className="flex w-full justify-center pt-6 pb-20">
          <div className="relative w-full max-w-3xl">
            <input
              type="text"
              placeholder="선수 이름 또는 대회 이름을 입력하세요."
              className="
                h-12 w-full rounded-full bg-white pl-11 pr-11
                ring-1 ring-gray-300 shadow-sm
                focus:placeholder-transparent
                placeholder:text-gray-400 text-center
                focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              aria-label="검색"
            />
            {/* 돋보기 아이콘 */}
            <span
              className="
              pointer-events-none absolute
              left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
          </div>
        </div>

        {/*스크롤 다운 아이콘*/}
        <div
          onClick={() => {
            document
              .getElementById("tournaments")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center mt-8 cursor-pointer"
        >
          <p className="text-xl font-semibold ">대회 현황 보러가기</p>
          <img
            src="/scroll-down.svg"
            alt="Scroll Down"
            className="h-[80px] w-auto opacity-50 animate-[float-fade_2.8s_ease-in-out_infinite]"
          />
        </div>
      </main>
      {/*대회 섹션*/}
      <section
        ref={tournamentsSectionRef}
        className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
        id="tournaments"
      >
        <div
          className={`pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/50 via-white/80 to-white/100 transition-opacity duration-700 ${
            revealTournaments ? "opacity-0" : "opacity-100"
          }`}
        />

        <div className="relative z-10 space-y-16 pt-12 lg:pt-20">
          {tournamentSections.map((section) => (
            <div key={section.id} id={section.id} className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {placeholderCards.map((card) => (
                  <img
                    key={`${section.id}-${card}`}
                    src="/tournament-example.jpg"
                    alt={`${section.title} ${card + 1}`}
                    className="h-56 w-full rounded-2xl object-cover shadow-sm"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      {/*footer*/}
      <footer className="mt-24 border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {/* Logo and description */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src="/drive-favicon.svg" alt="Drive Icon" className="h-10 w-10" />
                <span className="text-lg font-semibold text-gray-900">DRIVE</span>
              </div>
              <p className="text-sm text-gray-500">
                Drive는 대한민국 동호인 스포츠를 응원합니다.
              </p>
            </div>

            {/* Links column 1 */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                서비스
              </h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    공지사항
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    회사소개
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    개인정보처리방침
                  </a>
                </li>
              </ul>
            </div>

            {/* Links column 2 */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                대회
              </h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    대회 일정
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    대회 기록
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    선수 검색
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-gray-900">
                    클럽 찾기
                  </a>
                </li>
              </ul>
            </div>

            {/* Social links */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                SNS
              </h3>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 transition-colors hover:text-gray-500">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-center text-sm text-gray-400">
              &copy; 2025 Drive. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
