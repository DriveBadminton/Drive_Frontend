"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
};

export default function Select({
  value,
  options,
  placeholder = "선택",
  disabled = false,
  onChange,
  className = "",
}: Props) {
  const buttonId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
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

  // 메뉴가 열리면 listbox로 포커스를 이동해서 ↑/↓ 키로 바로 조작 가능하게
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.focus();
    });
  }, [open]);

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
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
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

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onButtonKeyDown}
        className="w-full rounded-xl border border-border bg-background pl-4 pr-12 py-3 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-background-secondary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className={selected ? "" : "text-foreground-muted"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-foreground-muted">
          <svg
            className="h-5 w-5"
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
          aria-labelledby={buttonId}
          aria-activedescendant={activeOptionId}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute z-50 mt-2 w-full max-h-[280px] overflow-y-auto custom-scrollbar rounded-xl border border-border bg-background-secondary p-1 shadow-lg outline-none"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                id={`${listboxId}-opt-${idx}`}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  closeMenu();
                  buttonRef.current?.focus();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary/20 text-foreground"
                    : "text-foreground"
                } ${isActive ? "bg-foreground-muted/10" : ""}`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    className="h-4 w-4 text-primary"
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
