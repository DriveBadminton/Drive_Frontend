// src/pages/Home.tsx
import { useEffect, useRef, useState } from "react";
import PageShell from "../components/layout/PageShell";

export default function Home() {
  const [revealTournaments, setRevealTournaments] = useState(false);

  const tournamentsSectionRef = useRef<HTMLElement | null>(null);

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
    <PageShell>
      <section className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
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
      </section>
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
    </PageShell>
  );
}
