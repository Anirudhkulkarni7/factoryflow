"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth/authService";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    authService.logout();
    router.replace("/login");
  }, [router]);

  return <div className="p-6">Signing out...</div>;
}