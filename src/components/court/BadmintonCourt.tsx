"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadmintonCourtStatus = "completed" | "active" | "upcoming";
export type BadmintonCourtDensity = "default" | "compact";

export type BadmintonCourtSlot =
  | {
      key: string | number;
      name?: string;
      meta?: ReactNode;
      isReserved?: boolean;
    }
  | null
  | undefined;

const SLOT_INDEXES = [0, 1, 2, 3] as const;

export function BadmintonCourt({
  slots,
  status = "active",
  density = "default",
  isEditable = false,
  isInteractionDisabled = false,
  selectFilledSlots = false,
  selectedSlot = null,
  onSelectSlot,
  resultLabel = null,
  emptyEditableLabel = "등록",
  emptyReadOnlyLabel = "빈 슬롯",
  className,
}: {
  slots: BadmintonCourtSlot[];
  status?: BadmintonCourtStatus;
  density?: BadmintonCourtDensity;
  isEditable?: boolean;
  isInteractionDisabled?: boolean;
  selectFilledSlots?: boolean;
  selectedSlot?: number | null;
  onSelectSlot?: (slotIndex: 0 | 1 | 2 | 3) => void;
  resultLabel?: string | null;
  emptyEditableLabel?: string;
  emptyReadOnlyLabel?: string;
  className?: string;
}) {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isCompact = density === "compact";
  const normalizedSlots = SLOT_INDEXES.map((index) => slots[index]);

  const frameToneClassName = isCompleted
    ? "border-zinc-900 bg-zinc-800 opacity-90"
    : isActive
    ? "border-slate-900 bg-emerald-700"
    : "border-slate-900 bg-emerald-700/85";

  const lineToneClassName = isCompleted ? "bg-zinc-600" : "bg-white";
  const lineBorderToneClassName = isCompleted ? "border-zinc-600" : "border-white";

  const renderPlayerChip = (
    slot: Exclude<BadmintonCourtSlot, null | undefined>,
    isSelected: boolean
  ) => (
    <div
      className={cn(
        "flex max-w-[84%] flex-col items-center justify-center rounded-none border-slate-900 bg-white text-slate-900",
        isCompact
          ? "min-w-[58px] border px-1.5 py-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] sm:min-w-[64px] sm:px-2 sm:py-1"
          : "min-w-[56px] border-2 px-1.5 py-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] sm:min-w-[64px] sm:px-2.5 sm:py-1.5",
        isCompleted && "border-zinc-900 bg-zinc-700 text-zinc-400 shadow-none",
        isSelected && "border-teal-500 bg-teal-100 text-teal-950 ring-2 ring-teal-300/60"
      )}
    >
      <div
        className={cn(
          "w-full truncate text-center leading-tight font-bold",
          isCompact ? "text-[9px] sm:text-[10px]" : "text-[9px] sm:text-[10px]"
        )}
      >
        {slot.name}
      </div>
      {slot.meta ? (
        <div
          className={cn(
            "mt-0.5 max-w-full truncate font-mono font-bold uppercase text-slate-500",
            isCompact
              ? "text-[7px] tracking-[0.1em] sm:text-[8px]"
              : "text-[6px] tracking-[0.12em] sm:text-[7px] sm:tracking-widest",
            isCompleted && "text-zinc-500"
          )}
        >
          {slot.meta}
        </div>
      ) : null}
    </div>
  );

  const renderEmptyReadOnlySlot = (isReserved?: boolean) => {
    if (isCompact) {
      return (
        <div className="flex min-w-0 max-w-[88%] items-center justify-center rounded-none border border-white/40 bg-white/15 px-1.5 py-1 text-center text-[8px] font-black leading-none text-white/80 sm:text-[9px]">
          {emptyReadOnlyLabel}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-none",
          isReserved || isCompleted
            ? "bg-zinc-700"
            : isActive
            ? "bg-white/30"
            : "bg-white/25"
        )}
      />
    );
  };

  return (
    <div
      className={cn(
        "relative mx-auto flex aspect-[11/6] w-full max-w-none overflow-hidden rounded-none shadow-inner",
        isCompact
          ? "border-2 px-1 py-1 sm:px-1.5 sm:py-1.5"
          : "border-4 px-2 py-1.5 sm:px-3 sm:py-2.5",
        frameToneClassName,
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute",
          isCompact ? "inset-[5px] sm:inset-[6px]" : "inset-[9px] sm:inset-[10px]"
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            isCompact ? "border" : "border-2",
            lineBorderToneClassName,
            isCompleted ? "opacity-80" : "opacity-40"
          )}
        />

        <div
          className={cn(
            "absolute inset-y-0 left-[5.7%] bg-white/28",
            isCompact ? "w-px" : "w-0.5",
            isCompleted && "bg-zinc-600/80"
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-[5.7%] bg-white/28",
            isCompact ? "w-px" : "w-0.5",
            isCompleted && "bg-zinc-600/80"
          )}
        />

        <div
          className={cn(
            "absolute inset-y-0 left-[35.2%]",
            lineToneClassName,
            isCompact ? "w-px opacity-40" : "w-0.5 opacity-40"
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-[35.2%]",
            lineToneClassName,
            isCompact ? "w-px opacity-40" : "w-0.5 opacity-40"
          )}
        />

        <div
          className={cn(
            "absolute inset-y-0 left-1/2 -translate-x-1/2",
            lineToneClassName,
            isCompact ? "w-0.5 opacity-55" : "w-1 opacity-55"
          )}
        />

        <div
          className={cn(
            "absolute inset-x-0 top-[7.5%]",
            lineToneClassName,
            isCompact ? "h-px opacity-35" : "h-0.5 opacity-35"
          )}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-[7.5%]",
            lineToneClassName,
            isCompact ? "h-px opacity-35" : "h-0.5 opacity-35"
          )}
        />

        <div
          className={cn(
            "absolute top-1/2 left-[5.7%] right-[64.8%] -translate-y-1/2",
            lineToneClassName,
            isCompact ? "h-px opacity-35" : "h-0.5 opacity-40"
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 left-[64.8%] right-[5.7%] -translate-y-1/2",
            lineToneClassName,
            isCompact ? "h-px opacity-35" : "h-0.5 opacity-40"
          )}
        />
      </div>

      {resultLabel ? (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-none border-2 border-zinc-950 bg-zinc-950 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-widest text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]">
          {resultLabel}
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-10 grid h-full w-full grid-cols-2 grid-rows-2",
          isCompact
            ? "gap-0.5 px-1.5 py-1 sm:gap-1 sm:px-2 sm:py-1.5"
            : "gap-1 px-2.5 py-1.5 sm:gap-1.5 sm:px-3.5 sm:py-2.5"
        )}
      >
        {normalizedSlots.map((slot, index) => {
          const slotIndex = index as 0 | 1 | 2 | 3;
          const isSelected = selectedSlot === index;
          const hasPlayer = Boolean(slot?.name);
          const playerChip = slot && hasPlayer ? renderPlayerChip(slot, isSelected) : null;

          return (
            <div
              key={`slot-${index}`}
              className={cn(
                "flex min-w-0 items-center justify-center",
                isCompact ? "p-[1px] sm:p-0.5" : "p-0.5 sm:p-1"
              )}
            >
              {playerChip ? (
                isEditable && selectFilledSlots ? (
                  <button
                    type="button"
                    disabled={isInteractionDisabled}
                    onClick={() => onSelectSlot?.(slotIndex)}
                    className={cn(
                      "flex h-full w-full items-center justify-center transition focus-visible:outline-none",
                      isInteractionDisabled
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-200/80 active:scale-[0.98]",
                      isSelected && "bg-teal-300/15 ring-2 ring-teal-300/70"
                    )}
                  >
                    {playerChip}
                  </button>
                ) : (
                  playerChip
                )
              ) : isEditable ? (
                <button
                  type="button"
                  disabled={isInteractionDisabled}
                  onClick={() => onSelectSlot?.(slotIndex)}
                  className={cn(
                    "flex w-full items-center justify-center rounded-none border-2 font-bold uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all",
                    isCompact
                      ? "h-5 max-w-[38px] px-1 text-[7px] tracking-[0.1em] sm:h-[22px] sm:max-w-[42px]"
                      : "h-[22px] max-w-[40px] text-[7px] tracking-[0.12em] sm:h-6 sm:max-w-[46px] sm:text-[8px] sm:tracking-widest",
                    isInteractionDisabled
                      ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 shadow-none"
                      : isSelected
                      ? "border-teal-500 bg-teal-100 text-teal-900 ring-2 ring-teal-300/60"
                      : "border-slate-900 bg-teal-400 text-slate-900 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/80 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                  )}
                >
                  {emptyEditableLabel}
                </button>
              ) : (
                renderEmptyReadOnlySlot(slot?.isReserved)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
