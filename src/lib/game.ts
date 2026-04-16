"use client";

import { apiRequest, isApiError } from "./api";
import { type BackendGrade, type UiGameGrade, toBackendGrade, toUiGameGrade } from "./grade";

export type Gender = "MALE" | "FEMALE";
export type Grade = UiGameGrade;
export type AgeGroup = 10 | 20 | 30 | 40 | 50 | 60 | 70;
export type GradeType = "REGIONAL" | "NATIONAL";
export type MatchRecordMode = "RESULT" | "STATUS_ONLY";
export type GameStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type MatchStatus = GameStatus | "NULL";
export type MatchResult = "TEAM_A_WIN" | "TEAM_B_WIN" | "DRAW" | null;

export interface Participant {
  id: string;
  accountId?: string | null;
  name: string;
  displayName: string;
  gender: Gender;
  grade: Grade;
  ageGroup: AgeGroup;
  assignedMatchCount: number;
  completedMatchCount: number;
  winCount: number;
  lossCount: number;
}

export interface CourtMatch {
  roundNumber: number;
  courtNumber: number;
  teamAIds: [string | null, string | null];
  teamBIds: [string | null, string | null];
  status: MatchStatus;
  result: MatchResult;
  isActive: boolean;
}

export interface GameRound {
  roundNumber: number;
  status: GameStatus;
  matches: CourtMatch[];
}

export interface Game {
  id: string;
  title: string;
  courtCount: number;
  roundCount: number;
  participants: Participant[];
  rounds: GameRound[];
  status: GameStatus;
  shareCode: string;
  createdBy: string;
  matchRecordMode: MatchRecordMode;
  gradeType: GradeType;
  scheduledAt?: string | null;
  location?: string | null;
}

export interface PublicGameSummary {
  id: string;
  title: string;
  courtCount: number;
  roundCount: number;
  status: GameStatus;
  shareCode: string;
  matchRecordMode: MatchRecordMode;
  gradeType: GradeType;
}

export interface CreateGameParticipant {
  participantId: number;
  accountId?: string;
  originalName: string;
  gender: Gender;
  grade: Grade;
  ageGroup: AgeGroup;
}

export interface CreateGameRound {
  roundNumber: number;
  courts: Array<{
    courtNumber: number;
    slots: [number | null, number | null, number | null, number | null];
  }>;
}

export interface CreateGameRequest {
  title: string;
  courtCount: number;
  roundCount: number;
  gradeType: GradeType;
  matchRecordMode?: MatchRecordMode;
  scheduledAt: string;
  location?: string;
  managerIds?: string[];
  participants: CreateGameParticipant[];
  rounds: CreateGameRound[];
}

export interface UpdateGameRequest {
  title?: string;
  matchRecordMode?: MatchRecordMode;
  gradeType?: GradeType;
  scheduledAt?: string | null;
  location?: string | null;
  managerIds?: string[];
}

export interface ScheduleDraftRound {
  roundNumber: number;
  matches: Array<{
    courtNumber: number;
    teamAIds: [string | null, string | null];
    teamBIds: [string | null, string | null];
  }>;
}

export type AssignmentPreviewPartnerPolicy =
  | "PREFER_PARTNERS"
  | "IGNORE_PARTNERS";
export type AssignmentPreviewExistingAssignmentPolicy =
  | "FILL_EMPTY_SLOTS"
  | "REASSIGN_ALL";
export type AssignmentPreviewSlot = [
  number | null,
  number | null,
  number | null,
  number | null,
];

export interface AssignmentPreviewCourt {
  courtNumber: number;
  slots: AssignmentPreviewSlot;
}

export interface AssignmentPreviewRound {
  roundNumber: number;
  courts: AssignmentPreviewCourt[];
}

export interface CreateGameAssignmentPreviewRequest {
  participants: Array<{
    participantId: number;
    gender: Gender;
    ageGroup: AgeGroup;
    grade: BackendGrade;
    gamesAssigned: number;
  }>;
  rounds: AssignmentPreviewRound[];
  partnerPairs: Array<{
    participantId1: number;
    participantId2: number;
  }>;
  preferences: {
    partnerPolicy: AssignmentPreviewPartnerPolicy;
    existingAssignmentPolicy: AssignmentPreviewExistingAssignmentPolicy;
  };
}

export interface CreateGameAssignmentPreviewResponse {
  rounds: AssignmentPreviewRound[];
  warnings: Array<{
    code: string;
    message: string;
  }>;
}

export type AssignmentPreviewJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export interface CreateGameAssignmentPreviewJobResponse {
  jobId: string;
  status: "QUEUED";
  pollAfterMs: number;
}

export interface GetGameAssignmentPreviewJobResponse {
  jobId: string;
  status: AssignmentPreviewJobStatus;
  preview: CreateGameAssignmentPreviewResponse | null;
  failure: {
    code: string;
    message: string;
  } | null;
  submittedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface CreateFreeGameResponse {
  gameId: string;
}

interface FreeGameDetailResponse {
  gameId: string;
  title: string;
  gameStatus: GameStatus;
  matchRecordMode: MatchRecordMode;
  gradeType: GradeType;
  courtCount: number;
  roundCount: number;
  organizerAccountId: string;
  shareCode: string;
  scheduledAt?: string | null;
  location?: string | null;
}

interface FreeGameParticipantResponse {
  participantId: string;
  accountId?: string | null;
  displayName: string;
  gender: Gender;
  grade?: string | null;
  ageGroup: number;
  assignedMatchCount: number;
  completedMatchCount: number;
  winCount: number;
  lossCount: number;
}

interface FreeGameParticipantsResponse {
  gameId: string;
  matchRecordMode: MatchRecordMode;
  participants: FreeGameParticipantResponse[];
}

interface FreeGameMatchResponse {
  courtNumber: number;
  teamAIds: Array<string | null>;
  teamBIds: Array<string | null>;
  matchStatus: MatchStatus;
  matchResult: Exclude<MatchResult, null> | "NULL";
  isActive: boolean;
}

interface FreeGameRoundResponse {
  roundNumber: number;
  roundStatus: GameStatus;
  matches: FreeGameMatchResponse[];
}

interface FreeGameRoundMatchResponse {
  gameId: string;
  rounds: FreeGameRoundResponse[];
}

function toPair(ids: Array<string | null> | undefined): [string | null, string | null] {
  return [ids?.[0] ?? null, ids?.[1] ?? null];
}

function mapParticipant(response: FreeGameParticipantResponse): Participant {
  return {
    id: response.participantId,
    accountId: response.accountId ?? null,
    name: response.displayName,
    displayName: response.displayName,
    gender: response.gender,
    grade: toUiGameGrade(response.grade) ?? "ROOKIE",
    ageGroup: response.ageGroup as AgeGroup,
    assignedMatchCount: response.assignedMatchCount,
    completedMatchCount: response.completedMatchCount,
    winCount: response.winCount,
    lossCount: response.lossCount,
  };
}

function mapRounds(rounds: FreeGameRoundResponse[]): GameRound[] {
  return rounds
    .slice()
    .sort((left, right) => left.roundNumber - right.roundNumber)
    .map((round) => ({
      roundNumber: round.roundNumber,
      status: round.roundStatus,
      matches: round.matches
        .slice()
        .sort((left, right) => left.courtNumber - right.courtNumber)
        .map((match) => ({
          roundNumber: round.roundNumber,
          courtNumber: match.courtNumber,
          teamAIds: toPair(match.teamAIds),
          teamBIds: toPair(match.teamBIds),
          status: match.matchStatus,
          result:
            match.matchResult && match.matchResult !== "NULL"
              ? match.matchResult
              : null,
          isActive: match.isActive,
        })),
    }));
}

function mapGame(
  detail: FreeGameDetailResponse,
  participants: FreeGameParticipantsResponse,
  rounds: FreeGameRoundMatchResponse
): Game {
  return {
    id: detail.gameId,
    title: detail.title,
    courtCount: detail.courtCount,
    roundCount: detail.roundCount,
    status: detail.gameStatus,
    shareCode: detail.shareCode,
    createdBy: detail.organizerAccountId,
    matchRecordMode: detail.matchRecordMode,
    gradeType: detail.gradeType,
    scheduledAt: detail.scheduledAt ?? null,
    location: detail.location ?? null,
    participants: participants.participants.map(mapParticipant),
    rounds: mapRounds(rounds.rounds),
  };
}

export async function createFreeGame(
  request: CreateGameRequest
): Promise<{ gameId: string }> {
  const response = await apiRequest<CreateFreeGameResponse>("/free-games", {
    method: "POST",
    auth: true,
    body: {
      ...request,
      participants: request.participants.map((participant) => ({
        ...participant,
        grade: toBackendGrade(participant.grade),
      })),
    },
  });

  return { gameId: response.gameId };
}

export async function createFreeGameAssignmentPreview(
  request: CreateGameAssignmentPreviewRequest
): Promise<CreateGameAssignmentPreviewJobResponse> {
  return apiRequest<CreateGameAssignmentPreviewJobResponse>(
    "/free-games/assignment-previews",
    {
      method: "POST",
      auth: true,
      body: request,
    }
  );
}

export async function getFreeGameAssignmentPreviewJob(
  jobId: string
): Promise<GetGameAssignmentPreviewJobResponse> {
  return apiRequest<GetGameAssignmentPreviewJobResponse>(
    `/free-games/assignment-previews/${jobId}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function getGameById(gameId: string): Promise<Game | null> {
  try {
    const [detail, participants, rounds] = await Promise.all([
      apiRequest<FreeGameDetailResponse>(`/free-games/${gameId}`, {
        method: "GET",
        auth: true,
      }),
      apiRequest<FreeGameParticipantsResponse>(
        `/free-games/${gameId}/participants?include=stats`,
        {
          method: "GET",
          auth: true,
        }
      ),
      apiRequest<FreeGameRoundMatchResponse>(
        `/free-games/${gameId}/rounds-and-matches`,
        {
          method: "GET",
          auth: true,
        }
      ),
    ]);

    return mapGame(detail, participants, rounds);
  } catch (error) {
    if (isApiError(error) && [401, 403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

export async function getPublicGameByShareCode(
  shareCode: string
): Promise<PublicGameSummary | null> {
  try {
    const detail = await apiRequest<FreeGameDetailResponse>(
      `/free-games/share/${shareCode}`,
      {
        method: "GET",
      }
    );

    return {
      id: detail.gameId,
      title: detail.title,
      courtCount: detail.courtCount,
      roundCount: detail.roundCount,
      status: detail.gameStatus,
      shareCode: detail.shareCode,
      matchRecordMode: detail.matchRecordMode,
      gradeType: detail.gradeType,
    };
  } catch (error) {
    if (isApiError(error) && [404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

export async function updateGame(
  gameId: string,
  updates: UpdateGameRequest
): Promise<boolean> {
  try {
    await apiRequest(`/free-games/${gameId}`, {
      method: "PATCH",
      auth: true,
      body: updates,
    });

    return true;
  } catch {
    return false;
  }
}

export async function updateGameSchedule(
  gameId: string,
  rounds: ScheduleDraftRound[]
): Promise<boolean> {
  try {
    await apiRequest(`/free-games/${gameId}/rounds-and-matches`, {
      method: "PATCH",
      auth: true,
      parseAs: "void",
      body: {
        rounds: rounds.map((round) => ({
          roundNumber: round.roundNumber,
          matches: round.matches.map((match) => ({
            courtNumber: match.courtNumber,
            teamAIds: match.teamAIds.map((id) =>
              id != null && id !== "" ? id : null
            ),
            teamBIds: match.teamBIds.map((id) =>
              id != null && id !== "" ? id : null
            ),
          })),
        })),
      },
    });

    return true;
  } catch {
    return false;
  }
}

export function getGameStatusLabel(status: GameStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "미진행";
    case "IN_PROGRESS":
      return "진행중";
    case "COMPLETED":
      return "완료";
    default:
      return "-";
  }
}

export function getMatchRecordModeLabel(mode: MatchRecordMode) {
  return mode === "RESULT" ? "결과 기록" : "상태만 기록";
}

export function getGradeTypeLabel(gradeType: GradeType) {
  return gradeType === "REGIONAL" ? "지역 급수" : "전국 급수";
}
