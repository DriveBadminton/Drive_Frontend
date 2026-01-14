import { getAccessToken, refreshAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 타입 정의
export type Gender = "MALE" | "FEMALE";
export type Grade = "ROOKIE" | "D" | "C" | "B" | "A" | "S" | "SS";
export type AgeGroup = 10 | 20 | 30 | 40 | 50 | 60 | 70;
export type GradeType = "REGIONAL" | "NATIONAL";
export type MatchRecordMode = "RESULT" | "STATUS_ONLY";
export type GameStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type MatchResult = "TEAM1_WIN" | "TEAM2_WIN" | "DRAW" | null;
export type GameType =
  | "MEN_DOUBLES"
  | "WOMEN_DOUBLES"
  | "MIXED_DOUBLES"
  | "CROSS_DOUBLES"
  | "OTHER_DOUBLES";

export interface Participant {
  id: string;
  name: string;
  displayName?: string;
  gender: Gender;
  grade: Grade;
  ageGroup: AgeGroup;
  userId?: number;
}

export interface CourtMatch {
  id?: string;
  roundNumber: number;
  courtNumber: number;
  player1Id: string;
  player2Id: string;
  player3Id: string;
  player4Id: string;
  gameType?: GameType;
  result?: MatchResult;
  status?: GameStatus;
}

export interface Game {
  id: string;
  title: string;
  courtCount: number;
  roundCount: number;
  participants: Participant[];
  courtMatches: CourtMatch[];
  status: GameStatus;
  shareLink: string;
  createdAt: string;
  createdBy: number;
}

// API 요청용 참가자 타입
export interface CreateGameParticipant {
  userId?: number;
  originalName: string;
  gender: Gender;
  grade: Grade;
  ageGroup: AgeGroup;
}

export interface CreateGameRequest {
  title: string;
  courtCount: number;
  roundCount: number;
  gradeType: GradeType;
  matchRecordMode?: MatchRecordMode;
  managerIds?: number[];
  participants?: CreateGameParticipant[];
}

export interface CreateGameResponse {
  gameId: number;
}

export interface UpdateMatchResultRequest {
  matchId: string;
  result: MatchResult;
}

export interface UpdateGameStatusRequest {
  status: GameStatus;
}

// API 응답 래퍼
interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  timestamp: string;
}

// 인증 헤더 생성
async function getAuthHeaders(): Promise<HeadersInit> {
  let token = getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// 401 에러 처리 및 토큰 갱신 후 재시도
async function fetchWithAuth<T>(
  url: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  let headers = await getAuthHeaders();

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // 401 에러 시 토큰 갱신 후 재시도
  if (response.status === 401) {
    console.log("[Game API] Access token expired, attempting refresh...");
    const newToken = await refreshAccessToken();

    if (newToken) {
      headers = await getAuthHeaders();
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API 요청 실패: ${response.status}`);
  }

  return response.json();
}

// 자유 게임 생성
export async function createFreeGame(
  request: CreateGameRequest
): Promise<{ gameId: number }> {
  const url = `${API_URL}/free-games`;
  console.log("[Game API] POST", url);
  console.log("[Game API] Request:", request);

  const response = await fetchWithAuth<CreateGameResponse>(url, {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || "게임 생성에 실패했습니다.");
  }

  console.log("[Game API] Created game:", response.data);
  return response.data;
}

// 게임 조회 (ID로)
export async function getGameById(gameId: string): Promise<Game | null> {
  const url = `${API_URL}/games/${gameId}`;
  console.log("[Game API] GET", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.warn("[Game API] Failed to get game:", response.status);
      return null;
    }

    const apiResponse = (await response.json()) as ApiResponse<Game>;

    if (!apiResponse.success || !apiResponse.data) {
      return null;
    }

    console.log("[Game API] Game data:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error("[Game API] Get game error:", error);
    return null;
  }
}

// 게임 조회 (공유 링크로)
export async function getGameByShareLink(
  shareLink: string
): Promise<Game | null> {
  const url = `${API_URL}/games/share/${shareLink}`;
  console.log("[Game API] GET", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(
        "[Game API] Failed to get game by share link:",
        response.status
      );
      return null;
    }

    const apiResponse = (await response.json()) as ApiResponse<Game>;

    if (!apiResponse.success || !apiResponse.data) {
      return null;
    }

    console.log("[Game API] Game data:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error("[Game API] Get game by share link error:", error);
    return null;
  }
}

// 경기 결과 저장
export async function updateMatchResult(
  gameId: string,
  matchId: string,
  result: MatchResult
): Promise<boolean> {
  const url = `${API_URL}/games/${gameId}/matches/${matchId}/result`;
  console.log("[Game API] PUT", url);

  try {
    const response = await fetchWithAuth<void>(url, {
      method: "PUT",
      body: JSON.stringify({ result }),
    });

    return response.success;
  } catch (error) {
    console.error("[Game API] Update match result error:", error);
    return false;
  }
}

// 게임 상태 변경
export async function updateGameStatus(
  gameId: string,
  status: GameStatus
): Promise<boolean> {
  const url = `${API_URL}/games/${gameId}/status`;
  console.log("[Game API] PUT", url);

  try {
    const response = await fetchWithAuth<void>(url, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    return response.success;
  } catch (error) {
    console.error("[Game API] Update game status error:", error);
    return false;
  }
}

// 모든 경기 상태 일괄 변경
export async function updateAllMatchStatus(
  gameId: string,
  status: GameStatus
): Promise<boolean> {
  const url = `${API_URL}/games/${gameId}/matches/status`;
  console.log("[Game API] PUT", url);

  try {
    const response = await fetchWithAuth<void>(url, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });

    return response.success;
  } catch (error) {
    console.error("[Game API] Update all match status error:", error);
    return false;
  }
}

// 참가자 추가
export async function addParticipant(
  gameId: string,
  participant: Omit<Participant, "id">
): Promise<Participant | null> {
  const url = `${API_URL}/games/${gameId}/participants`;
  console.log("[Game API] POST", url);

  try {
    const response = await fetchWithAuth<Participant>(url, {
      method: "POST",
      body: JSON.stringify(participant),
    });

    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("[Game API] Add participant error:", error);
    return null;
  }
}

// 라운드 추가
export async function addRound(
  gameId: string,
  courtMatches: Omit<CourtMatch, "id" | "gameType" | "result" | "status">[]
): Promise<CourtMatch[] | null> {
  const url = `${API_URL}/games/${gameId}/rounds`;
  console.log("[Game API] POST", url);

  try {
    const response = await fetchWithAuth<CourtMatch[]>(url, {
      method: "POST",
      body: JSON.stringify({ courtMatches }),
    });

    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("[Game API] Add round error:", error);
    return null;
  }
}

// 코트 추가
export async function addCourt(gameId: string): Promise<boolean> {
  const url = `${API_URL}/games/${gameId}/courts`;
  console.log("[Game API] POST", url);

  try {
    const response = await fetchWithAuth<void>(url, {
      method: "POST",
    });

    return response.success;
  } catch (error) {
    console.error("[Game API] Add court error:", error);
    return false;
  }
}

// 게임 수정
export async function updateGame(
  gameId: string,
  updates: Partial<Pick<Game, "title" | "courtCount" | "roundCount">>
): Promise<boolean> {
  const url = `${API_URL}/games/${gameId}`;
  console.log("[Game API] PATCH", url);

  try {
    const response = await fetchWithAuth<void>(url, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    return response.success;
  } catch (error) {
    console.error("[Game API] Update game error:", error);
    return false;
  }
}

// 게임 타입 판정 (클라이언트 사이드)
export function determineGameType(
  participants: Participant[],
  player1Id: string,
  player2Id: string,
  player3Id: string,
  player4Id: string
): { type: GameType | "INCOMPLETE"; label: string } {
  const getGender = (id: string) =>
    participants.find((p) => p.id === id)?.gender;

  const p1Gender = getGender(player1Id);
  const p2Gender = getGender(player2Id);
  const p3Gender = getGender(player3Id);
  const p4Gender = getGender(player4Id);

  if (!p1Gender || !p2Gender || !p3Gender || !p4Gender) {
    return { type: "INCOMPLETE", label: "-" };
  }

  const team1Males = [p1Gender, p2Gender].filter((g) => g === "MALE").length;
  const team1Females = [p1Gender, p2Gender].filter(
    (g) => g === "FEMALE"
  ).length;
  const team2Males = [p3Gender, p4Gender].filter((g) => g === "MALE").length;
  const team2Females = [p3Gender, p4Gender].filter(
    (g) => g === "FEMALE"
  ).length;

  if (team1Males === 2 && team2Males === 2) {
    return { type: "MEN_DOUBLES", label: "남자복식" };
  }
  if (team1Females === 2 && team2Females === 2) {
    return { type: "WOMEN_DOUBLES", label: "여자복식" };
  }
  if (
    team1Males === 1 &&
    team1Females === 1 &&
    team2Males === 1 &&
    team2Females === 1
  ) {
    return { type: "MIXED_DOUBLES", label: "혼합복식" };
  }
  if (
    (team1Males === 2 && team2Females === 2) ||
    (team1Females === 2 && team2Males === 2)
  ) {
    return { type: "CROSS_DOUBLES", label: "혼성복식" };
  }

  // 위 조건에 해당하지 않는 모든 경우 (예: 2M vs 1M1F)
  return { type: "OTHER_DOUBLES", label: "기타복식" };
}

// 게임 타입 라벨 반환
export function getGameTypeLabel(type: GameType | string): string {
  switch (type) {
    case "MEN_DOUBLES":
      return "남자복식";
    case "WOMEN_DOUBLES":
      return "여자복식";
    case "MIXED_DOUBLES":
      return "혼합복식";
    case "CROSS_DOUBLES":
      return "혼성복식";
    case "OTHER_DOUBLES":
      return "기타복식";
    default:
      return "-";
  }
}

// 게임 상태 라벨 반환
export function getGameStatusLabel(status: GameStatus): string {
  switch (status) {
    case "PENDING":
      return "미진행";
    case "IN_PROGRESS":
      return "진행중";
    case "COMPLETED":
      return "완료";
    default:
      return "-";
  }
}

// 급수 라벨 반환
export function getGradeLabel(grade: Grade): string {
  switch (grade) {
    case "ROOKIE":
      return "초심";
    default:
      return grade;
  }
}
