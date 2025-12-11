// Google OAuth 설정
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

// Kakao OAuth 설정
const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!;
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI!;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 사용자 정보 타입
export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
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

// 백엔드로 인가 코드 전송
export async function sendAuthCodeToBackend(
  provider: "google" | "kakao",
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/${provider}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
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

// 현재 로그인한 사용자 정보 가져오기
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include", // 쿠키 전송
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

// 로그아웃
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include", // 쿠키 전송
    });

    return response.ok;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}
