// ============================================================
// DevFlow — Módulo 5
// lib/auth.ts — Helpers de autenticación
// ============================================================

import Cookies from "js-cookie";
import api from "@/lib/api";
import type { User, LoginRequest, LoginResponse } from "@/types";

const TOKEN_KEY = "devflow_token";
const USER_KEY  = "devflow_user";

// ─── Login ───────────────────────────────────────────────────
export async function login(credentials: LoginRequest): Promise<User> {
  // Backend espera JSON, no form-urlencoded
  const { data } = await api.post<{ accessToken: string }>("/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });

  // Guardar token primero para que el interceptor lo use
  Cookies.set(TOKEN_KEY, data.accessToken, { expires: 7 });

  // Obtener datos del usuario con el token recién guardado
  const { data: user } = await api.get<User>("/auth/me");
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7 });

  return user;
}

// ─── Login con token ya emitido (OAuth GitHub) ───────────────
// El backend redirige a /auth/github/callback?token=... ; acá guardamos
// el token y traemos el usuario, igual que login() pero sin password.
export async function loginWithToken(token: string): Promise<User> {
  Cookies.set(TOKEN_KEY, token, { expires: 7 });
  const { data: user } = await api.get<User>("/auth/me");
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7 });
  return user;
}

// ─── Logout ──────────────────────────────────────────────────
export function logout(): void {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// ─── Obtener token ───────────────────────────────────────────
export function getToken(): string | null {
  return Cookies.get(TOKEN_KEY) ?? null;
}

// ─── Obtener usuario desde cookie (sin llamada a la API) ─────
export function getUserFromCookie(): User | null {
  try {
    const raw = Cookies.get(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// ─── Verificar sesión activa contra el backend ───────────────
// Llama a GET /auth/me — si falla, el interceptor de api.ts limpia cookies
export async function verifySession(): Promise<User | null> {
  try {
    const { data } = await api.get<User>("/auth/me");
    // Actualiza la cookie con los datos frescos del servidor
    Cookies.set(USER_KEY, JSON.stringify(data), { expires: 7 });
    return data;
  } catch {
    return null;
  }
}

// ─── Helper de rol ───────────────────────────────────────────
export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}
