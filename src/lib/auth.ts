"use client";

import {
  authRequest,
  apiRequest,
  getUserFacingErrorMessage,
  isApiError,
} from "./api";
import { BackendGrade, toBackendGrade } from "./grade";

const isDev = process.env.NODE_ENV === "development";

export type AuthProvider = "KAKAO" | "GOOGLE" | "APPLE" | "DUMMY";
export type AuthScreen = "login" | "signup";
export type UserStatus = "PENDING" | "ACTIVE";
export type Gender = "MALE" | "FEMALE";

export interface DummyLoginOption {
  label: string;
  startUrl: string;
}

export interface IdentitySessionState {
  hasSession: boolean;
  returnTo: string;
  screen?: AuthScreen | null;
  allowedProviders: AuthProvider[];
  dummyOptions: DummyLoginOption[];
}

interface CreateIdentitySessionResponse {
  nextUrl: string;
}

export interface SessionUser {
  status: UserStatus;
  nickname?: string | null;
  profileImageUrl?: string | null;
  provider?: AuthProvider | null;
}

export interface UserProfile {
  status: UserStatus;
  nickname?: string | null;
  tag?: string | null;
  profileImageUrl?: string | null;
  gender?: Gender | null;
  birth?: string | null;
  birthVisible?: boolean;
  regionalGrade?: BackendGrade | null;
  nationalGrade?: BackendGrade | null;
  districtName?: string | null;
  provinceName?: string | null;
  tagChangedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AccountStatusResponse {
  status: UserStatus;
  hasProfile: boolean;
}

export interface UserProfileCreateRequest {
  nickname: string;
  districtId: string;
  regionalGrade?: BackendGrade;
  nationalGrade?: BackendGrade;
  birth: string;
  gender: Gender;
}

export interface UserProfileUpdateRequest {
  nickname?: string;
  tag?: string;
  districtId?: string;
  regionalGrade?: BackendGrade;
  nationalGrade?: BackendGrade;
  birth?: string;
  birthVisible?: boolean;
  profileImageUrl?: string;
  gender?: Gender;
}

export interface ProfileDefaultsResponse {
  suggestedNickname?: string | null;
  hasSuggestedNickname?: boolean;
}

export interface Province {
  id: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
}

interface UserProfileCreateResponse {
  accountId: string;
}

function debugLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

function toFriendlyError(error: unknown, fallback: string) {
  return getUserFacingErrorMessage(error, fallback);
}

export async function createIdentitySession(input: {
  provider?: AuthProvider;
  screen?: AuthScreen;
  returnTo?: string;
  dummyCode?: string;
}): Promise<string> {
  const response = await authRequest<CreateIdentitySessionResponse>(
    "/identity/sessions",
    {
      method: "POST",
      body: input,
    }
  );

  debugLog("[Auth] Created identity session:", response.nextUrl);
  return response.nextUrl;
}

export async function getCurrentIdentitySession(): Promise<IdentitySessionState> {
  return authRequest<IdentitySessionState>("/identity/sessions/current", {
    method: "GET",
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return await apiRequest<SessionUser>("/users/me", {
      method: "GET",
      auth: true,
    });
  } catch (error) {
    if (isApiError(error) && [401, 403].includes(error.status)) {
      return null;
    }

    debugLog("[Auth] getCurrentUser failed:", error);
    return null;
  }
}

export async function getMyProfile(): Promise<UserProfile | null> {
  try {
    return await apiRequest<UserProfile>("/users/me/profile", {
      method: "GET",
      auth: true,
    });
  } catch (error) {
    if (isApiError(error) && [401, 403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

export async function createUserProfile(
  payload: UserProfileCreateRequest
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const response = await apiRequest<UserProfileCreateResponse>(
      "/users/me/profile",
      {
        method: "POST",
        auth: true,
        body: payload,
      }
    );

    return { success: true, accountId: response.accountId };
  } catch (error) {
    return {
      success: false,
      error: toFriendlyError(error, "프로필 저장에 실패했습니다."),
    };
  }
}

export async function updateUserProfile(
  payload: UserProfileUpdateRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest("/users/me/profile", {
      method: "PATCH",
      auth: true,
      body: payload,
      parseAs: "void",
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toFriendlyError(error, "프로필 수정에 실패했습니다."),
    };
  }
}

export async function getProfileDefaults(): Promise<ProfileDefaultsResponse | null> {
  try {
    return await apiRequest<ProfileDefaultsResponse>("/users/me/profile/defaults", {
      method: "GET",
      auth: true,
    });
  } catch (error) {
    if (isApiError(error) && [401, 404].includes(error.status)) {
      return null;
    }

    return null;
  }
}

export async function getProvinces(): Promise<Province[]> {
  try {
    return await apiRequest<Province[]>("/regions/provinces", {
      method: "GET",
    });
  } catch (error) {
    debugLog("[Auth] getProvinces failed:", error);
    return [];
  }
}

export async function getDistricts(
  provinceId: string,
  signal?: AbortSignal
): Promise<District[]> {
  try {
    return await apiRequest<District[]>(`/regions/${provinceId}/districts`, {
      method: "GET",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    debugLog("[Auth] getDistricts failed:", error);
    return [];
  }
}

export async function logout(): Promise<boolean> {
  try {
    await authRequest("/identity/sessions/current", {
      method: "DELETE",
      parseAs: "void",
    });
    return true;
  } catch (error) {
    debugLog("[Auth] logout failed:", error);
    return true;
  }
}

export async function deleteAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  return {
    success: false,
    error: "회원 탈퇴 기능이 아직 준비되지 않았습니다.",
  };
}

export function formatBirthDateForInput(birth?: string | null) {
  if (!birth) {
    return "";
  }

  const value = birth.includes("T") ? birth.slice(0, 10) : birth;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  return value;
}

export function toCompactBirthDate(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function buildCreateProfilePayload(input: {
  nickname: string;
  districtId: string;
  regionalGrade?: string;
  nationalGrade?: string;
  birth: string;
  gender: Gender;
}): UserProfileCreateRequest {
  return {
    nickname: input.nickname.trim(),
    districtId: input.districtId,
    regionalGrade: toBackendGrade(input.regionalGrade),
    nationalGrade: toBackendGrade(input.nationalGrade),
    birth: toCompactBirthDate(input.birth),
    gender: input.gender,
  };
}

export function buildUpdateProfilePayload(input: {
  nickname?: string;
  tag?: string;
  districtId?: string;
  regionalGrade?: string;
  nationalGrade?: string;
  birth?: string;
  gender?: Gender;
  birthVisible?: boolean;
  profileImageUrl?: string;
}): UserProfileUpdateRequest {
  return {
    ...(input.nickname != null ? { nickname: input.nickname.trim() } : {}),
    ...(input.tag != null ? { tag: input.tag.trim() } : {}),
    ...(input.districtId ? { districtId: input.districtId } : {}),
    ...(input.regionalGrade
      ? { regionalGrade: toBackendGrade(input.regionalGrade) }
      : {}),
    ...(input.nationalGrade
      ? { nationalGrade: toBackendGrade(input.nationalGrade) }
      : {}),
    ...(input.birth ? { birth: toCompactBirthDate(input.birth) } : {}),
    ...(input.gender ? { gender: input.gender } : {}),
    ...(typeof input.birthVisible === "boolean"
      ? { birthVisible: input.birthVisible }
      : {}),
    ...(input.profileImageUrl
      ? { profileImageUrl: input.profileImageUrl }
      : {}),
  };
}
