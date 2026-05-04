"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrutalistFieldButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
  placeholder: string;
  error?: boolean;
  leadingIcon?: React.ReactNode;
}

const BrutalistFieldButton = React.forwardRef<
  HTMLButtonElement,
  BrutalistFieldButtonProps
>(
  (
    {
      className,
      value,
      placeholder,
      error = false,
      leadingIcon,
      "aria-invalid": ariaInvalid,
      children,
      ...props
    },
    ref
  ) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === "true";

    return (
      <button
        ref={ref}
        type="button"
        data-invalid={isInvalid || undefined}
        className={cn(
          "flex h-14 w-full min-w-0 items-center gap-3 rounded-none border-2 bg-slate-50 px-3 text-left transition-colors focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          isInvalid
            ? "border-red-300 focus:border-red-500"
            : "border-slate-200 hover:border-slate-900 focus:border-slate-900",
          className
        )}
        {...props}
      >
        {leadingIcon ? (
          <span className="shrink-0 text-slate-400">{leadingIcon}</span>
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            value ? "text-slate-900" : "text-slate-400"
          )}
        >
          {value || placeholder}
        </span>
        {children}
      </button>
    );
  }
);

BrutalistFieldButton.displayName = "BrutalistFieldButton";

export { BrutalistFieldButton };
