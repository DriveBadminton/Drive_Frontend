"use client";

import { useState, useRef, useEffect, KeyboardEvent, useMemo } from "react";
import PageShell from "../../components/layout/PageShell";
import Tooltip from "../../components/Tooltip";
import Select from "../../components/Select";
import { useAuth } from "@/hooks/useAuth";
import { getKakaoOAuthURL } from "@/lib/auth";
import {
  createFreeGame,
  determineGameType,
  type Gender,
  type Grade,
  type AgeGroup,
  type GradeType,
  type GameType,
  type Participant as GameParticipant,
} from "@/lib/game";

type ViewMode = "main" | "game-create" | "game-matchup" | "game-complete";

// UI에서 사용하는 연령대 문자열 타입
type AgeGroupUI = "20" | "30" | "40" | "50" | "60" | "70";

type Participant = {
  id: string;
  name: string;
  gender: Gender;
  grade: Grade;
  ageGroup: AgeGroupUI;
};

// UI 문자열을 API 숫자로 변환
const ageGroupToNumber = (ageGroupUI: AgeGroupUI): AgeGroup =>
  parseInt(ageGroupUI, 10) as AgeGroup;

type CourtMatch = {
  roundNumber: number;
  courtNumber: number;
  player1Id: string;
  player2Id: string;
  player3Id: string;
  player4Id: string;
};

const GRADES: { value: Grade; label: string }[] = [
  { value: "ROOKIE", label: "초심" },
  { value: "D", label: "D" },
  { value: "C", label: "C" },
  { value: "B", label: "B" },
  { value: "A", label: "A" },
  { value: "S", label: "S" },
  { value: "SS", label: "SS" },
];

const AGE_GROUPS: { value: AgeGroupUI; label: string }[] = [
  { value: "20", label: "20대" },
  { value: "30", label: "30대" },
  { value: "40", label: "40대" },
  { value: "50", label: "50대" },
  { value: "60", label: "60대" },
  { value: "70", label: "70대+" },
];

export default function CourtManager() {
  const { isLoggedIn } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("main");

  // 게임 기본 정보
  const [gameTitle, setGameTitle] = useState("");
  const [courtCount, setCourtCount] = useState(2);
  const [roundCount, setRoundCount] = useState(1);
  const [gradeType, setGradeType] = useState<GradeType>("REGIONAL");

  // 참가자 목록
  const [participants, setParticipants] = useState<Participant[]>([]);

  // 라운드별 코트 매칭
  const [courtMatches, setCourtMatches] = useState<CourtMatch[]>([]);

  // 생성된 게임 ID
  const [createdGameId, setCreatedGameId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteGameModal, setShowDeleteGameModal] = useState(false);

  // 참가자 입력 상태
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantGender, setNewParticipantGender] =
    useState<Gender>("MALE");
  const [newParticipantGrade, setNewParticipantGrade] = useState<Grade>("D");
  const [newParticipantAge, setNewParticipantAge] = useState<AgeGroupUI>("30");

  const nameInputRef = useRef<HTMLInputElement>(null);

  // 매치업 화면 진입 시 기본 매칭 초기화
  useEffect(() => {
    if (viewMode === "game-matchup" && courtMatches.length === 0) {
      initializeCourtMatches();
    }
  }, [viewMode]);

  // 코트 매칭 초기화
  const initializeCourtMatches = (
    newRoundCount?: number,
    newCourtCount?: number
  ) => {
    const rounds = newRoundCount ?? roundCount;
    const courts = newCourtCount ?? courtCount;

    const matches: CourtMatch[] = [];
    for (let round = 1; round <= rounds; round++) {
      for (let court = 1; court <= courts; court++) {
        matches.push({
          roundNumber: round,
          courtNumber: court,
          player1Id: "",
          player2Id: "",
          player3Id: "",
          player4Id: "",
        });
      }
    }
    setCourtMatches(matches);
  };

  // 참가자 추가
  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;

    const newParticipant: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newParticipantName.trim(),
      gender: newParticipantGender,
      grade: newParticipantGrade,
      ageGroup: newParticipantAge,
    };

    setParticipants([...participants, newParticipant]);
    setNewParticipantName("");
    nameInputRef.current?.focus();
  };

  // 참가자 삭제
  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
    // 관련된 매칭도 초기화
    setCourtMatches(
      courtMatches.map((m) => ({
        ...m,
        player1Id: m.player1Id === id ? "" : m.player1Id,
        player2Id: m.player2Id === id ? "" : m.player2Id,
        player3Id: m.player3Id === id ? "" : m.player3Id,
        player4Id: m.player4Id === id ? "" : m.player4Id,
      }))
    );
  };

  // 참가자 수정
  const handleUpdateParticipant = (
    id: string,
    field: keyof Participant,
    value: string
  ) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // 라운드 추가
  const handleAddRound = () => {
    const newRoundNumber = roundCount + 1;
    setRoundCount(newRoundNumber);

    // 새 라운드에 대한 코트 매칭 추가
    const newMatches: CourtMatch[] = [];
    for (let court = 1; court <= courtCount; court++) {
      newMatches.push({
        roundNumber: newRoundNumber,
        courtNumber: court,
        player1Id: "",
        player2Id: "",
        player3Id: "",
        player4Id: "",
      });
    }
    setCourtMatches([...courtMatches, ...newMatches]);
  };

  // 라운드 삭제
  const handleRemoveRound = (roundNumber: number) => {
    // 라운드가 1개뿐일 때 삭제하면 게임 삭제 모달 표시
    if (roundCount <= 1) {
      setShowDeleteGameModal(true);
      return;
    }

    setRoundCount(roundCount - 1);
    setCourtMatches(
      courtMatches
        .filter((m) => m.roundNumber !== roundNumber)
        .map((m) => ({
          ...m,
          roundNumber:
            m.roundNumber > roundNumber ? m.roundNumber - 1 : m.roundNumber,
        }))
    );
  };

  // 참가자별 게임 수 계산
  const getGameCount = (participantId: string) => {
    return courtMatches.filter(
      (m) =>
        m.player1Id === participantId ||
        m.player2Id === participantId ||
        m.player3Id === participantId ||
        m.player4Id === participantId
    ).length;
  };

  // 같은 라운드 내에서 이미 선택된 참가자 제외한 옵션 생성
  const getParticipantOptions = (
    roundNumber: number,
    courtNumber: number,
    currentField: "player1Id" | "player2Id" | "player3Id" | "player4Id",
    currentMatch: CourtMatch
  ) => {
    // 같은 라운드의 모든 코트에서 이미 선택된 선수들 수집
    const selectedPlayers = new Set<string>();

    courtMatches.forEach((m) => {
      if (m.roundNumber === roundNumber) {
        const isCurrentMatch = m.courtNumber === courtNumber;

        // 현재 매치의 현재 필드는 제외
        if (!isCurrentMatch || currentField !== "player1Id") {
          if (m.player1Id) selectedPlayers.add(m.player1Id);
        }
        if (!isCurrentMatch || currentField !== "player2Id") {
          if (m.player2Id) selectedPlayers.add(m.player2Id);
        }
        if (!isCurrentMatch || currentField !== "player3Id") {
          if (m.player3Id) selectedPlayers.add(m.player3Id);
        }
        if (!isCurrentMatch || currentField !== "player4Id") {
          if (m.player4Id) selectedPlayers.add(m.player4Id);
        }
      }
    });

    return [
      { value: "", label: "선택" },
      ...participants
        .filter((p) => !selectedPlayers.has(p.id))
        .map((p) => ({
          value: p.id,
          label: `${p.name} (${p.gender === "MALE" ? "남" : "여"}, ${
            GRADES.find((g) => g.value === p.grade)?.label || p.grade
          })`,
        })),
    ];
  };

  // 코트 매칭 업데이트
  const handleUpdateCourtMatch = (
    roundNumber: number,
    courtNumber: number,
    field: "player1Id" | "player2Id" | "player3Id" | "player4Id",
    value: string
  ) => {
    setCourtMatches(
      courtMatches.map((m) =>
        m.roundNumber === roundNumber && m.courtNumber === courtNumber
          ? { ...m, [field]: value }
          : m
      )
    );
  };

  // 게임 생성으로 이동
  const handleGameCreate = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setViewMode("game-create");
    setGameTitle("");
    setCourtCount(2);
    setRoundCount(1);
    setGradeType("REGIONAL");
    setParticipants([]);
    setCourtMatches([]);
    setCreatedGameId(null);
  };

  // 매치업 설정으로 이동
  const handleGoToMatchup = () => {
    if (!gameTitle.trim()) {
      alert("게임 제목을 입력해주세요.");
      return;
    }
    setViewMode("game-matchup");
    initializeCourtMatches();
  };

  // 게임 생성 완료
  const handleCreateGame = async () => {
    setIsCreating(true);

    try {
      // API 요청 데이터 구성
      const requestData = {
        title: gameTitle.trim(),
        courtCount,
        roundCount,
        gradeType,
        matchRecordMode: "STATUS_ONLY" as const,
        participants:
          participants.length > 0
            ? participants.map((p) => ({
                originalName: p.name,
                gender: p.gender,
                grade: p.grade,
                ageGroup: ageGroupToNumber(p.ageGroup),
              }))
            : undefined,
      };

      const response = await createFreeGame(requestData);
      setCreatedGameId(response.gameId);
      setViewMode("game-complete");
    } catch (error) {
      console.error("자유 게임 생성 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "자유 게임 생성에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // 게임 링크 생성
  const gameLink = createdGameId
    ? `${
        typeof window !== "undefined" ? window.location.origin : ""
      }/court_manager/game/${createdGameId}`
    : null;

  // 링크 복사
  const handleCopyLink = async () => {
    if (!gameLink) return;

    try {
      await navigator.clipboard.writeText(gameLink);
      alert("링크가 복사되었습니다!");
    } catch (error) {
      console.error("복사 실패:", error);
      // 폴백: 수동 복사
      prompt("아래 링크를 복사하세요:", gameLink);
    }
  };

  // 대회 생성 (추후 구현)
  const handleTournamentCreate = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    console.log("대회 생성 (추후 구현)");
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
                  자유 게임
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

        {/* 로그인 필요 모달 */}
        {showLoginModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="로그인 필요"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLoginModal(false);
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-background-secondary p-6 ring-1 ring-border flex flex-col justify-center">
              <h3 className="text-center text-xl font-semibold text-foreground">
                로그인이 필요한 기능입니다
              </h3>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const currentPath = window.location.pathname;
                    window.location.href = getKakaoOAuthURL(currentPath);
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-yellow-500/50 bg-[#FEE500] px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:bg-[#FDD835] focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                >
                  <img src="/kakaotalk.png" alt="Kakao" className="h-5 w-5" />
                  카카오로 로그인
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 게임 삭제 확인 모달 */}
        {showDeleteGameModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="게임 삭제 확인"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteGameModal(false);
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-center text-xl font-semibold text-foreground">
                자유 게임을 삭제하시겠습니까?
              </h3>
              <p className="mt-2 text-center text-sm text-foreground-muted">
                마지막 라운드를 삭제하면 게임이 삭제됩니다.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteGameModal(false)}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background-secondary"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // TODO: 게임 삭제 로직 구현
                    setShowDeleteGameModal(false);
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // 게임 생성 화면 (첫 번째 단계: 설정)
  if (viewMode === "game-create") {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-8">
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
              자유 게임
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              게임 제목, 코트 수, 참가자를 설정해주세요
            </p>
          </div>

          <div className="space-y-6">
            {/* 게임 제목 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                게임 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="예: 1월 2일 목요 정모"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* 코트 수 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                코트 수
              </label>
              <div className="mt-2 relative">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={courtCount}
                  onChange={(e) => {
                    const value = Math.max(
                      1,
                      Math.min(20, parseInt(e.target.value) || 1)
                    );
                    setCourtCount(value);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-16 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-0 top-0 bottom-0 flex">
                  <button
                    type="button"
                    onClick={() =>
                      setCourtCount((prev) => Math.max(1, prev - 1))
                    }
                    className="flex items-center justify-center w-10 border-l border-border bg-background text-foreground transition-colors hover:bg-background-secondary hover:text-primary focus:outline-none"
                    aria-label="감소"
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
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCourtCount((prev) => Math.min(20, prev + 1))
                    }
                    className="flex items-center justify-center w-10 rounded-r-xl border-l border-border bg-background text-foreground transition-colors hover:bg-background-secondary hover:text-primary focus:outline-none"
                    aria-label="증가"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 급수 타입 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                급수 타입 <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gradeType"
                    value="REGIONAL"
                    checked={gradeType === "REGIONAL"}
                    onChange={() => setGradeType("REGIONAL")}
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">지역 급수</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gradeType"
                    value="NATIONAL"
                    checked={gradeType === "NATIONAL"}
                    onChange={() => setGradeType("NATIONAL")}
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">전국 급수</span>
                </label>
              </div>
            </div>

            {/* 참가자 추가 */}
            <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <label className="text-sm font-medium text-foreground">
                참가자 추가 ({participants.length}명)
              </label>

              {/* 입력 폼 */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                  placeholder="이름"
                  className="sm:col-span-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Select
                  value={newParticipantGender}
                  onChange={(v) => setNewParticipantGender(v as Gender)}
                  options={[
                    { value: "MALE", label: "남" },
                    { value: "FEMALE", label: "여" },
                  ]}
                />
                <Select
                  value={newParticipantGrade}
                  onChange={(v) => setNewParticipantGrade(v as Grade)}
                  options={GRADES}
                />
                <Select
                  value={newParticipantAge}
                  onChange={(v) => setNewParticipantAge(v as AgeGroupUI)}
                  options={AGE_GROUPS}
                />
              </div>

              <button
                type="button"
                onClick={handleAddParticipant}
                disabled={!newParticipantName.trim()}
                className="mt-3 w-full rounded-xl border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + 참가자 추가
              </button>

              {/* 참가자 목록 */}
              {participants.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="hidden sm:grid grid-cols-[1fr_50px_60px_60px_32px] gap-3 px-3 py-2 text-xs font-medium text-foreground-muted">
                    <span>이름</span>
                    <span className="text-center">성별</span>
                    <span className="text-center">급수</span>
                    <span className="text-center">나이</span>
                    <span></span>
                  </div>
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex flex-wrap sm:grid sm:grid-cols-[1fr_50px_60px_60px_32px] gap-2 sm:gap-3 items-center rounded-lg bg-background px-3 py-2.5"
                    >
                      <span className="text-sm text-foreground font-medium min-w-[80px]">
                        {participant.name}
                      </span>
                      <span
                        className={`text-xs text-center px-2 py-1 rounded-md whitespace-nowrap ${
                          participant.gender === "MALE"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-pink-500/20 text-pink-400"
                        }`}
                      >
                        {participant.gender === "MALE" ? "남" : "여"}
                      </span>
                      <span className="text-xs text-center px-2 py-1 rounded-md bg-foreground-muted/10 text-foreground-muted whitespace-nowrap">
                        {GRADES.find((g) => g.value === participant.grade)
                          ?.label || participant.grade}
                      </span>
                      <span className="text-xs text-center px-2 py-1 rounded-md bg-foreground-muted/10 text-foreground-muted whitespace-nowrap">
                        {participant.ageGroup}대
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="ml-auto sm:ml-0 rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
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
              )}
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleGoToMatchup}
              disabled={!gameTitle.trim()}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
            >
              다음: 라운드 매칭 설정
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // 매치업 설정 화면 (두 번째 단계)
  if (viewMode === "game-matchup") {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-8">
            <button
              onClick={() => setViewMode("game-create")}
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
              {gameTitle}
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              라운드별 코트 매칭을 설정해주세요 • 코트 {courtCount}개 • 참가자{" "}
              {participants.length}명
            </p>
          </div>

          <div className="space-y-6">
            {/* 참가자 게임 수 현황 - 스크롤 시 상단 고정 (헤더 80px + 간격 20px) */}
            <div className="sticky top-[100px] z-40 rounded-2xl bg-background-secondary p-4 sm:p-6 ring-1 ring-border shadow-lg">
              <h2 className="mb-3 text-base sm:text-lg font-semibold text-foreground">
                참가자별 게임 수
              </h2>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {participants.map((participant) => {
                  const count = getGameCount(participant.id);
                  return (
                    <div
                      key={participant.id}
                      className={`rounded-lg border px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm ${
                        count === 0
                          ? "border-foreground-muted/30 text-foreground-muted"
                          : "border-primary/50 bg-primary/10 text-foreground"
                      }`}
                    >
                      <span
                        className={
                          participant.gender === "MALE"
                            ? "text-blue-400"
                            : "text-pink-400"
                        }
                      >
                        {participant.name}
                      </span>
                      <span className="ml-1 text-foreground-muted">
                        ({count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 라운드별 매칭 */}
            {Array.from({ length: roundCount }, (_, roundIdx) => {
              const roundNumber = roundIdx + 1;
              const roundMatches = courtMatches.filter(
                (m) => m.roundNumber === roundNumber
              );

              return (
                <div
                  key={roundIdx}
                  className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      라운드 {roundNumber}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveRound(roundNumber)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {roundMatches.map((match) => {
                      // determineGameType은 gender 필드만 사용하므로 타입 호환성을 위해 단언 사용
                      // (로컬 Participant의 ageGroup은 문자열이지만, determineGameType은 gender만 사용)
                      const gameType = determineGameType(
                        participants as unknown as GameParticipant[],
                        match.player1Id,
                        match.player2Id,
                        match.player3Id,
                        match.player4Id
                      );

                      return (
                        <div
                          key={`${match.roundNumber}-${match.courtNumber}`}
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              코트 {match.courtNumber}
                            </span>
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

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            {/* 왼쪽 팀 */}
                            <div className="space-y-2">
                              <Select
                                value={match.player1Id}
                                onChange={(v) =>
                                  handleUpdateCourtMatch(
                                    match.roundNumber,
                                    match.courtNumber,
                                    "player1Id",
                                    v
                                  )
                                }
                                options={getParticipantOptions(
                                  match.roundNumber,
                                  match.courtNumber,
                                  "player1Id",
                                  match
                                )}
                                placeholder="선수 1"
                              />
                              <Select
                                value={match.player2Id}
                                onChange={(v) =>
                                  handleUpdateCourtMatch(
                                    match.roundNumber,
                                    match.courtNumber,
                                    "player2Id",
                                    v
                                  )
                                }
                                options={getParticipantOptions(
                                  match.roundNumber,
                                  match.courtNumber,
                                  "player2Id",
                                  match
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
                                value={match.player3Id}
                                onChange={(v) =>
                                  handleUpdateCourtMatch(
                                    match.roundNumber,
                                    match.courtNumber,
                                    "player3Id",
                                    v
                                  )
                                }
                                options={getParticipantOptions(
                                  match.roundNumber,
                                  match.courtNumber,
                                  "player3Id",
                                  match
                                )}
                                placeholder="선수 3"
                              />
                              <Select
                                value={match.player4Id}
                                onChange={(v) =>
                                  handleUpdateCourtMatch(
                                    match.roundNumber,
                                    match.courtNumber,
                                    "player4Id",
                                    v
                                  )
                                }
                                options={getParticipantOptions(
                                  match.roundNumber,
                                  match.courtNumber,
                                  "player4Id",
                                  match
                                )}
                                placeholder="선수 4"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* 라운드 추가 버튼 */}
            <button
              type="button"
              onClick={handleAddRound}
              className="w-full rounded-xl border-2 border-dashed border-border px-4 py-4 text-sm font-medium text-foreground-muted transition-colors hover:border-primary/50 hover:text-primary"
            >
              + 라운드 추가
            </button>

            {/* 게임 생성 버튼 */}
            <button
              onClick={handleCreateGame}
              disabled={isCreating}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "생성 중..." : "자유 게임 생성"}
            </button>
          </div>
        </div>

        {/* 게임 삭제 확인 모달 */}
        {showDeleteGameModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="게임 삭제 확인"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteGameModal(false);
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-center text-xl font-semibold text-foreground">
                자유 게임을 삭제하시겠습니까?
              </h3>
              <p className="mt-2 text-center text-sm text-foreground-muted">
                마지막 라운드를 삭제하면 게임이 삭제됩니다.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteGameModal(false)}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background-secondary"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // TODO: 게임 삭제 로직 구현
                    setShowDeleteGameModal(false);
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // 게임 생성 완료 화면
  if (viewMode === "game-complete") {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* 성공 아이콘 */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <svg
                className="h-10 w-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-semibold text-foreground">
              게임이 생성되었습니다!
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              아래 링크를 참가자들에게 공유하세요
            </p>

            {/* 링크 표시 */}
            <div className="mt-8 rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={gameLink || ""}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  복사
                </button>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  if (gameLink) {
                    window.open(gameLink, "_blank");
                  }
                }}
                className="rounded-xl border border-primary bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                게임 페이지 보기
              </button>
              <button
                type="button"
                onClick={() => setViewMode("main")}
                className="rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background-secondary"
              >
                메인으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return null;
}
