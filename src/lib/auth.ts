// Google OAuth 설정
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? "";

// Kakao OAuth 설정
const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? "";
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ?? "";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 개발 환경 확인
const isDev = process.env.NODE_ENV === "development";

// 개발 환경에서만 로깅하는 헬퍼 함수
function debugLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args);
  }
}

export type AuthProvider = "GOOGLE" | "KAKAO";

// 사용자 정보 타입
export interface User {
  id: number;
  role: string;
  status: UserStatus;
  nickname?: string; // API 응답에 포함되는 닉네임
  grade?: string | null;
  provinceName?: string | null;
  districtName?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  // 기존 호환성을 위한 필드들
  email?: string;
  name?: string; // 소셜 로그인에서 가져온 이름 (하위 호환성)
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
export function getGoogleOAuthURL(returnTo?: string): string {
  // 환경 변수 검증
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      "Google OAuth 설정이 누락되었습니다. NEXT_PUBLIC_GOOGLE_CLIENT_ID와 NEXT_PUBLIC_GOOGLE_REDIRECT_URI 환경 변수를 확인해주세요."
    );
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  // returnTo가 제공되면 sessionStorage에 저장
  if (returnTo && typeof window !== "undefined") {
    sessionStorage.setItem("oauth_return_to", returnTo);
  }

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
// forceLogin: true면 매번 카카오 로그인 화면 표시 (다른 계정으로 로그인)
export function getKakaoOAuthURL(
  returnTo?: string,
  forceLogin: boolean = false
): string {
  // 환경 변수 검증
  if (!KAKAO_CLIENT_ID || !KAKAO_REDIRECT_URI) {
    throw new Error(
      "Kakao OAuth 설정이 누락되었습니다. NEXT_PUBLIC_KAKAO_CLIENT_ID와 NEXT_PUBLIC_KAKAO_REDIRECT_URI 환경 변수를 확인해주세요."
    );
  }

  const rootUrl = "https://kauth.kakao.com/oauth/authorize";

  // returnTo가 제공되면 sessionStorage에 저장
  if (returnTo && typeof window !== "undefined") {
    sessionStorage.setItem("oauth_return_to", returnTo);
  }

  const options: Record<string, string> = {
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
  };

  // forceLogin이 true면 prompt=login 추가 (다른 계정으로 로그인)
  if (forceLogin) {
    options.prompt = "login";
  }

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

function getRedirectUriByProvider(provider: AuthProvider): string {
  const redirectUri =
    provider === "GOOGLE" ? GOOGLE_REDIRECT_URI : KAKAO_REDIRECT_URI;

  // 디버깅: 리다이렉트 URI 값 확인 (개발 환경에서만)
  debugLog(`[Auth] getRedirectUriByProvider(${provider}):`, redirectUri);
  debugLog(`[Auth] Redirect URI type:`, typeof redirectUri);
  debugLog(`[Auth] Redirect URI is undefined:`, redirectUri === undefined);
  debugLog(`[Auth] Redirect URI is null:`, redirectUri === null);

  if (!redirectUri) {
    console.error(`[Auth] ERROR: ${provider} redirect URI is ${redirectUri}`);
    console.error(
      `[Auth] Check environment variable: NEXT_PUBLIC_${provider}_REDIRECT_URI`
    );
    throw new Error(
      `${provider} redirect URI is not configured. Please set NEXT_PUBLIC_${provider}_REDIRECT_URI environment variable.`
    );
  }

  // URI 스킴 검증
  if (
    !redirectUri.startsWith("http://") &&
    !redirectUri.startsWith("https://")
  ) {
    console.error(
      `[Auth] ERROR: Redirect URI missing scheme (http:// or https://). Value: "${redirectUri}"`
    );
    throw new Error(
      `Invalid redirect URI format: ${redirectUri}. Must start with http:// or https://`
    );
  }

  return redirectUri;
}

export function getOAuthRedirectUri(provider: AuthProvider): string {
  const uri = getRedirectUriByProvider(provider);
  console.log(`[Auth] getOAuthRedirectUri(${provider}) returning:`, uri);
  return uri;
}

// 액세스 토큰 저장 (sessionStorage 사용)
const ACCESS_TOKEN_KEY = "access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  // 빈 문자열이나 공백만 있는 경우도 null로 처리
  return token && token.trim() ? token : null;
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
  // 디버깅: 리다이렉트 URI 검증
  console.log("[API] loginWithOAuth called with input:", input);
  console.log("[API] Input redirectUri:", input.redirectUri);
  console.log("[API] Input redirectUri type:", typeof input.redirectUri);
  console.log("[API] Input redirectUri validation:", {
    isUndefined: input.redirectUri === undefined,
    isNull: input.redirectUri === null,
    isEmpty: input.redirectUri === "",
    hasHttp: input.redirectUri?.startsWith("http://"),
    hasHttps: input.redirectUri?.startsWith("https://"),
  });

  const url = `${API_URL}/auth/login`;
  const requestBody = JSON.stringify(input);

  console.log("[API] POST", url);
  console.log("[API] API_URL:", API_URL);
  console.log("[API] Full URL:", url);
  console.log("[API] Request body (JSON string):", requestBody);
  console.log("[API] Request payload (object):", input);

  // API URL 유효성 검사
  if (!API_URL || API_URL === "undefined") {
    console.error("[API] API_URL이 설정되지 않았습니다!");
    return {
      success: false,
      error: "API 서버 URL이 설정되지 않았습니다.",
    };
  }

  // JSON 파싱 테스트로 실제 전송될 데이터 확인
  try {
    const parsed = JSON.parse(requestBody);
    console.log("[API] Parsed request body:", parsed);
    console.log("[API] Parsed redirectUri:", parsed.redirectUri);
    console.log("[API] Parsed redirectUri type:", typeof parsed.redirectUri);
  } catch (e) {
    console.error("[API] Failed to parse request body:", e);
  }

  try {
    // 타임아웃 설정 (30초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    console.log("[API] Fetch 요청 시작:", {
      url,
      method: "POST",
      hasBody: !!requestBody,
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: requestBody,
      credentials: "include", // 쿠키를 받기 위해 필수
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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

    // 타임아웃 에러인지 확인
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        console.error("[API] 요청 타임아웃 (30초 초과)", {
          url,
          apiUrl: API_URL,
          errorName: error.name,
          errorMessage: error.message,
        });
        return {
          success: false,
          error:
            "서버 응답 시간이 초과되었습니다. 백엔드 서버가 실행 중인지 확인해주세요.",
        };
      }

      if (error.message.includes("Failed to fetch")) {
        console.error("[API] 네트워크 연결 실패:", {
          url,
          apiUrl: API_URL,
          errorMessage: error.message,
        });
        return {
          success: false,
          error: `서버에 연결할 수 없습니다. (${API_URL})`,
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "서버와 연결할 수 없습니다.",
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
    let response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    // 401 에러 발생 시 Refresh Token으로 재발급 시도
    if (response.status === 401 && token) {
      console.log("[API] Access token expired, attempting refresh...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        // 새 토큰으로 재시도
        console.log("[API] Retrying request with new access token");
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          credentials: "include",
        });
        console.log(
          "[API] Retry response status:",
          response.status,
          response.statusText
        );
      } else {
        // Refresh 실패
        return {
          success: false,
          error: "세션이 만료되었습니다. 다시 로그인해주세요.",
        };
      }
    }

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

// /users/me 호출 횟수 추적 (디버깅용)
let usersMeCallCount = 0;

// 현재 로그인한 사용자 정보 가져오기
export async function getCurrentUser(
  accessToken?: string
): Promise<User | null> {
  // 액세스 토큰이 제공되지 않으면 저장된 토큰 사용
  let token = accessToken || getAccessToken();

  // 토큰이 없거나 빈 문자열이면 API 호출하지 않음 (비로그인 상태)
  if (!token || !token.trim()) {
    console.log("[API] No access token found, skipping /users/me request");
    return null;
  }

  // 호출 횟수 증가 및 로그
  usersMeCallCount++;
  const callNumber = usersMeCallCount;
  const caller = new Error().stack?.split("\n")[2]?.trim() || "unknown";

  const url = `${API_URL}/users/me`;
  console.log(`[API] GET ${url} - 호출 #${callNumber}`, {
    callNumber,
    caller,
    hasToken: !!token,
    timestamp: new Date().toISOString(),
  });

  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    let response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include", // 쿠키 전송 (RefreshToken 쿠키)
    });

    console.log("[API] Response status:", response.status, response.statusText);

    // 401 에러 발생 시 Refresh Token으로 재발급 시도
    if (response.status === 401) {
      console.log("[API] Access token expired, attempting refresh...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        // 새 토큰으로 재시도
        console.log("[API] Retrying request with new access token");
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          method: "GET",
          headers,
          credentials: "include",
        });
        console.log(
          "[API] Retry response status:",
          response.status,
          response.statusText
        );
      } else {
        // Refresh 실패 - 로그인되지 않은 상태
        console.debug("[API] Refresh failed - user not logged in");
        return null;
      }
    }

    if (!response.ok) {
      console.warn("[API] Failed to get user:", response.status);
      const errorData = await response.json().catch(() => ({}));
      console.warn("[API] Error details:", errorData);
      return null;
    }

    const apiResponse = (await response.json()) as ApiResponse<
      User & { nickname?: string }
    >;
    console.log("[API] User API response:", apiResponse);

    if (!apiResponse.success || !apiResponse.data) {
      console.warn("[API] API response indicates failure:", apiResponse);
      return null;
    }

    const responseData = apiResponse.data;
    const user: User = {
      id: responseData.id,
      role: responseData.role,
      status: responseData.status,
      nickname: responseData.nickname ?? undefined, // API 응답의 nickname 필드
      grade: responseData.grade ?? null,
      provinceName: responseData.provinceName ?? null,
      districtName: responseData.districtName ?? null,
      gender: responseData.gender ?? null,
      // 소셜 로그인에서 가져온 이름과 프로필 사진 (하위 호환성)
      name: responseData.name ?? undefined,
      profileImage: responseData.profileImage ?? undefined,
    };

    console.log("[API] User data:", user);
    return user;
  } catch (error) {
    console.error("[API] Get user error:", error);
    console.error("[API] API_URL:", API_URL);
    console.error("[API] Full URL:", url);

    // 네트워크 타임아웃이나 연결 실패 시 처리
    if (error instanceof Error) {
      if (
        error.message.includes("Failed to fetch") ||
        error.name === "TypeError"
      ) {
        console.warn(
          "[API] Network error (타임아웃 또는 연결 실패) - 토큰이 유효하지 않을 수 있으므로 제거"
        );
        // 타임아웃이 발생하면 토큰이 유효하지 않거나 서버에 연결할 수 없는 상태
        // 비로그인 상태로 처리하기 위해 토큰 제거
        removeAccessToken();
      }
    }

    return null;
  }
}

// Refresh Token으로 Access Token 재발급
interface RefreshTokenResponse {
  userId: number;
  accessToken: string;
}

export async function refreshAccessToken(): Promise<string | null> {
  const url = `${API_URL}/auth/refresh`;
  console.log("[API] POST", url, "- Refresh Token으로 Access Token 재발급");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      credentials: "include", // Refresh Token Cookie 전송
    });

    console.log(
      "[API] Refresh response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[API] Refresh token failed:", errorData);

      if (response.status === 400 || response.status === 500) {
        // Refresh Token이 없거나 만료된 경우
        console.warn(
          "[API] Refresh token invalid or expired, removing access token"
        );
        removeAccessToken();
      }
      return null;
    }

    const apiResponse =
      (await response.json()) as ApiResponse<RefreshTokenResponse>;
    console.log("[API] Refresh success response:", apiResponse);

    if (!apiResponse.success || !apiResponse.data?.accessToken) {
      console.warn("[API] Refresh response indicates failure:", apiResponse);
      return null;
    }

    const newAccessToken = apiResponse.data.accessToken;
    setAccessToken(newAccessToken); // 새 Access Token 저장
    console.log("[API] New access token saved");

    // Refresh Token Cookie는 서버에서 Set-Cookie로 자동 업데이트됨

    return newAccessToken;
  } catch (error) {
    console.error("[API] Refresh token error:", error);
    removeAccessToken();
    return null;
  }
}

// 회원 탈퇴
// TODO: 백엔드 API 구현 대기 중
// 스펙: DELETE /users/me 또는 DELETE /auth/withdraw
// 서버에서 계정 데이터를 삭제하거나 비활성화 처리
export async function deleteAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  // TODO: 백엔드 API가 구현되면 아래 주석을 해제하고 구현하세요
  /*
  const url = `${API_URL}/users/me`; // 또는 /auth/withdraw
  console.log("[API] DELETE", url, "- 회원 탈퇴 요청");

  const token = getAccessToken();
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    let response = await fetch(url, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    // 401 에러 발생 시 Refresh Token으로 재발급 시도
    if (response.status === 401 && token) {
      console.log("[API] Access token expired, attempting refresh...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          method: "DELETE",
          headers,
          credentials: "include",
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || "회원 탈퇴에 실패했습니다.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[API] Delete account error:", error);
    return {
      success: false,
      error: "서버와 연결할 수 없습니다.",
    };
  }
  */

  // 임시: API가 구현되지 않았음을 알림
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[API] 회원 탈퇴 API가 아직 구현되지 않았습니다. 백엔드 API 구현 후 deleteAccount 함수를 완성해주세요."
    );
  }
  return {
    success: false,
    error: "회원 탈퇴 기능이 아직 준비되지 않았습니다.",
  };
}

// 로그아웃
// 스펙: Refresh Token이 없어도 항상 성공 응답(idempotent)
// 서버는 항상 200 응답을 반환하며, Set-Cookie로 refresh_token을 만료시킴
export async function logout(): Promise<boolean> {
  const url = `${API_URL}/auth/logout`;
  console.log("[API] POST", url, "- 로그아웃 요청");

  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include", // 쿠키 전송 (Refresh Token Cookie)
    });

    console.log(
      "[API] Logout response status:",
      response.status,
      response.statusText
    );

    // 스펙에 따르면 항상 200 응답을 반환하므로,
    // 네트워크 에러가 아닌 이상 항상 성공으로 처리
    // Access Token은 Stateless이므로 프론트엔드에서만 제거
    removeAccessToken();

    // Refresh Token Cookie는 서버에서 Set-Cookie로 만료 처리됨
    // (Max-Age=0으로 즉시 만료)

    return true; // idempotent: 항상 성공
  } catch (error) {
    // 네트워크 에러 등으로 요청 자체가 실패한 경우에도
    // Access Token은 제거하고 성공으로 처리 (idempotent)
    console.error("[API] Logout error:", error);
    removeAccessToken();
    return true; // idempotent: 항상 성공
  }
}

// 프로필 입력 전 Prefill 정보 가져오기: GET /users/me/profile/prefill
export interface ProfilePrefillData {
  suggestedNickname: string | null;
  hasOauthNickname: boolean;
}

export interface ProfilePrefillResponse {
  suggestedNickname?: string | null;
  hasOauthNickname?: boolean;
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
    let response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    // 401 에러 발생 시 Refresh Token으로 재발급 시도
    if (response.status === 401 && token) {
      console.log("[API] Access token expired, attempting refresh...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        // 새 토큰으로 재시도
        console.log("[API] Retrying request with new access token");
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          method: "GET",
          headers,
          credentials: "include",
        });
        console.log(
          "[API] Retry response status:",
          response.status,
          response.statusText
        );
      } else {
        // Refresh 실패
        console.warn("[API] Refresh failed, returning null");
        return null;
      }
    }

    if (!response.ok) {
      console.warn("[API] Failed to get prefill:", response.status);
      const errorData = await response.json().catch(() => ({}));
      console.warn("[API] Error details:", errorData);
      return null;
    }

    // API 명세에 따르면 ApiResponse 래퍼로 감싸져 있음
    const apiResponse =
      (await response.json()) as ApiResponse<ProfilePrefillData>;
    console.log("[API] Prefill API response:", apiResponse);

    if (!apiResponse.success || !apiResponse.data) {
      console.warn("[API] API response indicates failure:", apiResponse);
      return null;
    }

    // 명세에 맞게 데이터 변환
    const data: ProfilePrefillResponse = {
      suggestedNickname: apiResponse.data.suggestedNickname,
      hasOauthNickname: apiResponse.data.hasOauthNickname,
    };

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
  provinceId: string | number,
  signal?: AbortSignal
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
      signal,
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
    // AbortError는 정상적인 취소이므로 재throw하여 호출자가 처리할 수 있도록 함
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    console.error("[API] Get districts error:", error);
    return [];
  }
}
