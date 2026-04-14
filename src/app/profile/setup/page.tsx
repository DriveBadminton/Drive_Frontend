"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, UserRound } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { SessionDateTimePicker } from "@/components/ui/session-date-time-picker";
import { normalizeReturnTo } from "@/app/auth-page-utils";
import {
  District,
  Gender,
  Province,
  buildCreateProfilePayload,
  createUserProfile,
  getCurrentIdentitySession,
  getDistricts,
  getProfileDefaults,
  getProvinces,
} from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

type FormState = {
  nickname: string;
  localGrade: string;
  nationalGrade: string;
  provinceId: string;
  districtId: string;
  birthDate: string;
  gender: Gender | "";
};

const LOCAL_GRADES = ["초심", "D", "C", "B", "A", "S", "SS"] as const;
const NATIONAL_GRADES = ["초심", "D", "C", "B", "A", "S", "SS"] as const;

export default function ProfileSetupPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, refetch, logout, user } = useAuth();
  const [form, setForm] = useState<FormState>({
    nickname: "",
    localGrade: "",
    nationalGrade: "",
    provinceId: "",
    districtId: "",
    birthDate: "",
    gender: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [completionRedirect, setCompletionRedirect] = useState("/profile");
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);

  const handleProvinceChange = (provinceId: string) => {
    setDistricts([]);
    setIsLoadingDistricts(false);
    setForm((prev) => ({
      ...prev,
      provinceId,
      districtId: "",
    }));
  };

  const validationError = useMemo(() => {
    if (!form.nickname.trim()) return "닉네임은 필수입니다.";
    if (!form.districtId.trim()) return "지역은 필수입니다.";
    if (!form.birthDate.trim()) return "생년월일은 필수입니다.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      return "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)";
    }
    if (!form.gender) return "성별은 필수입니다.";
    return "";
  }, [form]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login?returnTo=/profile/setup");
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoading && user?.status === "ACTIVE") {
      router.replace(isCompletingSetup ? completionRedirect : "/profile");
    }
  }, [completionRedirect, isCompletingSetup, isLoading, router, user]);

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const loadInitialData = async () => {
        const [defaults, nextProvinces, session] = await Promise.all([
          getProfileDefaults(),
          getProvinces(),
          getCurrentIdentitySession().catch(() => null),
        ]);

        setProvinces(nextProvinces);

        const nextReturnTo =
          session?.hasSession && session.returnTo
            ? normalizeReturnTo(session.returnTo)
            : "/profile";
        setCompletionRedirect(
          nextReturnTo === "/profile/setup" ? "/profile" : nextReturnTo
        );

        if (defaults?.hasSuggestedNickname && defaults.suggestedNickname) {
          setForm((prev) => ({
            ...prev,
            nickname: defaults.suggestedNickname || prev.nickname,
          }));
        }
      };

      void loadInitialData();
    }
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    if (!form.provinceId) {
      return;
    }

    const controller = new AbortController();

    const loadDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const nextDistricts = await getDistricts(
          form.provinceId,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setDistricts(nextDistricts);
          setIsLoadingDistricts(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setIsLoadingDistricts(false);
        }
      }
    };

    void loadDistricts();

    return () => controller.abort();
  }, [form.provinceId]);

  const onSubmit = async () => {
    setErrorMessage("");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    const result = await createUserProfile(
      buildCreateProfilePayload({
        nickname: form.nickname,
        districtId: form.districtId,
        regionalGrade: form.localGrade,
        nationalGrade: form.nationalGrade,
        birth: form.birthDate,
        gender: form.gender as Gender,
      })
    );

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || "프로필 저장에 실패했습니다.");
      return;
    }

    setIsCompletingSetup(true);
    await refetch();
    router.replace(completionRedirect);
  };

  if (isLoading) {
    return (
      <PageShell disableHeader disableFooter>
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <PageShell disableHeader disableFooter>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="mb-8 inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="rounded-none border-2 border-zinc-800 bg-zinc-900 p-6 md:p-10">
            <div className="mb-8 border-b border-zinc-800 pb-6">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                <div className="h-px w-8 bg-emerald-400" />
                Profile Setup
              </div>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                프로필을 완성해 주세요
              </h1>
              <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-zinc-400">
                필수 정보를 입력하면 회원가입이 완료됩니다.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                  Nickname *
                </label>
                <div className="relative">
                  <UserRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={form.nickname}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, nickname: event.target.value }))
                    }
                    className="w-full rounded-none border-2 border-zinc-800 bg-zinc-950 py-3 pr-4 pl-10 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                    placeholder="예) 홍길동"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                  Region *
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      value={form.provinceId}
                      onChange={(event) => handleProvinceChange(event.target.value)}
                      className="w-full rounded-none border-2 border-zinc-800 bg-zinc-950 py-3 pr-4 pl-10 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">시/도 선택</option>
                      {provinces.map((province) => (
                        <option key={province.id} value={province.id}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={form.districtId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, districtId: event.target.value }))
                    }
                    disabled={!form.provinceId || isLoadingDistricts}
                    className="w-full rounded-none border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {isLoadingDistricts ? "시/군/구 로딩 중..." : "시/군/구 선택"}
                    </option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                    Regional Grade
                  </label>
                  <select
                    value={form.localGrade}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, localGrade: event.target.value }))
                    }
                    className="w-full rounded-none border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">지역 급수 선택</option>
                    {LOCAL_GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                    National Grade
                  </label>
                  <select
                    value={form.nationalGrade}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        nationalGrade: event.target.value,
                      }))
                    }
                    className="w-full rounded-none border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">전국 급수 선택</option>
                    {NATIONAL_GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                    Birth Date *
                  </label>
                  <SessionDateTimePicker
                    value={form.birthDate}
                    onChange={(nextValue) =>
                      setForm((prev) => ({ ...prev, birthDate: nextValue }))
                    }
                    mode="date"
                    dateBoundary="past"
                    error={Boolean(form.birthDate) ? Boolean(validationError.includes("생년월일")) : false}
                    placeholder="생년월일을 선택하세요"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">
                    Gender *
                  </label>
                  <select
                    value={form.gender}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        gender: event.target.value as Gender | "",
                      }))
                    }
                    className="w-full rounded-none border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">성별 선택</option>
                    <option value="MALE">남성</option>
                    <option value="FEMALE">여성</option>
                  </select>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-6 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={isSubmitting}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-none border-2 border-emerald-500 bg-emerald-500 px-6 text-sm font-bold uppercase tracking-widest text-zinc-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Complete Profile"}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
