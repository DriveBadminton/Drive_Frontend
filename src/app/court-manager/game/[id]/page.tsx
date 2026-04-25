"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  Copy,
  LoaderCircle,
  PencilLine,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Select from "@/components/Select";
import { useAuth } from "@/hooks/useAuth";
import { getUserFacingErrorMessage } from "@/lib/api";
import { formatGradeLabel, toBackendGrade } from "@/lib/grade";
import {
  type AgeGroup,
  type AssignmentPreviewExistingAssignmentPolicy,
  CourtMatch,
  type CreateGameAssignmentPreviewRequest,
  type CreateGameAssignmentPreviewResponse,
  Game,
  GameRound,
  type Gender,
  type Grade,
  MatchRecordMode,
  MatchResult,
  MatchWinnerTeam,
  Participant,
  ScheduleDraftRound,
  addFreeGameParticipant,
  completeFreeGameMatch,
  createFreeGameAssignmentPreview,
  getFreeGameAssignmentPreviewJob,
  getGameById,
  getGameStatusLabel,
  getMatchRecordModeLabel,
  startFreeGame,
  startFreeGameMatch,
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

type EditMode = "settings" | "schedule" | null;

type ScheduleAssignmentTarget = {
  roundNumber: number;
  courtNumber: number;
  slotIndex: 0 | 1 | 2 | 3;
};

type DisplayRoundGroup = {
  roundNumber: number;
  visualStatus: VisualRoundStatus;
  courts: Array<{
    match: CourtMatch;
    participants: (Participant | undefined)[];
  }>;
};

type MatchScoreDraft = {
  teamAScore: string;
  teamBScore: string;
};

type ParticipantDraft = {
  name: string;
  gender: Gender;
  age: AgeGroup;
  grade: Grade;
};

const AI_ASSIGNMENT_POLICY_LABELS: Record<
  AssignmentPreviewExistingAssignmentPolicy,
  string
> = {
  FILL_EMPTY_SLOTS: "빈 슬롯만 채우기",
  REASSIGN_ALL: "전체 다시 배정",
};

const AI_PREVIEW_GENERIC_FAILURE_MESSAGE =
  "자동 배정을 완료하지 못했어요. 잠시 후 다시 시도해주세요.";
const ASSIGNMENT_PREVIEW_CONTRACT_ERROR_MESSAGE =
  "자동 배정 결과를 적용할 수 없어요. 현재 대진표는 유지했어요. 잠시 후 다시 시도해주세요.";
const DEFAULT_PARTICIPANT_DRAFT: ParticipantDraft = {
  name: "",
  gender: "MALE",
  age: 20,
  grade: "C",
};
const PARTICIPANT_GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "MALE", label: "남" },
  { value: "FEMALE", label: "여" },
];
const PARTICIPANT_AGE_OPTIONS: AgeGroup[] = [10, 20, 30, 40, 50, 60, 70];
const PARTICIPANT_GRADE_OPTIONS: Grade[] = ["ROOKIE", "D", "C", "B", "A", "S", "SS"];
const GRADE_TYPE_OPTIONS: Array<{ value: Game["gradeType"]; label: string }> = [
  { value: "REGIONAL", label: "지역 급수" },
  { value: "NATIONAL", label: "전국 급수" },
];
const PARTICIPANT_AGE_SELECT_OPTIONS = PARTICIPANT_AGE_OPTIONS.map((age) => ({
  value: String(age),
  label: `${age}대`,
}));
const PARTICIPANT_GRADE_SELECT_OPTIONS = PARTICIPANT_GRADE_OPTIONS.map((grade) => ({
  value: grade,
  label: formatGradeLabel(grade),
}));

class DetailAssignmentPreviewContractError extends Error {
  constructor(message = ASSIGNMENT_PREVIEW_CONTRACT_ERROR_MESSAGE) {
    super(message);
    this.name = "DetailAssignmentPreviewContractError";
  }
}

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

  if (matches.some((match) => match.status === "IN_PROGRESS")) {
    return "active";
  }

  return "upcoming";
}

function toVisualMatchStatus(match: CourtMatch): VisualRoundStatus {
  if (match.status === "COMPLETED") {
    return "completed";
  }

  if (match.status === "IN_PROGRESS") {
    return "active";
  }

  return "upcoming";
}

function getMatchKey(roundNumber: number, courtNumber: number) {
  return `${roundNumber}:${courtNumber}`;
}

function getCurrentOperationalRound(game: Game) {
  return (
    game.rounds.find((round) =>
      round.matches.some((match) => match.status !== "COMPLETED")
    ) ??
    game.rounds[0] ??
    null
  );
}

function getAllMatches(game: Game) {
  return game.rounds.flatMap((round) => round.matches);
}

function getNextPendingMatchesByCourt(game: Game) {
  const matchesByCourt = new Map<number, CourtMatch[]>();
  for (const match of getAllMatches(game)) {
    matchesByCourt.set(match.courtNumber, [
      ...(matchesByCourt.get(match.courtNumber) ?? []),
      match,
    ]);
  }

  return Array.from(matchesByCourt.entries())
    .sort(([leftCourtNumber], [rightCourtNumber]) => leftCourtNumber - rightCourtNumber)
    .flatMap(([, matches]) => {
      const nextMatch = matches
        .slice()
        .sort((left, right) => left.roundNumber - right.roundNumber)
        .find(
          (match) => match.status !== "COMPLETED" && hasAssignedParticipant(match)
        );

      return nextMatch?.status === "NOT_STARTED" ? [nextMatch] : [];
    });
}

function formatParticipantName(
  participantId: string | null,
  participantsById: Map<string, Participant>
) {
  if (!participantId) {
    return "빈 슬롯";
  }

  return participantsById.get(participantId)?.name ?? "알 수 없음";
}

function formatTeamLine(
  participantIds: [string | null, string | null],
  participantsById: Map<string, Participant>
) {
  return participantIds
    .map((participantId) => formatParticipantName(participantId, participantsById))
    .join(" / ");
}

function formatMatchCountLabel(count: number) {
  return `${count}경기`;
}

function getGenderLabel(gender: Gender) {
  return gender === "MALE" ? "남" : "여";
}

function formatParticipantProfileLabel(
  participant: Pick<Participant, "gender" | "ageGroup" | "grade">,
  options: { includeGrade?: boolean } = {}
) {
  return [
    `${getGenderLabel(participant.gender)} · ${participant.ageGroup}대`,
    options.includeGrade ? formatGradeLabel(participant.grade) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function shouldShowWinLoss(matchRecordMode: MatchRecordMode) {
  return matchRecordMode !== "STATUS_ONLY";
}

function formatWinLossLabel(participant: Pick<Participant, "winCount" | "lossCount">) {
  return `${participant.winCount ?? 0}승 ${participant.lossCount ?? 0}패`;
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

function getMatchSlotIds(match: Pick<CourtMatch, "teamAIds" | "teamBIds">) {
  return [
    match.teamAIds[0],
    match.teamAIds[1],
    match.teamBIds[0],
    match.teamBIds[1],
  ] as const;
}

function hasAssignedParticipant(match: Pick<CourtMatch, "teamAIds" | "teamBIds">) {
  return getMatchSlotIds(match).some(Boolean);
}

function findDraftMatch(
  rounds: ScheduleDraftRound[],
  roundNumber: number,
  courtNumber: number
) {
  return rounds
    .find((round) => round.roundNumber === roundNumber)
    ?.matches.find((match) => match.courtNumber === courtNumber);
}

function getDraftSlotValue(
  rounds: ScheduleDraftRound[],
  target: ScheduleAssignmentTarget
) {
  const draftMatch = findDraftMatch(rounds, target.roundNumber, target.courtNumber);
  if (!draftMatch) {
    return null;
  }

  const slotIds = getMatchSlotIds(draftMatch);
  return slotIds[target.slotIndex] ?? null;
}

function updateScheduleDraftSlot(
  rounds: ScheduleDraftRound[],
  target: ScheduleAssignmentTarget,
  value: string | null
) {
  return rounds.map((round) =>
    round.roundNumber !== target.roundNumber
      ? round
      : {
          ...round,
          matches: round.matches.map((match) => {
            if (match.courtNumber !== target.courtNumber) {
              return match;
            }

            if (target.slotIndex === 0 || target.slotIndex === 1) {
              const teamAIds = [...match.teamAIds] as [string | null, string | null];
              teamAIds[target.slotIndex] = value;
              return { ...match, teamAIds };
            }

            const teamBIds = [...match.teamBIds] as [string | null, string | null];
            const teamBSlotIndex = target.slotIndex === 2 ? 0 : 1;
            teamBIds[teamBSlotIndex] = value;
            return { ...match, teamBIds };
          }),
        }
  );
}

function countAssignedMatches(rounds: ScheduleDraftRound[]) {
  const countByParticipantId = new Map<string, number>();

  for (const round of rounds) {
    for (const match of round.matches) {
      for (const participantId of getMatchSlotIds(match)) {
        if (!participantId) {
          continue;
        }
        countByParticipantId.set(
          participantId,
          (countByParticipantId.get(participantId) ?? 0) + 1
        );
      }
    }
  }

  return countByParticipantId;
}

function buildParticipantViews(
  game: Game,
  scheduleDraft: ScheduleDraftRound[]
): ParticipantView[] {
  const activeMatchKeys = new Set(
    game.rounds.flatMap((round) =>
      round.matches
        .filter((match) => match.status === "IN_PROGRESS")
        .map((match) => `${round.roundNumber}:${match.courtNumber}`)
    )
  );
  const activeParticipantIds = new Set(
    scheduleDraft.flatMap((round) =>
      round.matches.flatMap((match) =>
        activeMatchKeys.has(`${round.roundNumber}:${match.courtNumber}`)
          ? getMatchSlotIds(match).filter(
              (participantId): participantId is string => Boolean(participantId)
            )
          : []
      )
    )
  );
  const assignedMatchCountByParticipantId = countAssignedMatches(scheduleDraft);

  return game.participants.map((participant) => ({
    ...participant,
    gamesAssigned: assignedMatchCountByParticipantId.get(participant.id) ?? 0,
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

function buildDisplayRoundGroups(
  game: Game,
  scheduleDraft: ScheduleDraftRound[]
): DisplayRoundGroup[] {
  const participantsById = new Map(
    game.participants.map((participant) => [participant.id, participant] as const)
  );

  return scheduleDraft.map((draftRound) => {
    const sourceRound = game.rounds.find(
      (round) => round.roundNumber === draftRound.roundNumber
    );

    return {
      roundNumber: draftRound.roundNumber,
      visualStatus: sourceRound ? toVisualRoundStatus(sourceRound.matches) : "upcoming",
      courts: draftRound.matches.map((draftMatch) => {
        const sourceMatch = sourceRound?.matches.find(
          (match) => match.courtNumber === draftMatch.courtNumber
        );
        const displayMatch: CourtMatch = {
          roundNumber: draftRound.roundNumber,
          courtNumber: draftMatch.courtNumber,
          teamAIds: draftMatch.teamAIds,
          teamBIds: draftMatch.teamBIds,
          status: sourceMatch?.status ?? "NOT_STARTED",
          result: sourceMatch?.result ?? null,
          teamAScore: sourceMatch?.teamAScore ?? null,
          teamBScore: sourceMatch?.teamBScore ?? null,
          isActive: sourceMatch?.isActive ?? false,
        };

        return {
          match: displayMatch,
          participants: getMatchSlotIds(displayMatch).map((participantId) =>
            participantId ? participantsById.get(participantId) : undefined
          ),
        };
      }),
    };
  });
}

function createParticipantAliasMaps(participants: Participant[]) {
  const aliasByParticipantId = new Map<string, number>();
  const participantIdByAlias = new Map<number, string>();

  participants.forEach((participant, index) => {
    const alias = index + 1;
    aliasByParticipantId.set(participant.id, alias);
    participantIdByAlias.set(alias, participant.id);
  });

  return { aliasByParticipantId, participantIdByAlias };
}

function buildGameDetailAssignmentPreviewRequest({
  game,
  scheduleDraft,
  existingAssignmentPolicy,
  aliasByParticipantId,
}: {
  game: Game;
  scheduleDraft: ScheduleDraftRound[];
  existingAssignmentPolicy: AssignmentPreviewExistingAssignmentPolicy;
  aliasByParticipantId: Map<string, number>;
}): CreateGameAssignmentPreviewRequest {
  const gamesAssignedByParticipantId = countAssignedMatches(scheduleDraft);

  return {
    participants: game.participants.map((participant) => ({
      participantId: aliasByParticipantId.get(participant.id) ?? 0,
      gender: participant.gender,
      ageGroup: participant.ageGroup,
      grade: toBackendGrade(participant.grade) ?? "초심",
      gamesAssigned: gamesAssignedByParticipantId.get(participant.id) ?? 0,
    })),
    rounds: scheduleDraft.map((round) => ({
      roundNumber: round.roundNumber,
      courts: round.matches.map((match) => ({
        courtNumber: match.courtNumber,
        slots:
          existingAssignmentPolicy === "REASSIGN_ALL"
            ? [null, null, null, null]
            : (getMatchSlotIds(match).map((participantId) =>
                participantId ? (aliasByParticipantId.get(participantId) ?? null) : null
              ) as [number | null, number | null, number | null, number | null]),
      })),
    })),
    partnerPairs: [],
    preferences: {
      partnerPolicy: "IGNORE_PARTNERS",
      existingAssignmentPolicy,
    },
  };
}

function applyGameDetailAssignmentPreview({
  preview,
  scheduleDraft,
  participantIdByAlias,
}: {
  preview: CreateGameAssignmentPreviewResponse;
  scheduleDraft: ScheduleDraftRound[];
  participantIdByAlias: Map<number, string>;
}) {
  if (!Array.isArray(preview.rounds) || preview.rounds.length !== scheduleDraft.length) {
    throw new DetailAssignmentPreviewContractError();
  }

  const nextScheduleDraft = scheduleDraft.map((round, roundIndex) => {
    const previewRound = preview.rounds[roundIndex];

    if (
      !previewRound ||
      previewRound.roundNumber !== round.roundNumber ||
      !Array.isArray(previewRound.courts) ||
      previewRound.courts.length !== round.matches.length
    ) {
      throw new DetailAssignmentPreviewContractError();
    }

    return {
      ...round,
      matches: round.matches.map((match, matchIndex) => {
        const previewCourt = previewRound.courts[matchIndex];

        if (
          !previewCourt ||
          previewCourt.courtNumber !== match.courtNumber ||
          !Array.isArray(previewCourt.slots) ||
          previewCourt.slots.length !== 4
        ) {
          throw new DetailAssignmentPreviewContractError();
        }

        const nextIds = previewCourt.slots.map((participantAlias) => {
          if (participantAlias === null) {
            return null;
          }

          const participantId = participantIdByAlias.get(participantAlias);
          if (!participantId) {
            throw new DetailAssignmentPreviewContractError();
          }

          return participantId;
        }) as [string | null, string | null, string | null, string | null];

        return {
          ...match,
          teamAIds: [nextIds[0], nextIds[1]] as [string | null, string | null],
          teamBIds: [nextIds[2], nextIds[3]] as [string | null, string | null],
        };
      }),
    };
  });

  const validationError = validateSchedule(nextScheduleDraft);
  if (validationError) {
    throw new DetailAssignmentPreviewContractError();
  }

  return nextScheduleDraft;
}

const BadmintonCourt = ({
  court,
  status,
  density = "default",
  isEditable = false,
  isInteractionDisabled = false,
  selectedTargetSlot = null,
  onSelectSlot,
}: {
  court: {
    match: CourtMatch;
    participants: (Participant | undefined)[];
  };
  status: VisualRoundStatus;
  density?: "default" | "compact";
  isEditable?: boolean;
  isInteractionDisabled?: boolean;
  selectedTargetSlot?: number | null;
  onSelectSlot?: (slotIndex: 0 | 1 | 2 | 3) => void;
}) => {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isCompact = density === "compact";
  const resultLabel =
    court.match.teamAScore != null && court.match.teamBScore != null
      ? `${court.match.teamAScore}:${court.match.teamBScore}`
      : toResultLabel(court.match.result ?? null);
  const slotParticipantIds = getMatchSlotIds(court.match);
  const courtFrameClassName = isCompact
    ? "border-2 p-1 shadow-none"
    : "border-4 p-2 shadow-inner";
  const courtInsetClassName = isCompact ? "inset-1 border" : "inset-2 border-2";
  const netClassName = isCompact
    ? "top-1 bottom-1 w-0.5"
    : "top-1 bottom-1 w-1";
  const horizontalLineClassName = isCompact
    ? "left-1 right-1 h-px"
    : "left-2 right-2 h-0.5";
  const sideLineClassName = isCompact
    ? "top-1 bottom-1 w-px"
    : "top-2 bottom-2 w-0.5";
  const slotPaddingClassName = isCompact ? "p-0.5" : "p-1";
  const playerChipBaseClassName = isCompact
    ? "flex min-w-0 max-w-[96%] items-center justify-center overflow-hidden rounded-none border px-1 py-0.5"
    : "flex min-w-[70px] max-w-[95%] items-center justify-center rounded-none border-2 px-2 py-1";
  const playerNameClassName = isCompact
    ? "flex w-full min-w-0 flex-col items-center justify-center truncate text-center text-[9px] leading-none font-black sm:text-[10px] xl:text-[11px]"
    : "w-full truncate text-center text-[10px] leading-none font-bold";
  const playerMetaClassName = isCompact
    ? "mt-0.5 max-w-full truncate font-mono text-[7px] font-bold uppercase tracking-wider text-slate-500 sm:text-[8px]"
    : "ml-0.5 text-[9px] font-mono uppercase tracking-widest";
  const emptyEditableSlotClassName = isCompact
    ? "flex min-h-5 min-w-0 max-w-[88%] items-center justify-center rounded-none border px-1 py-0.5 text-[8px] font-black uppercase tracking-[0.12em]"
    : "flex min-h-8 min-w-[56px] max-w-[78px] items-center justify-center rounded-none border-2 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em]";
  const emptyReadOnlySlotClassName =
    "flex min-w-0 max-w-[88%] items-center justify-center rounded-none border border-white/35 bg-white/15 px-1 py-0.5 text-center text-[8px] font-black leading-none text-white/80";

  return (
    <div
      className={`relative flex aspect-[2/1] w-full min-w-0 flex-col justify-between overflow-hidden rounded-none ${courtFrameClassName} ${
        isCompleted
          ? "border-zinc-900 bg-zinc-800 opacity-90"
          : isActive
          ? "border-slate-900 bg-emerald-700"
          : "border-slate-900 bg-emerald-700/80"
      }`}
    >
      <div
        className={`pointer-events-none absolute ${courtInsetClassName} ${
          isCompleted
            ? "border-zinc-600"
            : isActive
            ? "border-white/30"
            : "border-white/25"
        }`}
      />
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${netClassName} ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/50"
            : "bg-white/40"
        }`}
      />
      <div
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${horizontalLineClassName} ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/30"
            : "bg-white/25"
        }`}
      />
      <div
        className={`pointer-events-none absolute left-[35%] ${sideLineClassName} ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/30"
            : "bg-white/25"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-[35%] ${sideLineClassName} ${
          isCompleted
            ? "bg-zinc-600"
            : isActive
            ? "bg-white/30"
            : "bg-white/25"
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
            className={`flex min-w-0 items-center justify-center ${slotPaddingClassName}`}
          >
            {isEditable ? (
              <button
                type="button"
                disabled={isInteractionDisabled}
                onClick={() => onSelectSlot?.(index as 0 | 1 | 2 | 3)}
                className={`flex h-full w-full items-center justify-center transition ${
                  isInteractionDisabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {participant ? (
                  <div
                    className={`${playerChipBaseClassName} ${
                      selectedTargetSlot === index
                        ? "border-teal-500 bg-teal-100 text-teal-950 ring-2 ring-teal-300/60"
                        : isCompleted
                        ? "border-zinc-900 bg-zinc-700 text-zinc-400"
                        : isActive
                        ? "border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                        : "border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    }`}
                  >
                    <div className={playerNameClassName}>
                      {participant.name}
                      <span
                        className={`${playerMetaClassName} ${
                          isCompleted ? "text-zinc-500" : "text-slate-500"
                        }`}
                      >
                        {isCompact ? "" : " · "}
                        {formatParticipantProfileLabel(participant)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`${emptyEditableSlotClassName} ${
                      selectedTargetSlot === index
                        ? "border-teal-500 bg-teal-100 text-teal-900 ring-2 ring-teal-300/60"
                        : isInteractionDisabled
                        ? "border-zinc-300 bg-zinc-100 text-zinc-400"
                        : "border-slate-900 bg-teal-400 text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-teal-300"
                    }`}
                  >
                    등록
                  </div>
                )}
              </button>
            ) : participant ? (
              <div
                className={`${playerChipBaseClassName} ${
                  isCompleted
                    ? "border-zinc-900 bg-zinc-700 text-zinc-400"
                    : isActive
                    ? "border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    : "border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                }`}
              >
                <div className={playerNameClassName}>
                  {participant.name}
                  <span
                    className={`${playerMetaClassName} ${
                      isCompleted ? "text-zinc-500" : "text-slate-500"
                    }`}
                  >
                    {isCompact ? "" : " · "}
                    {formatParticipantProfileLabel(participant)}
                  </span>
                </div>
              </div>
            ) : isCompact ? (
              <div className={emptyReadOnlySlotClassName}>빈 슬롯</div>
            ) : (
              <div
                className={`h-1.5 w-1.5 rounded-none ${
                  slotParticipantIds[index]
                    ? "bg-zinc-700"
                    : isCompleted
                    ? "bg-zinc-700"
                    : isActive
                    ? "bg-white/30"
                    : "bg-white/25"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const OperationCourtTile = ({
  match,
  participantsById,
  tone = "pending",
  children,
}: {
  match: CourtMatch;
  participantsById: Map<string, Participant>;
  tone?: "pending" | "active";
  children?: ReactNode;
}) => {
  const isActive = tone === "active";
  const toneBadgeClassName = isActive
    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
    : "border-zinc-300 bg-zinc-100 text-zinc-500";
  const accentClassName = isActive ? "text-emerald-700" : "text-zinc-900";
  const dividerClassName = isActive ? "border-emerald-500/20" : "border-zinc-200";
  const operationCourt = {
    match,
    participants: getMatchSlotIds(match).map((participantId) =>
      participantId ? participantsById.get(participantId) : undefined
    ),
  };

  return (
    <article
      className={`flex w-full min-w-0 flex-col overflow-hidden border-2 bg-white p-2 ${
        isActive
          ? "border-emerald-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
          : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${accentClassName}`}>
              코트 {String(match.courtNumber).padStart(2, "0")}
            </span>
            <span
              className={`inline-flex items-center border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest ${toneBadgeClassName}`}
            >
              {isActive ? "진행 중" : "대기"}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-zinc-400">
          R{String(match.roundNumber).padStart(2, "0")}
        </span>
      </div>

      <div className={`mt-2 min-w-0 border-t pt-2 ${dividerClassName}`}>
        <BadmintonCourt
          court={operationCourt}
          status={isActive ? "active" : "upcoming"}
          density="compact"
        />
      </div>

      {children ? <div className={`mt-2 border-t pt-2 ${dividerClassName}`}>{children}</div> : null}
    </article>
  );
};

const CompactScheduleRound = ({
  round,
  participantById,
}: {
  round: DisplayRoundGroup;
  participantById: Map<string, Participant>;
}) => {
  return (
    <section className="border-t border-zinc-200 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div
          className={`border px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest ${
            round.visualStatus === "active"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : round.visualStatus === "completed"
              ? "border-zinc-300 bg-zinc-100 text-zinc-500"
              : "border-zinc-200 bg-white text-zinc-400"
          }`}
        >
          Round {String(round.roundNumber).padStart(2, "0")}
          {round.visualStatus === "active" ? (
            <span className="ml-2 animate-pulse text-emerald-500">●</span>
          ) : null}
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          {round.courts.length}코트
        </span>
      </div>

      <div className="divide-y divide-zinc-100 border border-zinc-200 bg-white">
        {round.courts.map((court, courtIndex) => {
          const matchStatus = toVisualMatchStatus(court.match);
          const matchStatusLabel =
            matchStatus === "active"
              ? "진행 중"
              : matchStatus === "completed"
              ? "완료"
              : "대기";

          return (
            <div
              key={`${round.roundNumber}-${court.match.courtNumber}`}
              className="grid gap-1.5 px-3 py-2.5 sm:grid-cols-[5.5rem_1fr] sm:items-center"
            >
              <div className="flex items-center justify-between gap-2 sm:block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  코트 {String(courtIndex + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-[10px] font-bold sm:mt-1 sm:block ${
                    matchStatus === "active"
                      ? "text-emerald-600"
                      : matchStatus === "completed"
                      ? "text-zinc-400"
                      : "text-zinc-300"
                  }`}
                >
                  {matchStatusLabel}
                </span>
              </div>

              <div className="grid min-w-0 gap-1.5 text-xs font-bold text-zinc-800 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 font-mono font-black text-emerald-600">
                    A
                  </span>
                  <span className="truncate">
                    {formatTeamLine(court.match.teamAIds, participantById)}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 font-mono font-black text-emerald-600">
                    B
                  </span>
                  <span className="truncate">
                    {formatTeamLine(court.match.teamBIds, participantById)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [operationSubmitting, setOperationSubmitting] = useState(false);
  const [isAiPreviewSubmitting, setIsAiPreviewSubmitting] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [aiPreviewError, setAiPreviewError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, MatchScoreDraft>>({});
  const [selectedScheduleTarget, setSelectedScheduleTarget] =
    useState<ScheduleAssignmentTarget | null>(null);
  const [existingAssignmentPolicy, setExistingAssignmentPolicy] =
    useState<AssignmentPreviewExistingAssignmentPolicy>("FILL_EMPTY_SLOTS");
  const [copyLabel, setCopyLabel] = useState("공유");
  const [participantDraft, setParticipantDraft] = useState<ParticipantDraft>(
    DEFAULT_PARTICIPANT_DRAFT
  );
  const [participantError, setParticipantError] = useState("");
  const [isParticipantSubmitting, setIsParticipantSubmitting] = useState(false);
  const [isParticipantManagerOpen, setIsParticipantManagerOpen] = useState(false);

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
        setEditMode(null);
        setSettingsError("");
        setScheduleError("");
        setAiPreviewError("");
        setOperationError("");
        setParticipantError("");
        setScoreDrafts({});
        setSelectedScheduleTarget(null);
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
      setOperationError("");
    }
  };

  const displayRoundGroups = useMemo(() => {
    if (!game) {
      return [];
    }

    return buildDisplayRoundGroups(game, scheduleDraft);
  }, [game, scheduleDraft]);

  const participantViews = useMemo(
    () => (game ? buildParticipantViews(game, scheduleDraft) : []),
    [game, scheduleDraft]
  );

  const participantById = useMemo(
    () => new Map(game?.participants.map((participant) => [participant.id, participant]) ?? []),
    [game]
  );
  const { aliasByParticipantId, participantIdByAlias } = useMemo(
    () => createParticipantAliasMaps(game?.participants ?? []),
    [game]
  );

  const activeRound = displayRoundGroups.find(
    (round) => round.visualStatus === "active"
  );
  const currentOperationalRound = game ? getCurrentOperationalRound(game) : null;
  const allMatches = game ? getAllMatches(game) : [];
  const pendingMatches = game ? getNextPendingMatchesByCourt(game) : [];
  const activeMatches = allMatches.filter((match) => match.status === "IN_PROGRESS");
  const operationalRoundNumber =
    activeMatches[0]?.roundNumber ??
    pendingMatches[0]?.roundNumber ??
    currentOperationalRound?.roundNumber ??
    null;
  const isOperator = !!game;
  const isEditingSettings = editMode === "settings";
  const isEditingSchedule = editMode === "schedule";
  const isBusy = operationSubmitting || isAiPreviewSubmitting || isParticipantSubmitting;
  const isScheduleInteractionDisabled = isBusy || !isEditingSchedule;
  const canAddParticipant = game?.status !== "COMPLETED";
  const isAnyModalOpen =
    isEditingSettings ||
    isParticipantManagerOpen ||
    Boolean(selectedScheduleTarget && isEditingSchedule);

  useEffect(() => {
    if (!isAnyModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAnyModalOpen]);

  const handleCopyShareLink = async () => {
    if (!game) {
      return;
    }

    await navigator.clipboard.writeText(
      `${window.location.origin}/court-manager/share/${game.shareCode}`
    );
    setCopyLabel("복사됨");
    window.setTimeout(() => setCopyLabel("공유"), 1200);
  };

  const openSettingsEditor = () => {
    if (!game) {
      return;
    }
    setSettingsError("");
    setScheduleError("");
    setAiPreviewError("");
    setSelectedScheduleTarget(null);
    setSettingsDraft({
      title: game.title,
      matchRecordMode: game.matchRecordMode,
      gradeType: game.gradeType,
    });
    setEditMode("settings");
  };

  const closeSettingsEditor = () => {
    if (!game) {
      return;
    }
    setSettingsError("");
    setSettingsDraft({
      title: game.title,
      matchRecordMode: game.matchRecordMode,
      gradeType: game.gradeType,
    });
    setEditMode(null);
  };

  const openScheduleEditor = () => {
    if (!game) {
      return;
    }
    setScheduleError("");
    setAiPreviewError("");
    setSettingsError("");
    setSelectedScheduleTarget(null);
    setScheduleDraft(cloneSchedule(game.rounds));
    setEditMode("schedule");
  };

  const closeScheduleEditor = () => {
    if (!game) {
      return;
    }
    setScheduleDraft(cloneSchedule(game.rounds));
    setScheduleError("");
    setAiPreviewError("");
    setSelectedScheduleTarget(null);
    setEditMode(null);
  };

  const getParticipantAssignmentConflict = (participantId: string) => {
    if (!selectedScheduleTarget) {
      return "";
    }

    const targetRound = scheduleDraft.find(
      (round) => round.roundNumber === selectedScheduleTarget.roundNumber
    );
    if (!targetRound) {
      return "";
    }

    for (const match of targetRound.matches) {
      const slotIds = getMatchSlotIds(match);

      for (let slotIndex = 0; slotIndex < slotIds.length; slotIndex += 1) {
        const currentParticipantId = slotIds[slotIndex];
        if (!currentParticipantId || currentParticipantId !== participantId) {
          continue;
        }

        const isSameTarget =
          match.courtNumber === selectedScheduleTarget.courtNumber &&
          slotIndex === selectedScheduleTarget.slotIndex;
        if (isSameTarget) {
          continue;
        }

        if (match.courtNumber === selectedScheduleTarget.courtNumber) {
          return "같은 코트에 이미 배정됨";
        }

        return `라운드 ${selectedScheduleTarget.roundNumber}의 다른 코트에 이미 배정됨`;
      }
    }

    return "";
  };

  const handleSelectScheduleTarget = (
    roundNumber: number,
    courtNumber: number,
    slotIndex: 0 | 1 | 2 | 3
  ) => {
    if (isScheduleInteractionDisabled) {
      return;
    }

    setScheduleError("");
    setAiPreviewError("");
    setSelectedScheduleTarget({ roundNumber, courtNumber, slotIndex });
  };

  const closeScheduleAssignmentModal = () => {
    setSelectedScheduleTarget(null);
  };

  const assignParticipantToTarget = (participantId: string | null) => {
    if (!selectedScheduleTarget || isScheduleInteractionDisabled) {
      return;
    }

    if (participantId) {
      const assignmentConflict = getParticipantAssignmentConflict(participantId);
      if (assignmentConflict) {
        return;
      }
    }

    setScheduleDraft((prev) =>
      updateScheduleDraftSlot(prev, selectedScheduleTarget, participantId)
    );
    setSelectedScheduleTarget(null);
  };

  const handleSaveSettings = async () => {
    if (!game || !settingsDraft) {
      return;
    }

    const trimmedTitle = settingsDraft.title.trim();
    if (!trimmedTitle) {
      setSettingsError("게임 이름을 입력해주세요.");
      return;
    }

    setOperationSubmitting(true);
    setSettingsError("");
    const success = await updateGame(game.id, {
      title: trimmedTitle,
      matchRecordMode: isRecordModeLocked
        ? game.matchRecordMode
        : settingsDraft.matchRecordMode,
      gradeType: settingsDraft.gradeType,
    });
    if (!success) {
      setSettingsError("게임 이름 저장에 실패했습니다.");
    } else {
      setEditMode(null);
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
      setScheduleError(validationError);
      return;
    }

    setOperationSubmitting(true);
    setScheduleError("");
    setAiPreviewError("");
    const success = await updateGameSchedule(game.id, scheduleDraft);
    if (!success) {
      setScheduleError("대진표 저장에 실패했습니다.");
    } else {
      setEditMode(null);
      setSelectedScheduleTarget(null);
      await reloadGame();
    }
    setOperationSubmitting(false);
  };

  const handleAddParticipant = async () => {
    if (!game || !canAddParticipant || isBusy) {
      return;
    }

    const trimmedName = participantDraft.name.trim();
    if (!trimmedName) {
      setParticipantError("참가자 이름을 입력해주세요.");
      return;
    }

    setIsParticipantSubmitting(true);
    setParticipantError("");
    const success = await addFreeGameParticipant(game.id, {
      ...participantDraft,
      name: trimmedName,
    });
    if (!success) {
      setParticipantError("참가자 추가에 실패했습니다.");
    } else {
      setParticipantDraft((prev) => ({ ...DEFAULT_PARTICIPANT_DRAFT, gender: prev.gender }));
      await reloadGame();
    }
    setIsParticipantSubmitting(false);
  };

  const handleStartGame = async () => {
    if (!game) {
      return;
    }

    setOperationSubmitting(true);
    setOperationError("");
    const success = await startFreeGame(game.id);
    if (!success) {
      setOperationError("자유게임 시작에 실패했습니다.");
    } else {
      await reloadGame();
    }
    setOperationSubmitting(false);
  };

  const handleStartMatch = async (roundNumber: number, courtNumber: number) => {
    if (!game) {
      return;
    }

    setOperationSubmitting(true);
    setOperationError("");
    const success = await startFreeGameMatch(game.id, roundNumber, courtNumber);
    if (!success) {
      setOperationError("매치 시작에 실패했습니다.");
    } else {
      await reloadGame();
    }
    setOperationSubmitting(false);
  };

  const updateScoreDraft = (
    roundNumber: number,
    courtNumber: number,
    key: keyof MatchScoreDraft,
    value: string
  ) => {
    const matchKey = getMatchKey(roundNumber, courtNumber);
    setScoreDrafts((prev) => ({
      ...prev,
      [matchKey]: {
        teamAScore: prev[matchKey]?.teamAScore ?? "",
        teamBScore: prev[matchKey]?.teamBScore ?? "",
        [key]: value,
      },
    }));
  };

  const handleCompleteMatch = async (
    roundNumber: number,
    courtNumber: number,
    winnerTeam?: MatchWinnerTeam
  ) => {
    if (!game) {
      return;
    }

    const request =
      game.matchRecordMode === "SCORE"
        ? (() => {
            const scoreDraft = scoreDrafts[getMatchKey(roundNumber, courtNumber)];
            const teamAScore = Number(scoreDraft?.teamAScore);
            const teamBScore = Number(scoreDraft?.teamBScore);
            if (
              scoreDraft?.teamAScore === "" ||
              scoreDraft?.teamBScore === "" ||
              Number.isNaN(teamAScore) ||
              Number.isNaN(teamBScore)
            ) {
              setOperationError("양 팀 점수를 모두 입력해주세요.");
              return null;
            }
            if (teamAScore === teamBScore) {
              setOperationError("점수 기록에서는 동점을 입력할 수 없습니다.");
              return null;
            }
            return { teamAScore, teamBScore };
          })()
        : game.matchRecordMode === "WINNER_ONLY"
        ? { winnerTeam }
        : {};

    if (request == null) {
      return;
    }

    setOperationSubmitting(true);
    setOperationError("");
    const success = await completeFreeGameMatch(
      game.id,
      roundNumber,
      courtNumber,
      request
    );
    if (!success) {
      setOperationError("매치 종료에 실패했습니다.");
    } else {
      setScoreDrafts((prev) => {
        const next = { ...prev };
        delete next[getMatchKey(roundNumber, courtNumber)];
        return next;
      });
      await reloadGame();
    }
    setOperationSubmitting(false);
  };

  const handleRunScheduleAiPreview = async () => {
    if (!game) {
      return;
    }

    setIsAiPreviewSubmitting(true);
    setScheduleError("");
    setAiPreviewError("");
    setSelectedScheduleTarget(null);

    try {
      const request = buildGameDetailAssignmentPreviewRequest({
        game,
        scheduleDraft,
        existingAssignmentPolicy,
        aliasByParticipantId,
      });
      const submittedJob = await createFreeGameAssignmentPreview(request);

      while (true) {
        const job = await getFreeGameAssignmentPreviewJob(submittedJob.jobId);

        if (job.status === "QUEUED" || job.status === "RUNNING") {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          continue;
        }

        if (job.status === "FAILED") {
          setAiPreviewError(job.failure?.message || AI_PREVIEW_GENERIC_FAILURE_MESSAGE);
          return;
        }

        if (!job.preview) {
          setAiPreviewError(AI_PREVIEW_GENERIC_FAILURE_MESSAGE);
          return;
        }

        const nextScheduleDraft = applyGameDetailAssignmentPreview({
          preview: job.preview,
          scheduleDraft,
          participantIdByAlias,
        });
        setScheduleDraft(nextScheduleDraft);
        return;
      }
    } catch (error) {
      if (error instanceof DetailAssignmentPreviewContractError) {
        setAiPreviewError(error.message);
      } else {
        setAiPreviewError(
          getUserFacingErrorMessage(error, AI_PREVIEW_GENERIC_FAILURE_MESSAGE)
        );
      }
    } finally {
      setIsAiPreviewSubmitting(false);
    }
  };

  const selectedScheduleTargetMeta = selectedScheduleTarget
    ? {
        roundNumber: selectedScheduleTarget.roundNumber,
        courtNumber: selectedScheduleTarget.courtNumber,
        slotNumber: selectedScheduleTarget.slotIndex + 1,
      }
    : null;
  const selectedTargetParticipantId = selectedScheduleTarget
    ? getDraftSlotValue(scheduleDraft, selectedScheduleTarget)
    : null;
  const selectedTargetParticipant = selectedTargetParticipantId
    ? participantById.get(selectedTargetParticipantId) ?? null
    : null;
  const mobileParticipantViews = participantViews.slice(0, 8);
  const hiddenMobileParticipantCount = Math.max(
    participantViews.length - mobileParticipantViews.length,
    0
  );
  const isRecordModeLocked = game?.status !== "NOT_STARTED";
  const recordModeOptions: MatchRecordMode[] = [
    "STATUS_ONLY",
    "WINNER_ONLY",
    "SCORE",
  ];
  const assignmentPolicySelectOptions = Object.entries(
    AI_ASSIGNMENT_POLICY_LABELS
  ).map(([value, label]) => ({ value, label }));
  const operationBoardTitle = game
    ? game.status === "NOT_STARTED"
      ? "대기 게임"
      : game.status === "COMPLETED"
      ? "자유게임 완료"
      : activeMatches.length > 0
      ? "진행 중"
      : "입장 대상 확인"
    : "";
  const operationBoardSummary = game
    ? game.status === "COMPLETED"
      ? "모든 매치가 종료되었습니다."
      : activeMatches.length > 0
      ? `진행 중 ${activeMatches.length}코트${
          pendingMatches.length > 0 ? ` · 다음 입장 ${pendingMatches.length}코트` : ""
        }`
      : pendingMatches.length > 0
      ? `${pendingMatches.length}코트 입장 대기`
      : "입장 대상이 없습니다."
    : "";
  const showParticipantWinLoss = game
    ? shouldShowWinLoss(game.matchRecordMode)
    : false;
  const renderParticipantSummaryRow = (
    participant: ParticipantView,
    options: { includeGrade?: boolean; modal?: boolean } = {}
  ) => {
    const isPlaying = participant.status === "playing";

    return (
      <div
        key={participant.id}
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 transition-colors hover:bg-zinc-50 ${
          options.modal ? "px-4 py-3" : "px-4 py-3"
        }`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            {isPlaying ? (
              <span className="h-2 w-2 shrink-0 rounded-none bg-emerald-500" />
            ) : null}
            <div className="truncate text-sm font-bold text-zinc-950">
              {participant.name}
            </div>
          </div>
          <div
            className={`mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500 ${
              isPlaying ? "pl-[18px]" : ""
            }`}
          >
            <span>{formatParticipantProfileLabel(participant, options)}</span>
            <span>{formatMatchCountLabel(participant.gamesAssigned)}</span>
          </div>
        </div>

        {isPlaying || showParticipantWinLoss ? (
          <div className="shrink-0 text-right">
            {isPlaying ? (
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600">
                경기 중
              </div>
            ) : null}
            {showParticipantWinLoss ? (
              <div className={isPlaying ? "mt-1 text-[11px] font-bold text-zinc-500" : "text-[11px] font-bold text-zinc-500"}>
                {formatWinLossLabel(participant)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };
  const renderActiveMatchActions = (match: CourtMatch) => {
    if (!game) {
      return null;
    }

    const matchKey = getMatchKey(match.roundNumber, match.courtNumber);
    const scoreDraft = scoreDrafts[matchKey] ?? {
      teamAScore: "",
      teamBScore: "",
    };

    if (game.matchRecordMode === "STATUS_ONLY") {
      return (
        <Button
          className="h-10 w-full rounded-none bg-zinc-950 text-xs font-bold text-white hover:bg-zinc-800"
          onClick={() => void handleCompleteMatch(match.roundNumber, match.courtNumber)}
          disabled={isBusy}
        >
          매치 종료
        </Button>
      );
    }

    if (game.matchRecordMode === "WINNER_ONLY") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-none border-zinc-300 text-[11px] font-bold"
            onClick={() =>
              void handleCompleteMatch(match.roundNumber, match.courtNumber, "TEAM_A")
            }
            disabled={isBusy}
          >
            A팀 승
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-none border-zinc-300 text-[11px] font-bold"
            onClick={() =>
              void handleCompleteMatch(match.roundNumber, match.courtNumber, "TEAM_B")
            }
            disabled={isBusy}
          >
            B팀 승
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            inputMode="numeric"
            value={scoreDraft.teamAScore}
            onChange={(event) =>
              updateScoreDraft(
                match.roundNumber,
                match.courtNumber,
                "teamAScore",
                event.target.value.replace(/\D/g, "")
              )
            }
            className="h-10 min-w-0 rounded-none border-2 border-zinc-200 bg-white px-2 text-center text-sm font-bold text-zinc-950 focus:border-zinc-950 focus:outline-none"
            placeholder="A"
          />
          <input
            inputMode="numeric"
            value={scoreDraft.teamBScore}
            onChange={(event) =>
              updateScoreDraft(
                match.roundNumber,
                match.courtNumber,
                "teamBScore",
                event.target.value.replace(/\D/g, "")
              )
            }
            className="h-10 min-w-0 rounded-none border-2 border-zinc-200 bg-white px-2 text-center text-sm font-bold text-zinc-950 focus:border-zinc-950 focus:outline-none"
            placeholder="B"
          />
        </div>
        <Button
          className="h-10 rounded-none bg-zinc-950 px-3 text-xs font-bold text-white hover:bg-zinc-800"
          onClick={() => void handleCompleteMatch(match.roundNumber, match.courtNumber)}
          disabled={isBusy}
        >
          종료
        </Button>
      </div>
    );
  };
  const operationBoard = game ? (
    <section className="w-full min-w-0 overflow-hidden border-2 border-zinc-950 bg-white">
      <div className="border-b-2 border-zinc-950 bg-zinc-950 px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
              현재 운영
            </div>
            <h2 className="mt-1 font-display text-xl font-black tracking-tight text-white">
              {operationBoardTitle}
            </h2>
          </div>
          <span className="shrink-0 rounded-none border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-[10px] font-mono font-bold text-emerald-300">
            {operationalRoundNumber
              ? `R${String(operationalRoundNumber).padStart(2, "0")}`
              : "DONE"}
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-4 p-3 sm:p-4">
        {operationError ? (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            {operationError}
          </div>
        ) : null}

        {game.status === "COMPLETED" ? (
          <div className="border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm font-bold text-zinc-500">
            모든 매치가 종료되었습니다.
          </div>
        ) : activeMatches.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                <span>진행 중</span>
                <span>{operationBoardSummary}</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 md:grid-cols-3 xl:grid-cols-4">
                {activeMatches.map((match) => (
                  <OperationCourtTile
                    key={getMatchKey(match.roundNumber, match.courtNumber)}
                    match={match}
                    participantsById={participantById}
                    tone="active"
                  >
                    {renderActiveMatchActions(match)}
                  </OperationCourtTile>
                ))}
              </div>
            </div>

            {pendingMatches.length > 0 ? (
              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  <span>다음 입장</span>
                  <span>{pendingMatches.length}코트 입장 대기</span>
                </div>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {pendingMatches.map((match) => (
                    <OperationCourtTile
                      key={getMatchKey(match.roundNumber, match.courtNumber)}
                      match={match}
                      participantsById={participantById}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : pendingMatches.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                <span>{game.status === "NOT_STARTED" ? "대기 코트" : "입장 대기"}</span>
                <span>{operationBoardSummary}</span>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 md:grid-cols-3 xl:grid-cols-4">
                {pendingMatches.map((match) => (
                  <OperationCourtTile
                    key={getMatchKey(match.roundNumber, match.courtNumber)}
                    match={match}
                    participantsById={participantById}
                  >
                    {game.status === "IN_PROGRESS" ? (
                      <Button
                        className="h-10 w-full rounded-none bg-emerald-500 text-xs font-black tracking-widest text-zinc-950 hover:bg-emerald-400"
                        onClick={() =>
                          void handleStartMatch(match.roundNumber, match.courtNumber)
                        }
                        disabled={isBusy}
                      >
                        매치 시작
                      </Button>
                    ) : null}
                  </OperationCourtTile>
                ))}
              </div>
            </div>

            {game.status === "NOT_STARTED" ? (
              <Button
                className="h-11 w-full rounded-none bg-emerald-500 text-xs font-black tracking-widest text-zinc-950 hover:bg-emerald-400"
                onClick={() => void handleStartGame()}
                disabled={isBusy || pendingMatches.length === 0}
              >
                자유게임 시작
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm font-bold text-zinc-500">
            입장 대상이 없습니다. 대진표를 편집해 참가자를 배정해주세요.
          </div>
        )}
      </div>
    </section>
  ) : null;

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

  const headerRoundLabel = `${String(
    operationalRoundNumber ||
      currentOperationalRound?.roundNumber ||
      activeRound?.roundNumber ||
      displayRoundGroups[0]?.roundNumber ||
      1
  ).padStart(2, "0")}/${String(displayRoundGroups.length).padStart(2, "0")}`;
  const headerGradeTypeLabel =
    game.gradeType === "REGIONAL" ? "지역 급수" : "전국 급수";

  return (
    <div className="min-h-screen bg-zinc-50 pb-28 lg:pb-20">
      <div className="sticky top-16 z-30 border-b-4 border-emerald-600 bg-zinc-950 text-white">
        <div className="container mx-auto flex min-h-16 max-w-6xl items-center gap-2 px-4 py-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link href="/court-manager">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-none text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="코트매니저로 돌아가기"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="hidden h-6 w-px bg-zinc-800 sm:block" />
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse bg-emerald-400" />
                {getGameStatusLabel(game.status)}
              </div>
              <h1 className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase tracking-tight text-white sm:text-lg">
                {game.title}
              </h1>
              <div className="hidden shrink-0 items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 lg:flex">
                <span>{game.participants.length}명</span>
                <span className="h-1 w-1 bg-zinc-700" />
                <span>{String(game.courtCount).padStart(2, "0")}코트</span>
                <span className="h-1 w-1 bg-zinc-700" />
                <span>R{headerRoundLabel}</span>
                <span className="hidden h-1 w-1 bg-zinc-700 xl:block" />
                <span className="hidden xl:inline">
                  {getMatchRecordModeLabel(game.matchRecordMode)}
                </span>
                <span className="hidden h-1 w-1 bg-zinc-700 xl:block" />
                <span className="hidden xl:inline">{headerGradeTypeLabel}</span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 shrink-0 rounded-none border-2 border-zinc-700 bg-zinc-900 px-3 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap text-zinc-100 shadow-none hover:bg-zinc-800"
            onClick={openSettingsEditor}
            disabled={isBusy}
            aria-label="기본 정보 수정"
          >
            <PencilLine className="h-3.5 w-3.5 sm:mr-2" />
            <span className="hidden sm:inline">수정</span>
          </Button>
          <Button
            size="sm"
            className="h-11 shrink-0 rounded-none border-2 border-zinc-700 bg-zinc-900 px-3 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap text-zinc-100 shadow-none hover:bg-zinc-800"
            onClick={() => void handleCopyShareLink()}
            aria-label="공유 링크 복사"
          >
            <Copy className="h-3.5 w-3.5 sm:mr-2" />
            <span className="hidden sm:inline">{copyLabel}</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto min-w-0 max-w-6xl px-4 py-8">
        {pageError && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {pageError}
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8 lg:gap-8">
            {isOperator ? (
              <div className="order-1 min-w-0">{operationBoard}</div>
            ) : null}

            <div className="order-3 space-y-4 lg:order-3">
              <div className="flex flex-col gap-3 border-b border-zinc-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-black tracking-tight text-zinc-950">
                    대진표
                  </h2>
                  <p className="mt-1 text-xs font-mono text-zinc-500">
                    라운드별 코트 배정과 현재 진행 상태를 확인합니다.
                  </p>
                </div>
                {isOperator && !isEditingSchedule ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full shrink-0 rounded-none border-zinc-300 px-4 text-xs font-bold text-zinc-700 hover:border-zinc-950 hover:bg-zinc-50 hover:text-zinc-950 sm:w-auto"
                    onClick={openScheduleEditor}
                    disabled={isBusy}
                  >
                    <PencilLine className="mr-2 h-3.5 w-3.5" />
                    대진표 수정
                  </Button>
                ) : null}
              </div>

              {isEditingSchedule ? (
                <div className="border-2 border-zinc-950 bg-white px-3 py-3 sm:px-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="font-display text-base font-black uppercase tracking-tight text-zinc-950">
                          대진표 편집
                        </h3>
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700">
                          편집 중
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500 sm:text-right">
                        슬롯을 눌러 참가자를 바꾸고, 저장 전까지는 임시 대진표로 유지됩니다.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 lg:grid-cols-[minmax(10rem,1fr)_11rem_6.5rem_7.5rem]">
                      <Button
                        className="h-11 rounded-none bg-emerald-500 px-3 text-xs font-black tracking-widest text-slate-950 hover:bg-emerald-400"
                        onClick={() => void handleRunScheduleAiPreview()}
                        disabled={isBusy}
                      >
                        {isAiPreviewSubmitting ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="mr-2 h-4 w-4" />
                        )}
                        {isAiPreviewSubmitting ? "AI 배정 중..." : "AI 자동 배정"}
                      </Button>
                      <Select
                        variant="brutalist"
                        size="compact"
                        value={existingAssignmentPolicy}
                        options={assignmentPolicySelectOptions}
                        disabled={isBusy}
                        onChange={(value) =>
                          setExistingAssignmentPolicy(
                            value as AssignmentPreviewExistingAssignmentPolicy
                          )
                        }
                        className="min-w-0"
                      />
                      <Button
                        variant="outline"
                        className="h-11 rounded-none border-zinc-200 text-xs font-bold"
                        onClick={closeScheduleEditor}
                        disabled={isBusy}
                      >
                        변경 취소
                      </Button>
                      <Button
                        className="h-11 rounded-none bg-zinc-950 px-3 text-xs font-bold text-white hover:bg-zinc-800"
                        onClick={() => void handleSaveSchedule()}
                        disabled={isBusy}
                      >
                        대진표 저장
                      </Button>
                    </div>
                  </div>

                  {scheduleError ? (
                    <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                      {scheduleError}
                    </div>
                  ) : null}
                  {aiPreviewError ? (
                    <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                      {aiPreviewError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className={isEditingSchedule ? "space-y-12" : "space-y-4"}>
                {displayRoundGroups.map((round) => {
                  return isEditingSchedule ? (
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
                              <BadmintonCourt
                                court={court}
                                status={toVisualMatchStatus(court.match)}
                                isEditable={isEditingSchedule}
                                isInteractionDisabled={isBusy}
                                selectedTargetSlot={
                                  selectedScheduleTarget?.roundNumber === round.roundNumber &&
                                  selectedScheduleTarget?.courtNumber ===
                                    court.match.courtNumber
                                    ? selectedScheduleTarget.slotIndex
                                    : null
                                }
                                onSelectSlot={(slotIndex) =>
                                  handleSelectScheduleTarget(
                                    round.roundNumber,
                                    court.match.courtNumber,
                                    slotIndex
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <CompactScheduleRound
                      key={round.roundNumber}
                      round={round}
                      participantById={participantById}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <div className="border-2 border-zinc-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b-2 border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-zinc-950">
                    참가자 현황
                  </h3>
                  <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    {participantViews.length}명
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-none border-zinc-300 bg-white px-3.5 text-xs font-bold hover:border-zinc-950 hover:bg-zinc-50"
                  onClick={() => {
                    setParticipantError("");
                    setIsParticipantManagerOpen(true);
                  }}
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  참가자 관리
                </Button>
              </div>

              <div className="divide-y-2 divide-zinc-100 lg:hidden">
                {mobileParticipantViews.map((participant) =>
                  renderParticipantSummaryRow(participant)
                )}

                {hiddenMobileParticipantCount > 0 ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border-t-2 border-zinc-100 bg-zinc-50 px-4 py-3 text-left text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                    onClick={() => {
                      setParticipantError("");
                      setIsParticipantManagerOpen(true);
                    }}
                  >
                    <span>전체 명단 / 추가</span>
                    <span className="font-mono text-zinc-400">
                      +{hiddenMobileParticipantCount}명
                    </span>
                  </button>
                ) : null}
              </div>

              <div className="hidden max-h-[500px] divide-y-2 divide-zinc-100 overflow-y-auto lg:block">
                {participantViews.map((participant) =>
                  renderParticipantSummaryRow(participant)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditingSettings ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain bg-zinc-950/50 px-4 py-8"
          onClick={closeSettingsEditor}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-xl flex-col overflow-hidden rounded-none border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 px-5 py-4">
              <div>
                <h3 className="font-display text-xl font-black tracking-tight text-slate-900">
                  기본 정보 수정
                </h3>
                <p className="mt-1 text-xs font-mono text-slate-500">
                  세션명, 기록 방식, 급수 기준을 수정합니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                onClick={closeSettingsEditor}
                aria-label="기본 정보 수정 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 p-5">
              <label className="block min-w-0">
                <span className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  세션명
                </span>
                <input
                  value={settingsDraft.title}
                  onChange={(event) =>
                    setSettingsDraft((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) {
                      return;
                    }

                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSaveSettings();
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeSettingsEditor();
                    }
                  }}
                  autoFocus
                  className="h-12 w-full min-w-0 rounded-none border-2 border-zinc-200 bg-zinc-50 px-3 font-display text-lg font-black tracking-tight text-zinc-950 focus:border-zinc-950 focus:bg-white focus:outline-none"
                  placeholder="세션 이름"
                />
              </label>

              <div className="grid gap-4">
                <fieldset className="min-w-0">
                  <legend className="mb-1 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    <span>기록 방식</span>
                    {isRecordModeLocked ? (
                      <span className="border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[9px] tracking-normal text-zinc-400">
                        시작 후 잠김
                      </span>
                    ) : null}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {recordModeOptions.map((mode) => {
                      const isSelected = settingsDraft.matchRecordMode === mode;

                      return (
                        <button
                          key={mode}
                          type="button"
                          disabled={isRecordModeLocked || isBusy}
                          onClick={() =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, matchRecordMode: mode } : prev
                            )
                          }
                          className={`h-11 rounded-none border-2 px-3 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? "border-teal-500 bg-teal-50 text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-900 hover:bg-white"
                          }`}
                          aria-pressed={isSelected}
                        >
                          {getMatchRecordModeLabel(mode)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="min-w-0">
                  <legend className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    급수 기준
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {GRADE_TYPE_OPTIONS.map((option) => {
                      const gradeType = option.value as Game["gradeType"];
                      const isSelected = settingsDraft.gradeType === gradeType;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, gradeType } : prev
                            )
                          }
                          className={`h-11 rounded-none border-2 px-3 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? "border-teal-500 bg-teal-50 text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-900 hover:bg-white"
                          }`}
                          aria-pressed={isSelected}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              {settingsError ? (
                <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                  {settingsError}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-none border-zinc-200 text-xs font-bold"
                  onClick={closeSettingsEditor}
                  disabled={operationSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-none bg-zinc-950 text-xs font-black tracking-widest text-white hover:bg-zinc-800"
                  onClick={() => void handleSaveSettings()}
                  disabled={operationSubmitting}
                >
                  {operationSubmitting ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isParticipantManagerOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain bg-zinc-950/50 px-4 py-8"
          onClick={() => setIsParticipantManagerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[min(88vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-none border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 px-5 py-4">
              <div>
                <h3 className="font-display text-xl font-black tracking-tight text-slate-900">
                  참가자 관리
                </h3>
                <p className="mt-1 text-xs font-mono text-slate-500">
                  참가자를 추가하고 현재 명단을 확인합니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                onClick={() => setIsParticipantManagerOpen(false)}
                aria-label="참가자 관리 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="min-h-0 overflow-y-auto border-b-2 border-zinc-100 md:border-r-2 md:border-b-0">
                <div className="flex items-center justify-between bg-zinc-50 px-4 py-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    현재 명단
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    {participantViews.length}명
                  </span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {participantViews.map((participant) =>
                    renderParticipantSummaryRow(participant, {
                      includeGrade: true,
                      modal: true,
                    })
                  )}
                </div>
              </div>

              <div className="bg-white p-4">
                <div className="mb-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    참가자 추가
                  </div>
                  {!canAddParticipant ? (
                    <p className="mt-1 text-xs font-bold text-zinc-400">
                      완료된 자유게임에는 참가자를 추가할 수 없습니다.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <input
                    value={participantDraft.name}
                    onChange={(event) =>
                      setParticipantDraft((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing) {
                        return;
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleAddParticipant();
                      }
                    }}
                    disabled={!canAddParticipant || isBusy}
                    className="h-11 min-w-0 rounded-none border-2 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-slate-900 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                    placeholder="이름"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      variant="brutalist"
                      size="compact"
                      value={participantDraft.gender}
                      options={PARTICIPANT_GENDER_OPTIONS}
                      disabled={!canAddParticipant || isBusy}
                      onChange={(value) =>
                        setParticipantDraft((prev) => ({
                          ...prev,
                          gender: value as Gender,
                        }))
                      }
                    />
                    <Select
                      variant="brutalist"
                      size="compact"
                      value={String(participantDraft.age)}
                      options={PARTICIPANT_AGE_SELECT_OPTIONS}
                      disabled={!canAddParticipant || isBusy}
                      onChange={(value) =>
                        setParticipantDraft((prev) => ({
                          ...prev,
                          age: Number(value) as AgeGroup,
                        }))
                      }
                    />
                    <Select
                      variant="brutalist"
                      size="compact"
                      value={participantDraft.grade}
                      options={PARTICIPANT_GRADE_SELECT_OPTIONS}
                      disabled={!canAddParticipant || isBusy}
                      onChange={(value) =>
                        setParticipantDraft((prev) => ({
                          ...prev,
                          grade: value as Grade,
                        }))
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    className="h-11 rounded-none bg-zinc-950 text-xs font-black tracking-widest text-white hover:bg-zinc-800"
                    onClick={() => void handleAddParticipant()}
                    disabled={!canAddParticipant || isBusy}
                  >
                    {isParticipantSubmitting ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    참가자 추가
                  </Button>
                </div>

                {participantError ? (
                  <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                    {participantError}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedScheduleTargetMeta && isEditingSchedule ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain bg-zinc-950/50 px-4 py-8"
          onClick={closeScheduleAssignmentModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[min(84vh,42rem)] w-full max-w-2xl flex-col overflow-hidden rounded-none border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  참가자 배정
                </h3>
                <p className="mt-1 text-xs font-mono text-slate-500">
                  라운드 {String(selectedScheduleTargetMeta.roundNumber).padStart(2, "0")} ·
                  코트 {String(selectedScheduleTargetMeta.courtNumber).padStart(2, "0")} · 슬롯{" "}
                  {selectedScheduleTargetMeta.slotNumber}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                onClick={closeScheduleAssignmentModal}
                aria-label="참가자 배정 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-4 p-5">
              {selectedTargetParticipant ? (
                <div className="border-2 border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    현재 배정
                  </div>
                  <div className="mt-1 text-sm font-bold text-zinc-950">
                    {selectedTargetParticipant.name}
                    <span className="ml-2 text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
                      {formatParticipantProfileLabel(selectedTargetParticipant)}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-none border-zinc-200"
                  onClick={() => assignParticipantToTarget(null)}
                  disabled={isBusy}
                >
                  빈 슬롯으로 비우기
                </Button>
              </div>

              <div className="max-h-[min(52vh,30rem)] overflow-y-auto border-2 border-zinc-200 bg-white">
                {participantViews.map((participant) => {
                  const assignmentConflict = getParticipantAssignmentConflict(
                    participant.id
                  );
                  const isCurrentSelection =
                    participant.id === selectedTargetParticipantId;
                  const isDisabled = Boolean(assignmentConflict) && !isCurrentSelection;

                  return (
                    <button
                      key={participant.id}
                      type="button"
                      disabled={isDisabled || isBusy}
                      onClick={() => assignParticipantToTarget(participant.id)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                        isCurrentSelection
                          ? "bg-teal-50"
                          : isDisabled
                          ? "cursor-not-allowed bg-zinc-50 text-zinc-400"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-zinc-950">
                          {participant.name}
                        </div>
                        <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          {formatParticipantProfileLabel(participant)} ·{" "}
                          {formatMatchCountLabel(participant.gamesAssigned)}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest ${
                          isDisabled
                            ? "text-red-500"
                            : isCurrentSelection
                            ? "text-teal-700"
                            : "text-zinc-500"
                        }`}
                      >
                        {isDisabled
                          ? assignmentConflict
                          : isCurrentSelection
                          ? "현재 배정"
                          : "선택"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
