// ============================================================
// DevFlow — Módulo 5
// app/auth/github/callback/page.tsx
// Recibe el ?token=... que emite el backend tras el OAuth de GitHub,
// lo guarda y redirige al dashboard.
// ============================================================

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithToken } from "@/lib/auth";
import { THEME } from "@/lib/constants";

function GitHubCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("No se recibió el token de GitHub.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loginWithToken(token);
        if (!cancelled) router.replace("/dashboard");
      } catch {
        if (!cancelled) setError("No se pudo iniciar sesión con GitHub.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: THEME.bg }}
    >
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm font-mono mb-3" style={{ color: "#EF4444" }}>
              {error}
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="text-xs font-mono px-3 py-2 rounded-lg"
              style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, color: "#E2E8F0" }}
            >
              Volver al login
            </button>
          </>
        ) : (
          <p className="text-sm font-mono text-gray-400">
            Conectando con GitHub…
          </p>
        )}
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GitHubCallback />
    </Suspense>
  );
}
