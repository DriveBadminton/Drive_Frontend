"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import {
  submitUserProfile,
  getProfilePrefill,
  getProvinces,
  getDistricts,
  Province,
  District,
} from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import Select from "@/components/Select";

type FormState = {
  nickname: string;
  localGrade: string;
  nationalGrade: string;
  provinceId: string;
  districtId: string;
  birthDate: string;
  gender: string;
};

export default function AccountProfilePage() {
  const router = useRouter();
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
  const [errorMessage, setErrorMessage] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

  const formatBirthDate = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);

    if (digits.length <= 4) return y;
    if (digits.length <= 6) return `${y}-${m}`;
    return `${y}-${m}-${d}`;
  };

  const LOCAL_GRADES = ["초심", "D", "C", "B", "A"] as const;
  const NATIONAL_GRADES = [
    "초심",
    "D",
    "C",
    "B",
    "A",
    "준자강",
    "자강",
  ] as const;

  const validationError = useMemo(() => {
    if (!form.nickname.trim()) return "닉네임은 필수입니다.";
    if (!form.districtId.trim()) return "지역은 필수입니다.";
    if (!form.birthDate.trim()) return "생년월일은 필수입니다.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      return "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)";
    }
    // gender가 MALE 또는 FEMALE인지 확인
    if (form.gender && !["MALE", "FEMALE"].includes(form.gender)) {
      return "성별은 남성 또는 여성만 선택 가능합니다.";
    }
    if (!form.gender.trim()) return "성별은 필수입니다.";
    return "";
  }, [form]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [isLoading, isLoggedIn, router]);

  // Prefill 데이터 및 지역 목록 로드
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      // 1. Prefill 데이터 가져오기
      const loadPrefill = async () => {
        const prefill = await getProfilePrefill();
        if (prefill?.suggestedNickname) {
          setForm((prev) => ({
            ...prev,
            nickname: prefill.suggestedNickname!,
          }));
        }
      };

      // 2. 시/도 목록 가져오기
      const loadProvinces = async () => {
        const provincesList = await getProvinces();
        setProvinces(Array.isArray(provincesList) ? provincesList : []);
      };

      loadPrefill();
      loadProvinces();
    }
  }, [isLoading, isLoggedIn]);

  // 시/도 선택 시 시/군/구 목록 로드
  useEffect(() => {
    if (!form.provinceId) {
      setDistricts([]);
      setForm((prev) => ({ ...prev, districtId: "" }));
      return;
    }

    const loadDistricts = async () => {
      setIsLoadingDistricts(true);
      const districtsList = await getDistricts(form.provinceId);
      setDistricts(districtsList);
      setIsLoadingDistricts(false);
      // 시/도 변경 시 districtId 초기화
      setForm((prev) => ({ ...prev, districtId: "" }));
    };

    loadDistricts();
  }, [form.provinceId]);

  const onSubmit = async () => {
    setErrorMessage("");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    // birthDate를 YYYYMMDD 형식으로 변환 (YYYY-MM-DD -> YYYYMMDD)
    const birth = form.birthDate.replace(/-/g, "");

    // grade: localGrade나 nationalGrade 중 하나를 선택 (우선순위: nationalGrade > localGrade)
    const grade = form.nationalGrade || form.localGrade || undefined;

    const result = await submitUserProfile({
      nickname: form.nickname.trim(),
      districtId: Number(form.districtId),
      grade,
      birth,
      gender: form.gender.trim(),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || "프로필 저장에 실패했습니다.");
      return;
    }

    await refetch();
    router.push("/"); // 회원가입 완료 후 랜딩페이지로 이동
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">
            프로필을 완성해 주세요
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            필수 정보를 입력하면 회원가입이 완료됩니다.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">
                닉네임 <span className="text-primary">*</span>
              </label>
              <input
                value={form.nickname}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, nickname: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="예) 홍길동"
                autoComplete="nickname"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                지역 <span className="text-primary">*</span>
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Select
                    value={form.provinceId}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, provinceId: v }))
                    }
                    placeholder="시/도 선택"
                    options={[
                      { value: "", label: "시/도 선택" },
                      ...(Array.isArray(provinces)
                        ? provinces.map((p) => ({
                            value: String(p.id),
                            label: p.name,
                          }))
                        : []),
                    ]}
                  />
                </div>
                <div>
                  <Select
                    value={form.districtId}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, districtId: v }))
                    }
                    placeholder={
                      isLoadingDistricts
                        ? "로딩 중..."
                        : form.provinceId
                        ? "시/군/구 선택"
                        : "시/도를 먼저 선택하세요"
                    }
                    disabled={!form.provinceId || isLoadingDistricts}
                    options={[
                      {
                        value: "",
                        label: form.provinceId
                          ? "시/군/구 선택"
                          : "시/도를 먼저 선택하세요",
                      },
                      ...districts.map((d) => ({
                        value: String(d.id),
                        label: d.name,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                급수 <span className="text-foreground-muted">(선택)</span>
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground-muted">
                    지역급수
                  </label>
                  <div className="mt-2">
                    <Select
                      value={form.localGrade}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          localGrade: v,
                        }))
                      }
                      placeholder="급수 없음"
                      options={[
                        { value: "", label: "급수 없음" },
                        ...LOCAL_GRADES.map((g) => ({ value: g, label: g })),
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground-muted">
                    전국급수
                  </label>
                  <div className="mt-2">
                    <Select
                      value={form.nationalGrade}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          nationalGrade: v,
                        }))
                      }
                      placeholder="급수 없음"
                      options={[
                        { value: "", label: "급수 없음" },
                        ...NATIONAL_GRADES.map((g) => ({ value: g, label: g })),
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                생년월일 <span className="text-primary">*</span>
              </label>
              <input
                value={form.birthDate}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    birthDate: formatBirthDate(e.target.value),
                  }));
                }}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="YYYYMMDD"
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
              />
              <p className="mt-2 text-xs text-foreground-muted">
                공개 정책은 추후 설정할 수 있어요.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                성별 <span className="text-primary">*</span>
              </label>
              <div className="mt-2">
                <Select
                  value={form.gender}
                  onChange={(v) => setForm((prev) => ({ ...prev, gender: v }))}
                  placeholder="성별 선택"
                  options={[
                    { value: "", label: "성별 선택" },
                    { value: "MALE", label: "남성" },
                    { value: "FEMALE", label: "여성" },
                  ]}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              >
                {isSubmitting ? "저장 중..." : "회원가입 완료"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
