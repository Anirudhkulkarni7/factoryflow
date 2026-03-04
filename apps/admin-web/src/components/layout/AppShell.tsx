"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "./nav";

import { getToken } from "@/lib/auth/token";
import { decodeJwt } from "@/lib/auth/jwt";
import { getSessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/layout/ModeToggle";
type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const token = useMemo(() => getToken(), [pathname]);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, token]);

  const displayName = useMemo(() => {
    if (!token) return "";
    const claims = decodeJwt(token);
    const stored = getSessionUser();
    return (
      claims?.email ??
      claims?.username ??
      stored?.email ??
      (claims?.sub ? `User ${String(claims.sub).slice(0, 8)}…` : "User")
    );
  }, [token]);

  if (!ready) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 h-14 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="font-semibold">FloorOps</div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <span className="text-sm text-muted-foreground">{displayName}</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/logout">Logout</Link>
            </Button>
          </div>
        </div>
      </header>
      {/* Body */}
      <div className="mx-auto flex max-w-screen-2xlgap-4 px-4 py-4">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="rounded-lg border bg-background p-2">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 rounded-lg border bg-background p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
