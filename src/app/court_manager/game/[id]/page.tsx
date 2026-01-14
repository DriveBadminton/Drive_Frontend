"use client";

import { useState, useEffect, use } from "react";
import PageShell from "../../../../components/layout/PageShell";
import Select from "../../../../components/Select";
import { useAuth } from "@/hooks/useAuth";
import {
  Game,
  Participant,
  CourtMatch,
  GameStatus,
  MatchResult,
  getGameById,
  updateMatchResult,
  updateGameStatus,
  updateAllMatchStatus,
  addParticipant,
  getGradeLabel,
  getGameTypeLabel,
  getGameStatusLabel,
  determineGameType,
  Gender,
  Grade,
  AgeGroup,
} from "@/lib/game";

const GRADES: { value: Grade; label: string }[] = [
  { value: "ROOKIE", label: "초심" },
  { value: "D", label: "D" },
  { value: "C", label: "C" },
  { value: "B", label: "B" },
  { value: "A", label: "A" },
  { value: "S", label: "S" },
  { value: "SS", label: "SS" },
];

// UI용 연령대 문자열 타입
type AgeGroupUI = "20" | "30" | "40" | "50" | "60" | "70";

const AGE_GROUPS: { value: AgeGroupUI; label: string }[] = [
  { value: "20", label: "20대" },
  { value: "30", label: "30대" },
  { value: "40", label: "40대" },
  { value: "50", label: "50대" },
  { value: "60", label: "60대" },
  { value: "70", label: "70대+" },
];

// UI 문자열을 API 숫자로 변환
const ageGroupToNumber = (ageGroupUI: AgeGroupUI): AgeGroup =>
  parseInt(ageGroupUI, 10) as AgeGroup;

const GAME_STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "PENDING", label: "미진행" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "COMPLETED", label: "완료" },
];

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gameId } = use(params);
  const { user, isLoggedIn } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"rounds" | "participants">(
    "rounds"
  );

  // 참가자 추가 모달
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantGender, setNewParticipantGender] =
    useState<Gender>("MALE");
  const [newParticipantGrade, setNewParticipantGrade] = useState<Grade>("D");
  const [newParticipantAge, setNewParticipantAge] = useState<AgeGroupUI>("30");

  // 상태 변경 모달
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<GameStatus>("PENDING");
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // 운영자 여부 확인
  const isOperator = isLoggedIn && game?.createdBy === user?.id;

  // 게임 데이터 로드
  useEffect(() => {
    async function loadGame() {
      setIsLoading(true);
      setError(null);

      try {
        const gameData = await getGameById(gameId);

        if (!gameData) {
          setError("게임을 찾을 수 없습니다.");
          return;
        }

        setGame(gameData);
      } catch (err) {
        console.error("게임 로드 실패:", err);
        setError("게임을 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    loadGame();
  }, [gameId]);

  // 경기 결과 변경
  const handleMatchResultChange = async (
    matchId: string,
    result: MatchResult
  ) => {
    if (!game || !isOperator) return;

    const success = await updateMatchResult(gameId, matchId, result);

    if (success) {
      setGame({
        ...game,
        courtMatches: game.courtMatches.map((m) =>
          m.id === matchId ? { ...m, result } : m
        ),
      });
    }
  };

  // 게임 상태 변경
  const handleGameStatusChange = async () => {
    if (!game || !isOperator) return;

    setIsChangingStatus(true);

    try {
      const success = await updateGameStatus(gameId, selectedStatus);

      if (success) {
        setGame({ ...game, status: selectedStatus });
        setShowStatusModal(false);
      }
    } finally {
      setIsChangingStatus(false);
    }
  };

  // 모든 경기 상태 일괄 변경
  const handleBulkStatusChange = async (status: GameStatus) => {
    if (!game || !isOperator) return;

    const success = await updateAllMatchStatus(gameId, status);

    if (success) {
      setGame({
        ...game,
        courtMatches: game.courtMatches.map((m) => ({ ...m, status })),
      });
    }
  };

  // 참가자 추가
  const handleAddParticipant = async () => {
    if (!game || !isOperator || !newParticipantName.trim()) return;

    const newParticipant = await addParticipant(gameId, {
      name: newParticipantName.trim(),
      gender: newParticipantGender,
      grade: newParticipantGrade,
      ageGroup: ageGroupToNumber(newParticipantAge),
    });

    if (newParticipant) {
      setGame({
        ...game,
        participants: [...game.participants, newParticipant],
      });
      setNewParticipantName("");
      setShowAddParticipantModal(false);
    }
  };

  // 라운드별 그룹화
  const getRoundMatches = (roundNumber: number) => {
    return (
      game?.courtMatches.filter((m) => m.roundNumber === roundNumber) || []
    );
  };

  // 참가자 ID로 이름 찾기
  const getParticipantName = (id: string) => {
    return game?.participants.find((p) => p.id === id)?.name || "Unknown";
  };

  // 참가자 정보 찾기
  const getParticipant = (id: string) => {
    return game?.participants.find((p) => p.id === id);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-foreground-muted">
              게임 정보를 불러오는 중...
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  // 에러
  if (error || !game) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {error || "게임을 찾을 수 없습니다"}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              링크가 올바른지 확인해주세요
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                {game.title}
              </h1>
              <p className="mt-2 text-sm text-foreground-muted">
                코트 {game.courtCount}개 • 라운드 {game.roundCount}개 • 참가자{" "}
                {game.participants.length}명
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* 게임 상태 배지 */}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  game.status === "COMPLETED"
                    ? "bg-green-500/20 text-green-400"
                    : game.status === "IN_PROGRESS"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-foreground-muted/20 text-foreground-muted"
                }`}
              >
                {getGameStatusLabel(game.status)}
              </span>

              {/* 운영자 전용 버튼 */}
              {isOperator && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus(game.status);
                    setShowStatusModal(true);
                  }}
                  className="rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  상태 변경
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-6 flex gap-1 rounded-xl bg-background-secondary p-1">
          <button
            type="button"
            onClick={() => setActiveTab("rounds")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "rounds"
                ? "bg-primary text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            경기표
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("participants")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "participants"
                ? "bg-primary text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            참가자 ({game.participants.length})
          </button>
        </div>

        {/* 경기표 탭 */}
        {activeTab === "rounds" && (
          <div className="space-y-6">
            {Array.from({ length: game.roundCount }, (_, roundIdx) => {
              const roundNumber = roundIdx + 1;
              const roundMatches = getRoundMatches(roundNumber);

              return (
                <div
                  key={roundNumber}
                  className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border"
                >
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    라운드 {roundNumber}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {roundMatches.map((match) => {
                      const p1 = getParticipant(match.player1Id);
                      const p2 = getParticipant(match.player2Id);
                      const p3 = getParticipant(match.player3Id);
                      const p4 = getParticipant(match.player4Id);

                      const gameType = match.gameType
                        ? {
                            type: match.gameType,
                            label: getGameTypeLabel(match.gameType),
                          }
                        : determineGameType(
                            game.participants,
                            match.player1Id,
                            match.player2Id,
                            match.player3Id,
                            match.player4Id
                          );

                      return (
                        <div
                          key={
                            match.id ||
                            `${match.roundNumber}-${match.courtNumber}`
                          }
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              코트 {match.courtNumber}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-md ${
                                  gameType.type === "MEN_DOUBLES"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : gameType.type === "WOMEN_DOUBLES"
                                    ? "bg-pink-500/20 text-pink-400"
                                    : gameType.type === "MIXED_DOUBLES"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : gameType.type === "CROSS_DOUBLES"
                                    ? "bg-green-500/20 text-green-400"
                                    : gameType.type === "OTHER_DOUBLES"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-foreground-muted/20 text-foreground-muted"
                                }`}
                              >
                                {gameType.label}
                              </span>
                            </div>
                          </div>

                          {/* 팀 구성 */}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            {/* 팀 1 */}
                            <div
                              className={`rounded-lg p-3 ${
                                match.result === "TEAM1_WIN"
                                  ? "bg-green-500/10 ring-1 ring-green-500/30"
                                  : match.result === "TEAM2_WIN"
                                  ? "bg-red-500/10 opacity-60"
                                  : "bg-background-secondary"
                              }`}
                            >
                              <div className="space-y-1">
                                <p className="text-sm text-foreground">
                                  <span
                                    className={
                                      p1?.gender === "MALE"
                                        ? "text-blue-400"
                                        : "text-pink-400"
                                    }
                                  >
                                    {p1?.name || "-"}
                                  </span>
                                  {p1 && (
                                    <span className="ml-1 text-xs text-foreground-muted">
                                      {getGradeLabel(p1.grade)}
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-foreground">
                                  <span
                                    className={
                                      p2?.gender === "MALE"
                                        ? "text-blue-400"
                                        : "text-pink-400"
                                    }
                                  >
                                    {p2?.name || "-"}
                                  </span>
                                  {p2 && (
                                    <span className="ml-1 text-xs text-foreground-muted">
                                      {getGradeLabel(p2.grade)}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {match.result === "TEAM1_WIN" && (
                                <div className="mt-2 text-xs font-medium text-green-400">
                                  승리
                                </div>
                              )}
                            </div>

                            {/* VS */}
                            <span className="text-lg font-bold text-foreground-muted">
                              VS
                            </span>

                            {/* 팀 2 */}
                            <div
                              className={`rounded-lg p-3 ${
                                match.result === "TEAM2_WIN"
                                  ? "bg-green-500/10 ring-1 ring-green-500/30"
                                  : match.result === "TEAM1_WIN"
                                  ? "bg-red-500/10 opacity-60"
                                  : "bg-background-secondary"
                              }`}
                            >
                              <div className="space-y-1">
                                <p className="text-sm text-foreground">
                                  <span
                                    className={
                                      p3?.gender === "MALE"
                                        ? "text-blue-400"
                                        : "text-pink-400"
                                    }
                                  >
                                    {p3?.name || "-"}
                                  </span>
                                  {p3 && (
                                    <span className="ml-1 text-xs text-foreground-muted">
                                      {getGradeLabel(p3.grade)}
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-foreground">
                                  <span
                                    className={
                                      p4?.gender === "MALE"
                                        ? "text-blue-400"
                                        : "text-pink-400"
                                    }
                                  >
                                    {p4?.name || "-"}
                                  </span>
                                  {p4 && (
                                    <span className="ml-1 text-xs text-foreground-muted">
                                      {getGradeLabel(p4.grade)}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {match.result === "TEAM2_WIN" && (
                                <div className="mt-2 text-xs font-medium text-green-400">
                                  승리
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 운영자: 결과 입력 */}
                          {isOperator && match.id && (
                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleMatchResultChange(
                                    match.id!,
                                    match.result === "TEAM1_WIN"
                                      ? null
                                      : "TEAM1_WIN"
                                  )
                                }
                                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                  match.result === "TEAM1_WIN"
                                    ? "bg-green-500 text-white"
                                    : "border border-border bg-background text-foreground hover:bg-background-secondary"
                                }`}
                              >
                                팀1 승
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMatchResultChange(
                                    match.id!,
                                    match.result === "TEAM2_WIN"
                                      ? null
                                      : "TEAM2_WIN"
                                  )
                                }
                                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                  match.result === "TEAM2_WIN"
                                    ? "bg-green-500 text-white"
                                    : "border border-border bg-background text-foreground hover:bg-background-secondary"
                                }`}
                              >
                                팀2 승
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 참가자 탭 */}
        {activeTab === "participants" && (
          <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                참가자 목록
              </h3>
              {isOperator && (
                <button
                  type="button"
                  onClick={() => setShowAddParticipantModal(true)}
                  className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  + 참가자 추가
                </button>
              )}
            </div>

            <div className="space-y-2">
              {/* 헤더 */}
              <div className="grid grid-cols-[1fr_60px_60px_60px] gap-3 px-3 py-2 text-xs font-medium text-foreground-muted">
                <span>이름</span>
                <span className="text-center">성별</span>
                <span className="text-center">급수</span>
                <span className="text-center">나이</span>
              </div>

              {game.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="grid grid-cols-[1fr_60px_60px_60px] gap-3 items-center rounded-lg bg-background px-3 py-3"
                >
                  <span className="text-sm text-foreground">
                    {participant.name}
                  </span>
                  <span
                    className={`text-xs text-center px-2 py-1 rounded-md ${
                      participant.gender === "MALE"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-pink-500/20 text-pink-400"
                    }`}
                  >
                    {participant.gender === "MALE" ? "남" : "여"}
                  </span>
                  <span className="text-xs text-center text-foreground-muted">
                    {getGradeLabel(participant.grade)}
                  </span>
                  <span className="text-xs text-center text-foreground-muted">
                    {participant.ageGroup}대
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 상태 변경 모달 */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStatusModal(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
            <h3 className="text-xl font-semibold text-foreground">
              게임 상태 변경
            </h3>

            <div className="mt-6 space-y-3">
              {GAME_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    selectedStatus === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-background-secondary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleGameStatusChange}
                disabled={isChangingStatus}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {isChangingStatus ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 참가자 추가 모달 */}
      {showAddParticipantModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddParticipantModal(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
            <h3 className="text-xl font-semibold text-foreground">
              참가자 추가
            </h3>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  이름
                </label>
                <input
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="이름 입력"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    성별
                  </label>
                  <Select
                    value={newParticipantGender}
                    onChange={(v) => setNewParticipantGender(v as Gender)}
                    options={[
                      { value: "MALE", label: "남" },
                      { value: "FEMALE", label: "여" },
                    ]}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    급수
                  </label>
                  <Select
                    value={newParticipantGrade}
                    onChange={(v) => setNewParticipantGrade(v as Grade)}
                    options={GRADES}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    나이
                  </label>
                  <Select
                    value={newParticipantAge}
                    onChange={(v) => setNewParticipantAge(v as AgeGroupUI)}
                    options={AGE_GROUPS}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddParticipantModal(false)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddParticipant}
                disabled={!newParticipantName.trim()}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
