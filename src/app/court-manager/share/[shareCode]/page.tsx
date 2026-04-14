"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, Copy, Lock } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { getUserFacingErrorMessage } from "@/lib/api";
import {
  PublicGameSummary,
  getGameStatusLabel,
  getGradeTypeLabel,
  getMatchRecordModeLabel,
  getPublicGameByShareCode,
} from "@/lib/game";

export default function PublicCourtManagerSharePage() {
  const params = useParams();
  const shareCode =
    typeof params?.shareCode === "string" ? params.shareCode : "";
  const [game, setGame] = useState<PublicGameSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    if (!shareCode) {
      setPageError("공유 코드를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadGame = async () => {
      setIsLoading(true);
      setPageError("");

      try {
        const response = await getPublicGameByShareCode(shareCode);
        if (cancelled) {
          return;
        }

        if (!response) {
          setPageError("공유 세션을 찾을 수 없습니다.");
          setGame(null);
          return;
        }

        setGame(response);
      } catch (error) {
        if (!cancelled) {
          setPageError(
            getUserFacingErrorMessage(error, "공유 세션을 불러오지 못했습니다.")
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1200);
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!game) {
    return (
      <PageShell mainClassName="bg-zinc-50">
        <div className="container mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-950">
            Public Share
          </h1>
          <p className="mt-4 text-sm font-medium text-zinc-500">
            {pageError || "공유 세션을 찾을 수 없습니다."}
          </p>
          <Link href="/" className="mt-8 inline-flex">
            <Button className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800">
              홈으로 이동
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell mainClassName="bg-zinc-50">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:px-8">
        <Link
          href="/court-manager"
          className="mb-8 inline-flex items-center text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-950"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Court Manager
        </Link>

        <div className="border-2 border-zinc-950 bg-zinc-950 p-8 text-white">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
            <div className="h-px w-8 bg-emerald-400" />
            Public Share
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl">
            {game.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
            <span>{getGameStatusLabel(game.status)}</span>
            <span>{getMatchRecordModeLabel(game.matchRecordMode)}</span>
            <span>{getGradeTypeLabel(game.gradeType)}</span>
          </div>
        </div>

        <div className="grid gap-6 border-2 border-t-0 border-zinc-200 bg-white p-8 md:grid-cols-4">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
              Share Code
            </div>
            <div className="mt-2 font-display text-2xl font-black text-zinc-950">
              {game.shareCode}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
              Courts
            </div>
            <div className="mt-2 font-display text-2xl font-black text-zinc-950">
              {String(game.courtCount).padStart(2, "0")}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
              Rounds
            </div>
            <div className="mt-2 font-display text-2xl font-black text-zinc-950">
              {String(game.roundCount).padStart(2, "0")}
            </div>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => void handleCopy()}
              className="w-full rounded-none bg-orange-500 text-zinc-950 hover:bg-orange-400"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copyLabel}
            </Button>
          </div>
        </div>

        <div className="mt-8 border-2 border-dashed border-zinc-300 bg-zinc-100 p-6">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
            <Lock className="h-4 w-4" />
            Current Contract
          </div>
          <p className="text-sm leading-relaxed text-zinc-600">
            현재 백엔드 공개 계약은 세션 요약 정보만 제공합니다. 참가자 목록과
            라운드/매치 보드는 백엔드 공개 조회 확장 후 이 화면에 연결합니다.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
