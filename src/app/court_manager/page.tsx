"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import PageShell from "../../components/layout/PageShell";
import Tooltip from "../../components/Tooltip";
import Select from "../../components/Select";

type ViewMode = "main" | "game-create" | "game-matchup";

type Participant = {
  id: string;
  name: string;
  grade: string;
};

type GameMatch = {
  courtNumber: number;
  matchNumber: number; // 매치 번호 추가
  player1: string;
  player2: string;
  player3: string;
  player4: string;
};

const GRADES = ["초심", "D조", "C조", "B조", "A조"] as const;

export default function CourtManager() {
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [courtCount, setCourtCount] = useState(1);
  const [gamesPerCourt, setGamesPerCourt] = useState<number>(1);
  const [maleParticipants, setMaleParticipants] = useState<Participant[]>([]);
  const [femaleParticipants, setFemaleParticipants] = useState<Participant[]>(
    []
  );
  const [gameMatches, setGameMatches] = useState<GameMatch[]>([]);

  const maleInputRef = useRef<HTMLInputElement>(null);
  const femaleInputRef = useRef<HTMLInputElement>(null);

  // 매치업 화면 진입 시 기본 매칭 초기화
  useEffect(() => {
    if (viewMode === "game-matchup" && gameMatches.length === 0) {
      const matches: GameMatch[] = [];
      for (let matchNum = 1; matchNum <= gamesPerCourt; matchNum++) {
        for (let courtNum = 1; courtNum <= courtCount; courtNum++) {
          matches.push({
            courtNumber: courtNum,
            matchNumber: matchNum,
            player1: "",
            player2: "",
            player3: "",
            player4: "",
          });
        }
      }
      setGameMatches(matches);
    }
  }, [viewMode, courtCount, gamesPerCourt, gameMatches.length]);

  // 남자 참가자 추가
  const handleAddMaleParticipant = (name: string) => {
    if (!name.trim()) return;
    const newParticipant: Participant = {
      id: `male-${Date.now()}-${Math.random()}`,
      name: name.trim(),
      grade: "D조",
    };
    setMaleParticipants([...maleParticipants, newParticipant]);
    if (maleInputRef.current) {
      maleInputRef.current.value = "";
    }
  };

  // 여자 참가자 추가
  const handleAddFemaleParticipant = (name: string) => {
    if (!name.trim()) return;
    const newParticipant: Participant = {
      id: `female-${Date.now()}-${Math.random()}`,
      name: name.trim(),
      grade: "D조",
    };
    setFemaleParticipants([...femaleParticipants, newParticipant]);
    if (femaleInputRef.current) {
      femaleInputRef.current.value = "";
    }
  };

  // 남자 참가자 급수 변경
  const handleMaleGradeChange = (id: string, grade: string) => {
    setMaleParticipants(
      maleParticipants.map((p) => (p.id === id ? { ...p, grade } : p))
    );
  };

  // 여자 참가자 급수 변경
  const handleFemaleGradeChange = (id: string, grade: string) => {
    setFemaleParticipants(
      femaleParticipants.map((p) => (p.id === id ? { ...p, grade } : p))
    );
  };

  // 남자 참가자 삭제
  const handleRemoveMaleParticipant = (id: string) => {
    setMaleParticipants(maleParticipants.filter((p) => p.id !== id));
  };

  // 여자 참가자 삭제
  const handleRemoveFemaleParticipant = (id: string) => {
    setFemaleParticipants(femaleParticipants.filter((p) => p.id !== id));
  };

  // 게임 매칭 초기화
  const initializeGameMatches = (count?: number) => {
    const currentCourtCount = count ?? courtCount;

    const matches: GameMatch[] = [];
    for (let matchNum = 1; matchNum <= gamesPerCourt; matchNum++) {
      for (let courtNum = 1; courtNum <= currentCourtCount; courtNum++) {
        matches.push({
          courtNumber: courtNum,
          matchNumber: matchNum,
          player1: "",
          player2: "",
          player3: "",
          player4: "",
        });
      }
    }
    setGameMatches(matches);
  };

  // 참가자 리스트 (게임 수 계산용)
  const allParticipants = [
    ...maleParticipants.map((p) => ({ ...p, gender: "male" as const })),
    ...femaleParticipants.map((p) => ({ ...p, gender: "female" as const })),
  ];

  // 각 참가자의 게임 수 계산
  const getGameCount = (participantName: string) => {
    let count = 0;
    gameMatches.forEach((match) => {
      if (
        match.player1 === participantName ||
        match.player2 === participantName ||
        match.player3 === participantName ||
        match.player4 === participantName
      ) {
        count++;
      }
    });
    return count;
  };

  // 게임 생성으로 이동 (첫 번째 단계)
  const handleGameCreate = () => {
    setViewMode("game-create");
    setCourtCount(1);
    setGamesPerCourt(1);
    setMaleParticipants([]);
    setFemaleParticipants([]);
    setGameMatches([]);
  };

  // 매치업 설정으로 이동 (두 번째 단계)
  const handleGoToMatchup = () => {
    if (allParticipants.length === 0) {
      alert("최소 1명의 참가자를 추가해주세요.");
      return;
    }
    setViewMode("game-matchup");
  };

  // 첫 번째 단계로 돌아가기
  const handleBackToCreate = () => {
    setViewMode("game-create");
  };

  // 대회 생성 (추후 구현)
  const handleTournamentCreate = () => {
    // TODO: 추후 구현
    console.log("대회 생성 (추후 구현)");
  };

  // 게임 매칭 드롭다운 옵션 생성
  const getParticipantOptions = (
    courtNumber: number,
    currentMatch: GameMatch,
    excludeField?: "player1" | "player2" | "player3" | "player4"
  ) => {
    // 같은 매치 번호의 모든 코트에서 이미 선택된 선수들 수집
    const selectedPlayers = new Set<string>();
    gameMatches.forEach((m) => {
      if (m.matchNumber === currentMatch.matchNumber) {
        // 현재 매치가 아니거나, 현재 필드가 아닌 경우에만 수집
        const isCurrentMatch =
          m.courtNumber === currentMatch.courtNumber &&
          m.matchNumber === currentMatch.matchNumber;
        if (!isCurrentMatch || excludeField !== "player1") {
          if (m.player1) selectedPlayers.add(m.player1);
        }
        if (!isCurrentMatch || excludeField !== "player2") {
          if (m.player2) selectedPlayers.add(m.player2);
        }
        if (!isCurrentMatch || excludeField !== "player3") {
          if (m.player3) selectedPlayers.add(m.player3);
        }
        if (!isCurrentMatch || excludeField !== "player4") {
          if (m.player4) selectedPlayers.add(m.player4);
        }
      }
    });

    return [
      { value: "", label: "선택" },
      ...allParticipants
        .filter((p) => !selectedPlayers.has(p.name))
        .map((p) => ({
          value: p.name,
          label: `${p.name} ${p.grade.replace("조", "")}`,
        })),
    ];
  };

  // 메인 화면
  if (viewMode === "main") {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-semibold text-foreground">
              코트 매니저
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              게임과 대회를 생성하고 관리하세요
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 게임 생성 버튼 */}
            <Tooltip message="모임 전 게임을 미리 짤 수 있습니다">
              <button
                onClick={handleGameCreate}
                className="w-full rounded-2xl bg-background-secondary p-8 ring-1 ring-border transition-all hover:bg-background hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="mb-4 flex items-center justify-center">
                  <div className="rounded-full bg-primary/20 p-4">
                    <svg
                      className="h-8 w-8 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  게임 생성
                </h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  참가자를 등록하고 게임 매칭을 생성하세요
                </p>
              </button>
            </Tooltip>

            {/* 대회 생성 버튼 */}
            <Tooltip message="토너먼트와 같은 대회를 생성할 수 있습니다.">
              <button
                onClick={handleTournamentCreate}
                className="w-full rounded-2xl bg-background-secondary p-8 ring-1 ring-border transition-all hover:bg-background hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="mb-4 flex items-center justify-center">
                  <div className="rounded-full bg-primary/20 p-4">
                    <svg
                      className="h-8 w-8 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  대회 생성
                </h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  토너먼트와 같은 대회를 생성하세요
                </p>
              </button>
            </Tooltip>
          </div>
        </div>
      </PageShell>
    );
  }

  // 게임 생성 화면 (첫 번째 단계: 설정)
  if (viewMode === "game-create") {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <button
                onClick={() => setViewMode("main")}
                className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                돌아가기
              </button>
              <h1 className="text-3xl font-semibold text-foreground">
                게임 생성
              </h1>
              <p className="mt-2 text-sm text-foreground-muted">
                코트 수, 게임 수, 참가자를 설정해주세요
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 코트 수 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                코트 수
              </label>
              <div className="mt-2 relative">
                <input
                  type="number"
                  min="1"
                  value={courtCount}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    setCourtCount(value);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-8 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-0 top-0 bottom-0 flex flex-col">
                  <button
                    type="button"
                    onClick={() => setCourtCount((prev) => prev + 1)}
                    className="flex flex-1 items-center justify-center w-7 rounded-tr-xl border-l border-border bg-background text-foreground transition-colors hover:bg-background-secondary hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    aria-label="증가"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCourtCount((prev) => Math.max(1, prev - 1))
                    }
                    className="flex flex-1 items-center justify-center w-7 rounded-br-xl border-l border-t border-border bg-background text-foreground transition-colors hover:bg-background-secondary hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    aria-label="감소"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 게임 수 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                게임 수
              </label>
              <div className="mt-2 relative">
                <input
                  type="number"
                  min="1"
                  value={gamesPerCourt}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    setGamesPerCourt(value);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-8 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-0 top-0 bottom-0 flex flex-col">
                  <button
                    type="button"
                    onClick={() => setGamesPerCourt((prev) => prev + 1)}
                    className="flex flex-1 items-center justify-center w-7 rounded-tr-xl border-l border-border bg-background text-foreground transition-colors hover:bg-background-secondary hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    aria-label="증가"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGamesPerCourt((prev) => Math.max(1, prev - 1))
                    }
                    className="flex flex-1 items-center justify-center w-7 rounded-br-xl border-l border-t border-border bg-background text-foreground transition-colors hover:bg-background-secondary hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    aria-label="감소"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 남자 참가자 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                남자 참가자 ({maleParticipants.length}명)
              </label>
              <input
                ref={maleInputRef}
                type="text"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMaleParticipant(e.currentTarget.value);
                  }
                }}
                placeholder="이름 입력 후 엔터"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="mt-4 space-y-2">
                {maleParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 rounded-lg bg-background px-3 py-2"
                  >
                    <span className="flex-1 text-sm text-foreground">
                      {participant.name}
                    </span>
                    <Select
                      value={participant.grade}
                      onChange={(grade) =>
                        handleMaleGradeChange(participant.id, grade)
                      }
                      options={GRADES.map((g) => ({ value: g, label: g }))}
                      className="w-24"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveMaleParticipant(participant.id)
                      }
                      className="rounded-lg p-1 text-foreground-muted transition-colors hover:bg-foreground-muted/10 hover:text-foreground"
                      aria-label="삭제"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 여자 참가자 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                여자 참가자 ({femaleParticipants.length}명)
              </label>
              <input
                ref={femaleInputRef}
                type="text"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFemaleParticipant(e.currentTarget.value);
                  }
                }}
                placeholder="이름 입력 후 엔터"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="mt-4 space-y-2">
                {femaleParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 rounded-lg bg-background px-3 py-2"
                  >
                    <span className="flex-1 text-sm text-foreground">
                      {participant.name}
                    </span>
                    <Select
                      value={participant.grade}
                      onChange={(grade) =>
                        handleFemaleGradeChange(participant.id, grade)
                      }
                      options={GRADES.map((g) => ({ value: g, label: g }))}
                      className="w-24"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveFemaleParticipant(participant.id)
                      }
                      className="rounded-lg p-1 text-foreground-muted transition-colors hover:bg-foreground-muted/10 hover:text-foreground"
                      aria-label="삭제"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleGoToMatchup}
              disabled={allParticipants.length === 0}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
            >
              다음
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // 매치업 설정 화면 (두 번째 단계)
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={handleBackToCreate}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              이전
            </button>
            <h1 className="text-3xl font-semibold text-foreground">
              코트별 매치업 설정
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              각 코트의 게임별 참가자를 선택해주세요
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 참가자 리스트 (게임 수) */}
          {allParticipants.length > 0 && (
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                참가자별 게임 수
              </h2>
              <div className="flex flex-wrap gap-2">
                {allParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    {participant.name} ({getGameCount(participant.name)}게임)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매치별 매치업 */}
          {gameMatches.length > 0 && (
            <div className="space-y-6">
              {Array.from({ length: gamesPerCourt }, (_, matchIdx) => {
                const matchNumber = matchIdx + 1;
                const matchGroup = gameMatches.filter(
                  (m) => m.matchNumber === matchNumber
                );
                return (
                  <div
                    key={matchIdx}
                    className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border"
                  >
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                      매치 {matchNumber}
                    </h3>
                    <div className="space-y-4">
                      {matchGroup.map((match) => (
                        <div
                          key={`${match.courtNumber}-${match.matchNumber}`}
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="mb-3 text-sm font-medium text-foreground">
                            코트 {match.courtNumber}
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                            {/* 왼쪽 팀 */}
                            <div className="space-y-2">
                              <Select
                                value={match.player1}
                                onChange={(value) => {
                                  const matchIndex = gameMatches.findIndex(
                                    (m) =>
                                      m.courtNumber === match.courtNumber &&
                                      m.matchNumber === match.matchNumber
                                  );
                                  setGameMatches(
                                    gameMatches.map((m, idx) =>
                                      idx === matchIndex
                                        ? { ...m, player1: value }
                                        : m
                                    )
                                  );
                                }}
                                options={getParticipantOptions(
                                  match.courtNumber,
                                  match,
                                  "player1"
                                )}
                                placeholder="선수 1"
                              />
                              <Select
                                value={match.player2}
                                onChange={(value) => {
                                  const matchIndex = gameMatches.findIndex(
                                    (m) =>
                                      m.courtNumber === match.courtNumber &&
                                      m.matchNumber === match.matchNumber
                                  );
                                  setGameMatches(
                                    gameMatches.map((m, idx) =>
                                      idx === matchIndex
                                        ? { ...m, player2: value }
                                        : m
                                    )
                                  );
                                }}
                                options={getParticipantOptions(
                                  match.courtNumber,
                                  match,
                                  "player2"
                                )}
                                placeholder="선수 2"
                              />
                            </div>

                            {/* VS */}
                            <span className="text-lg font-bold text-foreground-muted">
                              VS
                            </span>

                            {/* 오른쪽 팀 */}
                            <div className="space-y-2">
                              <Select
                                value={match.player3}
                                onChange={(value) => {
                                  const matchIndex = gameMatches.findIndex(
                                    (m) =>
                                      m.courtNumber === match.courtNumber &&
                                      m.matchNumber === match.matchNumber
                                  );
                                  setGameMatches(
                                    gameMatches.map((m, idx) =>
                                      idx === matchIndex
                                        ? { ...m, player3: value }
                                        : m
                                    )
                                  );
                                }}
                                options={getParticipantOptions(
                                  match.courtNumber,
                                  match,
                                  "player3"
                                )}
                                placeholder="선수 3"
                              />
                              <Select
                                value={match.player4}
                                onChange={(value) => {
                                  const matchIndex = gameMatches.findIndex(
                                    (m) =>
                                      m.courtNumber === match.courtNumber &&
                                      m.matchNumber === match.matchNumber
                                  );
                                  setGameMatches(
                                    gameMatches.map((m, idx) =>
                                      idx === matchIndex
                                        ? { ...m, player4: value }
                                        : m
                                    )
                                  );
                                }}
                                options={getParticipantOptions(
                                  match.courtNumber,
                                  match,
                                  "player4"
                                )}
                                placeholder="선수 4"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
