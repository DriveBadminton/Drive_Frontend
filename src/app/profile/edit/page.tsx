"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, MapPin, PencilLine } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { getUserFacingErrorMessage } from "@/lib/api";
import {
  District,
  Gender,
  Province,
  buildUpdateProfilePayload,
  deleteAccount,
  formatBirthDateForInput,
  getDistricts,
  getMyProfile,
  getProvinces,
  updateUserProfile,
} from "@/lib/auth";
import { toProfileGradeSelection } from "@/lib/grade";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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

function ProfileEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isLoading, refetch } = useAuth();
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
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

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
      router.push("/login?returnTo=/profile/edit");
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const loadProfile = async () => {
        setIsBootstrapping(true);
        setErrorMessage("");

        try {
          const [profile, nextProvinces] = await Promise.all([
            getMyProfile(),
            getProvinces(),
          ]);

          if (!profile) {
            setErrorMessage("프로필 정보를 불러오지 못했습니다.");
            setIsBootstrapping(false);
            return;
          }

          setProvinces(nextProvinces);

          const baseForm: FormState = {
            nickname: profile.nickname || "",
            localGrade: toProfileGradeSelection(profile.regionalGrade),
            nationalGrade: toProfileGradeSelection(profile.nationalGrade),
            provinceId: "",
            districtId: "",
            birthDate: formatBirthDateForInput(profile.birth),
            gender: profile.gender || "",
          };

          const matchedProvince = nextProvinces.find(
            (province) => province.name === profile.provinceName
          );

          if (!matchedProvince) {
            setForm(baseForm);
            setIsBootstrapping(false);
            return;
          }

          const nextDistricts = await getDistricts(matchedProvince.id);
          const matchedDistrict = nextDistricts.find(
            (district) => district.name === profile.districtName
          );

          setDistricts(nextDistricts);
          setForm({
            ...baseForm,
            provinceId: String(matchedProvince.id),
            districtId: matchedDistrict ? String(matchedDistrict.id) : "",
          });
        } catch (error) {
          setErrorMessage(
            getUserFacingErrorMessage(error, "프로필 정보를 불러오지 못했습니다.")
          );
        } finally {
          setIsBootstrapping(false);
        }
      };

      void loadProfile();
    }
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    if (!form.provinceId || isBootstrapping) {
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
  }, [form.provinceId, isBootstrapping]);

  const onSubmit = async () => {
    setErrorMessage("");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const returnTo = searchParams.get("returnTo") || "/profile";
    setIsSubmitting(true);

    const profileResult = await updateUserProfile(
      buildUpdateProfilePayload({
        nickname: form.nickname,
        districtId: form.districtId,
        regionalGrade: form.localGrade,
        nationalGrade: form.nationalGrade,
        birth: form.birthDate,
        gender: form.gender as Gender,
      })
    );

    setIsSubmitting(false);

    if (!profileResult.success) {
      setErrorMessage(profileResult.error || "프로필 수정에 실패했습니다.");
      return;
    }

    await refetch();
    router.push(returnTo);
  };

  const handleWithdraw = async () => {
    const result = await deleteAccount();
    setErrorMessage(result.error || "회원 탈퇴 기능이 아직 준비되지 않았습니다.");
  };

  if (isLoading || isBootstrapping) {
    return (
      <PageShell disableFooter>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <PageShell disableFooter mainClassName="bg-zinc-50">
      <div className="container mx-auto max-w-3xl px-4 py-8 md:px-8 lg:py-12">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-emerald-600">
            <div className="h-px w-8 bg-emerald-600" />
            Profile Edit
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-950 md:text-4xl">
            정보 수정
          </h1>
        </div>

        <div className="rounded-none border-2 border-zinc-200 bg-white p-6 md:p-10">
          <div className="mb-8 border-b-2 border-zinc-100 pb-6">
            <p className="max-w-xl text-sm font-medium leading-relaxed text-zinc-500">
              닉네임과 프로필 정보를 하나의 프로필 업데이트 흐름으로 저장합니다.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                Nickname *
              </label>
              <div className="relative">
                <PencilLine className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={form.nickname}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nickname: event.target.value }))
                  }
                  className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 py-3 pr-4 pl-10 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none"
                  placeholder="예) 홍길동"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                Region *
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <select
                    value={form.provinceId}
                    onChange={(event) => handleProvinceChange(event.target.value)}
                    className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 py-3 pr-4 pl-10 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none"
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
                  className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  Regional Grade
                </label>
                <select
                  value={form.localGrade}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, localGrade: event.target.value }))
                  }
                  className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none"
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
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
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
                  className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none"
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
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  Birth Date *
                </label>
                <input
                  value={form.birthDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                  className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none"
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
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
                  className="w-full rounded-none border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 focus:border-zinc-900 focus:bg-white focus:outline-none"
                >
                  <option value="">성별 선택</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                </select>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={() => void onSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "저장 중..." : "변경사항 저장"}
            </Button>
            <Button
              variant="outline"
              className="rounded-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => void handleWithdraw()}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              회원 탈퇴 준비 중
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function ProfileEditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <ProfileEditContent />
    </Suspense>
  );
}
