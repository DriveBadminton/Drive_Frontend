import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormFieldRenderProps = {
  id: string;
  describedBy?: string;
  invalid: boolean;
};

export function FormField({
  id,
  label,
  labelVisibility = "visible",
  required = false,
  errorText,
  helperText,
  className,
  children,
}: {
  id: string;
  label: string;
  labelVisibility?: "visible" | "sr-only";
  required?: boolean;
  errorText?: string;
  helperText?: string;
  className?: string;
  children: ReactNode | ((props: FormFieldRenderProps) => ReactNode);
}) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(errorText);

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-[11px] font-mono font-bold uppercase tracking-widest text-slate-900",
          labelVisibility === "sr-only" ? "sr-only" : ""
        )}
      >
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>

      {typeof children === "function"
        ? children({ id, describedBy, invalid })
        : children}

      {helperText ? (
        <p id={helperId} className="text-xs font-medium text-slate-500">
          {helperText}
        </p>
      ) : null}
      {errorText ? (
        <p
          id={errorId}
          className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
        >
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
