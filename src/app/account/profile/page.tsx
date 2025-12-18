"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { submitUserProfile } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import Select from "@/components/Select";

type FormState = {
  nickname: string;
  localGrade: string;
  nationalGrade: string;
  region: string;
  birthDate: string;
};

export default function AccountProfilePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, refetch } = useAuth();

  const [form, setForm] = useState<FormState>({
    nickname: "",
    localGrade: "",
    nationalGrade: "",
    region: "",
    birthDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (!form.region.trim()) return "지역은 필수입니다.";
    if (form.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      return "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)";
    }
    return "";
  }, [form]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [isLoading, isLoggedIn, router]);

  const onSubmit = async () => {
    setErrorMessage("");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    // ✅ Mock 모드: 백엔드 없이도 회원가입 완료 흐름을 테스트할 수 있도록 처리
    // (현재 프로젝트는 mock_logged_in을 localStorage에 저장해두는 방식으로 임시 로그인 중)
    const isMock =
      typeof window !== "undefined" &&
      localStorage.getItem("mock_logged_in") === "true";

    if (isMock) {
      try {
        const payload = {
          nickname: form.nickname.trim(),
          region: form.region.trim(),
          localGrade: form.localGrade || undefined,
          nationalGrade: form.nationalGrade || undefined,
          birthDate: form.birthDate.trim() || undefined,
        };
        localStorage.setItem("mock_profile", JSON.stringify(payload));
        localStorage.setItem("mock_has_profile", "true");
        localStorage.setItem("mock_user_status", "ACTIVE");
      } catch {}

      await refetch();
      router.push("/home");
      return;
    }

    setIsSubmitting(true);
    const result = await submitUserProfile({
      nickname: form.nickname.trim(),
      region: form.region.trim(),
      localGrade: form.localGrade || undefined,
      nationalGrade: form.nationalGrade || undefined,
      birthDate: form.birthDate.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || "프로필 저장에 실패했습니다.");
      return;
    }

    // Mock 모드: 프로필 완료로 전환
    try {
      localStorage.setItem("mock_has_profile", "true");
      localStorage.setItem("mock_user_status", "ACTIVE");
    } catch {}

    await refetch();
    router.push("/home");
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
              <input
                value={form.region}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, region: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="예) 서울 / 수원 / 용인"
                autoComplete="address-level1"
              />
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
                생년월일 <span className="text-foreground-muted">(선택)</span>
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
                생년월일은 선택이며, 공개 정책은 추후 설정할 수 있어요.
              </p>
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
