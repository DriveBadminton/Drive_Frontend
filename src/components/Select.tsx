"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type Option = { value: string; label: string };
type SelectPlacement = "auto" | "bottom" | "top";
type ResolvedPlacement = Exclude<SelectPlacement, "auto">;

type Props = {
  id?: string;
  value: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  placement?: SelectPlacement;
  onChange: (value: string) => void;
  className?: string;
  variant?: "default" | "brutalist";
  size?: "default" | "compact";
  surface?: "light" | "dark";
  leadingIcon?: ReactNode;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export default function Select({
  id,
  value,
  options,
  placeholder = "선택",
  disabled = false,
  loading = false,
  loadingLabel = "불러오는 중...",
  emptyLabel = "선택 가능한 항목이 없습니다.",
  placement = "auto",
  onChange,
  className = "",
  variant = "default",
  size = "default",
  surface = "light",
  leadingIcon,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: Props) {
  const buttonId = useId();
  const listboxId = useId();
  const triggerId = id ?? buttonId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [resolvedPlacement, setResolvedPlacement] =
    useState<ResolvedPlacement>("bottom");

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );
  const hasSelectableOptions = !loading && options.length > 0;

  const resolveMenuPlacement = useCallback((): ResolvedPlacement => {
    if (placement !== "auto") {
      return placement;
    }

    if (typeof window === "undefined") {
      return "bottom";
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return "bottom";
    }

    const estimatedRowHeight = size === "compact" ? 38 : 42;
    const estimatedMenuHeight = Math.min(
      288,
      Math.max(estimatedRowHeight, options.length * estimatedRowHeight + 8)
    );
    const bottomSpace = window.innerHeight - rect.bottom;
    const topSpace = rect.top;

    return bottomSpace < estimatedMenuHeight + 12 && topSpace > bottomSpace
      ? "top"
      : "bottom";
  }, [options.length, placement, size]);

  const openMenu = () => {
    if (disabled) return;
    setResolvedPlacement(resolveMenuPlacement());
    setOpen(true);
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(hasSelectableOptions ? (idx >= 0 ? idx : 0) : -1);
  };

  const closeMenu = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const syncPlacement = () => {
      setResolvedPlacement(resolveMenuPlacement());
    };

    syncPlacement();
    window.addEventListener("resize", syncPlacement);
    window.addEventListener("scroll", syncPlacement, true);

    return () => {
      window.removeEventListener("resize", syncPlacement);
      window.removeEventListener("scroll", syncPlacement, true);
    };
  }, [loading, open, options.length, placement, resolveMenuPlacement, size]);

  // 메뉴가 열리면 listbox로 포커스를 이동해서 ↑/↓ 키로 바로 조작 가능하게
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    requestAnimationFrame(() => {
      const activeOption = listRef.current?.querySelector(
        `[data-select-option-index="${activeIndex}"]`
      );
      activeOption?.scrollIntoView({ block: "nearest" });
    });
  }, [activeIndex, open]);

  const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openMenu();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openMenu();
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        openMenu();
      } else {
        closeMenu();
      }
      return;
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;

    if (e.key === "Tab") {
      // Tab 이동 시 드롭다운 닫고, 기본 Tab 이동은 그대로 허용
      closeMenu();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      buttonRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hasSelectableOptions) {
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hasSelectableOptions) {
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      if (hasSelectableOptions) {
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      if (hasSelectableOptions) {
        setActiveIndex(options.length - 1);
      }
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) {
        onChange(opt.value);
        closeMenu();
        buttonRef.current?.focus();
      }
    }
  };

  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;
  const isDarkBrutalist = variant === "brutalist" && surface === "dark";
  const styles =
    variant === "brutalist"
      ? isDarkBrutalist
        ? size === "compact"
          ? {
              trigger:
                "h-10 w-full rounded-none border-2 border-zinc-800 bg-zinc-950 py-2 pl-2 pr-10 text-left text-[12px] font-semibold text-white transition-colors hover:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:border-emerald-500",
              iconWrap:
                "pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500",
              icon: "h-3.5 w-3.5",
              leadingIcon: "shrink-0 text-zinc-500",
              value: "text-white",
              placeholder: "text-zinc-500",
              menu:
                "absolute z-[70] w-full max-h-72 overflow-y-auto scrollbar-hidden border-2 border-zinc-700 bg-zinc-950 p-1 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.25)] outline-none",
              empty:
                "px-3 py-3 text-left text-sm font-medium text-zinc-500",
              option: {
                base: "flex w-full items-center justify-between rounded-none px-3 py-2 text-sm font-medium text-zinc-100 transition-colors",
                selected: "bg-emerald-500/15 text-emerald-200",
                active: "bg-zinc-800",
                check: "h-4 w-4 text-emerald-400",
              },
            }
          : {
              trigger:
                "h-12 w-full rounded-none border-2 border-zinc-800 bg-zinc-950 py-3 pl-3 pr-12 text-left text-sm font-semibold text-white transition-colors hover:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:border-emerald-500",
              iconWrap:
                "pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-500",
              icon: "h-4 w-4",
              leadingIcon: "shrink-0 text-zinc-500",
              value: "text-white",
              placeholder: "text-zinc-500",
              menu:
                "absolute z-[70] w-full max-h-72 overflow-y-auto scrollbar-hidden border-2 border-zinc-700 bg-zinc-950 p-1 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.25)] outline-none",
              empty:
                "px-3 py-3 text-left text-sm font-medium text-zinc-500",
              option: {
                base: "flex w-full items-center justify-between rounded-none px-3 py-2 text-sm font-medium text-zinc-100 transition-colors",
                selected: "bg-emerald-500/15 text-emerald-200",
                active: "bg-zinc-800",
                check: "h-4 w-4 text-emerald-400",
              },
            }
        : size === "compact"
        ? {
            trigger:
              "h-11 w-full rounded-none border-2 border-slate-200 bg-slate-50 py-2 pl-2 pr-6 text-left text-[12px] font-semibold text-slate-900 transition-colors hover:bg-white disabled:opacity-60 focus-visible:outline-none focus-visible:border-slate-900",
            iconWrap:
              "pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500",
            icon: "h-3.5 w-3.5",
            leadingIcon: "shrink-0 text-slate-500",
            value: "text-slate-900",
            placeholder: "text-slate-400",
            menu:
              "absolute z-[70] w-full max-h-72 overflow-y-auto scrollbar-hidden border-2 border-slate-900 bg-white p-1 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] outline-none",
            empty:
              "px-3 py-3 text-left text-sm font-medium text-slate-400",
            option: {
              base: "flex w-full items-center justify-between rounded-none px-3 py-2 text-sm font-medium text-slate-900 transition-colors",
              selected: "bg-teal-50 text-slate-900",
              active: "bg-slate-100",
              check: "h-4 w-4 text-teal-600",
            },
          }
        : {
            trigger:
              "h-[50px] w-full rounded-none border-2 border-slate-200 bg-slate-50 py-3 pl-3 pr-9 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-white disabled:opacity-60 focus-visible:outline-none focus-visible:border-slate-900",
            iconWrap:
              "pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500",
            icon: "h-4 w-4",
            leadingIcon: "shrink-0 text-slate-500",
            value: "text-slate-900",
            placeholder: "text-slate-400",
            menu:
              "absolute z-[70] w-full max-h-72 overflow-y-auto scrollbar-hidden border-2 border-slate-900 bg-white p-1 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] outline-none",
            empty:
              "px-3 py-3 text-left text-sm font-medium text-slate-400",
            option: {
              base: "flex w-full items-center justify-between rounded-none px-3 py-2 text-sm font-medium text-slate-900 transition-colors",
              selected: "bg-teal-50 text-slate-900",
              active: "bg-slate-100",
              check: "h-4 w-4 text-teal-600",
            },
          }
      : {
          trigger:
            "w-full rounded-xl border border-border bg-background pl-4 pr-12 py-3 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-background-secondary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          iconWrap:
            "pointer-events-none absolute inset-y-0 right-4 flex items-center text-foreground-muted",
          icon: "h-5 w-5",
          leadingIcon: "shrink-0 text-foreground-muted",
          value: "text-foreground",
          placeholder: "text-foreground-muted",
          menu:
            "absolute z-[70] w-full max-h-72 overflow-y-auto custom-scrollbar rounded-xl border border-border bg-background-secondary p-1 shadow-lg outline-none",
          empty:
            "px-3 py-3 text-left text-sm font-medium text-foreground-muted",
          option: {
            base: "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-foreground",
            selected: "bg-primary/20 text-foreground",
            active: "bg-foreground-muted/10",
            check: "h-4 w-4 text-primary",
          },
        };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        data-invalid={ariaInvalid ? "true" : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={`${styles.trigger} flex items-center justify-between gap-3`}
      >
        <span className="flex min-w-0 items-center gap-3">
          {leadingIcon ? (
            <span className={styles.leadingIcon}>{leadingIcon}</span>
          ) : null}
          <span
            className={`min-w-0 truncate ${
              selected ? styles.value : styles.placeholder
            }`}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span className={styles.iconWrap}>
          <svg
            className={styles.icon}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          aria-activedescendant={activeOptionId}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className={`${styles.menu} ${
            resolvedPlacement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {loading || options.length === 0 ? (
            <div
              role="option"
              aria-disabled="true"
              aria-selected="false"
              className={styles.empty}
            >
              {loading ? loadingLabel : emptyLabel}
            </div>
          ) : null}
          {!loading && options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                id={`${listboxId}-opt-${idx}`}
                data-select-option-index={idx}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  closeMenu();
                  buttonRef.current?.focus();
                }}
                className={`${styles.option.base} ${
                  isSelected ? styles.option.selected : ""
                } ${isActive ? styles.option.active : ""}`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    className={styles.option.check}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.414l-7.2 7.2a1 1 0 01-1.414 0l-3.2-3.2a1 1 0 011.414-1.414l2.493 2.493 6.493-6.493a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
