import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import PageShell from "../components/layout/PageShell";

interface Tournament {
  id: string;
  name: string;
  organizer: string;
  isPrivate: boolean;
  participants: Array<unknown>;
  inviteCode?: string;
  createdAt: string;
}

export default function CourtManager() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participatingTournaments, setParticipatingTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const storedTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
    setTournaments(storedTournaments);
    setParticipatingTournaments(storedTournaments.slice(0, 2));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  };

  return (
    <PageShell mainClassName="bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center lg:text-left">
          <h1 className="text-xl font-semibold text-gray-900">DRIVE 코트매니저</h1>
          <p className="mt-1 text-sm text-gray-600">대회를 생성하고 관리하세요.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">대회 관리</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate("/create-tournament")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-5 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5"
              >
                <Icon name="plus" className="h-5 w-5" />
                대회 생성하기
              </button>
              <button
                type="button"
                onClick={() => navigate("/tournament-search")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-5 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5"
              >
                <Icon name="user-add" className="h-5 w-5" />
                대회 참여하기
              </button>
              <button
                type="button"
                onClick={() => navigate("/tournament-search")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-5 text-sm font-semibold text-blue-600 transition-transform hover:-translate-y-0.5 hover:border-blue-300"
              >
                <Icon name="checklist" className="h-5 w-5" />
                대회 목록 보기
              </button>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">참여 중인 대회</h3>
              {participatingTournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-10">
                  <Icon name="trophy" className="mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-600">참여 중인 대회가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participatingTournaments.map((tournament) => (
                    <div key={tournament.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{tournament.name}</p>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          진행중
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatDate(tournament.createdAt)} · 주최자: {tournament.organizer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">대회 참여 이력</h3>
              {tournaments.length <= 2 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-10">
                  <Icon name="history" className="mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-600">대회 참여 이력이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tournaments.slice(2, 5).map((tournament) => (
                    <div key={tournament.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{tournament.name}</p>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          완료
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatDate(tournament.createdAt)} · 주최자: {tournament.organizer}
                      </p>
                    </div>
                  ))}
                  {tournaments.length > 5 && (
                    <button
                      type="button"
                      onClick={() => navigate("/tournament-list")}
                      className="w-full text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                    >
                      더 보기 ({tournaments.length - 5}개)
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
