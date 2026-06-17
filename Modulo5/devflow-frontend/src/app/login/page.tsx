// ============================================================
// DevFlow — Módulo 5
// app/login/page.tsx — Login real contra la API
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { THEME, DEMO_CREDENTIALS, API_URL } from "@/lib/constants";

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

  function fillCredentials(cred: typeof DEMO_CREDENTIALS[number]) {
    setEmail(cred.email);
    setPassword(cred.password);
    setError(null);
  }

  function loginWithGitHub() {
    // El backend maneja el OAuth (secretos server-side) y vuelve a
    // /auth/github/callback?token=...
    window.location.href = `${API_URL}/auth/github/login`;
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

            {/* Separador */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ backgroundColor: THEME.border }} />
              <span className="text-xs font-mono text-gray-600">o</span>
              <div className="flex-1 h-px" style={{ backgroundColor: THEME.border }} />
            </div>

            {/* Login con GitHub */}
            <button
              onClick={loginWithGitHub}
              className="w-full py-2.5 rounded-lg text-sm font-mono font-bold transition-all flex items-center justify-center gap-2 hover:brightness-110"
              style={{
                backgroundColor: "#161B22",
                color: "#E2E8F0",
                border: `1px solid ${THEME.border}`,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Continuar con GitHub
            </button>
          </div>
        </div>

        {/* Credenciales demo */}
        <div className="mt-4">
          <p className="text-xs font-mono text-gray-600 text-center mb-2">
            Credenciales demo
          </p>
          <div className="space-y-1.5">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.email}
                onClick={() => fillCredentials(cred)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors hover:brightness-110"
                style={{
                  backgroundColor: THEME.surface,
                  border: `1px solid ${THEME.border}`,
                  color: "#64748B",
                }}
              >
                <span
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor:
                      cred.role === "admin" ? `${THEME.accent}22` : "#22C55E22",
                    color: cred.role === "admin" ? THEME.accent : "#22C55E",
                  }}
                >
                  {cred.role}
                </span>
                <span>{cred.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
