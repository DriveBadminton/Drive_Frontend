"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  X,
  Trash2,
  UsersRound,
} from "lucide-react";
import Select from "@/components/Select";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import { SessionDateTimePicker } from "@/components/ui/session-date-time-picker";
import { useAuth } from "@/hooks/useAuth";
import { createFreeGame, Grade } from "@/lib/game";
import { validateParticipantName } from "@/lib/participant";
import { searchPlaces, type PlaceSearchResult } from "@/lib/place";
import { pushRecentGameId } from "@/lib/recent-games";

type LocalParticipant = {
  clientId: string;
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
type PartnerLinks = Record<string, string>;
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

const AGE_GROUP_OPTIONS = ["10s", "20s", "30s", "40s", "50s", "60s"];
const LEVEL_OPTIONS: Grade[] = ["ROOKIE", "D", "C", "B", "A", "S", "SS"];
const DEFAULT_AI_PARTNER_POLICY: AiPartnerPolicy = "prefer-partners";
const DEFAULT_AI_EXISTING_ASSIGNMENT_POLICY: AiExistingAssignmentPolicy =
  "fill-empty-slots";
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
const LEVEL_SELECT_OPTIONS = LEVEL_OPTIONS.map((level) => ({
  value: level,
  label: level,
}));

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
              (player) => player?.clientId === participant.clientId
            ).length,
          0
        ),
      0
    );

    return { ...participant, gamesAssigned };
  });
}

function isFutureDateTime(value: string) {
  if (!value) {
    return false;
  }

  const candidate = new Date(value);
  return !Number.isNaN(candidate.getTime()) && candidate.getTime() > Date.now();
}

function getGenderLabel(gender: "M" | "F") {
  return GENDER_LABELS[gender];
}

function getAgeGroupLabel(ageGroup: string) {
  return AGE_GROUP_LABELS[ageGroup as keyof typeof AGE_GROUP_LABELS] ?? ageGroup;
}

function detachPartnerLinks(partnerLinks: PartnerLinks, participantId: string): PartnerLinks {
  const nextLinks = { ...partnerLinks };
  const partnerId = nextLinks[participantId];

  delete nextLinks[participantId];
  if (partnerId) {
    delete nextLinks[partnerId];
  }

  return nextLinks;
}

function connectPartnerLinks(
  partnerLinks: PartnerLinks,
  leftParticipantId: string,
  rightParticipantId: string
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
    participants.map((participant) => [participant.clientId, participant])
  );
  const visited = new Set<string>();
  const groups: ParticipantSummaryGroup[] = [];

  for (const participant of participants) {
    if (visited.has(participant.clientId)) {
      continue;
    }

    const partnerId = partnerLinks[participant.clientId];
    const partner = partnerId ? participantById.get(partnerId) : null;

    if (partner) {
      visited.add(participant.clientId);
      visited.add(partner.clientId);
      groups.push({
        type: "pair",
        key: [participant.clientId, partner.clientId].sort().join(":"),
        participants: [participant, partner],
      });
      continue;
    }

    visited.add(participant.clientId);
    groups.push({
      type: "single",
      key: participant.clientId,
      participant,
    });
  }

  return groups;
}

const BadmintonCourt = ({
  court,
  roundId,
  assignmentTarget,
  selectAssignmentTarget,
}: {
  court: LocalCourt;
  roundId: string;
  assignmentTarget: AssignmentTarget | null;
  selectAssignmentTarget: (roundId: string, courtId: string, slotIndex: number) => void;
}) => {
  return (
    <div className="relative mx-auto flex aspect-[11/6] w-full max-w-[264px] overflow-hidden rounded-none border-4 border-slate-900 bg-emerald-700 px-3 py-2.5 shadow-inner">
      <div className="pointer-events-none absolute inset-[10px]">
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

      <div className="relative z-10 grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 px-3.5 py-2.5">
        {[0, 1, 2, 3].map((index) => {
          const participant = court.assignedParticipants[index];
          const isSelectedTarget =
            assignmentTarget?.roundId === roundId &&
            assignmentTarget.courtId === court.id &&
            assignmentTarget.slotIndex === index;

          return (
            <div key={index} className="flex items-center justify-center p-1">
              {participant ? (
                <div className="flex min-w-[64px] max-w-[84%] flex-col items-center justify-center rounded-none border-2 border-slate-900 bg-white px-2.5 py-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <div className="w-full truncate text-center text-[10px] leading-tight font-bold text-slate-900">
                    {participant.name}
                  </div>
                  <div className="mt-0.5 text-[7px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    {getGenderLabel(participant.gender)}/{getAgeGroupLabel(participant.ageGroup)}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => selectAssignmentTarget(roundId, court.id, index)}
                  className={`flex h-6 w-full max-w-[46px] items-center justify-center rounded-none border-2 text-[8px] font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all ${
                    isSelectedTarget
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
  const [partnerLinks, setPartnerLinks] = useState<PartnerLinks>({});
  const [partnerSelectionSourceId, setPartnerSelectionSourceId] = useState<string | null>(null);
  const [aiPartnerPolicy, setAiPartnerPolicy] =
    useState<AiPartnerPolicy>(DEFAULT_AI_PARTNER_POLICY);
  const [aiExistingAssignmentPolicy, setAiExistingAssignmentPolicy] =
    useState<AiExistingAssignmentPolicy>(DEFAULT_AI_EXISTING_ASSIGNMENT_POLICY);
  const [lastAddedParticipantId, setLastAddedParticipantId] = useState<string | null>(null);
  const isParticipantNameComposingRef = useRef(false);
  const submitParticipantAfterCompositionRef = useRef(false);
  const skipNextParticipantEnterRef = useRef(false);
  const participantListRef = useRef<HTMLDivElement | null>(null);
  const participantRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.location.href = "/login?returnTo=/court-manager/create";
    }
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    if (!lastAddedParticipantId) {
      return;
    }

    const containerElement = participantListRef.current;
    const rowElement = participantRowRefs.current[lastAddedParticipantId];
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
    setRounds((prev) => [
      ...prev,
      { id: getNextOrdinalId(prev, "round"), courts: buildCourts(courts) },
    ]);
  };

  const addCourtToRound = (roundId: string) => {
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
    setAiPartnerPolicy((current) =>
      current === "prefer-partners" ? "ignore-partners" : "prefer-partners"
    );
  };

  const cycleAiExistingAssignmentPolicy = () => {
    setAiExistingAssignmentPolicy((current) =>
      current === "fill-empty-slots" ? "reassign-all" : "fill-empty-slots"
    );
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
      (current) => current?.clientId === participant.clientId
    );
    if (existsInSameCourt) {
      return "같은 코트";
    }

    const existsInSameRound = targetRound.courts.some((court) =>
      court.assignedParticipants.some(
        (current) => current?.clientId === participant.clientId
      )
    );
    if (existsInSameRound) {
      return "같은 라운드";
    }

    return null;
  };

  const assignParticipantToTarget = (participant: LocalParticipant) => {
    if (!assignmentTarget) {
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
    const nextRounds = rounds.filter((round) => round.id !== roundId);

    setRounds(nextRounds);
    setParticipants((prev) => recalculateAssignments(prev, nextRounds));
    if (assignmentTarget?.roundId === roundId) {
      setIsParticipantAssignModalOpen(false);
      setAssignmentTarget(null);
    }
  };

  const addParticipant = (participantName = newParticipant.name) => {
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
      clientId: crypto.randomUUID(),
      name: trimmedParticipantName,
      gender: newParticipant.gender,
      ageGroup: newParticipant.ageGroup,
      level: newParticipant.level,
      gamesAssigned: 0,
    };

    setLastAddedParticipantId(nextParticipant.clientId);
    setParticipants((prev) => [...prev, nextParticipant]);
    setNewParticipant({
      name: "",
      gender: "M",
      ageGroup: "20s",
      level: "C",
    });
  };

  const startPartnerSelection = (participantClientId: string) => {
    setPartnerSelectionSourceId((current) =>
      current === participantClientId ? null : participantClientId
    );
  };

  const assignPartner = (participantClientId: string) => {
    if (!partnerSelectionSourceId || partnerSelectionSourceId === participantClientId) {
      return;
    }

    setPartnerLinks((current) =>
      connectPartnerLinks(current, partnerSelectionSourceId, participantClientId)
    );
    setPartnerSelectionSourceId(null);
  };

  const clearPartner = (participantClientId: string) => {
    setPartnerLinks((current) => detachPartnerLinks(current, participantClientId));
    setPartnerSelectionSourceId((current) =>
      current === participantClientId ? null : current
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
        error instanceof Error
          ? error.message
          : "장소 검색 중 오류가 발생했습니다."
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

  const removeParticipant = (participantClientId: string) => {
    const nextRounds = rounds.map((round) => ({
      ...round,
      courts: round.courts.map((court) => ({
        ...court,
        assignedParticipants: court.assignedParticipants.map((participant) =>
          participant?.clientId === participantClientId ? null : participant
        ),
      })),
    }));
    const nextParticipants = participants.filter(
      (participant) => participant.clientId !== participantClientId
    );
    setRounds(nextRounds);
    setParticipants(recalculateAssignments(nextParticipants, nextRounds));
    setPartnerLinks((current) => detachPartnerLinks(current, participantClientId));
    setPartnerSelectionSourceId((current) =>
      current === participantClientId ? null : current
    );
  };

  const handleNext = async () => {
    setSubmitError("");
    setSubmitErrorField(null);

    const stepValidation = getStepValidationResult(step);
    if (stepValidation) {
      setSubmitError(stepValidation.message);
      setSubmitErrorField(stepValidation.field);
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
          matchRecordMode: "RESULT",
          scheduledAt: date,
          location: trimmedLocation,
          participants: participants.map((participant) => ({
            clientId: participant.clientId,
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
                participant?.clientId ?? null
              ) as [string | null, string | null, string | null, string | null],
            })),
          })),
        });

        const gameId = result.gameId;
        pushRecentGameId(gameId);
        setCreatedGameId(gameId);
        setStep(4);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "세션 생성에 실패했습니다."
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
    "준비 완료",
  ];

  const trimmedGameName = gameName.trim();
  const trimmedLocation = location.trim();

  const getStepValidationResult = (
    targetStep: number
  ): { field: StepValidationField; message: string } | null => {
    if (targetStep === 1) {
      if (!trimmedGameName) {
        return { field: "gameName", message: "세션 이름을 입력해주세요." };
      }

      if (!date) {
        return { field: "date", message: "날짜와 시간을 선택해주세요." };
      }

      if (!isFutureDateTime(date)) {
        return {
          field: "date",
          message: "현재 시각보다 미래의 시간만 선택할 수 있습니다.",
        };
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
    participants.map((participant) => [participant.clientId, participant])
  );
  const partnerSelectionSource = partnerSelectionSourceId
    ? participantById.get(partnerSelectionSourceId) ?? null
    : null;
  const participantSummaryGroups = buildParticipantSummaryGroups(participants, partnerLinks);
  const hasPartnerPairs = participantSummaryGroups.some((group) => group.type === "pair");
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

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:px-8 lg:py-12">
      <div className="mb-8 md:mb-10">
        <div className="mb-8 flex items-center justify-between">
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
                className={`text-[9px] font-mono uppercase tracking-widest ${
                  step >= index ? "font-bold text-slate-900" : "text-slate-400"
                }`}
              >
                {stepLabels[index - 1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-[500px] flex-col overflow-visible rounded-sm border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="absolute top-0 left-0 h-4 w-4 border-r-2 border-b-2 border-slate-200" />
        <div className="absolute top-0 right-0 h-4 w-4 border-b-2 border-l-2 border-slate-200" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-t-2 border-r-2 border-slate-200" />
        <div className="absolute right-0 bottom-0 h-4 w-4 border-t-2 border-l-2 border-slate-200" />

        <div
          className={`z-10 flex min-h-[52px] items-center border-b px-6 py-3 text-sm font-medium md:px-10 ${
            submitError
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-transparent bg-transparent text-transparent"
          }`}
        >
          {submitError || "\u00A0"}
        </div>

        <div className="z-30 flex-1 px-5 py-3 md:px-10 md:py-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-2xl space-y-5"
              >
                <div className="mb-3 border-b-2 border-slate-100 pb-2">
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    자유게임 설정
                  </h2>
                  <p className="mt-1 text-sm font-mono text-slate-500">
                    자유게임에 필요한 기본 정보를 입력하세요.
                  </p>
                </div>

                <div className="space-y-6">
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

                  <div className="grid gap-6 sm:grid-cols-2">
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
                      <div className="space-y-3">
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

                  <div className="grid gap-6 border-t-2 border-slate-100 pt-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                        활성 코트
                      </label>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                          onClick={() => setCourts((prev) => Math.max(1, prev - 1))}
                        >
                          -
                        </Button>
                        <div className="flex h-12 w-20 items-center justify-center border-2 border-slate-900 bg-slate-900 font-display text-xl font-bold text-white">
                          {String(courts).padStart(2, "0")}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                          onClick={() => setCourts((prev) => prev + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900">
                        활성 라운드
                      </label>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                          onClick={() => setRoundCount((prev) => Math.max(1, prev - 1))}
                        >
                          -
                        </Button>
                        <div className="flex h-12 w-20 items-center justify-center border-2 border-slate-900 bg-slate-900 font-display text-xl font-bold text-white">
                          {String(roundCount).padStart(2, "0")}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                          onClick={() => setRoundCount((prev) => prev + 1)}
                        >
                          +
                        </Button>
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
                className="space-y-5"
              >
                <div className="mb-3 flex flex-col justify-between gap-3 border-b-2 border-slate-100 pb-2 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="font-display text-2xl font-bold uppercase text-slate-900">
                      참가자 구성
                    </h2>
                    <p className="mt-1 text-sm font-mono text-slate-500">
                      참가자를 추가하고 등급을 지정해주세요.
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="mb-1 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      총 인원
                    </span>
                    <div className="font-display text-3xl leading-none font-bold text-teal-600">
                      {String(participants.length).padStart(2, "0")}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="min-w-[220px] flex-[1.8]">
                    <input
                      type="text"
                      placeholder="이름"
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
                      onChange={(event) =>
                        setNewParticipant((prev) => ({
                          ...prev,
                          level: event as Grade,
                        }))
                      }
                    />
                  </div>
                  <Button
                    onClick={() => addParticipant()}
                    className="h-[50px] w-full rounded-none bg-slate-900 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 sm:w-[96px]"
                  >
                    추가
                  </Button>
                </div>

                <div
                  className={`border-2 bg-white ${
                    submitErrorField === "participants"
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                >
                  {partnerSelectionSource ? (
                    <div className="flex items-start justify-between gap-4 border-b-2 border-violet-200 bg-violet-50 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700">
                          파트너 선택 모드
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
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
                        className="h-9 rounded-none border-2 border-violet-200 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700 hover:border-violet-400 hover:bg-violet-100"
                        onClick={() => setPartnerSelectionSourceId(null)}
                      >
                        취소
                      </Button>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <div className="min-w-[860px]">
                      <div className="grid grid-cols-[56px_minmax(0,2fr)_72px_88px_84px_minmax(0,1.5fr)_48px] gap-4 border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                        <div className="text-center">ID</div>
                        <div className="text-center">이름</div>
                        <div className="text-center">성별</div>
                        <div className="text-center">연령</div>
                        <div className="text-center">등급</div>
                        <div className="text-center">파트너</div>
                        <div className="text-center">관리</div>
                      </div>
                      <div ref={participantListRef} className="max-h-[320px] overflow-y-auto bg-white">
                        {participants.map((participant, index) => {
                          const partner = partnerLinks[participant.clientId]
                            ? participantById.get(partnerLinks[participant.clientId]) ?? null
                            : null;
                          const isPartnerSource =
                            partnerSelectionSourceId === participant.clientId;
                          const isPartnerCandidate =
                            partnerSelectionSourceId !== null &&
                            partnerSelectionSourceId !== participant.clientId;

                          return (
                            <div
                              key={participant.clientId}
                              ref={(element) => {
                                participantRowRefs.current[participant.clientId] = element;
                              }}
                              onClick={() => {
                                if (isPartnerCandidate) {
                                  assignPartner(participant.clientId);
                                }
                              }}
                              className={`grid grid-cols-[56px_minmax(0,2fr)_72px_88px_84px_minmax(0,1.5fr)_48px] items-center gap-4 px-4 py-3 transition-colors ${
                                index > 0 ? "border-t-2 border-slate-100" : ""
                              } ${
                                isPartnerSource
                                  ? "bg-violet-50"
                                  : isPartnerCandidate
                                    ? "cursor-pointer bg-white hover:bg-violet-50"
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
                                        className="border border-violet-200 bg-white px-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700 hover:border-violet-400 hover:bg-violet-100"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          startPartnerSelection(participant.clientId);
                                        }}
                                      >
                                        변경
                                      </button>
                                      <button
                                        type="button"
                                        className="border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          clearPartner(participant.clientId);
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
                                    className="h-9 w-full rounded-none border-2 border-slate-200 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startPartnerSelection(participant.clientId);
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
                                  className="h-8 w-8 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeParticipant(participant.clientId);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        {participants.length === 0 && (
                          <div className="py-12 text-center font-mono text-xs uppercase tracking-widest text-slate-400">
                            아직 추가된 참가자가 없습니다
                          </div>
                        )}
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
                className="space-y-5"
              >
                <div className="mb-3 flex flex-col justify-between gap-3 border-b-2 border-slate-100 pb-2 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="font-display text-2xl font-bold uppercase text-slate-900">
                      코트 배정
                    </h2>
                    <p className="mt-1 text-sm font-mono text-slate-500">
                      배정할 코트 슬롯을 먼저 선택한 뒤 참가자를 등록하세요.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
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
                                onClick={item.onClick ?? undefined}
                                className={`flex h-9 w-9 items-center justify-center rounded-none border-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.08)] transition-colors ${item.className}`}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            ) : (
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-none border-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.08)] transition-colors ${item.className}`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-none bg-emerald-500 font-mono text-[10px] uppercase tracking-widest text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-emerald-400 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                    >
                      <Activity className="mr-2 h-3 w-3" />
                      AI 자동 배정
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-2 border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3">
                      <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                        참가자 요약
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {participantSummaryGroups.map((group) =>
                        group.type === "pair" ? (
                          <div key={group.key} className="relative xl:col-span-2">
                            <div className="grid gap-3 sm:grid-cols-2">
                              {group.participants.map((participant) => (
                                <div
                                  key={participant.clientId}
                                  className="flex items-center justify-between border-2 border-violet-400 bg-violet-50/20 p-3 text-left text-xs"
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span className="truncate font-bold text-slate-900">
                                      {participant.name}
                                    </span>
                                    <span className="shrink-0 font-mono text-slate-500">
                                      {getGenderLabel(participant.gender)}/
                                      {getAgeGroupLabel(participant.ageGroup)}
                                    </span>
                                  </div>
                                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-900">
                                    게임 수 {participant.gamesAssigned}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="pointer-events-none absolute top-1/2 left-1/2 hidden h-[3px] w-4 -translate-x-1/2 -translate-y-1/2 bg-violet-500 sm:block" />
                            <div className="mt-2 flex items-center justify-center sm:hidden">
                              <div className="h-[3px] w-4 bg-violet-500" />
                            </div>
                          </div>
                        ) : (
                          <div
                            key={group.key}
                            className="flex items-center justify-between border border-slate-200 bg-white p-3 text-left text-xs"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="truncate font-bold text-slate-900">
                                {group.participant.name}
                              </span>
                              <span className="shrink-0 font-mono text-slate-500">
                                {getGenderLabel(group.participant.gender)}/
                                {getAgeGroupLabel(group.participant.ageGroup)}
                              </span>
                            </div>
                            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-900">
                              게임 수 {group.participant.gamesAssigned}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {rounds.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                      <div className="text-sm font-medium text-slate-500">
                        아직 생성된 라운드가 없습니다.
                      </div>
                    </div>
                  ) : (
                    rounds.map((round, roundIndex) => (
                      <div key={round.id} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="bg-slate-900 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white">
                            라운드 {String(roundIndex + 1).padStart(2, "0")}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 rounded-none border border-slate-300 text-[10px] font-bold uppercase tracking-widest"
                            onClick={() => addCourtToRound(round.id)}
                          >
                            + 코트 추가
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => removeRoundBlock(round.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {round.courts.length === 0 ? (
                          <div className="border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                            <div className="text-sm font-medium text-slate-500">
                              이 라운드에는 아직 코트가 없습니다.
                            </div>
                          </div>
                        ) : (
                          <div className="mx-auto flex max-w-[1140px] flex-wrap justify-center gap-7">
                            {round.courts.map((court, courtIndex) => (
                              <div
                                key={court.id}
                                className="w-full max-w-[264px] shrink-0 space-y-1 sm:w-[264px]"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                                    코트 {String(courtIndex + 1).padStart(2, "0")}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
                                    onClick={() => removeCourtFromRound(round.id, court.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <BadmintonCourt
                                  court={court}
                                  roundId={round.id}
                                  assignmentTarget={assignmentTarget}
                                  selectAssignmentTarget={selectAssignmentTarget}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="relative mb-10">
                  <div className="absolute inset-0 bg-teal-500 opacity-20 blur-2xl" />
                  <div className="relative flex h-24 w-24 -rotate-3 items-center justify-center border-2 border-slate-900 bg-teal-500 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                    <Check className="h-10 w-10 stroke-[3]" />
                  </div>
                </div>
                <div className="mb-3 text-[10px] font-mono uppercase tracking-widest text-teal-600">
                  Initialization Complete
                </div>
                <h2 className="mb-6 font-display text-4xl font-bold uppercase tracking-tight text-slate-900">
                  System Ready
                </h2>
                <p className="mx-auto mb-10 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                  <strong className="text-slate-900">
                    {gameName || "Weekend Morning Rally"}
                  </strong>{" "}
                  has been successfully configured. Proceed to the operations desk to manage the live session.
                </p>

                <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
                  <Link
                    href={`/court-manager/game/${createdGameId || ""}`}
                    className="flex-1"
                  >
                    <Button className="h-14 w-full rounded-none bg-slate-900 text-sm font-bold uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_rgba(16,185,129,1)] transition-transform hover:bg-slate-800 active:translate-y-1 active:translate-x-1 active:shadow-none">
                      Enter Operations
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="h-14 rounded-none border-2 border-slate-200 px-8 text-sm font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                    onClick={async () => {
                      if (!createdGameId) {
                        return;
                      }
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/court-manager/game/${createdGameId}`
                      );
                    }}
                  >
                    Share Link
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step < 4 && (
          <div className="z-10 flex items-center justify-between border-t-2 border-slate-900 bg-slate-50 p-4 md:p-6">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step === 1 || isSubmitting}
              className="rounded-none font-mono text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="flex w-full max-w-[412px] justify-end gap-3">
              {step === 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRoundBlock}
                  className="h-12 w-full rounded-none border-2 border-slate-900 bg-white font-bold uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-slate-50 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none sm:w-[200px]"
                >
                  라운드 추가
                </Button>
              ) : null}
              <Button
                onClick={() => void handleNext()}
                disabled={isSubmitting}
                className="h-12 w-full rounded-none bg-teal-500 font-bold uppercase tracking-widest text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-teal-400 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none sm:w-[200px]"
              >
                {nextButtonLabel}
                {step !== 3 && !isSubmitting && <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
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
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
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

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="예: 숙지다목적체육관"
                      className="w-full rounded-none border-2 border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-sm font-medium transition-colors focus:border-slate-900 focus:bg-white focus:outline-none"
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
                    className="h-[50px] rounded-none border-2 border-slate-900 px-4 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900"
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
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
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
                  className="h-10 w-10 rounded-none border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:bg-slate-50"
                  onClick={closeParticipantAssignModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {participants.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {participants.map((participant) => {
                      const assignmentConflict = getParticipantAssignmentConflict(participant);
                      const isDisabled = assignmentConflict !== null;

                      return (
                        <button
                          key={participant.clientId}
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
