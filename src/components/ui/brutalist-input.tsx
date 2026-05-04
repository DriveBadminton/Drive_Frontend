"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrutalistInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leadingIcon?: React.ReactNode;
}

const BrutalistInput = React.forwardRef<HTMLInputElement, BrutalistInputProps>(
  ({ className, error = false, leadingIcon, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const isInvalid = error || ariaInvalid === true || ariaInvalid === "true";

    return (
      <div className="relative min-w-0">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          aria-invalid={isInvalid || undefined}
          className={cn(
            "h-14 w-full rounded-none border-2 bg-slate-50 px-4 text-sm font-medium text-slate-900 transition-colors placeholder:text-slate-400 focus:bg-white focus:outline-none",
            leadingIcon ? "pl-11" : "",
            isInvalid
              ? "border-red-300 focus:border-red-500"
              : "border-slate-200 focus:border-slate-900",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

BrutalistInput.displayName = "BrutalistInput";

export { BrutalistInput };
