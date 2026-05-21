"use client";

import { ArrowRight } from "lucide-react";
import { getAuthLoadFailureMessage, resolveAuthErrorMessage } from "@/components/auth/auth-error-messages";
import {
  AuthFailureState,
  AuthLoadingState,
  AuthPageScene,
} from "@/components/auth/AuthPageScene";
import { useAuthScreen } from "@/hooks/useAuthScreen";

interface LoginPageClientProps {
  returnTo: string;
  errorCode?: string;
}

export default function LoginPageClient({
  returnTo,
  errorCode,
}: LoginPageClientProps) {
  const { session, loading, loadFailed, effectiveReturnTo, restart } =
    useAuthScreen({
      screen: "login",
      returnTo,
      errorCode,
    });
  const errorMessage = resolveAuthErrorMessage("login", errorCode);

  if (loading) {
    return <AuthLoadingState />;
  }

  if (loadFailed) {
    return (
      <AuthFailureState
        message={getAuthLoadFailureMessage()}
        onRestart={() => void restart()}
      />
    );
  }

  if (!session?.hasSession) {
    if (!errorMessage) {
      return <AuthLoadingState />;
    }

    return (
      <AuthFailureState message={errorMessage} onRestart={() => void restart()} />
    );
  }

  return (
    <AuthPageScene
      eyebrow="Login"
      title="RallyOn 로그인"
      description="계정을 연결하고 코트 운영과 플레이 흐름을 이어서 사용하세요."
      errorMessage={errorMessage}
      screen="login"
      returnTo={effectiveReturnTo}
      allowedProviders={session.allowedProviders}
      dummyOptions={session.dummyOptions}
      form={
        <form
          method="post"
          action="/identity/sessions/local"
          className="space-y-3"
        >
          <input type="hidden" name="returnTo" value={effectiveReturnTo} />
          <label className="block space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-zinc-500">
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              placeholder="you@rallyon.com"
              className="h-12 w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-zinc-500">
              Password
            </span>
            <input
              type="password"
              name="password"
              required
              placeholder="비밀번호"
              className="h-12 w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-none bg-orange-500 text-sm font-bold uppercase tracking-[0.18em] text-zinc-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.12)] transition hover:bg-orange-400"
          >
            로그인
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </form>
      }
      footer={
        <p className="text-sm font-medium text-zinc-600">
          아직 계정이 없으신가요?{" "}
          <a
            href={`/signup?returnTo=${encodeURIComponent(effectiveReturnTo)}`}
            className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
          >
            회원가입
          </a>
        </p>
      }
    />
  );
}
