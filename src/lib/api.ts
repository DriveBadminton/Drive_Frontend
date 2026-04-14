"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.rallyon.test";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "https://auth.rallyon.test";

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetail;

  constructor(message: string, status: number, problem?: ProblemDetail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export function getUserFacingErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function getDefaultErrorMessage(status: number) {
  switch (status) {
    case 400:
      return "요청 내용을 다시 확인해주세요.";
    case 401:
      return "로그인 상태가 만료되었어요. 다시 로그인 후 시도해주세요.";
    case 403:
      return "이 작업을 수행할 권한이 없어요.";
    case 404:
      return "요청한 정보를 찾을 수 없어요.";
    case 409:
      return "현재 상태와 충돌해 요청을 처리하지 못했어요.";
    case 422:
      return "입력한 내용을 다시 확인해주세요.";
    case 429:
      return "요청이 많아요. 잠시 후 다시 시도해주세요.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "일시적인 서버 문제로 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";
    default:
      return "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";
  }
}

type ParseMode = "json" | "text" | "void";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: BodyInit | object | null;
  parseAs?: ParseMode;
  retryOnUnauthorized?: boolean;
}

function isJsonLikeResponse(contentType: string | null) {
  return (
    contentType?.includes("application/json") ||
    contentType?.includes("application/problem+json") ||
    contentType?.includes("+json")
  );
}

function normalizeBody(body: ApiRequestOptions["body"]) {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

async function parseProblemDetail(response: Response) {
  if (!isJsonLikeResponse(response.headers.get("content-type"))) {
    return undefined;
  }

  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return undefined;
  }
}

async function toApiError(response: Response, fallback?: string) {
  const problem = await parseProblemDetail(response);
  const message =
    problem?.detail ||
    problem?.title ||
    fallback ||
    getDefaultErrorMessage(response.status);

  return new ApiError(message, response.status, problem);
}

async function refreshSession() {
  try {
    const response = await fetch(`${AUTH_URL}/identity/tokens/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    return response.status === 204;
  } catch {
    return false;
  }
}

async function executeRequest(path: string, options: ApiRequestOptions) {
  return executeRequestToBaseUrl(API_URL, path, options);
}

async function executeRequestToBaseUrl(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions
) {
  const body = normalizeBody(options.body);
  const headers = new Headers(options.headers);

  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    body,
    headers,
    credentials: "include",
  });
}

export async function authRequest<T = void>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { parseAs = "json" } = options;
  const response = await executeRequestToBaseUrl(AUTH_URL, path, options);

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (parseAs === "void" || response.status === 204) {
    return undefined as T;
  }

  if (parseAs === "text") {
    return (await response.text()) as T;
  }

  if (!isJsonLikeResponse(response.headers.get("content-type"))) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiRequest<T = void>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    auth = false,
    parseAs = "json",
    retryOnUnauthorized = auth,
  } = options;

  let response = await executeRequest(path, options);

  if (
    auth &&
    retryOnUnauthorized &&
    response.status === 401 &&
    path !== "/identity/tokens/refresh"
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await executeRequest(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (parseAs === "void" || response.status === 204) {
    return undefined as T;
  }

  if (parseAs === "text") {
    return (await response.text()) as T;
  }

  if (!isJsonLikeResponse(response.headers.get("content-type"))) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export { API_URL, AUTH_URL };
