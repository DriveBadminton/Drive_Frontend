"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MapPin, UserRound } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import Select from "@/components/Select";
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
const LOCAL_GRADE_OPTIONS = LOCAL_GRADES.map((grade) => ({
  value: grade,
  label: grade,
}));
const NATIONAL_GRADE_OPTIONS = NATIONAL_GRADES.map((grade) => ({
  value: grade,
  label: grade,
}));
const GENDER_OPTIONS = [
  { value: "MALE", label: "남성" },
  { value: "FEMALE", label: "여성" },
];
const FIELD_IDS = {
  nickname: "profile-setup-nickname",
  province: "profile-setup-province",
  district: "profile-setup-district",
  birthDate: "profile-setup-birth-date",
  gender: "profile-setup-gender",
  localGrade: "profile-setup-local-grade",
  nationalGrade: "profile-setup-national-grade",
  formHelp: "profile-setup-form-help",
  submitHelp: "profile-setup-submit-help",
} as const;

const FIELD_LABEL_CLASS =
  "text-[11px] font-mono font-bold tracking-[0.18em] text-zinc-300";
const FIELD_CONTROL_WITH_ICON_CLASS =
  "h-12 w-full rounded-none border-2 border-zinc-800 bg-zinc-950 pr-4 pl-10 text-sm font-semibold text-white transition-colors placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

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
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [provinceLoadError, setProvinceLoadError] = useState("");
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [districtLoadError, setDistrictLoadError] = useState("");
  const [completionRedirect, setCompletionRedirect] = useState("/profile");
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);

  const handleProvinceChange = (provinceId: string) => {
    setDistricts([]);
    setIsLoadingDistricts(false);
    setDistrictLoadError("");
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
  const isFormReady = !validationError;
  const districtPlaceholder = !form.provinceId
    ? "시/도를 먼저 선택하세요"
    : isLoadingDistricts
    ? "시/군/구 불러오는 중..."
    : "시/군/구 선택";
  const provincePlaceholder = isLoadingProvinces
    ? "시/도 불러오는 중..."
    : provinceLoadError
    ? "시/도 선택 불가"
    : "시/도 선택";
  const provinceEmptyLabel =
    provinceLoadError || "시/도 목록이 없습니다.";
  const districtEmptyLabel =
    districtLoadError || "시/군/구 목록이 없습니다.";
  const provinceOptions = useMemo(
    () =>
      provinces.map((province) => ({
        value: province.id,
        label: province.name,
      })),
    [provinces]
  );
  const districtOptions = useMemo(
    () =>
      districts.map((district) => ({
        value: district.id,
        label: district.name,
      })),
    [districts]
  );

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
        setIsLoadingProvinces(true);
        setProvinceLoadError("");

        try {
          const [defaults, nextProvinces, session] = await Promise.all([
            getProfileDefaults(),
            getProvinces(),
            getCurrentIdentitySession().catch(() => null),
          ]);

          setProvinces(nextProvinces);
          setProvinceLoadError(
            nextProvinces.length > 0 ? "" : "시/도 목록을 불러오지 못했습니다."
          );

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
        } catch {
          setProvinces([]);
          setProvinceLoadError("시/도 목록을 불러오지 못했습니다.");
        } finally {
          setIsLoadingProvinces(false);
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
      setDistrictLoadError("");
      try {
        const nextDistricts = await getDistricts(
          form.provinceId,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setDistricts(nextDistricts);
          setDistrictLoadError(
            nextDistricts.length > 0 ? "" : "시/군/구 목록이 없습니다."
          );
          setIsLoadingDistricts(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setDistricts([]);
          setDistrictLoadError("시/군/구 목록을 불러오지 못했습니다.");
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

        <div className="relative z-10 mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              aria-label="로그아웃하고 처음 화면으로 이동"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-none border-2 border-zinc-800 px-3 text-[11px] font-mono font-bold tracking-[0.18em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>

          <div className="rounded-none border-2 border-zinc-800 bg-zinc-900/95 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.25)] sm:p-6 md:p-8">
            <div className="mb-5 border-b border-zinc-800 pb-5">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono tracking-widest text-emerald-400">
                <div className="h-px w-8 bg-emerald-400" />
                프로필 설정
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">
                    프로필을 완성해 주세요
                  </h1>
                  <p
                    id={FIELD_IDS.formHelp}
                    className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-zinc-400"
                  >
                    닉네임, 지역, 생년월일, 성별만 입력하면 바로 시작할 수 있어요.
                  </p>
                </div>
                <div className="inline-flex h-8 w-fit items-center border border-emerald-500/40 bg-emerald-500/10 px-3 text-[10px] font-mono font-bold tracking-widest text-emerald-300">
                  필수 4개
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <section
                aria-labelledby="required-profile-fields"
                className="space-y-4"
              >
                <div>
                  <h2
                    id="required-profile-fields"
                    className="text-sm font-black text-white"
                  >
                    필수 정보
                  </h2>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    가입 완료와 기본 매칭에 필요한 최소 정보입니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={FIELD_IDS.nickname}
                    className={FIELD_LABEL_CLASS}
                  >
                    닉네임 <span aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <UserRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id={FIELD_IDS.nickname}
                      value={form.nickname}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          nickname: event.target.value,
                        }))
                      }
                      className={FIELD_CONTROL_WITH_ICON_CLASS}
                      placeholder="예) 홍길동"
                      required
                      aria-invalid={!form.nickname.trim()}
                      aria-describedby={FIELD_IDS.submitHelp}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor={FIELD_IDS.province}
                      className={FIELD_LABEL_CLASS}
                    >
                      시/도 <span aria-hidden="true">*</span>
                    </label>
                    <Select
                      id={FIELD_IDS.province}
                      value={form.provinceId}
                      options={provinceOptions}
                      placeholder={provincePlaceholder}
                      onChange={handleProvinceChange}
                      variant="brutalist"
                      surface="dark"
                      leadingIcon={<MapPin className="h-4 w-4" />}
                      loading={isLoadingProvinces}
                      loadingLabel="시/도 불러오는 중..."
                      emptyLabel={provinceEmptyLabel}
                      aria-invalid={!form.provinceId.trim()}
                      aria-describedby={FIELD_IDS.submitHelp}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={FIELD_IDS.district}
                      className={FIELD_LABEL_CLASS}
                    >
                      시/군/구 <span aria-hidden="true">*</span>
                    </label>
                    <Select
                      id={FIELD_IDS.district}
                      value={form.districtId}
                      options={districtOptions}
                      placeholder={districtPlaceholder}
                      onChange={(districtId) =>
                        setForm((prev) => ({
                          ...prev,
                          districtId,
                        }))
                      }
                      disabled={!form.provinceId || isLoadingDistricts}
                      variant="brutalist"
                      surface="dark"
                      loading={isLoadingDistricts}
                      loadingLabel="시/군/구 불러오는 중..."
                      emptyLabel={districtEmptyLabel}
                      aria-invalid={!form.districtId.trim()}
                      aria-describedby={FIELD_IDS.submitHelp}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor={FIELD_IDS.birthDate}
                      className={FIELD_LABEL_CLASS}
                    >
                      생년월일 <span aria-hidden="true">*</span>
                    </label>
                    <SessionDateTimePicker
                      id={FIELD_IDS.birthDate}
                      value={form.birthDate}
                      onChange={(nextValue) =>
                        setForm((prev) => ({ ...prev, birthDate: nextValue }))
                      }
                      mode="date"
                      dateBoundary="past"
                      error={Boolean(
                        form.birthDate && validationError.includes("생년월일")
                      )}
                      placeholder="생년월일을 선택하세요"
                      surface="dark"
                      aria-describedby={FIELD_IDS.submitHelp}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={FIELD_IDS.gender}
                      className={FIELD_LABEL_CLASS}
                    >
                      성별 <span aria-hidden="true">*</span>
                    </label>
                    <Select
                      id={FIELD_IDS.gender}
                      value={form.gender}
                      options={GENDER_OPTIONS}
                      placeholder="성별 선택"
                      onChange={(gender) =>
                        setForm((prev) => ({
                          ...prev,
                          gender: gender as Gender | "",
                        }))
                      }
                      variant="brutalist"
                      surface="dark"
                      aria-invalid={!form.gender}
                      aria-describedby={FIELD_IDS.submitHelp}
                    />
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="optional-profile-fields"
                className="border-t border-zinc-800 pt-5"
              >
                <div>
                  <h2
                    id="optional-profile-fields"
                    className="text-sm font-black text-white"
                  >
                    선택 정보
                  </h2>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    급수는 경기 배정 품질을 높이는 정보이며 나중에 수정할 수 있어요.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor={FIELD_IDS.localGrade}
                      className={FIELD_LABEL_CLASS}
                    >
                      지역 급수
                    </label>
                    <Select
                      id={FIELD_IDS.localGrade}
                      value={form.localGrade}
                      options={LOCAL_GRADE_OPTIONS}
                      placeholder="지역 급수 선택"
                      onChange={(localGrade) =>
                        setForm((prev) => ({
                          ...prev,
                          localGrade,
                        }))
                      }
                      variant="brutalist"
                      surface="dark"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={FIELD_IDS.nationalGrade}
                      className={FIELD_LABEL_CLASS}
                    >
                      전국 급수
                    </label>
                    <Select
                      id={FIELD_IDS.nationalGrade}
                      value={form.nationalGrade}
                      options={NATIONAL_GRADE_OPTIONS}
                      placeholder="전국 급수 선택"
                      onChange={(nationalGrade) =>
                        setForm((prev) => ({
                          ...prev,
                          nationalGrade,
                        }))
                      }
                      variant="brutalist"
                      surface="dark"
                    />
                  </div>
                </div>
              </section>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-5 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {errorMessage}
              </div>
            )}

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={isSubmitting || !isFormReady}
                className="inline-flex h-12 w-full items-center justify-center rounded-none border-2 border-emerald-500 bg-emerald-500 px-6 text-sm font-black tracking-[0.18em] text-zinc-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-800 disabled:text-zinc-500 sm:w-auto"
              >
                {isSubmitting ? "저장 중..." : "프로필 완료"}
              </button>
              <p
                id={FIELD_IDS.submitHelp}
                className="mt-3 text-xs font-medium leading-relaxed text-zinc-500"
              >
                {isFormReady
                  ? "완료 후 RallyOn을 바로 사용할 수 있어요."
                  : `필수 항목을 입력해 주세요. ${validationError}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
