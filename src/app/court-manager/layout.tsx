import PageShell from "@/components/layout/PageShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell
      disableFooter
      mainClassName="flex h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#F8F9FA]"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </PageShell>
  );
}
