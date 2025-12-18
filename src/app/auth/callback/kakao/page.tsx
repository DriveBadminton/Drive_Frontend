"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAccountStatus,
  getOAuthRedirectUri,
  loginWithOAuth,
} from "@/lib/auth";

// 🔧 임시 테스트 모드 (백엔드 없이 테스트할 때 true로 변경)
const MOCK_MODE = false;

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

      // 🔧 Mock 모드: 백엔드 호출 없이 바로 로그인 성공 처리
      if (MOCK_MODE) {
        console.log("🔧 Mock Mode: 카카오 인가 코드 수신:", code);
        localStorage.setItem("mock_logged_in", "true");
        // 신규 가입 플로우 테스트용 (기본: PENDING)
        if (!localStorage.getItem("mock_user_status")) {
          localStorage.setItem("mock_user_status", "PENDING");
          localStorage.setItem("mock_has_profile", "false");
        }
        const mockStatus = localStorage.getItem("mock_user_status");
        const mockHasProfile =
          localStorage.getItem("mock_has_profile") === "true";
        if (mockStatus === "PENDING" || !mockHasProfile) {
          // 첫 로그인 유저는 콜백 화면을 거의 표시하지 않고 즉시 프로필 입력으로 이동
          setSuppressUi(true);
          router.replace("/account/profile");
        } else {
          setStatus("success");
          router.push("/home");
        }
        return;
      }

      // 1) OAuth 로그인: /auth/login 호출
      const result = await loginWithOAuth({
        provider: "kakao",
        authorizationCode: code,
        redirectUri: getOAuthRedirectUri("kakao"),
      });

      if (result.success) {
        // 2) 로그인 성공 후 상태 확인: /account/status
        const accountStatus = await getAccountStatus();

        if (
          accountStatus &&
          (accountStatus.status === "PENDING" || !accountStatus.hasProfile)
        ) {
          // 첫 로그인 유저는 콜백 화면을 거의 표시하지 않고 즉시 프로필 입력으로 이동
          setSuppressUi(true);
          router.replace("/account/profile");
          return;
        }

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
