// src/pages/Home.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import { Button } from "../components/Button";
import Icon from "../components/Icon";

export default function Home() {
  const navigate = useNavigate();
  const [revealTournaments, setRevealTournaments] = useState(false);

  const tournamentsSectionRef = useRef<HTMLElement | null>(null);

  const tournamentSections = [
    { id: "current-tournaments", title: "진행 중인 대회 🏸", type: "current" },
    { id: "upcoming-tournaments", title: "예정된 대회 📅", type: "upcoming" },
    { id: "finished-tournaments", title: "종료된 대회 🏆", type: "finished" },
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
        <div className="absolute top-0 -z-10 h-full w-full opacity-30">
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-200 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-100 blur-3xl" />
        </div>

        {/* 로고 */}
        <img
          src="/drive-logo.svg"
          alt="Drive Logo"
          className="mb-8 h-24 w-auto drop-shadow-sm sm:h-32 lg:h-44"
        />

        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Badminton Tournament <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 to-emerald-600">Management</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
          대회를 쉽고 간편하게 관리하세요. <br />선수 등록부터 대진표 생성까지, 드라이브가 함께합니다.
        </p>

        {/* 검색창 */}
        <div className="flex w-full justify-center pb-12">
          <div className="relative w-full max-w-2xl group">
            <input
              type="text"
              placeholder="선수 이름 또는 대회 이름을 입력하세요."
              className="
                h-14 w-full rounded-full bg-white pl-14 pr-6
                shadow-lg ring-1 ring-gray-200 transition-all
                placeholder:text-gray-400
                focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:shadow-green-100
              "
              aria-label="검색"
            />
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors">
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
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
                    <div className="mb-4 rounded-full bg-white p-4 shadow-sm ring-1 ring-gray-100">
                      <Icon name="trophy" className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">등록된 대회가 없습니다.</h3>
                    <p className="mt-1 mb-6 text-sm text-gray-500 max-w-sm">
                      현재 {section.title.replace(/[^가-힣\s]/g, "")}가 없습니다.<br />
                      새로운 대회를 직접 개최해보세요!
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/create-tournament')}
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
