"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCurrentUser,
  getOAuthRedirectUri,
  loginWithOAuth,
} from "@/lib/auth";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMessage, setLoadingMessage] =
    useState("카카오 로그인 처리 중...");
  const [suppressUi, setSuppressUi] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      // 에러가 있는 경우 (사용자가 취소했거나 등)
      if (error) {
        setStatus("error");
        setErrorMessage("로그인이 취소되었습니다.");
        return;
      }

      // 인가 코드가 없는 경우
      if (!code) {
        setStatus("error");
        setErrorMessage("인가 코드를 받지 못했습니다.");
        return;
      }

      // 1) OAuth 로그인: /auth/login 호출
      const result = await loginWithOAuth({
        provider: "KAKAO",
        authorizationCode: code,
        redirectUri: getOAuthRedirectUri("KAKAO"),
      });

      if (result.success) {
        if (!result.accessToken) {
          setStatus("error");
          setErrorMessage("액세스 토큰을 받지 못했습니다.");
          return;
        }

        // 2) 로그인 성공 후 상태 확인: /users/me (액세스 토큰 포함)
        const userData = await getCurrentUser(result.accessToken);

        if (!userData) {
          setStatus("error");
          setErrorMessage("사용자 정보를 가져올 수 없습니다.");
          return;
        }

        if (userData.status === "PENDING") {
          // 첫 로그인 유저는 콜백 화면을 거의 표시하지 않고 즉시 프로필 입력으로 이동
          setSuppressUi(true);
          router.replace("/account/profile");
          return;
        }

        // ACTIVE 상태인 경우 메인 화면으로 이동
        setStatus("success");
        setTimeout(() => {
          router.push("/home");
        }, 800);
      } else {
        setStatus("error");
        setErrorMessage(result.error || "로그인에 실패했습니다.");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (suppressUi) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="mb-4">
              <div className="h-12 w-12 mx-auto rounded-full border-4 border-yellow-400 border-t-transparent animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {loadingMessage}
            </h1>
            <p className="mt-2 text-foreground-muted">잠시만 기다려주세요.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-4">
              <div className="h-12 w-12 mx-auto rounded-full bg-yellow-400 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-gray-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              로그인 성공!
            </h1>
            <p className="mt-2 text-foreground-muted">
              메인 페이지로 이동합니다...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4">
              <div className="h-12 w-12 mx-auto rounded-full bg-red-500 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              로그인 실패
            </h1>
            <p className="mt-2 text-foreground-muted">{errorMessage}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors font-medium"
            >
              메인으로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
