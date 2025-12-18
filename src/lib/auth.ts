// Google OAuth 설정
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

// Kakao OAuth 설정
const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!;
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI!;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type AuthProvider = "google" | "kakao";

// 사용자 정보 타입
export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
}

export type UserStatus = "PENDING" | "ACTIVE";

export interface AccountStatusResponse {
  userId: string;
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
  /**
   * @deprecated 기존 단일 급수 표현(LOCAL|NATIONAL + 값). 현재는 localGrade/nationalGrade를 권장
   */
  gradeType?: "LOCAL" | "NATIONAL";
  /**
   * @deprecated 기존 단일 급수 표현(LOCAL:A 형태로 보내기도 함). 현재는 localGrade/nationalGrade를 권장
   */
  grade?: string;
  /** 지역급수 (초심/D/C/B/A) */
  localGrade?: string;
  /** 전국급수 (초심/D/C/B/A/준자강/자강) */
  nationalGrade?: string;
  region: string;
  birthDate?: string; // YYYY-MM-DD (optional)
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
  return provider === "google" ? GOOGLE_REDIRECT_URI : KAKAO_REDIRECT_URI;
}

export function getOAuthRedirectUri(provider: AuthProvider): string {
  return getRedirectUriByProvider(provider);
}

// (신규 플로우) OAuth 로그인: 인가코드 + provider + redirectUri → 백엔드 /auth/login
export async function loginWithOAuth(
  input: OAuthLoginRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      credentials: "include", // 쿠키를 받기 위해 필수
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || "로그인에 실패했습니다.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Auth error:", error);
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

// 로그인 성공 후 사용자 상태 확인: GET /account/status
export async function getAccountStatus(): Promise<AccountStatusResponse | null> {
  try {
    const response = await fetch(`${API_URL}/account/status`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) return null;
    return (await response.json()) as AccountStatusResponse;
  } catch (error) {
    console.error("Account status error:", error);
    return null;
  }
}

// 프로필 등록: POST /users/profile
export async function submitUserProfile(
  payload: UserProfileRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || "프로필 저장에 실패했습니다.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Submit profile error:", error);
    return { success: false, error: "서버와 연결할 수 없습니다." };
  }
}

// 현재 로그인한 사용자 정보 가져오기
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      credentials: "include", // 쿠키 전송
    });

    if (!response.ok) return null;
    return (await response.json()) as User;
  } catch (error) {
    console.error("Get user error:", error);
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

    return response.ok;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}
