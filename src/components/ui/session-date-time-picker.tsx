"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { Calendar, X } from "lucide-react";
import Select from "@/components/Select";
import {
  getNextSelectableScheduledAt,
  SCHEDULED_AT_TIME_STEP_MINUTES,
  SCHEDULED_AT_VALIDATION_MESSAGE,
} from "@/lib/scheduled-at";
import { cn } from "@/lib/utils";

type SessionDateTimePickerMode = "date-time" | "date";
type DateBoundary = "future" | "past" | "any";
type DateTimePickerSurface = "light" | "dark";
const DESKTOP_PICKER_MEDIA_QUERY = "(min-width: 1024px)";

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

function clampMonth(date: Date, startMonth: Date, endMonth: Date) {
  const month = startOfMonth(date);
  if (month.getTime() < startMonth.getTime()) {
    return startMonth;
  }

  if (month.getTime() > endMonth.getTime()) {
    return endMonth;
  }

  return month;
}

function getAllowedMonthRangeForYear(
  year: number,
  startMonth: Date,
  endMonth: Date
) {
  const startYear = startMonth.getFullYear();
  const endYear = endMonth.getFullYear();
  const minimumMonth = year === startYear ? startMonth.getMonth() : 0;
  const maximumMonth = year === endYear ? endMonth.getMonth() : 11;

  return {
    minimumMonth,
    maximumMonth,
  };
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
  return minute <= 59 && minute % SCHEDULED_AT_TIME_STEP_MINUTES === 0
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

function getAvailableTimes(day: Date, minimumDateTime?: Date) {
  const times: string[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (
      let minute = 0;
      minute < 60;
      minute += SCHEDULED_AT_TIME_STEP_MINUTES
    ) {
      const candidate = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hour,
        minute,
        0,
        0
      );

      if (minimumDateTime && candidate.getTime() < minimumDateTime.getTime()) {
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
  id,
  value,
  onChange,
  error = false,
  mode = "date-time",
  dateBoundary,
  placeholder,
  surface = "light",
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  mode?: SessionDateTimePickerMode;
  dateBoundary?: DateBoundary;
  placeholder?: string;
  surface?: DateTimePickerSurface;
  "aria-describedby"?: string;
}) {
  const effectiveDateBoundary = dateBoundary ?? getDefaultDateBoundary(mode);
  const initialDraft = getTimeDraft(parsePickerValue(value, mode).time);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [desktopPanelStyle, setDesktopPanelStyle] = useState<CSSProperties>();
  const [hourInput, setHourInput] = useState(initialDraft.hour);
  const [minuteInput, setMinuteInput] = useState(initialDraft.minute);
  const [timeError, setTimeError] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const now = new Date();
  const today = startOfDay(now);
  const minimumDateTime =
    effectiveDateBoundary === "future" && mode === "date-time"
      ? getNextSelectableScheduledAt(now)
      : undefined;
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
  const [visibleMonth, setVisibleMonth] = useState(() =>
    clampMonth(defaultMonth, visibleMonthStart, visibleMonthEnd)
  );
  const isDarkSurface = surface === "dark";
  const triggerSurfaceClass = isDarkSurface
    ? "bg-zinc-950 focus:border-emerald-500 focus:bg-zinc-950"
    : "bg-slate-50 focus:border-slate-900 focus:bg-white";
  const triggerStateClass = error
    ? isDarkSurface
      ? "border-red-500/70 text-red-200"
      : "border-red-300 text-red-600"
    : isDarkSurface
    ? "border-zinc-800 text-white hover:border-zinc-700"
    : "border-slate-200 text-slate-900 hover:border-slate-300";
  const iconClass = isDarkSurface ? "text-zinc-500" : "text-slate-400";
  const selectedTextClass = isDarkSurface ? "text-white" : "text-slate-900";
  const mutedTextClass = isDarkSurface ? "text-zinc-500" : "text-slate-400";
  const overlayClass = isDarkSurface ? "bg-zinc-950/60" : "bg-slate-950/28";
  const panelClass = isDarkSurface
    ? "border-zinc-700 bg-zinc-950 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.25)]"
    : "border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]";
  const mobileHeaderClass = isDarkSurface
    ? "border-zinc-800 text-zinc-400"
    : "border-slate-100 text-slate-500";
  const closeButtonClass = isDarkSurface
    ? "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-emerald-500 hover:text-white"
    : "border-slate-200 bg-white text-slate-500 hover:border-slate-900 hover:text-slate-900";
  const calendarShellClass = isDarkSurface
    ? "border-zinc-800 bg-zinc-900"
    : "border-slate-100 bg-slate-50";
  const modalWidthClass =
    mode === "date" ? "max-w-[28rem]" : "max-w-[44rem]";
  const yearOptions = (() => {
    const startYear = visibleMonthStart.getFullYear();
    const endYear = visibleMonthEnd.getFullYear();
    const years: Array<{ value: string; label: string }> = [];

    if (effectiveDateBoundary === "past") {
      for (let year = endYear; year >= startYear; year -= 1) {
        years.push({ value: String(year), label: `${year}년` });
      }

      return years;
    }

    for (let year = startYear; year <= endYear; year += 1) {
      years.push({ value: String(year), label: `${year}년` });
    }

    return years;
  })();
  const visibleYear = visibleMonth.getFullYear();
  const { minimumMonth, maximumMonth } = getAllowedMonthRangeForYear(
    visibleYear,
    visibleMonthStart,
    visibleMonthEnd
  );
  const monthOptions = Array.from(
    { length: maximumMonth - minimumMonth + 1 },
    (_, index) => {
      const monthIndex = minimumMonth + index;
      return {
        value: String(monthIndex),
        label: `${monthIndex + 1}월`,
      };
    }
  );

  const updateVisibleMonth = (nextMonth: Date) => {
    setVisibleMonth(clampMonth(nextMonth, visibleMonthStart, visibleMonthEnd));
  };

  const handleVisibleYearChange = (yearValue: string) => {
    const year = Number(yearValue);
    if (Number.isNaN(year)) {
      return;
    }

    const monthRange = getAllowedMonthRangeForYear(
      year,
      visibleMonthStart,
      visibleMonthEnd
    );
    const monthIndex = Math.min(
      Math.max(visibleMonth.getMonth(), monthRange.minimumMonth),
      monthRange.maximumMonth
    );
    updateVisibleMonth(new Date(year, monthIndex, 1));
  };

  const handleVisibleMonthChange = (monthValue: string) => {
    const monthIndex = Number(monthValue);
    if (Number.isNaN(monthIndex)) {
      return;
    }

    updateVisibleMonth(new Date(visibleYear, monthIndex, 1));
  };

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
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
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

  useEffect(() => {
    if (!isOpen || isDesktopViewport) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isDesktopViewport, isOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_PICKER_MEDIA_QUERY);

    const syncViewport = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !rootRef.current || !isDesktopViewport) {
      return;
    }

    const syncDesktopPanelStyle = () => {
      if (!rootRef.current) {
        return;
      }

      const rect = rootRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const horizontalMargin = 24;
      const verticalGap = 8;
      const desiredWidth = mode === "date" ? 384 : 640;
      const width = Math.min(desiredWidth, viewportWidth - horizontalMargin * 2);
      const left = Math.min(
        Math.max(rect.left, horizontalMargin),
        viewportWidth - width - horizontalMargin
      );
      const topSpace = rect.top - 16;
      const bottomSpace = viewportHeight - rect.bottom - 16;
      const requiredSpace = mode === "date" ? 360 : 420;
      const shouldOpenUpward =
        bottomSpace < requiredSpace && topSpace > bottomSpace;

      setDesktopPanelStyle(
        shouldOpenUpward
          ? {
              bottom: viewportHeight - rect.top + verticalGap,
              left,
              width,
            }
          : {
              left,
              top: rect.bottom + verticalGap,
              width,
            }
      );
    };

    syncDesktopPanelStyle();
    window.addEventListener("resize", syncDesktopPanelStyle);
    window.addEventListener("scroll", syncDesktopPanelStyle, true);

    return () => {
      window.removeEventListener("resize", syncDesktopPanelStyle);
      window.removeEventListener("scroll", syncDesktopPanelStyle, true);
    };
  }, [isDesktopViewport, isOpen, mode]);

  const toggleOpen = () => {
    if (!isOpen) {
      syncDrafts(selectedTime);
      setVisibleMonth(
        clampMonth(selectedDay ?? defaultMonth, visibleMonthStart, visibleMonthEnd)
      );
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

    const availableTimes = getAvailableTimes(day, minimumDateTime);
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

    if (minute % SCHEDULED_AT_TIME_STEP_MINUTES !== 0) {
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

    if (
      minimumDateTime &&
      candidate.getTime() < minimumDateTime.getTime()
    ) {
      setTimeError(SCHEDULED_AT_VALIDATION_MESSAGE);
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
        return getAvailableTimes(day, minimumDateTime).length === 0;
      }

      return false;
    }

    if (effectiveDateBoundary === "past") {
      return normalizedDay > today;
    }

    return false;
  };
  const dayPickerClassNames = {
    root: "w-full",
    months: "w-full",
    month:
      "grid w-full grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] grid-rows-[2.25rem_auto] items-center gap-y-3",
    month_caption: cn(
      "col-start-2 row-start-1 flex h-9 items-center justify-center text-sm font-bold tracking-tight",
      isDarkSurface ? "text-zinc-100" : "text-slate-900"
    ),
    caption_label: "block text-center leading-none",
    chevron: cn(
      "h-5 w-5 fill-current",
      isDarkSurface ? "text-zinc-100" : "text-slate-700"
    ),
    button_previous: cn(
      "col-start-1 row-start-1 flex h-10 w-10 self-center items-center justify-center border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-35",
      isDarkSurface
        ? "border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-emerald-500 hover:bg-zinc-900 hover:text-emerald-200"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:bg-slate-50"
    ),
    button_next: cn(
      "col-start-3 row-start-1 flex h-10 w-10 self-center items-center justify-center border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-35",
      isDarkSurface
        ? "border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-emerald-500 hover:bg-zinc-900 hover:text-emerald-200"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:bg-slate-50"
    ),
    month_grid: "col-span-3 row-start-2 w-full border-collapse",
    weekdays: cn(
      "border-b-2",
      isDarkSurface ? "border-zinc-800" : "border-slate-200"
    ),
    weekday: cn(
      "pb-2 text-center text-[10px] font-mono font-bold uppercase tracking-widest",
      isDarkSurface ? "text-zinc-500" : "text-slate-400"
    ),
    week: "mt-1",
    day: "p-0 text-center",
    day_button: cn(
      "flex h-10 w-full items-center justify-center border text-sm font-semibold transition-colors",
      isDarkSurface
        ? "border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
        : "border-slate-100 bg-white text-slate-900 hover:bg-slate-50"
    ),
    today: isDarkSurface ? "text-emerald-300" : "text-teal-600",
    selected: isDarkSurface
      ? "border-emerald-300 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
      : "bg-teal-500 text-slate-950 hover:bg-teal-400 border-slate-900",
    outside: isDarkSurface ? "text-zinc-700" : "text-slate-300",
    disabled: isDarkSurface
      ? "bg-zinc-900 text-zinc-700 [&>button]:cursor-not-allowed [&>button]:border-zinc-900 [&>button]:bg-zinc-900 [&>button]:text-zinc-700 [&>button]:hover:bg-zinc-900"
      : "bg-slate-50 text-slate-300 [&>button]:cursor-not-allowed [&>button]:border-slate-100 [&>button]:bg-slate-50 [&>button]:text-slate-300 [&>button]:hover:bg-slate-50",
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        id={id}
        type="button"
        onClick={toggleOpen}
        aria-describedby={ariaDescribedBy}
        data-invalid={error ? "true" : undefined}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-none border-2 px-4 text-left transition-colors focus:outline-none",
          triggerSurfaceClass,
          triggerStateClass
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Calendar className={cn("h-4 w-4 shrink-0", iconClass)} />
          {selectedLabel ? (
            <div className={cn("min-w-0 truncate text-sm font-semibold", selectedTextClass)}>
              {selectedLabel.date}
              {selectedLabel.time ? ` ${selectedLabel.time}` : ""}
            </div>
          ) : (
            <span className={cn("text-sm font-medium", mutedTextClass)}>
              {placeholder ?? (mode === "date" ? "날짜를 선택하세요" : "날짜와 시간을 선택하세요")}
            </span>
          )}
        </div>
        <span className={cn("font-mono text-[10px] tracking-widest", mutedTextClass)}>
          선택
        </span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              {!isDesktopViewport ? (
                <div
                  className={cn("fixed inset-0 z-40", overlayClass)}
                  aria-hidden="true"
                  onClick={closePicker}
                />
              ) : null}
              <div
                ref={panelRef}
                role="dialog"
                aria-modal={!isDesktopViewport}
                className={cn(
                  "fixed z-50 border-2 p-3",
                  isDesktopViewport
                    ? "overflow-visible"
                    : cn(
                        "inset-x-4 top-1/2 mx-auto max-h-[calc(100svh-2rem)] -translate-y-1/2 overflow-y-auto scrollbar-hidden",
                        modalWidthClass
                      ),
                  panelClass
                )}
                style={isDesktopViewport ? desktopPanelStyle : undefined}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  className={cn(
                    "mb-3 flex items-center justify-between border-b pb-2 lg:hidden",
                    mobileHeaderClass
                  )}
                >
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest">
                    {mode === "date" ? "날짜 선택" : "날짜 및 시간 선택"}
                  </div>
                  <button
                    type="button"
                    onClick={closePicker}
                    aria-label="날짜 선택 닫기"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center border transition-colors",
                      closeButtonClass
                    )}
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
                  <div className={cn("border-2 p-3", calendarShellClass)}>
                    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                      <Select
                        value={String(visibleYear)}
                        options={yearOptions}
                        onChange={handleVisibleYearChange}
                        variant="brutalist"
                        size="compact"
                        surface={surface}
                        placement="bottom"
                      />
                      <Select
                        value={String(visibleMonth.getMonth())}
                        options={monthOptions}
                        onChange={handleVisibleMonthChange}
                        variant="brutalist"
                        size="compact"
                        surface={surface}
                        placement="bottom"
                      />
                    </div>
                    <div className="overflow-visible">
                      <DayPicker
                        mode="single"
                        selected={selectedDay}
                        onSelect={handleDaySelect}
                        disabled={isDayDisabled}
                        month={visibleMonth}
                        onMonthChange={updateVisibleMonth}
                        startMonth={visibleMonthStart}
                        endMonth={visibleMonthEnd}
                        navLayout="around"
                        showOutsideDays={false}
                        locale={ko}
                        classNames={dayPickerClassNames}
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
                        현재 시각 기준 다음 10분 슬롯부터 선택할 수 있어요.
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
            </>,
            document.body
          )
        : null}
    </div>
  );
}
