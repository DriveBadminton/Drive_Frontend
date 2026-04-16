"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TIME_STEP_MINUTES = 10;
type SessionDateTimePickerMode = "date-time" | "date";
type DateBoundary = "future" | "past" | "any";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, date.getMonth(), 1);
}

function parseDateValue(value: string) {
  const normalizedValue = value.includes("T") ? value.split("T")[0] : value;
  if (!normalizedValue) {
    return undefined;
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);
  if ([year, month, day].some((segment) => Number.isNaN(segment))) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function parsePickerValue(value: string, mode: SessionDateTimePickerMode) {
  if (mode === "date") {
    return {
      day: parseDateValue(value),
      time: "",
    };
  }

  if (!value) {
    return { day: undefined, time: "" };
  }

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return { day: undefined, time: "" };
  }

  const day = parseDateValue(datePart);
  const [hours, minutes] = timePart.split(":").map(Number);
  if (!day || [hours, minutes].some((segment) => Number.isNaN(segment))) {
    return { day: undefined, time: "" };
  }

  return {
    day,
    time: `${pad(hours)}:${pad(minutes)}`,
  };
}

function buildPickerValue(
  day: Date,
  time: string,
  mode: SessionDateTimePickerMode
) {
  const datePart = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(
    day.getDate()
  )}`;

  if (mode === "date") {
    return datePart;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return `${datePart}T${pad(hours)}:${pad(minutes)}`;
}

function formatDateLabel(day: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  }).format(day);
}

function formatTimeLabel(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${pad(hours)}:${pad(minutes)}`;
}

function getTimeDraft(time: string): { hour: string; minute: string } {
  if (!time) {
    return {
      hour: "",
      minute: "",
    };
  }

  const [hours, minutes] = time.split(":").map(Number);

  return {
    hour: pad(hours),
    minute: pad(minutes),
  };
}

function sanitizeHourInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) {
    return "";
  }

  if (digits.length === 1) {
    return digits;
  }

  return Number(digits) <= 23 ? digits : digits.slice(0, 1);
}

function sanitizeMinuteInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) {
    return "";
  }

  if (digits.length === 1) {
    return Number(digits) <= 5 ? digits : "";
  }

  const minute = Number(digits);
  return minute <= 59 && minute % TIME_STEP_MINUTES === 0
    ? digits
    : digits.slice(0, 1);
}

function formatPickerLabel(value: string, mode: SessionDateTimePickerMode) {
  const { day, time } = parsePickerValue(value, mode);
  if (!day) {
    return null;
  }

  if (mode === "date") {
    return {
      date: formatDateLabel(day),
      time: null,
    };
  }

  if (!time) {
    return null;
  }

  return {
    date: formatDateLabel(day),
    time: formatTimeLabel(time),
  };
}

function getAvailableTimes(day: Date, now: Date) {
  const times: string[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += TIME_STEP_MINUTES) {
      const candidate = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hour,
        minute,
        0,
        0
      );

      if (candidate <= now) {
        continue;
      }

      times.push(`${pad(hour)}:${pad(minute)}`);
    }
  }

  return times;
}

function getDefaultDateBoundary(mode: SessionDateTimePickerMode): DateBoundary {
  return mode === "date-time" ? "future" : "past";
}

export function SessionDateTimePicker({
  value,
  onChange,
  error = false,
  mode = "date-time",
  dateBoundary,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  mode?: SessionDateTimePickerMode;
  dateBoundary?: DateBoundary;
  placeholder?: string;
}) {
  const effectiveDateBoundary = dateBoundary ?? getDefaultDateBoundary(mode);
  const initialDraft = getTimeDraft(parsePickerValue(value, mode).time);
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [hourInput, setHourInput] = useState(initialDraft.hour);
  const [minuteInput, setMinuteInput] = useState(initialDraft.minute);
  const [timeError, setTimeError] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const now = new Date();
  const today = startOfDay(now);
  const { day: selectedDay, time: selectedTime } = parsePickerValue(value, mode);
  const selectedLabel = formatPickerLabel(value, mode);
  const visibleMonthStart =
    effectiveDateBoundary === "past"
      ? startOfMonth(addYears(now, -100))
      : effectiveDateBoundary === "future"
      ? startOfMonth(now)
      : startOfMonth(addYears(now, -1));
  const visibleMonthEnd =
    effectiveDateBoundary === "past"
      ? startOfMonth(now)
      : effectiveDateBoundary === "future"
      ? startOfMonth(addMonths(now, 2))
      : startOfMonth(addYears(now, 1));
  const defaultMonth =
    selectedDay ??
    (effectiveDateBoundary === "past" ? addYears(now, -20) : startOfMonth(now));

  const syncDrafts = (time: string) => {
    const draft = getTimeDraft(time);
    setHourInput(draft.hour);
    setMinuteInput(draft.minute);
    setTimeError("");
  };

  const closePicker = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePicker();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleOpen = () => {
    if (!isOpen && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceAbove = rect.top;
      const requiredSpace = mode === "date" ? 360 : 420;
      const spaceBelow = viewportHeight - rect.bottom;

      setPlacement(
        spaceBelow < requiredSpace && spaceAbove > spaceBelow ? "top" : "bottom"
      );
      syncDrafts(selectedTime);
    }

    setIsOpen((prev) => !prev);
  };

  const handleDaySelect = (day?: Date) => {
    if (!day) {
      return;
    }

    if (mode === "date") {
      onChange(buildPickerValue(day, "", mode));
      closePicker();
      return;
    }

    const availableTimes = getAvailableTimes(day, now);
    if (availableTimes.length === 0) {
      return;
    }

    const nextTime = availableTimes.includes(selectedTime)
      ? selectedTime
      : availableTimes[0];

    syncDrafts(nextTime);
    onChange(buildPickerValue(day, nextTime, mode));
  };

  const applyManualTime = () => {
    if (!selectedDay || mode === "date") {
      return;
    }

    if (!hourInput || !minuteInput) {
      setTimeError("시간을 올바르게 입력해주세요.");
      return;
    }

    const hour = Number(hourInput);
    const minute = Number(minuteInput);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      setTimeError("시간을 올바르게 입력해주세요.");
      return;
    }

    if (minute % TIME_STEP_MINUTES !== 0) {
      setTimeError("분은 10분 단위로 입력해주세요.");
      return;
    }

    const time = `${pad(hour)}:${pad(minute)}`;
    const nextValue = buildPickerValue(selectedDay, time, mode);
    const candidate = new Date(
      selectedDay.getFullYear(),
      selectedDay.getMonth(),
      selectedDay.getDate(),
      hour,
      minute,
      0,
      0
    );

    if (candidate.getTime() <= now.getTime()) {
      setTimeError("현재보다 미래 시간만 선택할 수 있습니다.");
      return;
    }

    setTimeError("");
    onChange(nextValue);
    closePicker();
  };

  const isDayDisabled = (day: Date) => {
    const normalizedDay = startOfDay(day);

    if (effectiveDateBoundary === "future") {
      if (normalizedDay < today) {
        return true;
      }

      if (mode === "date-time") {
        return getAvailableTimes(day, now).length === 0;
      }

      return false;
    }

    if (effectiveDateBoundary === "past") {
      return normalizedDay > today;
    }

    return false;
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "flex h-14 w-full items-center justify-between rounded-none border-2 bg-slate-50 px-4 text-left transition-colors focus:border-slate-900 focus:bg-white focus:outline-none",
          error
            ? "border-red-300 text-red-600"
            : "border-slate-200 text-slate-900 hover:border-slate-300"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
          {selectedLabel ? (
            <div className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {selectedLabel.date}
              {selectedLabel.time ? ` ${selectedLabel.time}` : ""}
            </div>
          ) : (
            <span className="text-sm font-medium text-slate-400">
              {placeholder ?? (mode === "date" ? "날짜를 선택하세요" : "날짜와 시간을 선택하세요")}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] tracking-widest text-slate-400">
          선택
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/28 sm:hidden"
            aria-hidden="true"
            onClick={closePicker}
          />
          <div
            className={cn(
              "fixed inset-x-4 top-1/2 z-50 max-h-[calc(100vh-2rem)] -translate-y-1/2 overflow-y-auto border-2 border-slate-900 bg-white p-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:max-h-none sm:w-[min(40rem,calc(100vw-3rem))] sm:translate-y-0 sm:overflow-visible",
              placement === "top"
                ? "sm:bottom-full sm:mb-2"
                : "sm:top-full sm:mt-2",
              mode === "date" ? "sm:max-w-[24rem]" : ""
            )}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 sm:hidden">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                {mode === "date" ? "날짜 선택" : "날짜 및 시간 선택"}
              </div>
              <button
                type="button"
                onClick={closePicker}
                aria-label="날짜 선택 닫기"
                className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={cn(
                "grid gap-3",
                mode === "date"
                  ? "grid-cols-1"
                  : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_15rem]"
              )}
            >
              <div className="border-2 border-slate-100 bg-slate-50 p-3">
                <div className="max-h-[18.5rem] overflow-auto">
                  <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={handleDaySelect}
                    disabled={isDayDisabled}
                    startMonth={visibleMonthStart}
                    endMonth={visibleMonthEnd}
                    defaultMonth={defaultMonth}
                    navLayout="around"
                    showOutsideDays={false}
                    locale={ko}
                    classNames={{
                      root: "w-full",
                      months: "w-full",
                      month:
                        "grid w-full grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] grid-rows-[2.25rem_auto] items-center gap-y-3",
                      month_caption:
                        "col-start-2 row-start-1 flex h-9 items-center justify-center text-sm font-bold tracking-tight text-slate-900",
                      caption_label: "block text-center leading-none",
                      button_previous:
                        "col-start-1 row-start-1 flex h-9 w-9 self-center items-center justify-center border-2 border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-900 hover:bg-slate-50",
                      button_next:
                        "col-start-3 row-start-1 flex h-9 w-9 self-center items-center justify-center border-2 border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-900 hover:bg-slate-50",
                      month_grid: "col-span-3 row-start-2 w-full border-collapse",
                      weekdays: "border-b-2 border-slate-200",
                      weekday:
                        "pb-2 text-center text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400",
                      week: "mt-1",
                      day: "p-0 text-center",
                      day_button:
                        "flex h-10 w-full items-center justify-center border border-slate-100 bg-white text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50",
                      today: "text-teal-600",
                      selected:
                        "bg-teal-500 text-slate-950 hover:bg-teal-400 border-slate-900",
                      outside: "text-slate-300",
                      disabled:
                        "bg-slate-50 text-slate-300 [&>button]:cursor-not-allowed [&>button]:border-slate-100 [&>button]:bg-slate-50 [&>button]:text-slate-300 [&>button]:hover:bg-slate-50",
                    }}
                  />
                </div>
              </div>

              {mode === "date-time" ? (
                <div className="border-2 border-slate-100 bg-white p-3">
                  <div className="mb-3">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                      시간 입력
                    </div>
                  </div>

                  {selectedDay ? (
                    <div className="max-h-[18.5rem] space-y-3 overflow-y-auto pr-1">
                      <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        {formatDateLabel(selectedDay)}
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400">
                            시
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            value={hourInput}
                            onChange={(event) => {
                              setHourInput(sanitizeHourInput(event.target.value));
                              setTimeError("");
                            }}
                            placeholder="15"
                            className="h-11 w-full rounded-none border-2 border-slate-200 bg-white px-3 text-center text-sm font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                        <div className="pb-3 text-lg font-bold text-slate-400">:</div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400">
                            분
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            value={minuteInput}
                            onChange={(event) => {
                              setMinuteInput(sanitizeMinuteInput(event.target.value));
                              setTimeError("");
                            }}
                            placeholder="10"
                            className="h-11 w-full rounded-none border-2 border-slate-200 bg-white px-3 text-center text-sm font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="text-[10px] font-mono tracking-widest text-slate-400">
                        24시간 형식으로 입력하고 분은 10분 단위를 사용해주세요.
                      </div>

                      {timeError ? (
                        <div className="text-[11px] font-medium text-red-600">
                          {timeError}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={applyManualTime}
                        className="h-11 w-full border-2 border-slate-900 bg-teal-500 text-sm font-bold tracking-widest text-slate-950 transition-colors hover:bg-teal-400"
                      >
                        시간 적용
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-h-[10rem] items-center justify-center border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-[11px] font-mono uppercase tracking-widest text-slate-400">
                      먼저 날짜를 선택해주세요
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
