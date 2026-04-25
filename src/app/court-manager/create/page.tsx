"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Handshake,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  Search,
  Scale,
  ShieldCheck,
  Shuffle,
  Plus,
  X,
  Trash2,
  UsersRound,
} from "lucide-react";
import Select from "@/components/Select";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import { SessionDateTimePicker } from "@/components/ui/session-date-time-picker";
import { useAuth } from "@/hooks/useAuth";
import { getUserFacingErrorMessage, isApiError } from "@/lib/api";
import {
  createFreeGame,
  createFreeGameAssignmentPreview,
  getFreeGameAssignmentPreviewJob,
  Grade,
  type CreateGameAssignmentPreviewResponse,
} from "@/lib/game";
import { validateParticipantName } from "@/lib/participant";
import { searchPlaces, type PlaceSearchResult } from "@/lib/place";
import { pushRecentGameId } from "@/lib/recent-games";
import {
  isScheduledAtSelectable,
  sanitizeScheduledAtDraft,
  SCHEDULED_AT_VALIDATION_MESSAGE,
} from "@/lib/scheduled-at";
import {
  applyAssignmentPreviewToRounds,
  AssignmentPreviewContractError,
  buildAssignmentPreviewRequest,
  buildAssignmentPreviewRequestKey,
  createAssignmentPreviewRequestKey,
  matchesAssignmentPreviewRequestKey,
  validateAssignmentPreviewResponse,
} from "./assignmentPreview";

const SESSION_STORAGE_KEY = "rallyon_create_free_game_state";
const SESSION_STORAGE_VERSION = 1;

type LocalParticipant = {
  participantId: number;
  name: string;
  gender: "M" | "F";
  ageGroup: string;
  level: Grade;
  gamesAssigned: number;
};

type LocalCourt = {
  id: string;
  assignedParticipants: Array<LocalParticipant | null>;
};

type LocalRound = {
  id: string;
  courts: LocalCourt[];
};

type AssignmentTarget = {
  roundId: string;
  courtId: string;
  slotIndex: number;
};

type StepValidationField = "gameName" | "date" | "location" | "participants" | null;
type PartnerLinks = Record<number, number>;
type AiPartnerPolicy = "prefer-partners" | "ignore-partners";
type AiExistingAssignmentPolicy = "fill-empty-slots" | "reassign-all";
type ParticipantSummaryGroup =
  | {
      type: "pair";
      key: string;
      participants: [LocalParticipant, LocalParticipant];
    }
  | {
      type: "single";
      key: string;
      participant: LocalParticipant;
    };

type SavedDraftState = {
  version: number;
  step: number;
  gameName: string;
  date: string;
  location: string;
  courts: number;
  roundCount: number;
  rounds: LocalRound[];
  participants: LocalParticipant[];
  partnerLinks: PartnerLinks;
};

const AGE_GROUP_OPTIONS = ["10s", "20s", "30s", "40s", "50s", "60s"];
const LEVEL_OPTIONS: Grade[] = ["ROOKIE", "D", "C", "B", "A", "S", "SS"];
const DEFAULT_AI_PARTNER_POLICY: AiPartnerPolicy = "prefer-partners";
const DEFAULT_AI_EXISTING_ASSIGNMENT_POLICY: AiExistingAssignmentPolicy =
  "fill-empty-slots";
const AI_PREVIEW_STALE_MESSAGE =
  "자동 배정 결과가 준비되었지만 현재 배정이 바뀌어 적용하지 않았어요. 다시 자동 배정을 실행해주세요.";
const AI_PREVIEW_POLLING_RETRY_MESSAGE =
  "자동 배정 상태를 다시 확인하는 중이에요. 결과가 확인될 때까지 편집은 잠시 잠겨 있어요.";
const AI_PREVIEW_GENERIC_FAILURE_MESSAGE =
  "자동 배정을 완료하지 못했어요. 잠시 후 다시 시도해주세요.";
const AI_PREVIEW_REASSIGN_ALL_NO_CHANGES_MESSAGE =
  "전체 다시 배정을 요청했지만 결과가 기존 배정과 동일합니다. 다시 시도하거나 조건을 조정해주세요.";
const AI_PREVIEW_POLL_RETRY_DELAY_MS = 1000;
const AI_PREVIEW_POLL_DEGRADED_DELAY_MS = 5000;
const AI_PREVIEW_POLL_DEGRADED_THRESHOLD = 3;
const GENDER_LABELS = {
  M: "남",
  F: "여",
} as const;
const AGE_GROUP_LABELS = {
  "10s": "10대",
  "20s": "20대",
  "30s": "30대",
  "40s": "40대",
  "50s": "50대",
  "60s": "60대",
} as const;
const AI_EXISTING_ASSIGNMENT_POLICY_LABELS = {
  "fill-empty-slots": "빈 슬롯만 채우기",
  "reassign-all": "전체 다시 배정",
} as const;
const AI_PARTNER_POLICY_LABELS = {
  "prefer-partners": "우선 붙여주기",
  "ignore-partners": "무시하기",
} as const;
const GENDER_SELECT_OPTIONS = [
  { value: "M", label: "남" },
  { value: "F", label: "여" },
] as const;
const AGE_GROUP_SELECT_OPTIONS = AGE_GROUP_OPTIONS.map((ageGroup) => ({
  value: ageGroup,
  label: AGE_GROUP_LABELS[ageGroup as keyof typeof AGE_GROUP_LABELS] ?? ageGroup,
}));
const AGE_GROUP_COMPACT_SELECT_OPTIONS = AGE_GROUP_OPTIONS.map((ageGroup) => ({
  value: ageGroup,
  label: ageGroup.replace("s", ""),
}));
const LEVEL_SELECT_OPTIONS = LEVEL_OPTIONS.map((level) => ({
  value: level,
  label: level,
}));
const LEVEL_COMPACT_LABELS = {
  ROOKIE: "R",
  D: "D",
  C: "C",
  B: "B",
  A: "A",
  S: "S",
  SS: "SS",
} as const;
const LEVEL_COMPACT_SELECT_OPTIONS = LEVEL_OPTIONS.map((level) => ({
  value: level,
  label: LEVEL_COMPACT_LABELS[level],
}));

function StepSectionHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b-2 border-slate-100 pb-3 md:mb-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-2xl font-bold uppercase text-slate-900 md:text-[1.75rem]">
          {title}
        </h2>
        <p className="mt-1 text-sm font-mono text-slate-500">{description}</p>
      </div>
      {meta ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {meta}
        </div>
      ) : null}
    </div>
  );
}

function buildCourts(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `court-${index + 1}`,
    assignedParticipants: Array.from({ length: 4 }, () => null),
  }));
}

function getNextOrdinalId<T extends { id: string }>(items: T[], prefix: string) {
  const nextNumber =
    items.reduce((max, item) => {
      const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `${prefix}-${nextNumber}`;
}

function createInitialRounds(courtCount: number, roundCount: number): LocalRound[] {
  return Array.from({ length: roundCount }, (_, index) => ({
    id: `round-${index + 1}`,
    courts: buildCourts(courtCount),
  }));
}

function recalculateAssignments(
  participants: LocalParticipant[],
  rounds: LocalRound[]
): LocalParticipant[] {
  return participants.map((participant) => {
    const gamesAssigned = rounds.reduce(
      (total, round) =>
        total +
        round.courts.reduce(
          (courtTotal, court) =>
            courtTotal +
            court.assignedParticipants.filter(
              (player) => player?.participantId === participant.participantId
            ).length,
          0
        ),
      0
    );

    return { ...participant, gamesAssigned };
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidLocalParticipant(value: unknown): value is LocalParticipant {
  return (
    isObjectRecord(value) &&
    isPositiveInteger(value.participantId) &&
    typeof value.name === "string" &&
    (value.gender === "M" || value.gender === "F") &&
    typeof value.ageGroup === "string" &&
    AGE_GROUP_OPTIONS.includes(value.ageGroup) &&
    typeof value.level === "string" &&
    LEVEL_OPTIONS.includes(value.level as Grade) &&
    typeof value.gamesAssigned === "number"
  );
}

function toCanonicalParticipants(value: unknown): LocalParticipant[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const participants = value.filter(isValidLocalParticipant).map((participant) => ({
    participantId: participant.participantId,
    name: participant.name,
    gender: participant.gender,
    ageGroup: participant.ageGroup,
    level: participant.level,
    gamesAssigned: 0,
  }));

  if (participants.length !== value.length) {
    return null;
  }

  const uniqueIds = new Set(participants.map((participant) => participant.participantId));
  return uniqueIds.size === participants.length ? participants : null;
}

function toCanonicalRounds(
  value: unknown,
  participantById: Map<number, LocalParticipant>
): LocalRound[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const rounds = value.map((roundValue) => {
    if (!isObjectRecord(roundValue) || typeof roundValue.id !== "string") {
      return null;
    }

    const rawCourts = roundValue.courts;
    if (!Array.isArray(rawCourts) || rawCourts.length === 0) {
      return null;
    }

    const courts = rawCourts.map((courtValue) => {
      if (!isObjectRecord(courtValue) || typeof courtValue.id !== "string") {
        return null;
      }

      const rawSlots = courtValue.assignedParticipants;
      if (!Array.isArray(rawSlots) || rawSlots.length !== 4) {
        return null;
      }

      const assignedParticipants = rawSlots.map((slotValue) => {
        if (slotValue === null) {
          return null;
        }

        if (!isObjectRecord(slotValue)) {
          return undefined;
        }

        const participantId = slotValue.participantId;
        if (!isPositiveInteger(participantId)) {
          return undefined;
        }

        return participantById.get(participantId) ?? undefined;
      });

      if (assignedParticipants.some((slot) => slot === undefined)) {
        return null;
      }

      return {
        id: courtValue.id,
        assignedParticipants: assignedParticipants as Array<LocalParticipant | null>,
      };
    });

    if (courts.some((court) => court === null)) {
      return null;
    }

    return {
      id: roundValue.id,
      courts: courts as LocalCourt[],
    };
  });

  return rounds.some((round) => round === null) ? null : (rounds as LocalRound[]);
}

function toCanonicalPartnerLinks(
  value: unknown,
  participantById: Map<number, LocalParticipant>
): PartnerLinks | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const nextLinks: PartnerLinks = {};

  for (const [rawFromId, rawToId] of Object.entries(value)) {
    const fromId = Number(rawFromId);
    if (!isPositiveInteger(fromId) || !isPositiveInteger(rawToId)) {
      return null;
    }

    const toId = rawToId;
    if (!participantById.has(fromId) || !participantById.has(toId) || fromId === toId) {
      return null;
    }

    nextLinks[fromId] = toId;
  }

  for (const [rawFromId, toId] of Object.entries(nextLinks)) {
    const fromId = Number(rawFromId);
    if (nextLinks[toId] !== fromId) {
      return null;
    }
  }

  return nextLinks;
}

function parseSavedDraftState(value: unknown): SavedDraftState | null {
  if (!isObjectRecord(value) || value.version !== SESSION_STORAGE_VERSION) {
    return null;
  }

  const step = value.step;
  const gameName = value.gameName;
  const date = value.date;
  const location = value.location;
  const courts = value.courts;
  const roundCount = value.roundCount;
  const participants = toCanonicalParticipants(value.participants);
  if (!participants) {
    return null;
  }

  const participantById = new Map(
    participants.map((participant) => [participant.participantId, participant])
  );
  const rounds = toCanonicalRounds(value.rounds, participantById);
  const partnerLinks = toCanonicalPartnerLinks(value.partnerLinks, participantById);

  if (
    !rounds ||
    !partnerLinks ||
    !isPositiveInteger(step) ||
    step > 3 ||
    typeof gameName !== "string" ||
    typeof date !== "string" ||
    typeof location !== "string" ||
    !isPositiveInteger(courts) ||
    !isPositiveInteger(roundCount)
  ) {
    return null;
  }

  const hydratedParticipants = recalculateAssignments(participants, rounds);
  const hydratedCourts =
    step === 1
      ? courts
      : Math.max(
          1,
          rounds.reduce((maxCourtCount, round) => Math.max(maxCourtCount, round.courts.length), 0)
        );
  const hydratedRoundCount = step === 1 ? roundCount : rounds.length;

  return {
    version: SESSION_STORAGE_VERSION,
    step,
    gameName,
    date: sanitizeScheduledAtDraft(date),
    location,
    courts: hydratedCourts,
    roundCount: hydratedRoundCount,
    rounds,
    participants: hydratedParticipants,
    partnerLinks,
  };
}

function getGenderLabel(gender: "M" | "F") {
  return GENDER_LABELS[gender];
}

function getAgeGroupLabel(ageGroup: string) {
  return AGE_GROUP_LABELS[ageGroup as keyof typeof AGE_GROUP_LABELS] ?? ageGroup;
}

function getAgeGroupCompactLabel(ageGroup: string) {
  return ageGroup.replace("s", "");
}

function getLevelCompactLabel(level: Grade) {
  return LEVEL_COMPACT_LABELS[level] ?? level;
}

function detachPartnerLinks(partnerLinks: PartnerLinks, participantId: number): PartnerLinks {
  const nextLinks = { ...partnerLinks };
  const partnerId = nextLinks[participantId];

  delete nextLinks[participantId];
  if (partnerId !== undefined) {
    delete nextLinks[partnerId];
  }

  return nextLinks;
}

function connectPartnerLinks(
  partnerLinks: PartnerLinks,
  leftParticipantId: number,
  rightParticipantId: number
): PartnerLinks {
  if (leftParticipantId === rightParticipantId) {
    return partnerLinks;
  }

  let nextLinks = detachPartnerLinks(partnerLinks, leftParticipantId);
  nextLinks = detachPartnerLinks(nextLinks, rightParticipantId);

  nextLinks[leftParticipantId] = rightParticipantId;
  nextLinks[rightParticipantId] = leftParticipantId;

  return nextLinks;
}

function buildParticipantSummaryGroups(
  participants: LocalParticipant[],
  partnerLinks: PartnerLinks
): ParticipantSummaryGroup[] {
  const participantById = new Map(
    participants.map((participant) => [participant.participantId, participant])
  );
  const visited = new Set<number>();
  const groups: ParticipantSummaryGroup[] = [];

  for (const participant of participants) {
    if (visited.has(participant.participantId)) {
      continue;
    }

    const partnerId = partnerLinks[participant.participantId];
    const partner = partnerId !== undefined ? participantById.get(partnerId) : null;

    if (partner) {
      visited.add(participant.participantId);
      visited.add(partner.participantId);
      groups.push({
        type: "pair",
        key: [participant.participantId, partner.participantId]
          .sort((left, right) => left - right)
          .join(":"),
        participants: [participant, partner],
      });
      continue;
    }

    visited.add(participant.participantId);
    groups.push({
      type: "single",
      key: String(participant.participantId),
      participant,
    });
  }

  return groups;
}

function hasAssignmentChanges(currentRounds: LocalRound[], nextRounds: LocalRound[]) {
  return currentRounds.some((round, roundIndex) =>
    round.courts.some((court, courtIndex) =>
      court.assignedParticipants.some((participant, slotIndex) => {
        const nextParticipant =
          nextRounds[roundIndex]?.courts[courtIndex]?.assignedParticipants[slotIndex] ?? null;

        return participant?.participantId !== nextParticipant?.participantId;
      })
    )
  );
}

function hasAssignedParticipants(rounds: LocalRound[]) {
  return rounds.some((round) =>
    round.courts.some((court) =>
      court.assignedParticipants.some((participant) => participant !== null)
    )
  );
}

function getAiPreviewSummaryMessage(
  warnings: CreateGameAssignmentPreviewResponse["warnings"]
) {
  const warningCodes = new Set(warnings.map((warning) => warning.code));

  if (warningCodes.has("PARTIAL_ASSIGNMENT")) {
    return "지금 구성으로는 더 배정할 수 있는 자리가 없어요. 참가자 수나 라운드 구성을 확인해주세요.";
  }

  if (warningCodes.has("PARTNER_CONSTRAINT_PARTIAL")) {
    return "지정한 파트너를 모두 함께 배정하기 어려워 현재 배정을 유지했어요.";
  }

  return "현재 구성으로는 자동 배정을 더 진행하기 어려워요. 코트와 참가자 구성을 다시 확인해주세요.";
}

const BadmintonCourt = ({
  court,
  roundId,
  assignmentTarget,
  isLocked,
  selectAssignmentTarget,
}: {
  court: LocalCourt;
  roundId: string;
  assignmentTarget: AssignmentTarget | null;
  isLocked: boolean;
  selectAssignmentTarget: (roundId: string, courtId: string, slotIndex: number) => void;
}) => {
  return (
    <div className="relative mx-auto flex aspect-[11/6] w-full max-w-none overflow-hidden rounded-none border-4 border-slate-900 bg-emerald-700 px-2 py-1.5 shadow-inner sm:px-3 sm:py-2.5">
      <div className="pointer-events-none absolute inset-[9px] sm:inset-[10px]">
        <div className="absolute inset-0 border-2 border-white/42" />

        <div className="absolute inset-y-0 left-[5.7%] w-0.5 bg-white/28" />
        <div className="absolute inset-y-0 right-[5.7%] w-0.5 bg-white/28" />

        <div className="absolute inset-y-0 left-[35.2%] w-0.5 bg-white/42" />
        <div className="absolute inset-y-0 right-[35.2%] w-0.5 bg-white/42" />

        <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white/55" />

        <div className="absolute inset-x-0 top-[7.5%] h-0.5 bg-white/35" />
        <div className="absolute inset-x-0 bottom-[7.5%] h-0.5 bg-white/35" />

        <div className="absolute top-1/2 left-[5.7%] right-[64.8%] h-0.5 -translate-y-1/2 bg-white/38" />
        <div className="absolute top-1/2 left-[64.8%] right-[5.7%] h-0.5 -translate-y-1/2 bg-white/38" />
      </div>

      <div className="relative z-10 grid h-full w-full grid-cols-2 grid-rows-2 gap-1 px-2.5 py-1.5 sm:gap-1.5 sm:px-3.5 sm:py-2.5">
        {[0, 1, 2, 3].map((index) => {
          const participant = court.assignedParticipants[index];
          const isSelectedTarget =
            assignmentTarget?.roundId === roundId &&
            assignmentTarget.courtId === court.id &&
            assignmentTarget.slotIndex === index;

          return (
            <div key={index} className="flex items-center justify-center p-0.5 sm:p-1">
              {participant ? (
                <div className="flex min-w-[56px] max-w-[84%] flex-col items-center justify-center rounded-none border-2 border-slate-900 bg-white px-1.5 py-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] sm:min-w-[64px] sm:px-2.5 sm:py-1.5">
                  <div className="w-full truncate text-center text-[9px] leading-tight font-bold text-slate-900 sm:text-[10px]">
                    {participant.name}
                  </div>
                  <div className="mt-0.5 text-[6px] font-mono font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[7px] sm:tracking-widest">
                    {getGenderLabel(participant.gender)}/{getAgeGroupLabel(participant.ageGroup)}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => selectAssignmentTarget(roundId, court.id, index)}
                  className={`flex h-5.5 w-full max-w-[40px] items-center justify-center rounded-none border-2 text-[7px] font-bold uppercase tracking-[0.12em] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all sm:h-6 sm:max-w-[46px] sm:text-[8px] sm:tracking-widest ${
                    isLocked
                      ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 shadow-none"
                      : isSelectedTarget
                      ? "border-teal-500 bg-teal-100 text-teal-900 ring-2 ring-teal-300/60"
                      : "border-slate-900 bg-teal-400 text-slate-900 hover:bg-teal-300 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                  }`}
                >
                  등록
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CreateFreeGamePage() {
  const { isLoading, isLoggedIn } = useAuth();
  const [step, setStep] = useState(1);
  const [gameName, setGameName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isParticipantAssignModalOpen, setIsParticipantAssignModalOpen] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");
  const [courts, setCourts] = useState(2);
  const [roundCount, setRoundCount] = useState(1);
  const [rounds, setRounds] = useState<LocalRound[]>(createInitialRounds(2, 1));
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    gender: "M" as "M" | "F",
    ageGroup: "20s",
    level: "C" as Grade,
  });
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitErrorField, setSubmitErrorField] = useState<StepValidationField>(null);
  const [isDraftStateHydrated, setIsDraftStateHydrated] = useState(false);
  const [partnerLinks, setPartnerLinks] = useState<PartnerLinks>({});
  const [partnerSelectionSourceId, setPartnerSelectionSourceId] = useState<number | null>(null);
  const [aiPartnerPolicy, setAiPartnerPolicy] =
    useState<AiPartnerPolicy>(DEFAULT_AI_PARTNER_POLICY);
  const [aiExistingAssignmentPolicy, setAiExistingAssignmentPolicy] =
    useState<AiExistingAssignmentPolicy>(DEFAULT_AI_EXISTING_ASSIGNMENT_POLICY);
  const [isGeneratingAiPreview, setIsGeneratingAiPreview] = useState(false);
  const [isParticipantSummaryCollapsed, setIsParticipantSummaryCollapsed] = useState(true);
  const [lastAddedParticipantId, setLastAddedParticipantId] = useState<number | null>(null);
  const isAssignmentEditingLocked = isGeneratingAiPreview;
  const isCreateOverlayOpen = isLocationModalOpen || isParticipantAssignModalOpen;
  const isParticipantNameComposingRef = useRef(false);
  const submitParticipantAfterCompositionRef = useRef(false);
  const skipNextParticipantEnterRef = useRef(false);
  const participantScrollBodyRef = useRef<HTMLDivElement | null>(null);
  const participantListViewportRef = useRef<HTMLDivElement | null>(null);
  const participantMobileRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const participantDesktopRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const nextParticipantIdRef = useRef(1);
  const activePreviewJobIdRef = useRef<string | null>(null);
  const previewPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewPollFailureCountRef = useRef(0);
  const roundsRef = useRef(rounds);
  const participantsRef = useRef(participants);
  const partnerLinksRef = useRef(partnerLinks);
  const aiPartnerPolicyRef = useRef(aiPartnerPolicy);
  const aiExistingAssignmentPolicyRef = useRef(aiExistingAssignmentPolicy);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.location.href = "/login?returnTo=/court-manager/create";
    }
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = parseSavedDraftState(JSON.parse(saved));

        if (!parsed) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } else {
          setStep(parsed.step);
          setGameName(parsed.gameName);
          setDate(parsed.date);
          setLocation(parsed.location);
          setCourts(parsed.courts);
          setRoundCount(parsed.roundCount);
          setRounds(parsed.rounds);
          setParticipants(parsed.participants);
          setPartnerLinks(parsed.partnerLinks);
        }
      }
    } catch (error) {
      console.error("Failed to parse form state from session storage", error);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setIsDraftStateHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftStateHydrated) {
      return;
    }

    try {
      if (step === 4) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          version: SESSION_STORAGE_VERSION,
          step,
          gameName,
          date,
          location,
          courts,
          roundCount,
          rounds,
          participants,
          partnerLinks,
        })
      );
    } catch (error) {
      console.error("Failed to save form state to session storage", error);
    }
  }, [
    step,
    gameName,
    date,
    location,
    courts,
    roundCount,
    rounds,
    participants,
    partnerLinks,
    isDraftStateHydrated,
  ]);

  useEffect(() => {
    if (!isCreateOverlayOpen) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isCreateOverlayOpen]);

  useEffect(() => {
    roundsRef.current = rounds;
  }, [rounds]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    const nextParticipantId =
      participants.reduce(
        (maxParticipantId, participant) =>
          Math.max(maxParticipantId, participant.participantId),
        0
      ) + 1;
    nextParticipantIdRef.current = nextParticipantId;
  }, [participants]);

  useEffect(() => {
    partnerLinksRef.current = partnerLinks;
  }, [partnerLinks]);

  useEffect(() => {
    aiPartnerPolicyRef.current = aiPartnerPolicy;
  }, [aiPartnerPolicy]);

  useEffect(() => {
    aiExistingAssignmentPolicyRef.current = aiExistingAssignmentPolicy;
  }, [aiExistingAssignmentPolicy]);

  useEffect(() => {
    return () => {
      if (previewPollTimeoutRef.current) {
        clearTimeout(previewPollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lastAddedParticipantId === null) {
      return;
    }

    const mobileRowElement = participantMobileRowRefs.current[lastAddedParticipantId];
    const desktopRowElement = participantDesktopRowRefs.current[lastAddedParticipantId];
    const rowElement =
      mobileRowElement?.offsetParent !== null
        ? mobileRowElement
        : desktopRowElement?.offsetParent !== null
          ? desktopRowElement
          : null;
    const containerElement =
      mobileRowElement?.offsetParent !== null
        ? participantScrollBodyRef.current
        : desktopRowElement?.offsetParent !== null
          ? participantListViewportRef.current
          : participantScrollBodyRef.current;
    if (containerElement && rowElement && containerElement.scrollHeight > containerElement.clientHeight) {
      const containerRect = containerElement.getBoundingClientRect();
      const rowRect = rowElement.getBoundingClientRect();
      const rowTop = rowRect.top - containerRect.top + containerElement.scrollTop;
      const rowBottom = rowTop + rowRect.height;
      const visibleTop = containerElement.scrollTop;
      const visibleBottom = visibleTop + containerElement.clientHeight;

      if (rowBottom > visibleBottom) {
        containerElement.scrollTo({
          top: rowBottom - containerElement.clientHeight,
        });
      } else if (rowTop < visibleTop) {
        containerElement.scrollTo({
          top: rowTop,
        });
      }
    }

    setLastAddedParticipantId(null);
  }, [lastAddedParticipantId, participants]);

  const addRoundBlock = () => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setRounds((prev) => [
      ...prev,
      { id: getNextOrdinalId(prev, "round"), courts: buildCourts(courts) },
    ]);
  };

  const addCourtToRound = (roundId: string) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setRounds((prev) =>
      prev.map((round) =>
        round.id === roundId
          ? {
              ...round,
              courts: [
                ...round.courts,
                {
                  id: getNextOrdinalId(round.courts, "court"),
                  assignedParticipants: Array.from({ length: 4 }, () => null),
                },
              ],
            }
          : round
      )
    );
  };

  const selectAssignmentTarget = (
    roundId: string,
    courtId: string,
    slotIndex: number
  ) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setSubmitError("");
    setSubmitErrorField(null);
    setAssignmentTarget({ roundId, courtId, slotIndex });
    setIsParticipantAssignModalOpen(true);
  };

  const closeParticipantAssignModal = () => {
    setIsParticipantAssignModalOpen(false);
    setAssignmentTarget(null);
  };

  const cycleAiPartnerPolicy = () => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setAiPartnerPolicy((current) =>
      current === "prefer-partners" ? "ignore-partners" : "prefer-partners"
    );
  };

  const cycleAiExistingAssignmentPolicy = () => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setAiExistingAssignmentPolicy((current) =>
        current === "fill-empty-slots" ? "reassign-all" : "fill-empty-slots"
    );
  };

  const clearPreviewPolling = () => {
    if (previewPollTimeoutRef.current) {
      clearTimeout(previewPollTimeoutRef.current);
      previewPollTimeoutRef.current = null;
    }
    previewPollFailureCountRef.current = 0;
  };

  const finishPreviewJob = () => {
    clearPreviewPolling();
    activePreviewJobIdRef.current = null;
    setIsGeneratingAiPreview(false);
  };

  const getCurrentAssignmentPreviewRequestKey = () =>
    buildAssignmentPreviewRequestKey({
      participants: participantsRef.current,
      rounds: roundsRef.current,
      partnerLinks: partnerLinksRef.current,
      partnerPolicy: aiPartnerPolicyRef.current,
      existingAssignmentPolicy: aiExistingAssignmentPolicyRef.current,
    });

  const schedulePreviewJobPoll = (
    jobId: string,
    submittedRequestKey: string,
    submittedExistingAssignmentPolicy: AiExistingAssignmentPolicy,
    delayMs = 1000
  ) => {
    if (previewPollTimeoutRef.current) {
      clearTimeout(previewPollTimeoutRef.current);
    }

    previewPollTimeoutRef.current = setTimeout(() => {
      void pollPreviewJob(jobId, submittedRequestKey, submittedExistingAssignmentPolicy);
    }, delayMs);
  };

  const pollPreviewJob = async (
    jobId: string,
    submittedRequestKey: string,
    submittedExistingAssignmentPolicy: AiExistingAssignmentPolicy
  ) => {
    previewPollTimeoutRef.current = null;

    try {
      const job = await getFreeGameAssignmentPreviewJob(jobId);
      previewPollFailureCountRef.current = 0;
      setSubmitError("");
      setSubmitErrorField(null);

      if (job.status === "QUEUED" || job.status === "RUNNING") {
        schedulePreviewJobPoll(
          jobId,
          submittedRequestKey,
          submittedExistingAssignmentPolicy,
          AI_PREVIEW_POLL_RETRY_DELAY_MS
        );
        return;
      }

      finishPreviewJob();

      if (job.status === "FAILED") {
        setSubmitError(
          job.failure?.message ||
            AI_PREVIEW_GENERIC_FAILURE_MESSAGE
        );
        setSubmitErrorField(null);
        return;
      }

      if (!job.preview) {
        setSubmitError(AI_PREVIEW_GENERIC_FAILURE_MESSAGE);
        setSubmitErrorField(null);
        return;
      }

      const currentRequestKey = getCurrentAssignmentPreviewRequestKey();
      if (!matchesAssignmentPreviewRequestKey(currentRequestKey, submittedRequestKey)) {
        setSubmitError(AI_PREVIEW_STALE_MESSAGE);
        setSubmitErrorField(null);
        return;
      }

      const currentRounds = roundsRef.current;
      const currentParticipants = participantsRef.current;
      const preview = validateAssignmentPreviewResponse({
        preview: job.preview,
        rounds: currentRounds,
        participants: currentParticipants,
      });
      const nextRounds = applyAssignmentPreviewToRounds(
        currentRounds,
        preview.rounds,
        currentParticipants
      );
      const hasChanges = hasAssignmentChanges(currentRounds, nextRounds);

      setRounds(nextRounds);
      setParticipants((prev) => recalculateAssignments(prev, nextRounds));
      setIsParticipantAssignModalOpen(false);
      setAssignmentTarget(null);
      setSubmitError(
        !hasChanges && submittedExistingAssignmentPolicy === "reassign-all"
          ? AI_PREVIEW_REASSIGN_ALL_NO_CHANGES_MESSAGE
          : !hasChanges && preview.warnings.length > 0
          ? getAiPreviewSummaryMessage(preview.warnings)
          : ""
      );
      setSubmitErrorField(null);
    } catch (error) {
      if (error instanceof AssignmentPreviewContractError) {
        finishPreviewJob();
        setSubmitError(error.message);
        setSubmitErrorField(null);
        return;
      }

      previewPollFailureCountRef.current += 1;
      if (
        isApiError(error) &&
        error.status === 404
      ) {
        finishPreviewJob();
        setSubmitError(AI_PREVIEW_GENERIC_FAILURE_MESSAGE);
        setSubmitErrorField(null);
        return;
      }

      if (previewPollFailureCountRef.current >= AI_PREVIEW_POLL_DEGRADED_THRESHOLD) {
        setSubmitError(AI_PREVIEW_POLLING_RETRY_MESSAGE);
        setSubmitErrorField(null);
        schedulePreviewJobPoll(
          jobId,
          submittedRequestKey,
          submittedExistingAssignmentPolicy,
          AI_PREVIEW_POLL_DEGRADED_DELAY_MS
        );
        return;
      }

      schedulePreviewJobPoll(
        jobId,
        submittedRequestKey,
        submittedExistingAssignmentPolicy,
        AI_PREVIEW_POLL_RETRY_DELAY_MS
      );
    }
  };

  const handleGenerateAiPreview = async () => {
    if (isGeneratingAiPreview) {
      return;
    }

    const stepValidation = getStepValidationResult(3);
    if (stepValidation) {
      setSubmitError(stepValidation.message);
      setSubmitErrorField(stepValidation.field);
      return;
    }

    setSubmitError("");
    setSubmitErrorField(null);
    setIsParticipantAssignModalOpen(false);
    setAssignmentTarget(null);
    setPartnerSelectionSourceId(null);
    setIsGeneratingAiPreview(true);
    let submittedJobId: string | null = null;

    try {
      const request = buildAssignmentPreviewRequest({
        participants,
        rounds,
        partnerLinks,
        partnerPolicy: aiPartnerPolicy,
        existingAssignmentPolicy: aiExistingAssignmentPolicy,
      });
      const requestKey = createAssignmentPreviewRequestKey(request);
      const job = await createFreeGameAssignmentPreview(request);
      submittedJobId = job.jobId;

      activePreviewJobIdRef.current = job.jobId;
      schedulePreviewJobPoll(
        job.jobId,
        requestKey,
        aiExistingAssignmentPolicy,
        job.pollAfterMs
      );
    } catch (error) {
      if (error instanceof AssignmentPreviewContractError) {
        setSubmitError(error.message);
        setSubmitErrorField(null);
        return;
      }

      setSubmitError(
        getUserFacingErrorMessage(
          error,
          "자동 배정을 완료하지 못했어요. 잠시 후 다시 시도해주세요."
        )
      );
      setSubmitErrorField(null);
    } finally {
      if (!submittedJobId) {
        setIsGeneratingAiPreview(false);
      }
    }
  };

  const getParticipantAssignmentConflict = (participant: LocalParticipant) => {
    if (!assignmentTarget) {
      return null;
    }

    const targetRound = rounds.find((round) => round.id === assignmentTarget.roundId);
    const targetCourt = targetRound?.courts.find(
      (court) => court.id === assignmentTarget.courtId
    );

    if (!targetRound || !targetCourt) {
      return null;
    }

    const existsInSameCourt = targetCourt.assignedParticipants.some(
      (current) => current?.participantId === participant.participantId
    );
    if (existsInSameCourt) {
      return "같은 코트";
    }

    const existsInSameRound = targetRound.courts.some((court) =>
      court.assignedParticipants.some(
        (current) => current?.participantId === participant.participantId
      )
    );
    if (existsInSameRound) {
      return "같은 라운드";
    }

    return null;
  };

  const assignParticipantToTarget = (participant: LocalParticipant) => {
    if (isAssignmentEditingLocked || !assignmentTarget) {
      return;
    }

    const assignmentConflict = getParticipantAssignmentConflict(participant);
    if (assignmentConflict) {
      return;
    }

    const nextRounds = rounds.map((round) =>
      round.id === assignmentTarget.roundId
        ? {
            ...round,
            courts: round.courts.map((court) =>
              court.id === assignmentTarget.courtId
                ? {
                    ...court,
                    assignedParticipants: court.assignedParticipants.map((current, index) =>
                      index === assignmentTarget.slotIndex ? participant : current
                    ),
                  }
                : court
            ),
          }
        : round
    );

    setRounds(nextRounds);
    setParticipants((prev) => recalculateAssignments(prev, nextRounds));
    setIsParticipantAssignModalOpen(false);
    setAssignmentTarget(null);
  };

  const removeCourtFromRound = (roundId: string, courtId: string) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    const nextRounds = rounds.map((round) =>
      round.id === roundId
        ? {
            ...round,
            courts: round.courts.filter((court) => court.id !== courtId),
          }
        : round
    );

    setRounds(nextRounds);
    setParticipants((prev) => recalculateAssignments(prev, nextRounds));
    if (
      assignmentTarget?.roundId === roundId &&
      assignmentTarget.courtId === courtId
    ) {
      setIsParticipantAssignModalOpen(false);
      setAssignmentTarget(null);
    }
  };

  const removeRoundBlock = (roundId: string) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    const nextRounds = rounds.filter((round) => round.id !== roundId);

    setRounds(nextRounds);
    setParticipants((prev) => recalculateAssignments(prev, nextRounds));
    if (assignmentTarget?.roundId === roundId) {
      setIsParticipantAssignModalOpen(false);
      setAssignmentTarget(null);
    }
  };

  const handleClearAllAssignments = () => {
    if (isAssignmentEditingLocked || !hasAssignedParticipants(rounds)) {
      return;
    }

    const confirmed = window.confirm(
      "현재 코트 배정을 모두 초기화할까요? 참가자, 파트너, 라운드, 코트 구성은 유지됩니다."
    );
    if (!confirmed) {
      return;
    }

    const clearedRounds = rounds.map((round) => ({
      ...round,
      courts: round.courts.map((court) => ({
        ...court,
        assignedParticipants: Array.from({ length: court.assignedParticipants.length }, () => null),
      })),
    }));

    setSubmitError("");
    setSubmitErrorField(null);
    setRounds(clearedRounds);
    setParticipants((prev) => recalculateAssignments(prev, clearedRounds));
    setIsParticipantAssignModalOpen(false);
    setAssignmentTarget(null);
  };

  const addParticipant = (participantName = newParticipant.name) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    const trimmedParticipantName = participantName.trim();

    const participantNameError = validateParticipantName(trimmedParticipantName);
    if (participantNameError) {
      setSubmitError(participantNameError);
      setSubmitErrorField("participants");
      return;
    }

    setSubmitError("");
    setSubmitErrorField(null);
    submitParticipantAfterCompositionRef.current = false;
    skipNextParticipantEnterRef.current = false;

    const nextParticipant: LocalParticipant = {
      participantId: nextParticipantIdRef.current++,
      name: trimmedParticipantName,
      gender: newParticipant.gender,
      ageGroup: newParticipant.ageGroup,
      level: newParticipant.level,
      gamesAssigned: 0,
    };

    setLastAddedParticipantId(nextParticipant.participantId);
    setParticipants((prev) => [...prev, nextParticipant]);
    setNewParticipant({
      name: "",
      gender: "M",
      ageGroup: "20s",
      level: "C",
    });
  };

  const startPartnerSelection = (participantId: number) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setPartnerSelectionSourceId((current) =>
      current === participantId ? null : participantId
    );
  };

  const assignPartner = (participantId: number) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    if (partnerSelectionSourceId === null || partnerSelectionSourceId === participantId) {
      return;
    }

    setPartnerLinks((current) =>
      connectPartnerLinks(current, partnerSelectionSourceId, participantId)
    );
    setPartnerSelectionSourceId(null);
  };

  const clearPartner = (participantId: number) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    setPartnerLinks((current) => detachPartnerLinks(current, participantId));
    setPartnerSelectionSourceId((current) =>
      current === participantId ? null : current
    );
  };

  const handleSearchLocation = async () => {
    const query = locationQuery.trim();

    setSubmitError("");
    setSubmitErrorField(null);
    setLocationSearchError("");

    if (query.length < 2) {
      setLocationResults([]);
      setLocationSearchError("장소 검색어를 2글자 이상 입력해주세요.");
      return;
    }

    setIsSearchingLocation(true);

    try {
      const results = await searchPlaces(query);
      setLocationResults(results);
      if (results.length === 0) {
        setLocationSearchError("검색 결과가 없습니다. 다른 검색어로 다시 시도해주세요.");
      }
    } catch (error) {
      setLocationResults([]);
      setLocationSearchError(
        getUserFacingErrorMessage(
          error,
          "장소를 찾지 못했어요. 잠시 후 다시 시도해주세요."
        )
      );
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSubmitError("");
    setSubmitErrorField(null);
    setLocationSearchError("");
    setLocation(place.name);
    setLocationQuery(place.name);
    setLocationResults([]);
    setIsLocationModalOpen(false);
  };

  const removeParticipant = (participantId: number) => {
    if (isAssignmentEditingLocked) {
      return;
    }

    const nextRounds = rounds.map((round) => ({
      ...round,
      courts: round.courts.map((court) => ({
        ...court,
        assignedParticipants: court.assignedParticipants.map((participant) =>
          participant?.participantId === participantId ? null : participant
        ),
      })),
    }));
    const nextParticipants = participants.filter(
      (participant) => participant.participantId !== participantId
    );
    setRounds(nextRounds);
    setParticipants(recalculateAssignments(nextParticipants, nextRounds));
    setPartnerLinks((current) => detachPartnerLinks(current, participantId));
    setPartnerSelectionSourceId((current) =>
      current === participantId ? null : current
    );
  };

  const handleNext = async () => {
    setSubmitError("");
    setSubmitErrorField(null);

    if (step === 3 && isGeneratingAiPreview) {
      return;
    }

    const stepValidation = getStepValidationResult(step);
    if (stepValidation) {
      setSubmitError(stepValidation.message);
      setSubmitErrorField(stepValidation.field);
      return;
    }

    if (step >= 2 && scheduledAtValidationResult) {
      setSubmitError(scheduledAtValidationResult.message);
      setSubmitErrorField(scheduledAtValidationResult.field);
      setStep(1);
      return;
    }

    if (step === 1) {
      setRounds(createInitialRounds(courts, roundCount));
      setStep(2);
      return;
    }

    if (step === 3) {
      setIsSubmitting(true);
      try {
        const result = await createFreeGame({
          title: trimmedGameName,
          courtCount: rounds.reduce(
            (max, round) => Math.max(max, round.courts.length),
            0
          ),
          roundCount: rounds.length,
          gradeType: "REGIONAL",
          matchRecordMode: "WINNER_ONLY",
          scheduledAt: date,
          location: trimmedLocation,
          participants: participants.map((participant) => ({
            participantId: participant.participantId,
            originalName: participant.name,
            gender: participant.gender === "M" ? "MALE" : "FEMALE",
            grade: participant.level,
            ageGroup: Number(participant.ageGroup.replace("s", "")) as 10 | 20 | 30 | 40 | 50 | 60,
          })),
          rounds: rounds.map((round, roundIndex) => ({
            roundNumber: roundIndex + 1,
            courts: round.courts.map((court, courtIndex) => ({
              courtNumber: courtIndex + 1,
              slots: court.assignedParticipants.map((participant) =>
                participant?.participantId ?? null
              ) as [number | null, number | null, number | null, number | null],
            })),
          })),
        });

        const gameId = result.gameId;
        pushRecentGameId(gameId);
        setCreatedGameId(gameId);
        setStep(4);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (error) {
        setSubmitError(
          getUserFacingErrorMessage(
            error,
            "세션을 만들지 못했어요. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setSubmitError("");
    setSubmitErrorField(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const stepLabels = [
    "기본 설정",
    "참가자 구성",
    "코트 배정",
    "생성 완료",
  ];

  const trimmedGameName = gameName.trim();
  const trimmedLocation = location.trim();
  const scheduledAtValidationResult = !date
    ? {
        field: "date" as StepValidationField,
        message: "날짜와 시간을 선택해주세요.",
      }
    : !isScheduledAtSelectable(date)
      ? {
          field: "date" as StepValidationField,
          message: SCHEDULED_AT_VALIDATION_MESSAGE,
        }
      : null;

  const getStepValidationResult = (
    targetStep: number
  ): { field: StepValidationField; message: string } | null => {
    if (targetStep === 1) {
      if (!trimmedGameName) {
        return { field: "gameName", message: "세션 이름을 입력해주세요." };
      }

      if (scheduledAtValidationResult) {
        return scheduledAtValidationResult;
      }

      if (!trimmedLocation) {
        return { field: "location", message: "장소를 입력해주세요." };
      }

      return null;
    }

    if (targetStep === 2 && participants.length === 0) {
      return {
        field: "participants",
        message: "참가자를 최소 1명 이상 추가해주세요.",
      };
    }

    if (targetStep === 3) {
      if (rounds.length === 0) {
        return {
          field: null,
          message: "최소 1개 이상의 라운드를 추가해주세요.",
        };
      }

      if (!rounds.some((round) => round.courts.length > 0)) {
        return {
          field: null,
          message: "최소 1개 이상의 코트를 추가해주세요.",
        };
      }
    }

    return null;
  };

  const nextButtonLabel = isSubmitting
    ? "생성 중..."
    : step === 1
      ? "참가자 구성하기"
      : step === 2
      ? "코트 배정하기"
        : "자유게임 생성하기";

  const participantAssignModalMeta = assignmentTarget
    ? (() => {
        const roundIndex = rounds.findIndex((round) => round.id === assignmentTarget.roundId);
        if (roundIndex === -1) {
          return null;
        }

        const courtIndex = rounds[roundIndex].courts.findIndex(
          (court) => court.id === assignmentTarget.courtId
        );
        if (courtIndex === -1) {
          return null;
        }

        return {
          roundNumber: roundIndex + 1,
          courtNumber: courtIndex + 1,
        };
      })()
    : null;
  const participantById = new Map(
    participants.map((participant) => [participant.participantId, participant])
  );
  const partnerSelectionSource = partnerSelectionSourceId !== null
    ? participantById.get(partnerSelectionSourceId) ?? null
    : null;
  const participantSummaryGroups = buildParticipantSummaryGroups(participants, partnerLinks);
  const hasPartnerPairs = participantSummaryGroups.some((group) => group.type === "pair");
  const partnerPairCount = participantSummaryGroups.filter((group) => group.type === "pair").length;
  const participantSummaryMeta = hasPartnerPairs
    ? `${participants.length}명 · 파트너 ${partnerPairCount}쌍`
    : `${participants.length}명`;
  const aiAssignmentIndicators = [
    !hasPartnerPairs
      ? {
          key: "partner-policy",
          icon: Handshake,
          label: "파트너",
          value: "설정된 파트너 없음",
          interactive: false,
          onClick: null,
          className:
            "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-slate-50",
        }
      : aiPartnerPolicy === "prefer-partners"
      ? {
          key: "partner-policy",
          icon: Handshake,
          label: "파트너",
          value: AI_PARTNER_POLICY_LABELS["prefer-partners"],
          interactive: true,
          onClick: cycleAiPartnerPolicy,
          className:
            "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-white",
        }
      : {
          key: "partner-policy",
          icon: UsersRound,
          label: "파트너",
          value: AI_PARTNER_POLICY_LABELS["ignore-partners"],
          interactive: true,
          onClick: cycleAiPartnerPolicy,
          className:
            "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white",
        },
    {
      key: "balance-policy",
      icon: Scale,
      label: "실력",
      value: "균형 우선",
      interactive: false,
      onClick: null,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-white",
    },
    {
      key: "repeat-matchups",
      icon: ShieldCheck,
      label: "매치업",
      value: "중복 최소화",
      interactive: false,
      onClick: null,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-white",
    },
    aiExistingAssignmentPolicy === "fill-empty-slots"
      ? {
          key: "existing-assignment-policy",
          icon: LayoutGrid,
          label: "기존 배정",
          value: AI_EXISTING_ASSIGNMENT_POLICY_LABELS["fill-empty-slots"],
          interactive: true,
          onClick: cycleAiExistingAssignmentPolicy,
          className:
            "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-white",
        }
      : {
          key: "existing-assignment-policy",
          icon: Shuffle,
          label: "기존 배정",
          value: AI_EXISTING_ASSIGNMENT_POLICY_LABELS["reassign-all"],
          interactive: true,
          onClick: cycleAiExistingAssignmentPolicy,
          className:
            "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-white",
        },
  ];
  const canClearAllAssignments = !isGeneratingAiPreview && hasAssignedParticipants(rounds);
  const stepHeaderMeta =
    step === 3 ? (
      <div className="w-full md:w-auto">
        <div className="flex flex-col gap-2 md:hidden">
          <Button
            type="button"
            size="sm"
            disabled={isGeneratingAiPreview}
            onClick={() => void handleGenerateAiPreview()}
            className="h-10 w-full rounded-none bg-emerald-500 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-emerald-400 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
          >
            {isGeneratingAiPreview ? (
              <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="mr-2 h-3.5 w-3.5" />
            )}
            {isGeneratingAiPreview ? "AI 배정 중..." : "AI 자동 배정"}
          </Button>

          <div className="toolbar-scroll-hidden flex items-center gap-1 overflow-x-auto rounded-sm border border-slate-200 bg-slate-50 px-1 py-1 pb-1">
            {aiAssignmentIndicators.map((item) => {
              const Icon = item.icon;

              return (
                <Tooltip
                  key={item.key}
                  message={`${item.label}: ${item.value}`}
                  position="top"
                >
                  {item.interactive ? (
                    <button
                      type="button"
                      aria-label={`${item.label}: ${item.value}`}
                      disabled={isAssignmentEditingLocked}
                      onClick={item.onClick ?? undefined}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.08)] transition-colors ${
                        isAssignmentEditingLocked
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 shadow-none"
                          : item.className
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ) : (
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.08)] transition-colors ${item.className}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                </Tooltip>
              );
            })}

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canClearAllAssignments}
              onClick={handleClearAllAssignments}
              className="h-9 shrink-0 rounded-none border-2 border-slate-300 bg-white px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-700 transition-colors hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <X className="mr-1 h-3 w-3" />
              초기화
            </Button>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex md:justify-end">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {aiAssignmentIndicators.map((item) => {
              const Icon = item.icon;

              return (
                <Tooltip
                  key={item.key}
                  message={`${item.label}: ${item.value}`}
                  position="top"
                >
                  {item.interactive ? (
                    <button
                      type="button"
                      aria-label={`${item.label}: ${item.value}`}
                      disabled={isAssignmentEditingLocked}
                      onClick={item.onClick ?? undefined}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.08)] transition-colors sm:h-9 sm:w-9 ${
                        isAssignmentEditingLocked
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 shadow-none"
                          : item.className
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ) : (
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.08)] transition-colors sm:h-9 sm:w-9 ${item.className}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                </Tooltip>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canClearAllAssignments}
              onClick={handleClearAllAssignments}
              className="h-8 shrink-0 rounded-none border-2 border-slate-300 bg-white px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-700 transition-colors hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:h-9 sm:px-3 sm:text-[10px] sm:tracking-widest"
            >
              <X className="mr-1 h-3 w-3 sm:mr-2" />
              <span className="sm:hidden">초기화</span>
              <span className="hidden sm:inline">전체 배정 초기화</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isGeneratingAiPreview}
              onClick={() => void handleGenerateAiPreview()}
              className="h-8 shrink-0 rounded-none bg-emerald-500 px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-emerald-400 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none sm:h-9 sm:px-3 sm:text-[10px] sm:tracking-widest"
            >
              {isGeneratingAiPreview ? (
                <LoaderCircle className="mr-1 h-3 w-3 animate-spin sm:mr-2" />
              ) : (
                <Activity className="mr-1 h-3 w-3 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {isGeneratingAiPreview ? "AI 배정 중..." : "AI 자동 배정"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    ) : undefined;
  const currentStepHeader =
    step === 1
      ? {
          title: "자유게임 설정",
          description: "자유게임에 필요한 기본 정보를 입력하세요.",
          meta: undefined,
        }
      : step === 2
        ? {
            title: "참가자 구성",
            description: "참가자를 추가하고 등급을 지정해주세요.",
            meta: undefined,
          }
        : step === 3
          ? {
              title: "코트 배정",
              description: "배정할 코트 슬롯을 먼저 선택한 뒤 참가자를 등록하세요.",
              meta: stepHeaderMeta,
            }
          : null;
  const isCompletionStep = step === 4;
  const isContentDrivenStep = step === 1;
  const pageContainerClassName =
    "fixed inset-x-0 top-16 bottom-0 z-0 mx-auto flex min-h-0 max-w-5xl flex-col overflow-hidden px-4 pt-4 pb-2 md:px-8 md:pt-6 md:pb-4 lg:pt-7 lg:pb-5";
  const cardClassName =
    `relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
      isCompletionStep ? "flex-none" : isContentDrivenStep ? "md:flex-none" : ""
    }`;
  const contentAreaClassName =
    `z-30 flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 md:py-5 lg:py-6 ${
      isCompletionStep
        ? "flex-none overflow-visible"
        : isContentDrivenStep
          ? "md:flex-none md:overflow-visible"
          : ""
    }`;

  return (
    <div className={pageContainerClassName}>
      <div className="mb-3 md:mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              자유게임 생성
            </h1>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-mono uppercase tracking-widest sm:flex">
            <span className="text-slate-400">단계</span>
            <span className="text-lg leading-none font-bold text-teal-600">
              {String(step).padStart(2, "0")}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">04</span>
          </div>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex-1">
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-sm bg-slate-200">
                <div
                  className={`h-full bg-teal-500 transition-transform duration-500 ease-in-out ${
                    step >= index ? "translate-x-0" : "-translate-x-full"
                  }`}
                  style={{ transformOrigin: "left" }}
                />
              </div>
              <div
                className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
                  step >= index ? "font-bold text-slate-900" : "text-slate-400"
                }`}
              >
                {stepLabels[index - 1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClassName}>
        <div className="absolute top-0 left-0 h-4 w-4 border-r-2 border-b-2 border-slate-200" />
        <div className="absolute top-0 right-0 h-4 w-4 border-b-2 border-l-2 border-slate-200" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-t-2 border-r-2 border-slate-200" />
        <div className="absolute right-0 bottom-0 h-4 w-4 border-t-2 border-l-2 border-slate-200" />

        {submitError && (
          <div className="z-10 flex items-center border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-600 md:px-8">
            {submitError}
          </div>
        )}

        <div className={contentAreaClassName}>
          {currentStepHeader ? (
            <StepSectionHeader
              title={currentStepHeader.title}
              description={currentStepHeader.description}
              meta={currentStepHeader.meta}
            />
          ) : null}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col md:min-h-fit md:flex-none"
              >
                <div
                  className="wizard-scroll create-step-shell min-h-0 flex-1 pr-0.5 md:min-h-fit md:flex-none md:overflow-visible md:pr-0"
                  tabIndex={0}
                  role="region"
                  aria-label="자유게임 설정 본문"
                >
                  <div className="grid gap-3 md:gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                      세션 이름
                    </label>
                    <input
                      type="text"
                      placeholder="예: 주말 아침 랠리"
                      className={`h-14 w-full rounded-none border-2 bg-slate-50 px-4 text-sm font-medium transition-colors focus:bg-white focus:outline-none ${
                        submitErrorField === "gameName"
                          ? "border-red-300 focus:border-red-500"
                          : "border-slate-200 focus:border-slate-900"
                      }`}
                      value={gameName}
                      onChange={(event) => {
                        setSubmitError("");
                        setSubmitErrorField(null);
                        setGameName(event.target.value);
                      }}
                    />
                  </div>

                  <div className="create-step-split-grid grid gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                        날짜 및 시간
                      </label>
                      <SessionDateTimePicker
                        value={date}
                        onChange={(nextValue) => {
                          setSubmitError("");
                          setSubmitErrorField(null);
                          setDate(nextValue);
                        }}
                        error={submitErrorField === "date"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                        장소
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLocationSearchError("");
                              setLocationResults([]);
                              setLocationQuery(location);
                              setIsLocationModalOpen(true);
                            }}
                            className={`flex h-14 flex-1 items-center gap-3 rounded-none border-2 bg-slate-50 px-3 ${
                              submitErrorField === "location"
                                ? "border-red-300"
                                : "border-slate-200 hover:border-slate-900"
                            }`}
                          >
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0 truncate text-sm font-medium text-slate-900">
                              {location || "장소를 선택해주세요"}
                            </div>
                          </button>
                          <button
                            type="button"
                            className="flex h-14 shrink-0 items-center justify-center rounded-none border-2 border-slate-900 bg-white px-4 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-50"
                            onClick={() => {
                              setLocationSearchError("");
                              setLocationResults([]);
                              setLocationQuery(location);
                              setIsLocationModalOpen(true);
                            }}
                          >
                            <Search className="mr-2 h-4 w-4" />
                            장소 검색
                          </button>
                        </div>

                        {locationSearchError ? (
                          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {locationSearchError}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t-2 border-slate-100 pt-3 md:gap-4">
                    <div className="min-w-0 space-y-2">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                        코트
                      </label>
                      <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isGeneratingAiPreview}
                          className="h-9 w-9 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50 sm:h-10 sm:w-10"
                          onClick={() => {
                            if (isGeneratingAiPreview) {
                              return;
                            }
                            setCourts((prev) => Math.max(1, prev - 1));
                          }}
                        >
                          -
                        </Button>
                        <div className="flex h-9 w-[48px] items-center justify-center border-2 border-slate-900 bg-slate-900 font-display text-base font-bold text-white sm:h-10 sm:w-[56px] sm:text-lg">
                          {String(courts).padStart(2, "0")}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isGeneratingAiPreview}
                          className="h-9 w-9 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50 sm:h-10 sm:w-10"
                          onClick={() => {
                            if (isGeneratingAiPreview) {
                              return;
                            }
                            setCourts((prev) => prev + 1);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                        라운드
                      </label>
                      <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isGeneratingAiPreview}
                          className="h-9 w-9 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50 sm:h-10 sm:w-10"
                          onClick={() => {
                            if (isGeneratingAiPreview) {
                              return;
                            }
                            setRoundCount((prev) => Math.max(1, prev - 1));
                          }}
                        >
                          -
                        </Button>
                        <div className="flex h-9 w-[48px] items-center justify-center border-2 border-slate-900 bg-slate-900 font-display text-base font-bold text-white sm:h-10 sm:w-[56px] sm:text-lg">
                          {String(roundCount).padStart(2, "0")}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isGeneratingAiPreview}
                          className="h-9 w-9 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50 sm:h-10 sm:w-10"
                          onClick={() => {
                            if (isGeneratingAiPreview) {
                              return;
                            }
                            setRoundCount((prev) => prev + 1);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div
                  className="wizard-scroll create-step-shell min-h-0 flex-1 pr-0.5 md:pr-0"
                  tabIndex={0}
                  role="region"
                  aria-label="참가자 구성 본문"
                >
                  <div className="flex h-full min-h-0 flex-col gap-4 md:h-auto">
                    <div className="md:hidden">
                      <div className="grid grid-cols-[minmax(0,1fr)_44px_52px_44px_44px] gap-1">
                        <input
                          type="text"
                          placeholder="이름"
                          disabled={isAssignmentEditingLocked}
                          className={`h-11 min-w-0 w-full rounded-none border-2 bg-slate-50 px-2.5 text-[13px] font-medium transition-colors focus:bg-white focus:outline-none ${
                            submitErrorField === "participants"
                              ? "border-red-300 focus:border-red-500"
                              : "border-slate-200 focus:border-slate-900"
                          }`}
                          value={newParticipant.name}
                          onChange={(event) => {
                            if (submitErrorField === "participants") {
                              setSubmitError("");
                              setSubmitErrorField(null);
                            }

                            setNewParticipant((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }));
                          }}
                          onCompositionStart={() => {
                            isParticipantNameComposingRef.current = true;
                            submitParticipantAfterCompositionRef.current = false;
                            skipNextParticipantEnterRef.current = false;
                          }}
                          onCompositionEnd={(event) => {
                            const composedName = event.currentTarget.value;

                            isParticipantNameComposingRef.current = false;
                            setNewParticipant((prev) => ({
                              ...prev,
                              name: composedName,
                            }));

                            if (submitParticipantAfterCompositionRef.current) {
                              submitParticipantAfterCompositionRef.current = false;
                              skipNextParticipantEnterRef.current = true;
                              requestAnimationFrame(() => {
                                addParticipant(composedName);
                              });
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") {
                              return;
                            }

                            if (skipNextParticipantEnterRef.current) {
                              event.preventDefault();
                              skipNextParticipantEnterRef.current = false;
                              return;
                            }

                            const nativeEvent = event.nativeEvent as KeyboardEvent & {
                              isComposing?: boolean;
                              keyCode?: number;
                            };
                            const isComposing =
                              isParticipantNameComposingRef.current ||
                              nativeEvent.isComposing === true ||
                              nativeEvent.keyCode === 229;

                            event.preventDefault();

                            if (isComposing) {
                              submitParticipantAfterCompositionRef.current = true;
                              return;
                            }

                            addParticipant();
                          }}
                        />
                        <div className="min-w-0">
                          <Select
                            variant="brutalist"
                            size="compact"
                            value={newParticipant.gender}
                            options={[...GENDER_SELECT_OPTIONS]}
                            disabled={isAssignmentEditingLocked}
                            onChange={(event) =>
                              setNewParticipant((prev) => ({
                                ...prev,
                                gender: event as "M" | "F",
                              }))
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <Select
                            variant="brutalist"
                            size="compact"
                            value={newParticipant.ageGroup}
                            options={AGE_GROUP_COMPACT_SELECT_OPTIONS}
                            disabled={isAssignmentEditingLocked}
                            onChange={(event) =>
                              setNewParticipant((prev) => ({
                                ...prev,
                                ageGroup: event,
                              }))
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <Select
                            variant="brutalist"
                            size="compact"
                            value={newParticipant.level}
                            options={LEVEL_COMPACT_SELECT_OPTIONS}
                            disabled={isAssignmentEditingLocked}
                            onChange={(event) =>
                              setNewParticipant((prev) => ({
                                ...prev,
                                level: event as Grade,
                              }))
                            }
                          />
                        </div>
                        <Button
                          disabled={isAssignmentEditingLocked}
                          onClick={() => addParticipant()}
                          className="h-11 w-full rounded-none border-2 border-slate-900 bg-slate-900 p-0 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-slate-800 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                          aria-label="참가자 추가"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 md:flex md:flex-wrap">
                      <div className="min-w-0 flex-1 md:min-w-[220px] md:flex-[1.8]">
                        <input
                          type="text"
                          placeholder="이름"
                          disabled={isAssignmentEditingLocked}
                          className={`h-[50px] w-full rounded-none border-2 bg-slate-50 px-4 text-sm font-medium transition-colors focus:bg-white focus:outline-none ${
                            submitErrorField === "participants"
                              ? "border-red-300 focus:border-red-500"
                              : "border-slate-200 focus:border-slate-900"
                          }`}
                          value={newParticipant.name}
                          onChange={(event) => {
                            if (submitErrorField === "participants") {
                              setSubmitError("");
                              setSubmitErrorField(null);
                            }

                            setNewParticipant((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }));
                          }}
                          onCompositionStart={() => {
                            isParticipantNameComposingRef.current = true;
                            submitParticipantAfterCompositionRef.current = false;
                            skipNextParticipantEnterRef.current = false;
                          }}
                          onCompositionEnd={(event) => {
                            const composedName = event.currentTarget.value;

                            isParticipantNameComposingRef.current = false;
                            setNewParticipant((prev) => ({
                              ...prev,
                              name: composedName,
                            }));

                            if (submitParticipantAfterCompositionRef.current) {
                              submitParticipantAfterCompositionRef.current = false;
                              skipNextParticipantEnterRef.current = true;
                              requestAnimationFrame(() => {
                                addParticipant(composedName);
                              });
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") {
                              return;
                            }

                            if (skipNextParticipantEnterRef.current) {
                              event.preventDefault();
                              skipNextParticipantEnterRef.current = false;
                              return;
                            }

                            const nativeEvent = event.nativeEvent as KeyboardEvent & {
                              isComposing?: boolean;
                              keyCode?: number;
                            };
                            const isComposing =
                              isParticipantNameComposingRef.current ||
                              nativeEvent.isComposing === true ||
                              nativeEvent.keyCode === 229;

                            event.preventDefault();

                            if (isComposing) {
                              submitParticipantAfterCompositionRef.current = true;
                              return;
                            }

                            addParticipant();
                          }}
                        />
                      </div>
                      <div className="w-[88px] shrink-0">
                        <Select
                          variant="brutalist"
                          value={newParticipant.gender}
                          options={[...GENDER_SELECT_OPTIONS]}
                          disabled={isAssignmentEditingLocked}
                          onChange={(event) =>
                            setNewParticipant((prev) => ({
                              ...prev,
                              gender: event as "M" | "F",
                            }))
                          }
                        />
                      </div>
                      <div className="w-[104px] shrink-0">
                        <Select
                          variant="brutalist"
                          value={newParticipant.ageGroup}
                          options={AGE_GROUP_SELECT_OPTIONS}
                          disabled={isAssignmentEditingLocked}
                          onChange={(event) =>
                            setNewParticipant((prev) => ({
                              ...prev,
                              ageGroup: event,
                            }))
                          }
                        />
                      </div>
                      <div className="w-[104px] shrink-0">
                        <Select
                          variant="brutalist"
                          value={newParticipant.level}
                          options={LEVEL_SELECT_OPTIONS}
                          disabled={isAssignmentEditingLocked}
                          onChange={(event) =>
                            setNewParticipant((prev) => ({
                              ...prev,
                              level: event as Grade,
                            }))
                          }
                        />
                      </div>
                      <Button
                        disabled={isAssignmentEditingLocked}
                        onClick={() => addParticipant()}
                        className="h-[50px] w-[96px] rounded-none bg-slate-900 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800"
                      >
                        추가
                      </Button>
                    </div>

                    <div
                      className={`flex min-h-0 flex-1 flex-col overflow-hidden border-2 bg-white md:flex-none md:overflow-visible ${
                        submitErrorField === "participants"
                          ? "border-red-300"
                          : "border-slate-200"
                      }`}
                    >
                      {partnerSelectionSource ? (
                        <div className="flex items-start justify-between gap-4 border-b-2 border-violet-200 bg-violet-50 px-3 py-3 md:px-4 md:py-3.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700">
                              파트너 선택 모드
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="border border-violet-200 bg-white px-2 py-1 text-xs font-bold text-slate-900">
                                {partnerSelectionSource.name}
                              </span>
                              <span className="truncate text-sm font-medium text-slate-700">
                                의 파트너를 선택하세요.
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isAssignmentEditingLocked}
                            className="h-9 rounded-none border-2 border-violet-200 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700 hover:border-violet-400 hover:bg-violet-100"
                            onClick={() => setPartnerSelectionSourceId(null)}
                          >
                            취소
                          </Button>
                        </div>
                      ) : null}

                      <div
                        ref={participantScrollBodyRef}
                        className="wizard-scroll min-h-0 flex-1 md:hidden"
                        tabIndex={0}
                        role="region"
                        aria-label="참가자 목록"
                      >
                        {participants.map((participant, index) => {
                          const partner = partnerLinks[participant.participantId]
                            ? participantById.get(partnerLinks[participant.participantId]) ?? null
                            : null;
                          const isPartnerSource =
                            partnerSelectionSourceId === participant.participantId;
                          const isPartnerCandidate =
                            partnerSelectionSourceId !== null &&
                            partnerSelectionSourceId !== participant.participantId;

                          return (
                            <div
                              key={participant.participantId}
                              ref={(element) => {
                                participantMobileRowRefs.current[participant.participantId] =
                                  element;
                              }}
                              onClick={() => {
                                if (isPartnerCandidate && !isAssignmentEditingLocked) {
                                  assignPartner(participant.participantId);
                                }
                              }}
                              className={`px-3 py-3 transition-colors border-b-2 border-slate-100 ${
                                isPartnerSource
                                  ? "bg-violet-50"
                                  : isPartnerCandidate
                                    ? isAssignmentEditingLocked
                                  ? "bg-white"
                                      : "cursor-pointer bg-white hover:bg-violet-50"
                                    : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="min-w-0 flex flex-1 items-center gap-1.5">
                                  <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <span className="min-w-0 truncate text-sm font-bold text-slate-900">
                                    {participant.name}
                                  </span>
                                  <span className="shrink-0 text-[10px] font-mono text-slate-500">
                                    {getGenderLabel(participant.gender)}·
                                    {getAgeGroupCompactLabel(participant.ageGroup)}·
                                    {getLevelCompactLabel(participant.level)}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                {isPartnerSource ? (
                                  <div className="flex h-8 items-center rounded-none border-2 border-violet-300 bg-violet-100 px-2.5 text-[10px] font-mono font-bold text-violet-800">
                                    선택중
                                  </div>
                                ) : isPartnerCandidate ? (
                                  <button
                                    type="button"
                                    disabled={isAssignmentEditingLocked}
                                    className="flex h-8 items-center rounded-none border-2 border-violet-300 bg-violet-50 px-2.5 text-[10px] font-mono font-bold text-violet-800 hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      assignPartner(participant.participantId);
                                    }}
                                  >
                                    연결
                                  </button>
                                ) : partner ? (
                                  <>
                                    <button
                                      type="button"
                                      title={partner.name}
                                      disabled={isAssignmentEditingLocked}
                                      className="flex h-8 max-w-[92px] items-center rounded-none border-2 border-violet-300 bg-violet-50 px-2.5 text-[10px] font-bold text-violet-800 hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        startPartnerSelection(participant.participantId);
                                      }}
                                    >
                                      <span className="truncate">
                                      {partner.name}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isAssignmentEditingLocked}
                                      className="flex h-8 w-8 items-center justify-center rounded-none border-2 border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        clearPartner(participant.participantId);
                                      }}
                                      aria-label={`${participant.name} 파트너 해제`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isAssignmentEditingLocked}
                                    className="flex h-8 items-center rounded-none border-2 border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startPartnerSelection(participant.participantId);
                                    }}
                                  >
                                    파트너 지정
                                  </button>
                                )}
                                  <button
                                    type="button"
                                    disabled={isAssignmentEditingLocked}
                                    className="flex h-8 w-8 items-center justify-center rounded-none border-2 border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeParticipant(participant.participantId);
                                    }}
                                    aria-label={`${participant.name} 삭제`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {participants.length === 0 && (
                          <div className="flex min-h-[176px] flex-col items-center justify-center px-6 py-10 text-center">
                            <div className="text-sm font-bold text-slate-900">
                              아직 추가된 참가자가 없습니다
                            </div>
                            <div className="mt-1 text-xs font-mono text-slate-500">
                              이름과 조건을 입력한 뒤 참가자를 추가하세요.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="hidden md:block">
                        <div className="overflow-x-auto">
                          <div className="min-w-[620px] lg:min-w-[760px]">
                            <div className="grid grid-cols-[48px_minmax(0,1.8fr)_64px_78px_72px_minmax(0,1.4fr)_40px] gap-3 border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 lg:grid-cols-[56px_minmax(0,2fr)_72px_88px_84px_minmax(0,1.5fr)_48px] lg:gap-4">
                              <div className="text-center">ID</div>
                              <div className="text-center">이름</div>
                              <div className="text-center">성별</div>
                              <div className="text-center">연령</div>
                              <div className="text-center">등급</div>
                              <div className="text-center">파트너</div>
                              <div className="text-center">관리</div>
                            </div>
                            <div
                              ref={participantListViewportRef}
                              className="wizard-scroll max-h-[min(26rem,42vh)] bg-white"
                            >
                              {participants.map((participant, index) => {
                                const partner = partnerLinks[participant.participantId]
                                  ? participantById.get(
                                      partnerLinks[participant.participantId]
                                    ) ?? null
                                  : null;
                                const isPartnerSource =
                                  partnerSelectionSourceId === participant.participantId;
                                const isPartnerCandidate =
                                  partnerSelectionSourceId !== null &&
                                  partnerSelectionSourceId !== participant.participantId;

                                return (
                                  <div
                                    key={participant.participantId}
                                    ref={(element) => {
                                      participantDesktopRowRefs.current[
                                        participant.participantId
                                      ] = element;
                                    }}
                                    onClick={() => {
                                      if (isPartnerCandidate && !isAssignmentEditingLocked) {
                                        assignPartner(participant.participantId);
                                      }
                                    }}
                                    className={`grid grid-cols-[48px_minmax(0,1.8fr)_64px_78px_72px_minmax(0,1.4fr)_40px] items-center gap-3 px-4 py-3 transition-colors border-b-2 border-slate-100 lg:grid-cols-[56px_minmax(0,2fr)_72px_88px_84px_minmax(0,1.5fr)_48px] lg:gap-4 ${
                                      isPartnerSource
                                        ? "bg-violet-50"
                                        : isPartnerCandidate
                                          ? isAssignmentEditingLocked
                                            ? "bg-white"
                                            : "cursor-pointer bg-white hover:bg-violet-50"
                                          : "hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className="text-center font-mono text-xs text-slate-400">
                                      {String(index + 1).padStart(2, "0")}
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">
                                      {participant.name}
                                    </div>
                                    <div className="text-center font-mono text-xs text-slate-600">
                                      {getGenderLabel(participant.gender)}
                                    </div>
                                    <div className="text-center font-mono text-xs text-slate-600">
                                      {getAgeGroupLabel(participant.ageGroup)}
                                    </div>
                                    <div className="flex justify-center">
                                      <span className="border-2 border-slate-200 bg-slate-100 px-2 py-1 text-xs font-mono font-bold uppercase text-slate-700">
                                        {participant.level}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      {isPartnerSource ? (
                                        <div className="flex items-center gap-2 border-2 border-violet-200 bg-violet-50 px-2 py-2">
                                          <span className="truncate text-xs font-bold text-slate-900">
                                            {participant.name}
                                          </span>
                                          <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700">
                                            파트너 선택 중
                                          </span>
                                        </div>
                                      ) : isPartnerCandidate ? (
                                        <div className="flex items-center justify-between gap-2 border-2 border-violet-200 bg-violet-50 px-2 py-2">
                                          <span
                                            className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest ${
                                              partner
                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                : "border-violet-200 bg-white text-violet-700"
                                            }`}
                                          >
                                            {partner ? "교체" : "선택"}
                                          </span>
                                          <span className="min-w-0 truncate text-xs font-bold text-slate-900">
                                            이 참가자와 연결
                                          </span>
                                        </div>
                                      ) : partner ? (
                                        <div className="flex items-center justify-between gap-2 border-2 border-violet-200 bg-violet-50 px-2 py-2">
                                          <div className="min-w-0 truncate text-xs font-bold text-slate-900">
                                            {partner.name}
                                          </div>
                                          <div className="flex shrink-0 items-center gap-1">
                                            <button
                                              type="button"
                                              disabled={isAssignmentEditingLocked}
                                              className="border border-violet-200 bg-white px-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700 hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                startPartnerSelection(
                                                  participant.participantId
                                                );
                                              }}
                                            >
                                              변경
                                            </button>
                                            <button
                                              type="button"
                                              disabled={isAssignmentEditingLocked}
                                              className="border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                clearPartner(participant.participantId);
                                              }}
                                            >
                                              해제
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          disabled={isAssignmentEditingLocked}
                                          className="h-9 w-full rounded-none border-2 border-slate-200 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            startPartnerSelection(
                                              participant.participantId
                                            );
                                          }}
                                        >
                                          파트너 지정
                                        </Button>
                                      )}
                                    </div>
                                    <div className="flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isAssignmentEditingLocked}
                                        className="h-8 w-8 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          removeParticipant(participant.participantId);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                              {participants.length === 0 && (
                                <div className="flex min-h-[196px] flex-col items-center justify-center px-6 text-center">
                                  <div className="text-sm font-bold text-slate-900">
                                    아직 추가된 참가자가 없습니다
                                  </div>
                                  <div className="mt-1 text-xs font-mono text-slate-500">
                                    참가자를 추가하면 이 목록에서 바로 확인할 수 있습니다.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div
                  className="workbench-scroll create-step-shell min-h-0 flex-1 pr-0.5 md:pr-1"
                  tabIndex={0}
                  role="region"
                  aria-label="코트 배정 본문"
                >
                  <div className="space-y-3 pb-1 md:space-y-5 md:pb-2">
                    <div className="border-2 border-slate-200 bg-slate-50 p-2 md:p-3">
                      <button
                        type="button"
                        onClick={() =>
                          setIsParticipantSummaryCollapsed((current) => !current)
                        }
                        className="flex w-full items-center justify-between gap-2 text-left"
                        aria-expanded={!isParticipantSummaryCollapsed}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <h3 className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                            참가자 요약
                          </h3>
                          <p className="min-w-0 truncate text-[10px] font-mono text-slate-500 md:text-xs">
                            {participantSummaryMeta}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                          <span className="hidden sm:inline">
                            {isParticipantSummaryCollapsed ? "펼치기" : "접기"}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              isParticipantSummaryCollapsed ? "" : "rotate-90"
                            }`}
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {!isParticipantSummaryCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
                                {participantSummaryGroups.map((group) =>
                                  group.type === "pair" ? (
                                    <div key={group.key} className="relative col-span-2 xl:col-span-2">
                                      <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                                        {group.participants.map((participant) => (
                                          <div
                                            key={participant.participantId}
                                            className="flex min-w-0 items-center justify-between gap-2 border-2 border-violet-400 bg-violet-50/20 p-2 text-left text-[11px] md:p-3 md:text-xs"
                                          >
                                            <div className="flex min-w-0 items-center gap-1.5">
                                              <span className="min-w-0 truncate font-bold text-slate-900">
                                                {participant.name}
                                              </span>
                                              <span className="shrink-0 font-mono text-[9px] text-slate-500 md:text-[10px]">
                                                {getGenderLabel(participant.gender)} ·{" "}
                                                {getAgeGroupCompactLabel(participant.ageGroup)}
                                              </span>
                                            </div>
                                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-900 md:text-[10px]">
                                              {participant.gamesAssigned}회
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[3px] w-4 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
                                    </div>
                                  ) : (
                                    <div
                                      key={group.key}
                                      className="flex min-w-0 items-center justify-between gap-2 border border-slate-200 bg-white p-2 text-left text-[11px] md:p-3 md:text-xs"
                                    >
                                      <div className="flex min-w-0 items-center gap-1.5">
                                        <span className="min-w-0 truncate font-bold text-slate-900">
                                          {group.participant.name}
                                        </span>
                                        <span className="shrink-0 font-mono text-[9px] text-slate-500 md:text-[10px]">
                                          {getGenderLabel(group.participant.gender)} ·{" "}
                                          {getAgeGroupCompactLabel(group.participant.ageGroup)}
                                        </span>
                                      </div>
                                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-900 md:text-[10px]">
                                        {group.participant.gamesAssigned}회
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {rounds.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                        <div className="text-sm font-medium text-slate-500">
                          아직 생성된 라운드가 없습니다.
                        </div>
                      </div>
                    ) : (
                      rounds.map((round, roundIndex) => (
                        <section
                          key={round.id}
                          className="rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 md:p-3.5"
                        >
                          <div className="mx-auto w-full max-w-[760px] space-y-3 md:space-y-4 lg:max-w-[920px]">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="bg-slate-900 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white md:px-3">
                                  라운드 {String(roundIndex + 1).padStart(2, "0")}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isAssignmentEditingLocked}
                                  className="h-7 rounded-none border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase tracking-[0.14em] md:h-6 md:px-2 md:text-[10px] md:tracking-widest"
                                  onClick={() => addCourtToRound(round.id)}
                                >
                                  + 코트 추가
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isAssignmentEditingLocked}
                                  className="h-7 w-7 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500 md:h-6 md:w-6"
                                  onClick={() => removeRoundBlock(round.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {round.courts.length === 0 ? (
                              <div className="border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                                <div className="text-sm font-medium text-slate-500">
                                  이 라운드에는 아직 코트가 없습니다.
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-2 md:gap-4 lg:flex lg:flex-wrap lg:justify-center lg:gap-5">
                                {round.courts.map((court, courtIndex) => (
                                  <div
                                    key={court.id}
                                    className="w-full min-w-0 space-y-0.5 md:space-y-1 lg:w-[264px] lg:flex-none"
                                  >
                                    <div className="flex items-center justify-between px-0.5">
                                      <span className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-widest">
                                        코트 {String(courtIndex + 1).padStart(2, "0")}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isAssignmentEditingLocked}
                                        className="h-6 w-6 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        onClick={() =>
                                          removeCourtFromRound(round.id, court.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <BadmintonCourt
                                      court={court}
                                      roundId={round.id}
                                      assignmentTarget={assignmentTarget}
                                      isLocked={isAssignmentEditingLocked}
                                      selectAssignmentTarget={selectAssignmentTarget}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="mx-auto flex w-full max-w-xl flex-col items-center py-8 text-center md:py-10"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-teal-500 opacity-20 blur-2xl" />
                  <div className="relative flex h-20 w-20 -rotate-3 items-center justify-center border-2 border-slate-900 bg-teal-500 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                    <Check className="h-9 w-9 stroke-[3]" />
                  </div>
                </div>
                <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-teal-600">
                  생성 완료
                </div>
                <h2 className="mb-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  자유게임 생성 완료
                </h2>

                <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/court-manager/game/${createdGameId || ""}`}
                    className="flex-1"
                  >
                    <Button className="h-12 w-full rounded-none bg-slate-900 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(16,185,129,1)] transition-transform hover:bg-slate-800 active:translate-y-1 active:translate-x-1 active:shadow-none">
                      자유게임 시작하러 가기
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="h-12 rounded-none border-2 border-slate-200 px-8 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    onClick={async () => {
                      if (!createdGameId) {
                        return;
                      }
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/court-manager/game/${createdGameId}`
                      );
                    }}
                  >
                    링크 복사
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step < 4 && (
          <div
            className={`z-10 border-t-2 border-slate-900 bg-slate-50 ${
              step === 3
                ? "flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between md:p-5"
                : "flex items-center justify-between px-3 py-2.5 md:p-5"
            }`}
          >
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step === 1 || isSubmitting}
              className={`rounded-none font-mono text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 ${
                step === 3 ? "self-start" : ""
              }`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step === 3 ? (
              <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:justify-end md:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isAssignmentEditingLocked}
                  onClick={addRoundBlock}
                  className="h-11 w-full rounded-none border-2 border-slate-900 bg-white px-3 font-bold uppercase tracking-[0.14em] text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-slate-50 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none md:w-[172px]"
                >
                  라운드 추가
                </Button>
                <Button
                  onClick={() => void handleNext()}
                  disabled={isSubmitting || isGeneratingAiPreview}
                  className="h-11 w-full gap-1.5 rounded-none bg-teal-500 px-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-teal-400 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none md:w-[188px] md:text-sm md:tracking-[0.16em]"
                >
                  {nextButtonLabel}
                </Button>
              </div>
            ) : (
              <div className="flex w-full max-w-[184px] justify-end">
                <Button
                  onClick={() => void handleNext()}
                  disabled={isSubmitting}
                  className="h-10 w-[160px] gap-1.5 rounded-none bg-teal-500 px-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-teal-400 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none sm:h-11 sm:w-[168px] sm:text-sm sm:tracking-[0.16em]"
                >
                  {nextButtonLabel}
                  {!isSubmitting && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isLocationModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-8"
            onClick={() => setIsLocationModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              className="flex max-h-[min(80svh,42rem)] w-full max-w-2xl flex-col overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    장소 검색
                  </h3>
                  <p className="mt-1 text-xs font-mono text-slate-500">
                    체육관 또는 운동 장소 이름으로 검색하세요.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                  onClick={() => setIsLocationModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="modal-scroll flex-1 space-y-4 p-5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="예: 숙지다목적체육관"
                      className="h-12 w-full rounded-none border-2 border-slate-200 bg-slate-50 pr-4 pl-10 text-sm font-medium transition-colors focus:border-slate-900 focus:bg-white focus:outline-none"
                      value={locationQuery}
                      onChange={(event) => {
                        setLocationSearchError("");
                        setLocationResults([]);
                        setLocationQuery(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSearchLocation();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-none border-2 border-slate-900 px-4 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900"
                    onClick={() => void handleSearchLocation()}
                    disabled={isSearchingLocation}
                  >
                    {isSearchingLocation ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        검색
                      </>
                    )}
                  </Button>
                </div>

                {locationSearchError ? (
                  <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {locationSearchError}
                  </div>
                ) : null}

                {locationResults.length > 0 ? (
                  <div className="space-y-2">
                    {locationResults.map((place) => {
                      const key = `${place.name}-${place.roadAddress}-${place.address}-${place.link}`;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectPlace(place)}
                          className="flex w-full items-start justify-between gap-3 border-2 border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-slate-900 hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {place.name}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              {place.roadAddress || place.address}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-teal-600">
                            선택
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-48 items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        검색어를 입력하고 장소를 찾아보세요.
                      </div>
                      <div className="mt-2 text-xs font-medium text-slate-500">
                        2글자 이상 입력하면 체육관이나 운동 장소를 검색할 수 있어요.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isParticipantAssignModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-8"
            onClick={closeParticipantAssignModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              className="flex max-h-[min(80svh,42rem)] w-full max-w-2xl flex-col overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    참가자 선택
                  </h3>
                  <p className="mt-1 text-xs font-mono text-slate-500">
                    {participantAssignModalMeta
                      ? `라운드 ${String(participantAssignModalMeta.roundNumber).padStart(2, "0")} · 코트 ${String(participantAssignModalMeta.courtNumber).padStart(2, "0")}에 등록할 참가자를 선택하세요.`
                      : "등록할 참가자를 선택하세요."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isAssignmentEditingLocked}
                  className="h-10 w-10 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                  onClick={closeParticipantAssignModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="modal-scroll flex-1 space-y-4 p-5">
                {participants.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {participants.map((participant) => {
                      const assignmentConflict = getParticipantAssignmentConflict(participant);
                      const isDisabled =
                        isAssignmentEditingLocked || assignmentConflict !== null;

                      return (
                        <button
                          key={participant.participantId}
                          type="button"
                          onClick={() => assignParticipantToTarget(participant)}
                          disabled={isDisabled}
                          className={`flex w-full items-center gap-3 border-2 px-4 py-4 text-left transition-colors ${
                            isDisabled
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : "border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span
                              className={`truncate text-sm font-bold ${
                                isDisabled ? "text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {participant.name}
                            </span>
                            <span
                              className={`shrink-0 text-xs font-medium ${
                                isDisabled ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {getGenderLabel(participant.gender)}/{getAgeGroupLabel(participant.ageGroup)}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 rounded px-2 py-1 text-[10px] font-mono font-bold ${
                              isDisabled
                                ? "bg-slate-200 text-slate-500"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            {isDisabled ? assignmentConflict : `게임 수 ${participant.gamesAssigned}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-48 items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        아직 등록할 참가자가 없습니다.
                      </div>
                      <div className="mt-2 text-xs font-medium text-slate-500">
                        먼저 참가자 구성 단계에서 참가자를 추가해주세요.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
