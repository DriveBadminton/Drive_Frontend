"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  Copy,
  PencilLine,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getUserFacingErrorMessage } from "@/lib/api";
import {
  CourtMatch,
  Game,
  GameRound,
  MatchRecordMode,
  MatchResult,
  Participant,
  ScheduleDraftRound,
  getGameById,
  getGameStatusLabel,
  getGradeTypeLabel,
  getMatchRecordModeLabel,
  updateGame,
  updateGameSchedule,
} from "@/lib/game";
import { pushRecentGameId } from "@/lib/recent-games";

type VisualRoundStatus = "completed" | "active" | "upcoming";

type ParticipantView = Participant & {
  gamesAssigned: number;
  status: "playing" | "resting";
};

type SettingsDraft = {
  title: string;
  matchRecordMode: MatchRecordMode;
  gradeType: Game["gradeType"];
};

function toResultLabel(result: MatchResult) {
  switch (result) {
    case "TEAM_A_WIN":
      return "TEAM A";
    case "TEAM_B_WIN":
      return "TEAM B";
    case "DRAW":
      return "DRAW";
    default:
      return null;
  }
}

function toVisualRoundStatus(matches: CourtMatch[]): VisualRoundStatus {
  if (matches.every((match) => match.status === "COMPLETED")) {
    return "completed";
  }

  if (
    matches.some(
      (match) => match.status === "IN_PROGRESS" || match.isActive === true
    )
  ) {
    return "active";
  }

  return "upcoming";
}

function cloneSchedule(rounds: GameRound[]): ScheduleDraftRound[] {
  return rounds.map((round) => ({
    roundNumber: round.roundNumber,
    matches: round.matches.map((match) => ({
      courtNumber: match.courtNumber,
      teamAIds: [...match.teamAIds] as [string | null, string | null],
      teamBIds: [...match.teamBIds] as [string | null, string | null],
    })),
  }));
}

function buildParticipantViews(game: Game): ParticipantView[] {
  const activeParticipantIds = new Set(
    game.rounds.flatMap((round) =>
      round.matches.flatMap((match) =>
        match.status === "IN_PROGRESS" || match.isActive
          ? [...match.teamAIds, ...match.teamBIds].filter(
              (participantId): participantId is string => Boolean(participantId)
            )
          : []
      )
    )
  );

  return game.participants.map((participant) => ({
    ...participant,
    gamesAssigned: participant.assignedMatchCount,
    status: activeParticipantIds.has(participant.id) ? "playing" : "resting",
  }));
}

function validateSchedule(rounds: ScheduleDraftRound[]) {
  for (const round of rounds) {
    const usedIds = new Set<string>();

    for (const match of round.matches) {
      const allIds = [...match.teamAIds, ...match.teamBIds].filter(
        (participantId): participantId is string => Boolean(participantId)
      );

      const uniqueInMatch = new Set(allIds);
      if (uniqueInMatch.size !== allIds.length) {
        return `라운드 ${round.roundNumber}에 같은 참가자가 한 매치에 중복 배정되어 있습니다.`;
      }

      for (const participantId of allIds) {
        if (usedIds.has(participantId)) {
          return `라운드 ${round.roundNumber}에 같은 참가자가 여러 코트에 중복 배정되어 있습니다.`;
        }
        usedIds.add(participantId);
      }
    }
  }

  return "";
}

const BadmintonCourt = ({
  court,
  status,
}: {
  court: {
    match: CourtMatch;
    participants: (Participant | undefined)[];
  };
  status: VisualRoundStatus;
}) => {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const resultLabel = toResultLabel(court.match.result ?? null);

  return (
    <div
      className={`relative flex aspect-[2/1] flex-col justify-between overflow-hidden rounded-none border-4 p-2 shadow-inner ${
        isCompleted
          ? "border-zinc-900 bg-zinc-800 opacity-90"
          : isActive
          ? "border-slate-900 bg-emerald-700"
          : "border-zinc-300 bg-zinc-200"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-2 border-2 ${
          isCompleted
            ? "border-zinc-600"
            : isActive
            ? "border-white/30"
            : "border-zinc-400/30"
        }`}
      />
      <div
        className={`pointer-events-none absolute top-1 bottom-1 left-1/2 w-1 -translate-x-1/2 ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/50"
            : "bg-zinc-400/50"
        }`}
      />
      <div
        className={`pointer-events-none absolute top-1/2 left-2 right-2 h-0.5 -translate-y-1/2 ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/30"
            : "bg-zinc-400/30"
        }`}
      />
      <div
        className={`pointer-events-none absolute top-2 bottom-2 left-[35%] w-0.5 ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/30"
            : "bg-zinc-400/30"
        }`}
      />
      <div
        className={`pointer-events-none absolute top-2 bottom-2 right-[35%] w-0.5 ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/30"
            : "bg-zinc-400/30"
        }`}
      />

      {resultLabel && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-none border-2 border-zinc-950 bg-zinc-950 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-widest text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]">
          {resultLabel}
        </div>
      )}

      <div className="relative z-10 grid h-full w-full grid-cols-2 grid-rows-2">
        {court.participants.map((participant, index) => (
          <div
            key={`${court.match.roundNumber}-${court.match.courtNumber}-${index}`}
            className="flex items-center justify-center p-1"
          >
            {participant ? (
              <div
                className={`flex min-w-[70px] max-w-[95%] items-center justify-center rounded-none border-2 px-2 py-1 ${
                  isCompleted
                    ? "border-zinc-900 bg-zinc-700 text-zinc-400"
                    : isActive
                    ? "border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    : "border-zinc-400 bg-white text-zinc-600 shadow-[2px_2px_0px_0px_rgba(161,161,170,1)]"
                }`}
              >
                <div className="w-full truncate text-center text-[10px] leading-none font-bold">
                  {participant.name}
                  <span
                    className={`ml-0.5 text-[9px] font-mono uppercase tracking-widest ${
                      isCompleted ? "text-zinc-500" : "text-slate-500"
                    }`}
                  >
                    {" "}
                    · {participant.gender === "MALE" ? "M" : "F"}/
                    {participant.ageGroup}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`h-1.5 w-1.5 rounded-none ${
                  isCompleted
                    ? "bg-zinc-700"
                    : isActive
                    ? "bg-white/30"
                    : "bg-zinc-400/30"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ManagerGameDetailPage() {
  const params = useParams();
  const gameId = typeof params?.id === "string" ? params.id : "";
  const { isLoading, isLoggedIn } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [pageError, setPageError] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraftRound[]>([]);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [operationSubmitting, setOperationSubmitting] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Share");

  useEffect(() => {
    if (!isLoading && !isLoggedIn && gameId) {
      window.location.href = `/login?returnTo=${encodeURIComponent(
        `/court-manager/game/${gameId}`
      )}`;
    }
  }, [gameId, isLoading, isLoggedIn]);

  useEffect(() => {
    if (!gameId || !isLoggedIn) {
      return;
    }

    let cancelled = false;

    const loadGame = async () => {
      setIsPageLoading(true);
      setPageError("");

      try {
        const nextGame = await getGameById(gameId);

        if (cancelled) {
          return;
        }

        if (!nextGame) {
          setPageError("게임을 찾을 수 없습니다.");
          setGame(null);
          return;
        }

        pushRecentGameId(nextGame.id);
        setGame(nextGame);
        setSettingsDraft({
          title: nextGame.title,
          matchRecordMode: nextGame.matchRecordMode,
          gradeType: nextGame.gradeType,
        });
        setScheduleDraft(cloneSchedule(nextGame.rounds));
      } catch (error) {
        if (!cancelled) {
          setPageError(
            getUserFacingErrorMessage(error, "게임을 불러오지 못했어요.")
          );
        }
      } finally {
        if (!cancelled) {
          setIsPageLoading(false);
        }
      }
    };

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [gameId, isLoggedIn]);

  const reloadGame = async () => {
    if (!gameId) {
      return;
    }

    const nextGame = await getGameById(gameId);
    if (nextGame) {
      pushRecentGameId(nextGame.id);
      setGame(nextGame);
      setSettingsDraft({
        title: nextGame.title,
        matchRecordMode: nextGame.matchRecordMode,
        gradeType: nextGame.gradeType,
      });
      setScheduleDraft(cloneSchedule(nextGame.rounds));
    }
  };

  const roundGroups = useMemo(() => {
    if (!game) {
      return [];
    }

    return game.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      visualStatus: toVisualRoundStatus(round.matches),
      courts: round.matches.map((match) => ({
        match,
        participants: [
          game.participants.find((participant) => participant.id === match.teamAIds[0]),
          game.participants.find((participant) => participant.id === match.teamAIds[1]),
          game.participants.find((participant) => participant.id === match.teamBIds[0]),
          game.participants.find((participant) => participant.id === match.teamBIds[1]),
        ],
      })),
    }));
  }, [game]);

  const participantViews = useMemo(
    () => (game ? buildParticipantViews(game) : []),
    [game]
  );

  const participantOptions = useMemo(
    () =>
      (game?.participants ?? []).map((participant) => ({
        value: participant.id,
        label: `${participant.name} · ${
          participant.gender === "MALE" ? "M" : "F"
        }/${participant.ageGroup}`,
      })),
    [game]
  );

  const activeRound = roundGroups.find((round) => round.visualStatus === "active");
  const isOperator = !!game;

  const handleCopyShareLink = async () => {
    if (!game) {
      return;
    }

    await navigator.clipboard.writeText(
      `${window.location.origin}/court-manager/share/${game.shareCode}`
    );
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Share"), 1200);
  };

  const updateDraftSlot = (
    roundNumber: number,
    courtNumber: number,
    team: "A" | "B",
    slotIndex: 0 | 1,
    value: string
  ) => {
    setScheduleDraft((prev) =>
      prev.map((round) =>
        round.roundNumber !== roundNumber
          ? round
          : {
              ...round,
              matches: round.matches.map((match) => {
                if (match.courtNumber !== courtNumber) {
                  return match;
                }

                const nextIds =
                  team === "A" ? [...match.teamAIds] : [...match.teamBIds];
                nextIds[slotIndex] = value || null;

                return team === "A"
                  ? {
                      ...match,
                      teamAIds: nextIds as [string | null, string | null],
                    }
                  : {
                      ...match,
                      teamBIds: nextIds as [string | null, string | null],
                    };
              }),
            }
      )
    );
  };

  const handleSaveSettings = async () => {
    if (!game || !settingsDraft) {
      return;
    }

    setOperationSubmitting(true);
    setPageError("");
    const success = await updateGame(game.id, settingsDraft);
    if (!success) {
      setPageError("기본 정보 저장에 실패했습니다.");
    } else {
      setIsEditingSettings(false);
      await reloadGame();
    }
    setOperationSubmitting(false);
  };

  const handleSaveSchedule = async () => {
    if (!game) {
      return;
    }

    const validationError = validateSchedule(scheduleDraft);
    if (validationError) {
      setPageError(validationError);
      return;
    }

    setOperationSubmitting(true);
    setPageError("");
    const success = await updateGameSchedule(game.id, scheduleDraft);
    if (!success) {
      setPageError("대진표 저장에 실패했습니다.");
    } else {
      setIsEditingSchedule(false);
      await reloadGame();
    }
    setOperationSubmitting(false);
  };

  if (isLoading || isPageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (pageError && !game) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900">{pageError}</h2>
          <p className="mt-2 text-sm text-zinc-500">
            링크가 올바른지 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!game || !settingsDraft) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="sticky top-16 z-30 border-b-4 border-emerald-600 bg-zinc-950 text-white">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/court-manager">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse bg-emerald-400" />
                {getGameStatusLabel(game.status)}
              </div>
              <h1 className="hidden font-display text-lg font-bold uppercase tracking-tight sm:block">
                {game.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 rounded-none border-zinc-700 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 hover:text-white sm:flex"
              onClick={() => void handleCopyShareLink()}
            >
              <Copy className="mr-2 h-3 w-3" />
              {copyLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {pageError && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <div className="flex flex-col justify-between gap-4 border-2 border-zinc-200 bg-white p-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="mb-2 font-display text-2xl font-black uppercase tracking-tight text-zinc-950 sm:hidden">
                  {game.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    {getMatchRecordModeLabel(game.matchRecordMode)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-zinc-400" />
                    {game.participants.length} Participants
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Settings2 className="h-4 w-4 text-zinc-400" />
                    {getGradeTypeLabel(game.gradeType)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                    Courts
                  </div>
                  <div className="font-display text-xl font-bold text-zinc-950">
                    {String(game.courtCount).padStart(2, "0")}
                  </div>
                </div>
                <div className="h-10 w-px bg-zinc-200" />
                <div className="text-center">
                  <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                    Round
                  </div>
                  <div className="font-display text-xl font-bold text-emerald-600">
                    {String(
                      activeRound?.roundNumber || roundGroups[0]?.roundNumber || 1
                    ).padStart(2, "0")}
                    <span className="text-zinc-300">
                      /{String(roundGroups.length).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isEditingSettings && (
              <div className="border-2 border-zinc-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold uppercase tracking-tight text-zinc-950">
                    기본 정보 수정
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    value={settingsDraft.title}
                    onChange={(event) =>
                      setSettingsDraft((prev) =>
                        prev ? { ...prev, title: event.target.value } : prev
                      )
                    }
                    className="rounded-none border-2 border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                    placeholder="세션 이름"
                  />
                  <select
                    value={settingsDraft.matchRecordMode}
                    onChange={(event) =>
                      setSettingsDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              matchRecordMode: event.target
                                .value as MatchRecordMode,
                            }
                          : prev
                      )
                    }
                    className="rounded-none border-2 border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="RESULT">결과 기록</option>
                    <option value="STATUS_ONLY">상태만 기록</option>
                  </select>
                  <select
                    value={settingsDraft.gradeType}
                    onChange={(event) =>
                      setSettingsDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              gradeType: event.target.value as Game["gradeType"],
                            }
                          : prev
                      )
                    }
                    className="rounded-none border-2 border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="REGIONAL">지역 급수</option>
                    <option value="NATIONAL">전국 급수</option>
                  </select>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800"
                    onClick={() => void handleSaveSettings()}
                    disabled={operationSubmitting}
                  >
                    저장
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-none"
                    onClick={() => {
                      setIsEditingSettings(false);
                      setSettingsDraft({
                        title: game.title,
                        matchRecordMode: game.matchRecordMode,
                        gradeType: game.gradeType,
                      });
                    }}
                    disabled={operationSubmitting}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-12">
              {roundGroups.map((round) => {
                const draftRound = scheduleDraft.find(
                  (item) => item.roundNumber === round.roundNumber
                );

                return (
                  <div key={round.roundNumber} className="relative">
                    <div className="mb-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-zinc-200" />
                      <div
                        className={`border-2 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-widest ${
                          round.visualStatus === "active"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : round.visualStatus === "completed"
                            ? "border-zinc-300 bg-zinc-100 text-zinc-500"
                            : "border-zinc-300 bg-white text-zinc-400"
                        }`}
                      >
                        Round {String(round.roundNumber).padStart(2, "0")}
                        {round.visualStatus === "active" && (
                          <span className="ml-2 animate-pulse text-emerald-500">●</span>
                        )}
                      </div>
                      <div className="h-px flex-1 bg-zinc-200" />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {round.courts.map((court, courtIndex) => {
                        const draftMatch = draftRound?.matches.find(
                          (match) => match.courtNumber === court.match.courtNumber
                        );

                        return (
                          <div
                            key={`${round.roundNumber}-${court.match.courtNumber}`}
                            className="space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                Court {String(courtIndex + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <BadmintonCourt court={court} status={round.visualStatus} />

                            {isEditingSchedule && draftMatch && (
                              <div className="grid gap-2 border-2 border-zinc-200 bg-white p-3">
                                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                  Team A
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {[0, 1].map((index) => (
                                    <select
                                      key={`teamA-${index}`}
                                      value={draftMatch.teamAIds[index] ?? ""}
                                      onChange={(event) =>
                                        updateDraftSlot(
                                          round.roundNumber,
                                          court.match.courtNumber,
                                          "A",
                                          index as 0 | 1,
                                          event.target.value
                                        )
                                      }
                                      className="rounded-none border-2 border-zinc-200 px-2 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                                    >
                                      <option value="">빈 슬롯</option>
                                      {participantOptions.map((participant) => (
                                        <option
                                          key={participant.value}
                                          value={participant.value}
                                        >
                                          {participant.label}
                                        </option>
                                      ))}
                                    </select>
                                  ))}
                                </div>

                                <div className="pt-2 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                  Team B
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {[0, 1].map((index) => (
                                    <select
                                      key={`teamB-${index}`}
                                      value={draftMatch.teamBIds[index] ?? ""}
                                      onChange={(event) =>
                                        updateDraftSlot(
                                          round.roundNumber,
                                          court.match.courtNumber,
                                          "B",
                                          index as 0 | 1,
                                          event.target.value
                                        )
                                      }
                                      className="rounded-none border-2 border-zinc-200 px-2 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                                    >
                                      <option value="">빈 슬롯</option>
                                      {participantOptions.map((participant) => (
                                        <option
                                          key={participant.value}
                                          value={participant.value}
                                        >
                                          {participant.label}
                                        </option>
                                      ))}
                                    </select>
                                  ))}
                                </div>
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
          </div>

          <div className="space-y-6 lg:col-span-4">
            {isOperator && (
              <>
                <div className="border-2 border-zinc-950 bg-zinc-950 p-6 text-white">
                  <h3 className="mb-4 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                    Operations
                  </h3>
                  <div className="space-y-3">
                    <Button
                      className="h-12 w-full rounded-none bg-emerald-600 text-xs font-bold uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-all hover:bg-emerald-500 active:translate-y-1 active:translate-x-1 active:shadow-none"
                      onClick={() => setIsEditingSettings((prev) => !prev)}
                      disabled={operationSubmitting}
                    >
                      <PencilLine className="mr-2 h-4 w-4" />
                      {isEditingSettings ? "기본 정보 닫기" : "기본 정보 수정"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-none border-zinc-700 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      onClick={() => setIsEditingSchedule((prev) => !prev)}
                      disabled={operationSubmitting}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      {isEditingSchedule ? "대진표 편집 닫기" : "대진표 편집"}
                    </Button>
                    {isEditingSchedule && (
                      <Button
                        className="h-12 w-full rounded-none bg-orange-500 text-xs font-bold uppercase tracking-widest text-zinc-950 hover:bg-orange-400"
                        onClick={() => void handleSaveSchedule()}
                        disabled={operationSubmitting}
                      >
                        대진표 저장
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-2 border-zinc-200 bg-white p-4">
                  <h3 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    Backend Contract Notes
                  </h3>
                  <div className="space-y-2 text-sm text-zinc-600">
                    <p>현재 계약에서는 기존 참가자 배치와 기본 정보 수정만 지원합니다.</p>
                    <p>결과/상태 변경, 참가자 추가, 코트 추가, 라운드 추가는 백엔드 확장 후 연결합니다.</p>
                  </div>
                </div>
              </>
            )}

            <div className="border-2 border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b-2 border-zinc-200 bg-zinc-50 p-4">
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-zinc-950">
                  Roster Status
                </h3>
                <span className="text-xs font-mono font-bold text-zinc-500">
                  {participantViews.length} Total
                </span>
              </div>

              <div className="max-h-[500px] divide-y-2 divide-zinc-100 overflow-y-auto">
                {participantViews.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-none ${
                          participant.status === "playing"
                            ? "bg-emerald-500"
                            : "bg-zinc-300"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-bold text-zinc-950">
                          {participant.name}
                        </div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          {participant.gender === "MALE" ? "M" : "F"}/
                          {participant.ageGroup} · {participant.gamesAssigned} Matches
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                          participant.status === "playing"
                            ? "text-emerald-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {participant.status}
                      </div>
                      <div className="mt-1 text-xs font-bold text-zinc-500">
                        {participant.winCount}W / {participant.lossCount}L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
