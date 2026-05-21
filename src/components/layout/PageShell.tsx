import type { ReactNode } from "react";
import MainHeader from "./MainHeader";
import MainFooter from "./MainFooter";

interface PageShellProps {
  children: ReactNode;
  mainClassName?: string;
  disableFooter?: boolean;
  disableHeader?: boolean;
}

export default function PageShell({
  children,
  mainClassName,
  disableFooter = false,
  disableHeader = false,
}: PageShellProps) {
  return (
    <div className="flex min-h-screen min-h-[100svh] flex-col bg-slate-50 text-slate-900">
      {!disableHeader && <MainHeader />}
      <main
        className={
          mainClassName
            ? `flex min-h-0 flex-1 flex-col ${mainClassName}`
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        {children}
      </main>
      {!disableFooter && <MainFooter />}
    </div>
  );
}
