"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: "홈", to: "/" },
  { label: "코트매니저", to: "/court-manager" },
  { label: "배드민턴 뉴스", to: "/news" },
];

export default function MainHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isLoggedIn, logout } = useAuth();

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative mx-auto flex h-16 w-full max-w-[112rem] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Logo variant="dark" className="h-7" />
          </Link>

          <nav className="hidden gap-6 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.to === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  href={item.to}
                  className={`text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
                    isActive ? "text-emerald-500" : "text-zinc-400 hover:text-emerald-500"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex md:gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-10 w-24 animate-pulse rounded-none border border-zinc-800 bg-zinc-900" />
                <div className="h-10 w-28 animate-pulse rounded-none bg-zinc-800" />
              </div>
            ) : isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-none text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-zinc-950">
                      <User className="h-3 w-3" />
                    </div>
                    {user?.nickname || "My Account"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-none border-2 border-zinc-800 bg-zinc-950 text-zinc-300"
                >
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    내 계정
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer rounded-none text-xs font-bold uppercase tracking-widest focus:bg-zinc-800 focus:text-white"
                  >
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      프로필
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-none text-xs font-bold uppercase tracking-widest focus:bg-zinc-800 focus:text-white"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="rounded-none text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <Link href={`/login?returnTo=${encodeURIComponent(pathname || "/")}`}>
                    로그인
                  </Link>
                </Button>
                <Button
                  asChild
                  className="rounded-none bg-orange-500 text-xs font-bold uppercase tracking-widest text-zinc-950 hover:bg-orange-400"
                >
                  <Link href="/login?returnTo=%2Fcourt-manager">시작하기</Link>
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none text-zinc-300 hover:bg-zinc-800 hover:text-white md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
