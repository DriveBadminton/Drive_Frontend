import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import PageShell from "../../components/layout/PageShell";

interface Participant {
  id: string;
  name: string;
  gender: "남자" | "여자";
  level: string;
}

export default function CreateTournament() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [tournamentName, setTournamentName] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [skipParticipants, setSkipParticipants] = useState(false);

  const [participantName, setParticipantName] = useState("");
  const [participantGender, setParticipantGender] = useState<"남자" | "여자">("남자");
  const [participantLevel, setParticipantLevel] = useState("A");

  const levels = ["A", "B", "C", "D", "E"];

  const addParticipant = () => {
    if (!participantName.trim()) return;

    const newParticipant: Participant = {
      id: `${Date.now()}-${Math.random()}`,
      name: participantName.trim(),
      gender: participantGender,
      level: participantLevel,
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setParticipantName("");
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((participant) => participant.id !== id));
  };

  const createTournament = () => {
    const tournament = {
      id: Date.now().toString(),
      name: tournamentName,
      organizer,
      isPrivate,
      participants: skipParticipants ? [] : participants,
      inviteCode: isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null,
      createdAt: new Date().toISOString(),
    };

    const tournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
    tournaments.push(tournament);
    localStorage.setItem("tournaments", JSON.stringify(tournaments));

    navigate("/tournament-list");
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      navigate("/court_manager");
    }
  };

  return (
    <PageShell mainClassName="bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="뒤로 가기"
          >
            <Icon name="arrow-left" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">대회 생성하기</h1>
        </div>

        <section className="mb-8 rounded-3xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-center gap-4 text-sm sm:gap-8">
            {[1, 2, 3].map((value) => (
              <div key={value} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${
                    step >= value ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {value}
                </div>
                <span className="hidden sm:block font-medium text-gray-600">
                  {value === 1 && "기본 정보"}
                  {value === 2 && "참여자 등록"}
                  {value === 3 && "대회 생성"}
                </span>
                {value < 3 && <div className="hidden h-px w-12 bg-slate-200 sm:block" />}
              </div>
            ))}
          </div>
        </section>

        {step === 1 && (
          <section className="space-y-8 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur lg:p-8">
            <h2 className="text-center text-2xl font-semibold text-gray-900">기본 정보</h2>

            <div>
              <label className="mb-4 block text-lg font-medium text-gray-800">대회 공개 설정</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`rounded-2xl border-2 p-6 transition-transform hover:-translate-y-0.5 ${
                    !isPrivate ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-center">
                    <Icon name="globe" className="mx-auto mb-3 h-8 w-8" />
                    <span className="mb-1 block text-lg font-semibold">공개 대회</span>
                    <p className="text-sm text-gray-600">누구나 참여가 가능한 공개 대회</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`rounded-2xl border-2 p-6 transition-transform hover:-translate-y-0.5 ${
                    isPrivate ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-center">
                    <Icon name="lock" className="mx-auto mb-3 h-8 w-8" />
                    <span className="mb-1 block text-lg font-semibold">비공개 대회</span>
                    <p className="text-sm text-gray-600">초대 코드로만 입장 가능</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-lg font-medium text-gray-800">대회 이름</label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(event) => setTournamentName(event.target.value)}
                  placeholder="대회 이름을 입력하세요"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="mb-2 block text-lg font-medium text-gray-800">주최자</label>
                <input
                  type="text"
                  value={organizer}
                  onChange={(event) => setOrganizer(event.target.value)}
                  placeholder="주최자 이름을 입력하세요"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!tournamentName.trim() || !organizer.trim()}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 py-4 text-lg font-semibold text-white shadow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              다음 단계
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-8 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur lg:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">참여자 등록</h2>
              <span className="text-base text-gray-600">{participants.length}명 등록됨</span>
            </div>

            <div>
              <label className="mb-3 block text-lg font-medium text-gray-800">참여자 등록 방식</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSkipParticipants(false)}
                  className={`rounded-2xl border-2 p-6 transition-transform hover:-translate-y-0.5 ${
                    !skipParticipants ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-center">
                    <Icon name="user-add" className="mx-auto mb-3 h-8 w-8" />
                    <span className="mb-1 block text-lg font-semibold">지금 등록</span>
                    <p className="text-sm text-gray-600">참여자를 미리 등록합니다.</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSkipParticipants(true)}
                  className={`rounded-2xl border-2 p-6 transition-transform hover:-translate-y-0.5 ${
                    skipParticipants ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-center">
                    <Icon name="time" className="mx-auto mb-3 h-8 w-8" />
                    <span className="mb-1 block text-lg font-semibold">나중에 등록</span>
                    <p className="text-sm text-gray-600">대회 생성 후에 등록합니다.</p>
                  </div>
                </button>
              </div>
            </div>

            {!skipParticipants ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-6">
                  <label className="mb-4 block text-lg font-medium text-gray-800">참여자 정보</label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">성별</label>
                        <select
                          value={participantGender}
                          onChange={(event) => setParticipantGender(event.target.value as "남자" | "여자")}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="남자">남자</option>
                          <option value="여자">여자</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">급수</label>
                        <select
                          value={participantLevel}
                          onChange={(event) => setParticipantLevel(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          {levels.map((level) => (
                            <option key={level} value={level}>
                              {level}급
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={participantName}
                        onChange={(event) => setParticipantName(event.target.value)}
                        placeholder="이름을 입력하세요"
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addParticipant();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addParticipant}
                        disabled={!participantName.trim()}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        참여자 추가
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">등록된 참여자</h3>
                  {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-12 text-gray-500">
                      <Icon name="user-add" className="mb-3 h-10 w-10" />
                      <p className="text-sm">참여자를 추가해주세요.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${
                                participant.gender === "남자" ? "bg-blue-500" : "bg-pink-500"
                              }`}
                            >
                              {participant.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                              <p className="text-xs text-gray-600">
                                {participant.gender} · {participant.level}급
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeParticipant(participant.id)}
                            className="text-sm text-red-500 transition-colors hover:text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-12 text-gray-500">
                <Icon name="time" className="mb-3 h-10 w-10" />
                <p className="text-sm">대회 생성 후 참여자를 등록할 수 있습니다.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!skipParticipants && participants.length < 2}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 py-4 text-lg font-semibold text-white shadow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              대회 생성하기
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-8 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur lg:p-8">
            <h2 className="text-center text-2xl font-semibold text-gray-900">대회 생성 확인</h2>

            <div className="space-y-6">
              <div className="rounded-2xl bg-blue-50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-blue-900">대회 정보</h3>
                <dl className="grid grid-cols-1 gap-4 text-blue-800 sm:grid-cols-2">
                  <div className="flex items-center justify-between text-sm">
                    <dt>대회명</dt>
                    <dd className="font-medium">{tournamentName}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <dt>주최자</dt>
                    <dd className="font-medium">{organizer}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <dt>공개 설정</dt>
                    <dd className="font-medium">{isPrivate ? "비공개 대회" : "공개 대회"}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <dt>참여자</dt>
                    <dd className="font-medium">{skipParticipants ? "나중에 등록" : `${participants.length}명`}</dd>
                  </div>
                </dl>
              </div>

              {isPrivate && (
                <div className="rounded-2xl bg-amber-50 p-6 text-amber-800">
                  <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <Icon name="info" className="h-5 w-5" />
                    비공개 대회 안내
                  </div>
                  <p className="text-sm">
                    대회 생성 후 초대 코드가 발급됩니다. 참여자에게 코드를 전달해 대회에 입장하도록 안내하세요.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={createTournament}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 py-4 text-lg font-semibold text-white shadow transition-transform hover:-translate-y-0.5"
            >
              대회 생성하기
            </button>
          </section>
        )}
      </div>
    </PageShell>
  );
}
