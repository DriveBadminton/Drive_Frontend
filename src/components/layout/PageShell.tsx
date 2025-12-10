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
    <div className="min-h-screen bg-background text-foreground">
      {!disableHeader && <MainHeader />}
      <main className={mainClassName ? `flex-1 ${mainClassName}` : "flex-1"}>
        {children}
      </main>
      {!disableFooter && <MainFooter />}
    </div>
  );
}
