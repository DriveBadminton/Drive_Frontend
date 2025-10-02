import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import PageShell from "../../components/layout/PageShell";

interface Tournament {
  id: string;
  name: string;
  organizer: string;
  isPrivate: boolean;
  participants: Array<unknown>;
  inviteCode?: string;
  createdAt: string;
}

export default function TournamentList() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const storedTournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
    setTournaments(storedTournaments);
  }, []);

  const handleInvite = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowInviteModal(true);
  };

  const copyInviteCode = () => {
    if (selectedTournament?.inviteCode) {
      navigator.clipboard.writeText(selectedTournament.inviteCode);
      alert("초대 코드가 복사되었습니다!");
    }
  };

  const joinPublicTournament = (tournament: Tournament) => {
    alert(`"${tournament.name}" 공개 대회에 참여 요청이 완료되었습니다!`);
    navigate(`/tournament/${tournament.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filteredTournaments = tournaments.filter(
    (tournament) =>
      tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.organizer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell mainClassName="bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/court_manager")}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="뒤로 가기"
          >
            <Icon name="arrow-left" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">대회 검색</h1>
        </div>

        <section className="mb-8 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-sm backdrop-blur lg:p-6">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="대회 이름 또는 주최자로 검색..."
              className="w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          {searchTerm && (
            <p className="mt-3 text-sm text-gray-600">
              "{searchTerm}"에 대한 검색 결과: {filteredTournaments.length}개
            </p>
          )}
        </section>

        {filteredTournaments.length === 0 ? (
          <div className="rounded-3xl border border-white/40 bg-white/80 p-10 text-center shadow-sm backdrop-blur">
            {searchTerm ? (
              <>
                <Icon name="search" className="mx-auto mb-4 h-12 w-12 text-gray-300" strokeWidth={1.6} />
                <h3 className="mb-2 text-lg font-medium text-gray-900">검색 결과가 없습니다</h3>
                <p className="mb-6 text-gray-600">다른 검색어로 시도해보세요</p>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
                >
                  전체 대회 보기
                </button>
              </>
            ) : (
              <>
                <Icon name="trophy" className="mx-auto mb-4 h-12 w-12 text-gray-300" strokeWidth={1.6} />
                <h3 className="mb-2 text-lg font-medium text-gray-900">생성된 대회가 없습니다</h3>
                <p className="mb-6 text-gray-600">첫 번째 대회를 생성해보세요!</p>
                <button
                  type="button"
                  onClick={() => navigate("/create-tournament")}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
                >
                  대회 생성하기
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredTournaments.map((tournament) => (
              <article
                key={tournament.id}
                className="rounded-3xl border border-white/40 bg-white/90 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
                      {tournament.isPrivate ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <Icon name="lock" className="h-3.5 w-3.5" strokeWidth={2} />
                          비공개
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <Icon name="globe" className="h-3.5 w-3.5" strokeWidth={2} />
                          공개
                        </span>
                      )}
                    </div>
                    <dl className="space-y-1 text-sm text-gray-600">
                      <div>
                        <dt className="sr-only">주최자</dt>
                        <dd>주최자: {tournament.organizer}</dd>
                      </div>
                      <div>
                        <dt className="sr-only">참가자</dt>
                        <dd>참여자: {tournament.participants.length}명</dd>
                      </div>
                      <div>
                        <dt className="sr-only">생성일</dt>
                        <dd>생성일: {formatDate(tournament.createdAt)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {tournament.isPrivate ? (
                    <button
                      type="button"
                      onClick={() => handleInvite(tournament)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition-transform"
                    >
                      <Icon name="share" className="h-4 w-4" />
                      초대하기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinPublicTournament(tournament)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition-transform"
                    >
                      <Icon name="user-add" className="h-4 w-4" />
                      참여하기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-transform hover:-translate-y-0.5 hover:border-gray-300"
                  >
                    <Icon name="eye" className="h-4 w-4" />
                    상세보기
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showInviteModal && selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Icon name="share" className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">대회 초대하기</h3>
              <p className="mt-1 text-sm text-gray-600">{selectedTournament.name}</p>
            </div>

            <div className="mb-6 rounded-2xl bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">초대 코드</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={selectedTournament.inviteCode || ""}
                  readOnly
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest"
                />
                <button
                  type="button"
                  onClick={copyInviteCode}
                  className="inline-flex h-10 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow hover:-translate-y-0.5 transition-transform"
                  aria-label="초대 코드 복사"
                >
                  <Icon name="copy" className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">이 코드를 참여자들과 공유하세요.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-transform hover:-translate-y-0.5"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
