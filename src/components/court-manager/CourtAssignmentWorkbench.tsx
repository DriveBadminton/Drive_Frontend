"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Trash2 } from "lucide-react";
import {
  BadmintonCourt,
  type BadmintonCourtSlot,
  type BadmintonCourtStatus,
} from "@/components/court/BadmintonCourt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CourtAssignmentWorkbenchTarget = {
  roundId: string;
  courtId: string;
  slotIndex: 0 | 1 | 2 | 3;
};

export type CourtAssignmentWorkbenchParticipantSummaryItem = {
  id: string | number;
  name: string;
  meta: string;
  badge?: string;
};

export type CourtAssignmentWorkbenchParticipantSummaryGroup =
  | {
      type: "pair";
      key: string;
      participants: [
        CourtAssignmentWorkbenchParticipantSummaryItem,
        CourtAssignmentWorkbenchParticipantSummaryItem
      ];
    }
  | {
      type: "single";
      key: string;
      participant: CourtAssignmentWorkbenchParticipantSummaryItem;
    };

export type CourtAssignmentWorkbenchCourt = {
  id: string;
  label: string;
  slots: BadmintonCourtSlot[];
  status?: BadmintonCourtStatus;
  resultLabel?: string | null;
  canRemove?: boolean;
};

export type CourtAssignmentWorkbenchRound = {
  id: string;
  label: string;
  courts: CourtAssignmentWorkbenchCourt[];
  status?: BadmintonCourtStatus;
  canAddCourt?: boolean;
  canRemove?: boolean;
};

export function CourtAssignmentWorkbench({
  rounds,
  participantSummary,
  selectedTarget,
  isLocked = false,
  selectFilledSlots = false,
  emptyEditableLabel = "등록",
  emptyRoundsLabel = "아직 생성된 라운드가 없습니다.",
  emptyCourtsLabel = "이 라운드에는 아직 코트가 없습니다.",
  onSelectSlot,
  onAddCourt,
  onRemoveCourt,
  onRemoveRound,
  className,
}: {
  rounds: CourtAssignmentWorkbenchRound[];
  participantSummary?: {
    meta: string;
    groups: CourtAssignmentWorkbenchParticipantSummaryGroup[];
    initiallyCollapsed?: boolean;
  };
  selectedTarget: CourtAssignmentWorkbenchTarget | null;
  isLocked?: boolean;
  selectFilledSlots?: boolean;
  emptyEditableLabel?: string;
  emptyRoundsLabel?: string;
  emptyCourtsLabel?: string;
  onSelectSlot: (
    roundId: string,
    courtId: string,
    slotIndex: 0 | 1 | 2 | 3
  ) => void;
  onAddCourt?: (roundId: string) => void;
  onRemoveCourt?: (roundId: string, courtId: string) => void;
  onRemoveRound?: (roundId: string) => void;
  className?: string;
}) {
  const [isParticipantSummaryCollapsed, setIsParticipantSummaryCollapsed] = useState(
    participantSummary?.initiallyCollapsed ?? true
  );

  return (
    <div className={cn("space-y-3 pb-1 md:space-y-5 md:pb-2", className)}>
      {participantSummary ? (
        <div className="border-2 border-slate-200 bg-slate-50 p-2 md:p-3">
          <button
            type="button"
            onClick={() => setIsParticipantSummaryCollapsed((current) => !current)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={!isParticipantSummaryCollapsed}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <h3 className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                참가자 요약
              </h3>
              <p className="min-w-0 truncate text-[10px] font-mono text-slate-500 md:text-xs">
                {participantSummary.meta}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
              <span className="hidden sm:inline">
                {isParticipantSummaryCollapsed ? "펼치기" : "접기"}
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isParticipantSummaryCollapsed ? "" : "rotate-90"
                }`}
              />
            </div>
          </button>

          <AnimatePresence initial={false}>
            {!isParticipantSummaryCollapsed ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
                    {participantSummary.groups.map((group) =>
                      group.type === "pair" ? (
                        <div key={group.key} className="relative col-span-2 xl:col-span-2">
                          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                            {group.participants.map((participant) => (
                              <ParticipantSummaryCard
                                key={participant.id}
                                participant={participant}
                                variant="pair"
                              />
                            ))}
                          </div>
                          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[3px] w-4 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
                        </div>
                      ) : (
                        <ParticipantSummaryCard
                          key={group.key}
                          participant={group.participant}
                        />
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      {rounds.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <div className="text-sm font-medium text-slate-500">{emptyRoundsLabel}</div>
        </div>
      ) : (
        rounds.map((round) => (
          <section
            key={round.id}
            className="rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 md:p-3.5"
          >
            <div className="mx-auto w-full max-w-[760px] space-y-3 md:space-y-4 lg:max-w-[920px]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest md:px-3",
                      round.status === "active"
                        ? "bg-emerald-600 text-white"
                        : round.status === "completed"
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-900 text-white"
                    )}
                  >
                    {round.label}
                  </span>
                  {round.status === "active" ? (
                    <span className="h-2 w-2 animate-pulse bg-emerald-500" />
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                  {onAddCourt && round.canAddCourt ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLocked}
                      className="h-7 rounded-none border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase tracking-[0.14em] md:h-6 md:px-2 md:text-[10px] md:tracking-widest"
                      onClick={() => onAddCourt(round.id)}
                    >
                      + 코트 추가
                    </Button>
                  ) : null}
                  {onRemoveRound && round.canRemove ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isLocked}
                      className="h-7 w-7 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500 md:h-6 md:w-6"
                      onClick={() => onRemoveRound(round.id)}
                      aria-label={`${round.label} 삭제`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {round.courts.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                  <div className="text-sm font-medium text-slate-500">
                    {emptyCourtsLabel}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-2 md:gap-4 lg:flex lg:flex-wrap lg:justify-center lg:gap-5">
                  {round.courts.map((court) => (
                    <div
                      key={court.id}
                      className="w-full min-w-0 space-y-0.5 md:space-y-1 lg:w-[264px] lg:flex-none"
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-widest">
                          {court.label}
                        </span>
                        {onRemoveCourt && court.canRemove ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isLocked}
                            className="h-6 w-6 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => onRemoveCourt(round.id, court.id)}
                            aria-label={`${court.label} 삭제`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <BadmintonCourt
                        slots={court.slots}
                        status={court.status}
                        resultLabel={court.resultLabel ?? null}
                        isEditable
                        selectFilledSlots={selectFilledSlots}
                        isInteractionDisabled={isLocked}
                        selectedSlot={
                          selectedTarget?.roundId === round.id &&
                          selectedTarget.courtId === court.id
                            ? selectedTarget.slotIndex
                            : null
                        }
                        onSelectSlot={(slotIndex) =>
                          onSelectSlot(round.id, court.id, slotIndex)
                        }
                        emptyEditableLabel={emptyEditableLabel}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ParticipantSummaryCard({
  participant,
  variant = "single",
}: {
  participant: CourtAssignmentWorkbenchParticipantSummaryItem;
  variant?: "single" | "pair";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 p-2 text-left text-[11px] md:p-3 md:text-xs",
        variant === "pair"
          ? "border-2 border-violet-400 bg-violet-50/20"
          : "border border-slate-200 bg-white"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate font-bold text-slate-900">
          {participant.name}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-slate-500 md:text-[10px]">
          {participant.meta}
        </span>
      </div>
      {participant.badge ? (
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-900 md:text-[10px]">
          {participant.badge}
        </span>
      ) : null}
    </div>
  );
}
