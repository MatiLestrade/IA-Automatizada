// ============================================================
// DevFlow — Módulo 5
// app/page.tsx — Redirect según auth
// ============================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <span className="text-sm font-mono text-gray-600 animate-pulse">
        Cargando...
      </span>
    </div>
  );
}
