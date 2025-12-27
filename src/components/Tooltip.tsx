"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  message: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({
  message,
  children,
  position = "top",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-border border-l-transparent border-r-transparent border-b-transparent border-t-4",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-border border-l-transparent border-r-transparent border-t-transparent border-b-4",
    left: "left-full top-1/2 -translate-y-1/2 border-l-border border-t-transparent border-b-transparent border-r-transparent border-l-4",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-border border-t-transparent border-b-transparent border-l-transparent border-r-4",
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap rounded-lg bg-background-secondary px-3 py-2 text-xs font-medium text-foreground shadow-lg ring-1 ring-border ${positionClasses[position]}`}
        >
          {message}
          <div
            className={`absolute ${arrowClasses[position]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
