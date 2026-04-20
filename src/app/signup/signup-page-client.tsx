"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getAuthLoadFailureMessage, resolveAuthErrorMessage } from "@/components/auth/auth-error-messages";
import {
  AuthFailureState,
  AuthLoadingState,
  AuthPageScene,
} from "@/components/auth/AuthPageScene";
import { useAuthScreen } from "@/hooks/useAuthScreen";

interface SignupPageClientProps {
  returnTo: string;
  errorCode?: string;
}

export default function SignupPageClient({
  returnTo,
  errorCode,
}: SignupPageClientProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [validationError, setValidationError] = useState("");
  const { session, loading, loadFailed, effectiveReturnTo, restart } =
    useAuthScreen({
      screen: "signup",
      returnTo,
      errorCode,
    });

  const serverErrorMessage = resolveAuthErrorMessage("signup", errorCode);
  const errorMessage = validationError || serverErrorMessage;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (password.length < 8) {
      event.preventDefault();
      setValidationError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (password !== passwordConfirm) {
      event.preventDefault();
      setValidationError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setValidationError("");
  }

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
      eyebrow="Signup"
      title="RallyOn 회원가입"
      description="이메일 계정을 만들고 바로 프로필 설정까지 이어서 완료하세요."
      errorMessage={errorMessage}
      screen="signup"
      returnTo={effectiveReturnTo}
      socialLabel="Social Start"
      allowedProviders={session.allowedProviders}
      dummyOptions={session.dummyOptions}
      form={
        <form
          method="post"
          action="/identity/registrations/local"
          className="space-y-3"
          onSubmit={handleSubmit}
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
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setValidationError("");
              }}
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setValidationError("");
              }}
              placeholder="8자 이상 비밀번호"
              className="h-12 w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-zinc-500">
              Confirm Password
            </span>
            <input
              type="password"
              name="passwordConfirm"
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                setValidationError("");
              }}
              placeholder="비밀번호를 다시 입력하세요"
              className="h-12 w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </label>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-none bg-orange-500 text-sm font-bold uppercase tracking-[0.18em] text-zinc-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.12)] transition hover:bg-orange-400"
          >
            회원가입
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </form>
      }
      footer={
        <p className="text-sm font-medium text-zinc-600">
          이미 계정이 있으신가요?{" "}
          <a
            href={`/login?returnTo=${encodeURIComponent(effectiveReturnTo)}`}
            className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
          >
            로그인
          </a>
        </p>
      }
    />
  );
}
