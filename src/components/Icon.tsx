import type { ReactNode } from "react";

type IconName =
    | "arrow-left"
    | "delete"
    | "globe"
    | "info"
    | "lock"
    | "time"
    | "user-add"
    | "plus"
    | "history"
    | "checklist"
    | "logout"
    | "trophy"
    | "group"
    | "ping-pong"
    | "bar-chart"
    | "check"
    | "warning"
    | "men"
    | "women"
    | "user"
    | "user-search"
    | "game"
    | "close"
    | "eye"
    | "copy"
    | "search"
    | "share"
    | "medal"
    | "team"
    | "chevron-down";

interface IconProps {
    name: IconName;
    className?: string;
    strokeWidth?: number;
}

const paths: Record<IconName, ReactNode> = {
    "arrow-left": <path d="M11 5l-7 7 7 7M4 12h16" />, // arrow left
    delete: (
        <>
            <path d="M5 7h14" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
        </>
    ),
    globe: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a14 14 0 010 18" />
            <path d="M12 3a14 14 0 000 18" />
        </>
    ),
    info: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8h.01" />
            <path d="M11 12h1v4h1" />
        </>
    ),
    lock: (
        <>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M12 5a3 3 0 013 3v3H9V8a3 3 0 013-3z" />
        </>
    ),
    time: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    "user-add": (
        <>
            <path d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
            <circle cx="9.5" cy="7" r="3.5" />
            <path d="M19 8v6" />
            <path d="M16 11h6" />
        </>
    ),
    plus: (
        <>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
        </>
    ),
    history: (
        <>
            <path d="M3 3v6h6" />
            <path d="M3.05 13A9 9 0 1012 3a9 9 0 00-6.36 2.64" />
            <path d="M12 7v6l4 2" />
        </>
    ),
    checklist: (
        <>
            <path d="M9 6h12" />
            <path d="M9 12h12" />
            <path d="M9 18h12" />
            <path d="M4.5 5l2 2 3-3" />
            <path d="M4.5 11l2 2 3-3" />
            <path d="M4.5 17l2 2 3-3" />
        </>
    ),
    logout: (
        <>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
        </>
    ),
    trophy: (
        <>
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 01-5 5 5 5 0 01-5-5V4z" />
            <path d="M5 4h2v2a4 4 0 01-4 4" />
            <path d="M19 4h2v2a4 4 0 01-4 4" />
        </>
    ),
    group: (
        <>
            <circle cx="9" cy="7" r="3" />
            <circle cx="17" cy="9" r="3" />
            <path d="M2 21v-1a6 6 0 016-6h2a6 6 0 016 6v1" />
            <path d="M14 21v-1a5 5 0 015-5h1" />
        </>
    ),
    "ping-pong": (
        <>
            <circle cx="9" cy="9" r="6" />
            <circle cx="17" cy="15" r="3" />
            <path d="M13 13l6 6" />
        </>
    ),
    "bar-chart": (
        <>
            <path d="M3 3v18h18" />
            <rect x="7" y="9" width="3" height="6" rx="1" />
            <rect x="12" y="5" width="3" height="10" rx="1" />
            <rect x="17" y="11" width="3" height="4" rx="1" />
        </>
    ),
    check: (
        <path d="M5 13l4 4L19 7" />
    ),
    warning: (
        <>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </>
    ),
    men: (
        <>
            <circle cx="9" cy="7" r="3" />
            <path d="M9 10v8" />
            <path d="M6 21h6" />
            <path d="M15 3h6v6" />
            <path d="M21 3l-7 7" />
        </>
    ),
    women: (
        <>
            <circle cx="12" cy="7" r="3" />
            <path d="M12 10v8" />
            <path d="M9 18h6" />
            <path d="M12 18v3" />
            <path d="M6 3h6v6" />
            <path d="M12 9L6 3" />
        </>
    ),
    user: (
        <>
            <path d="M15 19a4 4 0 00-8 0" />
            <circle cx="11" cy="7" r="4" />
            <path d="M3 21h16" />
        </>
    ),
    "user-search": (
        <>
            <circle cx="10" cy="8" r="4" />
            <path d="M6 21v-2a4 4 0 014-4h0a4 4 0 014 4v2" />
            <circle cx="18" cy="18" r="3" />
            <path d="M20.5 20.5L23 23" />
        </>
    ),
    game: (
        <>
            <rect x="3" y="8" width="18" height="10" rx="2" />
            <path d="M7 12h2" />
            <path d="M9 10v4" />
            <circle cx="15.5" cy="12" r="1.5" />
            <circle cx="18.5" cy="14.5" r="1" />
        </>
    ),
    close: (
        <>
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
        </>
    ),
    eye: (
        <>
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    copy: (
        <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15V7a2 2 0 012-2h8" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
        </>
    ),
    share: (
        <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98" />
            <path d="M15.42 6.51l-6.83 3.98" />
        </>
    ),
    medal: (
        <>
            <circle cx="12" cy="13" r="4" />
            <path d="M6 3l6 6 6-6" />
            <path d="M12 17v4" />
        </>
    ),
    team: (
        <>
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="8" r="3" />
            <path d="M2 21v-1a6 6 0 016-6h0" />
            <path d="M22 21v-1a6 6 0 00-6-6h0" />
            <path d="M10 21v-1a4 4 0 018 0v1" />
        </>
    ),
    "chevron-down": (
        <path d="M19 9l-7 7-7-7" />
    ),
};

export default function Icon({ name, className, strokeWidth = 1.8 }: IconProps) {
    const baseClass = className ? `h-5 w-5 ${className}` : "h-5 w-5";
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={baseClass}
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}
