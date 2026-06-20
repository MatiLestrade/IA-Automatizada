// ============================================================
// DevFlow — Módulo 5
// lib/api.ts — Instancia axios con interceptor JWT
// ============================================================

import axios from "axios";
import Cookies from "js-cookie";
import { API_URL } from "@/lib/constants";

// ─── snake_case → camelCase ───────────────────────────────────
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        camelizeKeys(v),
      ])
    );
  }
  return obj;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    // Saltea la página de aviso de ngrok en las llamadas a la API (mismo origen)
    "ngrok-skip-browser-warning": "true",
  },
});

// Interceptor de request — agrega el token JWT en cada llamada
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("devflow_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de response — convierte snake_case a camelCase + maneja 401
api.interceptors.response.use(
  (response) => {
    response.data = camelizeKeys(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("devflow_token");
      Cookies.remove("devflow_user");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
