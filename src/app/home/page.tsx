import PageShell from "@/components/layout/PageShell";

export default function HomePage() {
  // 로그인 성공 후 도착하는 메인 서비스 페이지 (URL은 /home 유지)
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">대회 검색</h1>
        <p className="mt-2 text-foreground-muted">
          대회/선수 검색 페이지는 준비 중입니다.
        </p>
      </div>
    </PageShell>
  );
}
