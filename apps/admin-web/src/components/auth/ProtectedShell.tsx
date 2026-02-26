"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth/token";
import { decodeJwt } from "@/lib/auth/jwt";

type ProtectedShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function ProtectedShell({ children }: ProtectedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const token = useMemo(() => getToken(), [pathname]);
  const claims = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, token]);

  if (!ready) return <div className="p-6">Loading...</div>;

  const display =
    claims?.email ?? claims?.username ?? claims?.name ?? claims?.sub ?? "User";

  return (
    <div className="min-h-screen">
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="font-semibold">FactoryFlow Admin</div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{display}</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/logout">Logout</Link>
          </Button>
        </div>
      </div>

      <main className="p-4">{children}</main>
    </div>
  );
}
