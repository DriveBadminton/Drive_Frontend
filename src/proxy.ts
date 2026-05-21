import { NextRequest, NextResponse } from "next/server";

const AUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_URL || "https://auth.rallyon.test";

function normalizeHeaderHost(value?: string | null) {
  return (value || "").split(",")[0].trim().split(":")[0];
}

export function proxy(request: NextRequest) {
  const authHost = new URL(AUTH_URL).host;
  const publicHost = normalizeHeaderHost(
    request.headers.get("x-forwarded-host"),
  );

  if (publicHost === authHost) {
    return NextResponse.next();
  }

  const redirectUrl = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    AUTH_URL,
  );

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/login", "/signup"],
};
