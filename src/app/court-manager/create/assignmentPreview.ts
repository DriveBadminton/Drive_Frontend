import type {
  AssignmentPreviewSlot,
  CreateGameAssignmentPreviewRequest,
  CreateGameAssignmentPreviewResponse,
  Grade,
} from "@/lib/game";
import { toBackendGrade } from "@/lib/grade";

type PreviewParticipant = {
  participantId: number;
  name: string;
  gender: "M" | "F";
  ageGroup: string;
  level: Grade;
  gamesAssigned: number;
};

type PreviewAssignableParticipant = {
  participantId: number;
};

type PreviewRound = {
  courts: Array<{
    id: string;
    assignedParticipants: Array<PreviewAssignableParticipant | null>;
  }>;
};

type PreviewPartnerLinks = Record<number, number>;
type PreviewPartnerPolicy = "prefer-partners" | "ignore-partners";
type PreviewExistingAssignmentPolicy = "fill-empty-slots" | "reassign-all";

const ASSIGNMENT_PREVIEW_CONTRACT_ERROR_MESSAGE =
  "자동 배정 결과를 적용할 수 없어요. 현재 배정은 유지했어요. 잠시 후 다시 시도해주세요.";

export class AssignmentPreviewContractError extends Error {
  constructor(message = ASSIGNMENT_PREVIEW_CONTRACT_ERROR_MESSAGE) {
    super(message);
    this.name = "AssignmentPreviewContractError";
  }
}

export function buildAssignmentPreviewRequest({
  participants,
  rounds,
  partnerLinks,
  partnerPolicy,
  existingAssignmentPolicy,
}: {
  participants: PreviewParticipant[];
  rounds: PreviewRound[];
  partnerLinks: PreviewPartnerLinks;
  partnerPolicy: PreviewPartnerPolicy;
  existingAssignmentPolicy: PreviewExistingAssignmentPolicy;
}): CreateGameAssignmentPreviewRequest {
  return {
    participants: participants.map((participant) => ({
      participantId: participant.participantId,
      gender: participant.gender === "M" ? "MALE" : "FEMALE",
      ageGroup: Number(
        participant.ageGroup.replace("s", "")
      ) as CreateGameAssignmentPreviewRequest["participants"][number]["ageGroup"],
      grade: toBackendGrade(participant.level) ?? "초심",
      gamesAssigned: participant.gamesAssigned,
    })),
    rounds: rounds.map((round, roundIndex) => ({
      roundNumber: roundIndex + 1,
      courts: round.courts.map((court, courtIndex) => ({
        courtNumber: courtIndex + 1,
        slots: toAssignmentPreviewSlot(
          court.assignedParticipants.map((participant) => participant?.participantId ?? null)
        ),
      })),
    })),
    partnerPairs: buildPartnerPairs(partnerLinks),
    preferences: {
      partnerPolicy:
        partnerPolicy === "prefer-partners" ? "PREFER_PARTNERS" : "IGNORE_PARTNERS",
      existingAssignmentPolicy:
        existingAssignmentPolicy === "fill-empty-slots"
          ? "FILL_EMPTY_SLOTS"
          : "REASSIGN_ALL",
    },
  };
}

export function createAssignmentPreviewRequestKey(
  request: CreateGameAssignmentPreviewRequest
) {
  return JSON.stringify(request);
}

export function buildAssignmentPreviewRequestKey(args: Parameters<
  typeof buildAssignmentPreviewRequest
>[0]) {
  return createAssignmentPreviewRequestKey(buildAssignmentPreviewRequest(args));
}

export function matchesAssignmentPreviewRequestKey(
  currentRequestKey: string,
  submittedRequestKey: string
) {
  return currentRequestKey === submittedRequestKey;
}

export function validateAssignmentPreviewResponse({
  preview,
  rounds,
  participants,
}: {
  preview: CreateGameAssignmentPreviewResponse;
  rounds: PreviewRound[];
  participants: PreviewAssignableParticipant[];
}): CreateGameAssignmentPreviewResponse {
  if (!Array.isArray(preview.rounds) || preview.rounds.length !== rounds.length) {
    throw new AssignmentPreviewContractError();
  }

  const participantIds = new Set(participants.map((participant) => participant.participantId));

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    const currentRound = rounds[roundIndex];
    const previewRound = preview.rounds[roundIndex];

    if (
      !previewRound ||
      previewRound.roundNumber !== roundIndex + 1 ||
      !Array.isArray(previewRound.courts) ||
      previewRound.courts.length !== currentRound.courts.length
    ) {
      throw new AssignmentPreviewContractError();
    }

    for (let courtIndex = 0; courtIndex < currentRound.courts.length; courtIndex += 1) {
      const previewCourt = previewRound.courts[courtIndex];

      if (
        !previewCourt ||
        previewCourt.courtNumber !== courtIndex + 1 ||
        !isAssignmentPreviewSlot(previewCourt.slots)
      ) {
        throw new AssignmentPreviewContractError();
      }

      for (const participantId of previewCourt.slots) {
        if (participantId !== null && !participantIds.has(participantId)) {
          throw new AssignmentPreviewContractError();
        }
      }
    }
  }

  if (!Array.isArray(preview.warnings) || !preview.warnings.every(isAssignmentPreviewWarning)) {
    throw new AssignmentPreviewContractError();
  }

  return preview;
}

export function applyAssignmentPreviewToRounds<TParticipant extends PreviewAssignableParticipant>(
  rounds: Array<{
    id: string;
    courts: Array<{
      id: string;
      assignedParticipants: Array<TParticipant | null>;
    }>;
  }>,
  previewRounds: CreateGameAssignmentPreviewResponse["rounds"],
  participants: TParticipant[]
) {
  const participantsById = new Map(
    participants.map((participant) => [participant.participantId, participant] as const)
  );

  return rounds.map((round, roundIndex) => ({
    ...round,
    courts: round.courts.map((court, courtIndex) => ({
      ...court,
      assignedParticipants: previewRounds[roundIndex].courts[courtIndex].slots.map(
        (participantId) =>
          participantId !== null ? participantsById.get(participantId) ?? null : null
      ),
    })),
  }));
}

function buildPartnerPairs(partnerLinks: PreviewPartnerLinks) {
  const seen = new Set<string>();

  return Object.entries(partnerLinks).flatMap(([participantId1, participantId2]) => {
    const leftParticipantId = Number(participantId1);
    const rightParticipantId = Number(participantId2);
    const pairKey = [leftParticipantId, rightParticipantId].sort((left, right) => left - right).join(":");
    if (seen.has(pairKey)) {
      return [];
    }

    seen.add(pairKey);
    return [{ participantId1: leftParticipantId, participantId2: rightParticipantId }];
  });
}

function toAssignmentPreviewSlot(values: Array<number | null>): AssignmentPreviewSlot {
  return [
    values[0] ?? null,
    values[1] ?? null,
    values[2] ?? null,
    values[3] ?? null,
  ];
}

function isAssignmentPreviewSlot(slots: unknown): slots is AssignmentPreviewSlot {
  return (
    Array.isArray(slots) &&
    slots.length === 4 &&
    slots.every((slot) => slot === null || typeof slot === "number")
  );
}

function isAssignmentPreviewWarning(
  warning: unknown
): warning is CreateGameAssignmentPreviewResponse["warnings"][number] {
  if (!warning || typeof warning !== "object") {
    return false;
  }

  const candidate = warning as Record<string, unknown>;
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}
