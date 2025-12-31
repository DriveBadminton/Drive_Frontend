"use client";

import { type FormEvent, useState } from "react";
// import { useRouter } from "next/navigation";

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // TODO: Replace with real auth integration
    setTimeout(() => {
      setIsSubmitting(false);
      alert("로그인이 구현되면 이곳에서 처리됩니다.");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl justify-center px-4 pt-20 pb-24 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-background-secondary p-6 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center justify-center gap-3">
              <img
                src="/drive-favicon.svg"
                alt="Drive Icon"
                className="h-10 w-10"
              />
              <img
                src="/drive-wordmark.svg"
                alt="Drive Wordmark"
                className="hidden h-7 w-auto sm:block brightness-0 invert"
              />
            </div>

            <h1 className="text-center text-2xl font-semibold text-foreground">
              로그인
            </h1>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-foreground-muted"
                  placeholder="drive@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-foreground-muted"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-foreground-muted">
                  <input
                    type="checkbox"
                    name="remember"
                    className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  로그인 상태 유지
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  비밀번호 찾기
                </a>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSubmitting}
              >
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>

              <div className="space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-yellow-500/50 bg-[#FEE500] px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                >
                  <img src="/kakao-icon.svg" alt="Kakao" className="h-5 w-5" />
                  Kakao 계정으로 계속하기
                </button>
              </div>

              <p className="text-center text-sm text-foreground-muted">
                아직 계정이 없다면{" "}
                <a
                  href="#"
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  회원가입
                </a>
                을 진행해주세요.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
