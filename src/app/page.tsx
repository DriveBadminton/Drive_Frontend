"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../components/layout/PageShell";
import { Button } from "../components/Button";
import Icon from "../components/Icon";

export default function Home() {
  const router = useRouter();
  const [revealTournaments, setRevealTournaments] = useState(false);

  const tournamentsSectionRef = useRef<HTMLElement | null>(null);

  const tournamentSections = [
    { id: "current-tournaments", title: "진행 중인 대회", type: "current" },
    { id: "upcoming-tournaments", title: "예정된 대회", type: "upcoming" },
    { id: "finished-tournaments", title: "종료된 대회", type: "finished" },
  ];

  const placeholderCards: any[] = []; // Start with empty state to show the improvement

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
      {/* Hero Section */}
      <section className="relative mx-auto flex min-h-[500px] w-full max-w-7xl flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
        {/* Background Decorative */}
        {/* Background Decorative */}
        <div className="absolute top-0 -z-10 h-full w-full overflow-hidden">
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-green-200 to-emerald-200 blur-[100px] opacity-40 animate-pulse" />
          <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-100 blur-[80px] opacity-30" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-yellow-100 blur-[60px] opacity-30" />
        </div>

        {/* 로고 */}
        <img
          src="/drive-logo.svg"
          alt="Drive Logo"
          className="mb-8 h-24 w-auto drop-shadow-sm sm:h-32 lg:h-44"
        />



        {/* 검색창 */}
        <div className="flex w-full justify-center pb-12">
          <div className="relative w-full max-w-2xl transform transition-all hover:scale-105">
            <div className="absolute inset-0 -z-10 rounded-full bg-white/40 blur-xl"></div>
            <input
              type="text"
              placeholder="선수 이름 또는 대회 이름을 입력하세요."
              className="h-16 w-full rounded-full bg-white/80 backdrop-blur-md pl-16 pr-6 shadow-2xl ring-1 ring-white/50 transition-all placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-green-500/50 focus:bg-white"
              aria-label="검색"
            />
            <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-gray-500">
              <Icon name="search" className="h-6 w-6" />
            </span>
          </div>
        </div>

        {/* 스크롤 다운 아이콘 */}
        <div
          onClick={() => {
            document
              .getElementById("tournaments")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="group mt-4 flex cursor-pointer flex-col items-center transition-opacity hover:opacity-80"
        >
          <p className="text-sm font-semibold text-gray-500 mb-2">대회 현황 보러가기</p>
          <div className="rounded-full bg-white p-2 shadow-md ring-1 ring-gray-100">
            <Icon name="chevron-down" className="h-6 w-6 text-green-600 animate-bounce" />
          </div>
        </div>
      </section>

      {/* 대회 섹션 */}
      <section
        ref={tournamentsSectionRef}
        className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8"
        id="tournaments"
      >
        <div
          className={`pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/50 via-slate-50/80 to-slate-50/100 transition-opacity duration-700 ${revealTournaments ? "opacity-0" : "opacity-100"
            }`}
        />

        <div className="relative z-10 space-y-20 pt-12">
          {tournamentSections.map((section) => (
            <div key={section.id} id={section.id} className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                {placeholderCards.length > 0 && (
                  <span className="text-sm font-medium text-green-600 cursor-pointer hover:underline">더보기 &rarr;</span>
                )}
              </div>

              <div className="min-h-[200px]">
                {placeholderCards.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {placeholderCards.map((card: any) => (
                      <div key={card} className="bg-white p-6 rounded-xl shadow-sm">Card</div>
                    ))}
                  </div>
                ) : (
                  // Empty State
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-lg transition-all hover:shadow-xl">
                    <div className="mb-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-inner">
                      <Icon name="trophy" className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">등록된 대회가 없습니다</h3>
                    <p className="mb-8 max-w-sm text-gray-500">
                      현재 {section.title.replace(/[^가-힣\s]/g, "")}가 없습니다.<br />
                      새로운 대회를 직접 개최하여 시작해보세요!
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/create-tournament')}
                      className="rounded-full px-8 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      대회 생성하기
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
