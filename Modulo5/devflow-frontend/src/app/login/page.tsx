// ============================================================
// DevFlow — Módulo 5
// app/login/page.tsx — Login real contra la API
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { THEME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Completá email y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch {
      setError("Credenciales incorrectas. Verificá email y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: THEME.bg }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight mb-1"
            style={{ fontFamily: "var(--font-syne), sans-serif", color: THEME.accent }}
          >
            DevFlow
          </h1>
          <p className="text-xs font-mono text-gray-600">
            Soporte técnico con IA
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        >
          <div className="space-y-4" onKeyDown={handleKeyDown}>
            {/* Email */}
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@devflow.app"
                className="w-full text-sm font-mono px-3 py-2.5 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors"
                style={{
                  backgroundColor: THEME.bg,
                  borderColor: THEME.border,
                  color: "#E2E8F0",
                }}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm font-mono px-3 py-2.5 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors"
                style={{
                  backgroundColor: THEME.bg,
                  borderColor: THEME.border,
                  color: "#E2E8F0",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs font-mono px-3 py-2 rounded"
                style={{ backgroundColor: "#EF444418", color: "#EF4444" }}
              >
                {error}
              </p>
            )}

            {/* Botón */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-mono font-bold transition-all"
              style={{
                backgroundColor: loading ? `${THEME.accent}66` : THEME.accent,
                color: "white",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
