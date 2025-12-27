// Google OAuth 설정
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

// Kakao OAuth 설정
const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!;
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI!;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type AuthProvider = "GOOGLE" | "KAKAO";

// 사용자 정보 타입
export interface User {
  id: number;
  role: string;
  status: UserStatus;
  grade?: string | null;
  provinceName?: string | null;
  districtName?: string | null;
  // 기존 호환성을 위한 필드들
  email?: string;
  name?: string;
  profileImage?: string;
}

export type UserStatus = "PENDING" | "ACTIVE";

// API 응답 래퍼 타입
export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  timestamp: string;
}

export interface AccountStatusResponse {
  userId: number;
  status: UserStatus;
  hasProfile: boolean;
}

export interface OAuthLoginRequest {
  provider: AuthProvider;
  authorizationCode: string;
  redirectUri: string;
}

export interface UserProfileRequest {
  nickname: string;
  districtId: number; // 시/군/구 ID (Long 타입)
  grade?: string; // 사용자 등급 (선택)
  birth: string; // 생년월일 YYYYMMDD (필수)
  gender: string; // 성별 (MALE | FEMALE)
}

// Google OAuth URL 생성
export function getGoogleOAuthURL(): string {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  const options = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

// Kakao OAuth URL 생성
export function getKakaoOAuthURL(): string {
  const rootUrl = "https://kauth.kakao.com/oauth/authorize";

  const options = {
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

function getRedirectUriByProvider(provider: AuthProvider): string {
  return provider === "GOOGLE" ? GOOGLE_REDIRECT_URI : KAKAO_REDIRECT_URI;
}

export function getOAuthRedirectUri(provider: AuthProvider): string {
  return getRedirectUriByProvider(provider);
}

// 액세스 토큰 저장 (sessionStorage 사용)
const ACCESS_TOKEN_KEY = "access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

// (신규 플로우) OAuth 로그인: 인가코드 + provider + redirectUri → 백엔드 /auth/login
export async function loginWithOAuth(
  input: OAuthLoginRequest
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  const url = `${API_URL}/auth/login`;
  const requestBody = JSON.stringify(input);

  console.log("[API] POST", url);
  console.log("[API] Request body:", requestBody);
  console.log("[API] Request payload:", input);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: requestBody,
      credentials: "include", // 쿠키를 받기 위해 필수
    });

    console.log("[API] Response status:", response.status, response.statusText);
    console.log(
      "[API] Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[API] Error response:", errorData);
      console.error("[API] Error details:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return {
        success: false,
        error: errorData.message || "로그인에 실패했습니다.",
      };
    }

    // 성공 응답 body에서 AccessToken 추출
    const responseData = await response.json().catch(() => ({}));
    console.log("[API] Login success response:", responseData);

    const accessToken =
      responseData.accessToken || responseData.data?.accessToken;
    if (accessToken) {
      console.log("[API] AccessToken received in response body");
      setAccessToken(accessToken); // 토큰 저장
      return { success: true, accessToken };
    }

    // accessToken이 없는 경우도 성공으로 처리 (쿠키만 사용하는 경우)
    return { success: true };
  } catch (error) {
    console.error("[API] Auth error:", error);
    return {
      success: false,
      error: "서버와 연결할 수 없습니다.",
    };
  }
}

// (구버전 호환) provider별 엔드포인트로 인가코드 전송 (/api/auth/google|kakao)
export async function sendAuthCodeToBackend(
  provider: AuthProvider,
  code: string
): Promise<{ success: boolean; error?: string }> {
  return loginWithOAuth({
    provider,
    authorizationCode: code,
    redirectUri: getRedirectUriByProvider(provider),
  });
}

// 프로필 등록: POST /users/me/profile
export async function submitUserProfile(
  payload: UserProfileRequest
): Promise<{ success: boolean; error?: string }> {
  const url = `${API_URL}/users/me/profile`;
  console.log("[API] POST", url);
  console.log("[API] Request payload:", payload);
  console.log("[API] Request body (JSON):", JSON.stringify(payload));

  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[API] Error response:", errorData);
      return {
        success: false,
        error: errorData.message || "프로필 저장에 실패했습니다.",
      };
    }

    console.log("[API] Profile submission success");
    return { success: true };
  } catch (error) {
    console.error("[API] Submit profile error:", error);
    return { success: false, error: "서버와 연결할 수 없습니다." };
  }
}

// 현재 로그인한 사용자 정보 가져오기
export async function getCurrentUser(
  accessToken?: string
): Promise<User | null> {
  const url = `${API_URL}/users/me`;
  console.log("[API] GET", url);

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  // 액세스 토큰이 제공되지 않으면 저장된 토큰 사용
  const token = accessToken || getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include", // 쿠키 전송 (RefreshToken 쿠키)
    });

    console.log("[API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 401) {
        // 401은 로그인하지 않은 상태이므로 정상적인 응답입니다
        const errorData = await response.json().catch(() => ({}));
        console.debug("[API] Unauthorized - 로그인되지 않은 상태:", errorData);
      } else {
        console.warn("[API] Failed to get user:", response.status);
        const errorData = await response.json().catch(() => ({}));
        console.warn("[API] Error details:", errorData);
      }
      return null;
    }

    const apiResponse = (await response.json()) as ApiResponse<User>;
    console.log("[API] User API response:", apiResponse);

    if (!apiResponse.success || !apiResponse.data) {
      console.warn("[API] API response indicates failure:", apiResponse);
      return null;
    }

    const user: User = {
      id: apiResponse.data.id,
      role: apiResponse.data.role,
      status: apiResponse.data.status,
      grade: apiResponse.data.grade ?? null,
      provinceName: apiResponse.data.provinceName ?? null,
      districtName: apiResponse.data.districtName ?? null,
    };

    console.log("[API] User data:", user);
    return user;
  } catch (error) {
    console.error("[API] Get user error:", error);
    console.error("[API] API_URL:", API_URL);
    console.error("[API] Full URL:", url);
    return null;
  }
}

// 로그아웃
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // 쿠키 전송
    });

    // 로그아웃 성공 시 저장된 액세스 토큰 제거
    if (response.ok) {
      removeAccessToken();
    }

    return response.ok;
  } catch (error) {
    console.error("Logout error:", error);
    removeAccessToken(); // 에러 발생 시에도 토큰 제거
    return false;
  }
}

// 프로필 입력 전 Prefill 정보 가져오기: GET /users/me/profile/prefill
export interface ProfilePrefillResponse {
  suggestedNickname?: string;
}

export async function getProfilePrefill(): Promise<ProfilePrefillResponse | null> {
  const url = `${API_URL}/users/me/profile/prefill`;
  console.log("[API] GET", url);

  const token = getAccessToken();
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      console.warn("[API] Failed to get prefill:", response.status);
      return null;
    }

    const data = (await response.json()) as ProfilePrefillResponse;
    console.log("[API] Prefill data:", data);
    return data;
  } catch (error) {
    console.error("[API] Profile prefill error:", error);
    return null;
  }
}

// 지역 관련 API
export interface Province {
  id: number;
  name: string;
}

export interface District {
  id: number; // API 명세에 따라 number
  name: string;
}

// 시/도 목록 조회: GET /regions/provinces
export async function getProvinces(): Promise<Province[]> {
  const url = `${API_URL}/regions/provinces`;
  console.log("[API] GET", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      console.warn("[API] Failed to get provinces:", response.status);
      return [];
    }

    const apiResponse = (await response.json()) as ApiResponse<Province[]>;
    console.log("[API] Provinces API response:", apiResponse);

    if (!apiResponse.success || !apiResponse.data) {
      console.warn("[API] API response indicates failure:", apiResponse);
      return [];
    }

    console.log("[API] Provinces:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error("[API] Get provinces error:", error);
    return [];
  }
}

// 시/군/구 목록 조회: GET /regions/{provinceId}/districts
export async function getDistricts(
  provinceId: string | number
): Promise<District[]> {
  const url = `${API_URL}/regions/${provinceId}/districts`;
  console.log("[API] GET", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      console.warn("[API] Failed to get districts:", response.status);
      return [];
    }

    const apiResponse = (await response.json()) as ApiResponse<District[]>;
    console.log("[API] Districts API response:", apiResponse);

    if (!apiResponse.success || !apiResponse.data) {
      console.warn("[API] API response indicates failure:", apiResponse);
      return [];
    }

    console.log("[API] Districts:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error("[API] Get districts error:", error);
    return [];
  }
}
