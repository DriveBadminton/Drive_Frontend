import PageShell from "@/components/layout/PageShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell disableFooter mainClassName="min-h-0 flex-1 bg-[#F8F9FA]">
      <div className="flex min-h-0 flex-1 flex-col bg-[#F8F9FA]">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </PageShell>
  );
}
