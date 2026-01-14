"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import {
  submitUserProfile,
  getProvinces,
  getDistricts,
  deleteAccount,
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

// useSearchParams를 사용하는 내부 컴포넌트
function AccountEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, isLoading, logout, refetch } = useAuth();

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
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawChecks, setWithdrawChecks] = useState({
    confirmIrreversible: false,
    confirmDataRemoval: false,
  });
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
    if (!form.gender.trim()) return "성별은 필수입니다.";
    // gender가 MALE 또는 FEMALE인지 확인
    if (form.gender && !["MALE", "FEMALE"].includes(form.gender)) {
      return "성별은 남성 또는 여성만 선택 가능합니다.";
    }
    return "";
  }, [form]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [isLoading, isLoggedIn, router]);

  // 시/도 목록 로드
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const loadProvinces = async () => {
        const provincesList = await getProvinces();
        setProvinces(Array.isArray(provincesList) ? provincesList : []);
      };

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

    const abortController = new AbortController();

    const loadDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const districtsList = await getDistricts(
          form.provinceId,
          abortController.signal
        );
        // 요청이 취소되지 않았는지 확인
        if (!abortController.signal.aborted) {
          setDistricts(districtsList);
          setIsLoadingDistricts(false);
        }
      } catch (error) {
        // AbortError는 정상적인 취소이므로 무시
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("[AccountEdit] Failed to load districts:", error);
          setIsLoadingDistricts(false);
        }
      }
    };

    loadDistricts();

    // cleanup: 이전 요청 취소
    return () => {
      abortController.abort();
    };
  }, [form.provinceId]);

  const onSubmit = async () => {
    setErrorMessage("");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const returnTo = searchParams.get("returnTo") || "/mypage";
    setIsSubmitting(true);

    // birthDate를 YYYYMMDD 형식으로 변환 (YYYY-MM-DD -> YYYYMMDD)
    const birth = form.birthDate.replace(/-/g, "");

    // grade: localGrade나 nationalGrade 중 하나를 선택 (우선순위: nationalGrade > localGrade)
    const grade = form.nationalGrade || form.localGrade || undefined;

    // NOTE: 백엔드에서 "정보 수정" 전용 endpoint(PUT/PATCH /users/me/profile)가 생기면 여기만 교체하면 됩니다.
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
    router.push(returnTo);
  };

  const canWithdraw =
    withdrawChecks.confirmIrreversible && withdrawChecks.confirmDataRemoval;

  const handleWithdraw = async () => {
    if (!canWithdraw) return;

    try {
      // TODO: 백엔드 API 구현 후 주석 해제
      // 실제 계정 삭제 API 호출
      const result = await deleteAccount();

      if (!result.success) {
        // API가 아직 구현되지 않은 경우 사용자에게 알림
        if (result.error?.includes("아직 준비되지 않았습니다")) {
          alert(
            "회원 탈퇴 기능이 아직 준비되지 않았습니다.\n현재는 로그아웃만 처리됩니다."
          );
          // 임시로 로그아웃만 수행
          await logout();
          setIsWithdrawOpen(false);
          router.push("/");
          return;
        }

        // 실제 API 에러인 경우
        setErrorMessage(result.error || "회원 탈퇴에 실패했습니다.");
        return;
      }

      // 계정 삭제 성공 시 로그아웃 및 리다이렉트
      await logout();
      setIsWithdrawOpen(false);
      router.push("/");
    } catch (error) {
      console.error("[AccountEdit] 회원 탈퇴 중 오류:", error);
      setErrorMessage("회원 탈퇴 중 오류가 발생했습니다.");
    }
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-background-secondary p-6 ring-1 ring-border sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">정보 수정</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            회원가입 때 입력했던 정보를 수정할 수 있어요.
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
                {isSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>

        {/* 회원 탈퇴 섹션 */}
        <div className="mt-8 rounded-2xl bg-background-secondary p-6 ring-1 ring-border sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">회원 탈퇴</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            탈퇴 시 계정 복구가 불가능할 수 있어요.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            >
              회원 탈퇴
            </button>
          </div>
        </div>
      </div>

      {/* 회원 탈퇴 모달 */}
      {isWithdrawOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="회원 탈퇴"
        >
          <div className="w-full max-w-lg rounded-2xl bg-background-secondary p-6 ring-1 ring-border">
            <h3 className="text-xl font-semibold text-foreground">회원 탈퇴</h3>
            <p className="mt-2 text-sm text-foreground-muted">
              탈퇴 전 아래 내용을 확인해 주세요.
            </p>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 rounded-xl bg-background p-4 ring-1 ring-border">
                <input
                  type="checkbox"
                  checked={withdrawChecks.confirmIrreversible}
                  onChange={(e) =>
                    setWithdrawChecks((prev) => ({
                      ...prev,
                      confirmIrreversible: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  탈퇴 후 계정은 복구할 수 없습니다.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl bg-background p-4 ring-1 ring-border">
                <input
                  type="checkbox"
                  checked={withdrawChecks.confirmDataRemoval}
                  onChange={(e) =>
                    setWithdrawChecks((prev) => ({
                      ...prev,
                      confirmDataRemoval: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  계정과 관련된 데이터가 삭제될 수 있음에 동의합니다.
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawOpen(false);
                  setWithdrawChecks({
                    confirmIrreversible: false,
                    confirmDataRemoval: false,
                  });
                }}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={!canWithdraw}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// Suspense로 감싸는 메인 페이지 컴포넌트
export default function AccountEditPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-foreground-muted">로딩 중...</p>
            </div>
          </div>
        </PageShell>
      }
    >
      <AccountEditContent />
    </Suspense>
  );
}
