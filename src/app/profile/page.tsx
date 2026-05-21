"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  MapPin,
  Tag,
  Trophy,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/tag-chip";
import { AuthProvider, UserProfile, getMyProfile } from "@/lib/auth";
import { getUserFacingErrorMessage } from "@/lib/api";
import { formatGradeLabel } from "@/lib/grade";
import { useAuth } from "@/hooks/useAuth";

const PROVIDER_BADGES: Record<
  Exclude<AuthProvider, "DUMMY">,
  { label: string; src: string; className: string }
> = {
  APPLE: {
    label: "Apple",
    src: "/social/apple-logo.svg",
    className: "bg-zinc-950",
  },
  GOOGLE: {
    label: "Google",
    src: "/social/google-g.svg",
    className: "bg-white",
  },
  KAKAO: {
    label: "Kakao",
    src: "/social/kakao-symbol.svg",
    className: "bg-[#FEE500]",
  },
};

function SocialProviderBadge({
  provider,
}: {
  provider?: AuthProvider | null;
}) {
  if (!provider || provider === "DUMMY") {
    return null;
  }

  const badge = PROVIDER_BADGES[provider];

  return (
    <div
      className={`absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-sm ${badge.className}`}
    >
      <Image
        src={badge.src}
        alt={`${badge.label} 로그인`}
        width={16}
        height={16}
        className="h-4 w-4"
      />
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoading, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.location.href = "/login?returnTo=/profile";
      return;
    }

    if (!isLoading && user?.status === "PENDING") {
      window.location.href = "/profile/setup";
      return;
    }

    if (!isLoading && isLoggedIn) {
      const loadProfile = async () => {
        setIsLoadingProfile(true);
        setProfileError("");

        try {
          const nextProfile = await getMyProfile();
          if (!nextProfile) {
            setProfileError("프로필 정보를 불러오지 못했습니다.");
            setProfile(null);
            return;
          }

          setProfile(nextProfile);
        } catch (error) {
          setProfileError(
            getUserFacingErrorMessage(error, "프로필 정보를 불러오지 못했습니다.")
          );
          setProfile(null);
        } finally {
          setIsLoadingProfile(false);
        }
      };

      void loadProfile();
    }
  }, [isLoading, isLoggedIn, user]);

  if (isLoading || isLoadingProfile) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!user || !profile) {
    return (
      <PageShell mainClassName="bg-zinc-50">
        <div className="container mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-950">
            Profile
          </h1>
          <p className="mt-4 text-sm font-medium text-zinc-500">
            {profileError || "프로필 정보를 확인할 수 없습니다."}
          </p>
          <Link href="/profile/edit" className="mt-8 inline-flex">
            <Button className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800">
              프로필 수정으로 이동
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const displayNickname = profile.nickname || user.nickname || "사용자";
  const displayRegion =
    profile.provinceName && profile.districtName
      ? `${profile.provinceName} ${profile.districtName}`
      : "미설정";
  const displayGrade = formatGradeLabel(
    profile.nationalGrade || profile.regionalGrade
  );

  return (
    <PageShell mainClassName="bg-zinc-50">
      <div className="min-h-screen bg-zinc-50">
        <div className="container mx-auto max-w-4xl px-4 py-8 md:px-8 lg:py-12">
          <div className="mb-12">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-emerald-600">
              <div className="h-px w-8 bg-emerald-600" />
              User Profile
            </div>
            <h1 className="font-display text-4xl font-black uppercase tracking-tight text-zinc-950 md:text-5xl">
              내 프로필
            </h1>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="md:col-span-1"
            >
              <div className="flex flex-col items-center border-2 border-zinc-200 bg-white p-6 text-center">
                <div className="relative mb-6">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-zinc-100 shadow-lg">
                    {profile.profileImageUrl ? (
                      <Image
                        src={profile.profileImageUrl}
                        alt={displayNickname}
                        width={128}
                        height={128}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-zinc-400" />
                    )}
                  </div>
                  <SocialProviderBadge provider={user.provider} />
                </div>

                <h2 className="mb-1 text-2xl font-bold text-zinc-950">
                  {displayNickname}
                </h2>
                <div className="mt-4 mb-2">
                  <TagChip tag={profile.tag} className="justify-center" />
                </div>
              </div>
            </motion.div>

            <div className="space-y-8 md:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="border-2 border-zinc-200 bg-white p-6 md:p-8"
              >
                <h3 className="mb-6 border-b-2 border-zinc-100 pb-4 font-display text-xl font-bold uppercase tracking-tight text-zinc-950">
                  계정 정보
                </h3>

                <div className="space-y-6">
                  <div className="grid gap-2 md:grid-cols-3 md:gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <User className="h-4 w-4" />
                      이름
                    </div>
                    <div className="text-sm font-medium text-zinc-950 md:col-span-2">
                      {displayNickname}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 md:gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <MapPin className="h-4 w-4" />
                      지역
                    </div>
                    <div className="text-sm font-medium text-zinc-950 md:col-span-2">
                      {displayRegion}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 md:gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <Trophy className="h-4 w-4" />
                      급수
                    </div>
                    <div className="text-sm font-medium text-zinc-950 md:col-span-2">
                      {displayGrade}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 md:gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <Tag className="h-4 w-4" />
                      태그
                    </div>
                    <div className="md:col-span-2">
                      <TagChip tag={profile.tag} muted />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="border-2 border-dashed border-zinc-300 bg-zinc-100 p-6 md:p-8"
              >
                <h3 className="mb-4 font-display text-lg font-bold uppercase tracking-tight text-zinc-950">
                  바로가기
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href="/profile/edit">
                    <Button
                      variant="outline"
                      className="h-14 w-full justify-between rounded-none border-2 border-zinc-200 bg-white font-bold uppercase tracking-widest text-zinc-950 transition-all hover:border-emerald-500 hover:bg-zinc-50"
                    >
                      정보 수정
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </Button>
                  </Link>
                  <Link href="/court-manager">
                    <Button
                      variant="outline"
                      className="h-14 w-full justify-between rounded-none border-2 border-zinc-200 bg-white font-bold uppercase tracking-widest text-zinc-950 transition-all hover:border-emerald-500 hover:bg-zinc-50"
                    >
                      코트매니저
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
