"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldActionGroup({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]",
        className
      )}
    >
      <div className="min-w-0">{children}</div>
      <div className="min-w-0 sm:min-w-[8.5rem]">{action}</div>
    </div>
  );
}
