"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendAuthCodeToBackend } from "@/lib/auth";

// 🔧 임시 테스트 모드 (백엔드 없이 테스트할 때 true로 변경)
const MOCK_MODE = true;

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

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
        console.log("🔧 Mock Mode: 인가 코드 수신:", code);
        localStorage.setItem("mock_logged_in", "true");
        setStatus("success");
        setTimeout(() => {
          router.push("/");
        }, 1500);
        return;
      }

      // 백엔드로 인가 코드 전송
      const result = await sendAuthCodeToBackend("google", code);

      if (result.success) {
        setStatus("success");
        // 잠시 후 메인 페이지로 이동
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        setStatus("error");
        setErrorMessage(result.error || "로그인에 실패했습니다.");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="mb-4">
              <div className="h-12 w-12 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              로그인 처리 중...
            </h1>
            <p className="mt-2 text-foreground-muted">잠시만 기다려주세요.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-4">
              <div className="h-12 w-12 mx-auto rounded-full bg-green-500 flex items-center justify-center">
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
              className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              메인으로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
