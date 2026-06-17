// ============================================================
// DevFlow — Módulo 5
// lib/constants.ts — Configuraciones de estado, prioridad y tipo
// ============================================================

import type { TicketStatus, TicketPriority, TicketType } from "@/types";

// ─── Status ─────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  TicketStatus,
  { color: string; label: string }
> = {
  received:   { color: "#94A3B8", label: "Recibido"    },
  analyzing:  { color: "#60A5FA", label: "Analizando"  },
  queued:     { color: "#A78BFA", label: "En cola"     },
  approval:   { color: "#FBBF24", label: "Aprobación"  },
  inprogress: { color: "#34D399", label: "En progreso" },
  completed:  { color: "#22C55E", label: "Completado"  },
  rejected:   { color: "#EF4444", label: "Rechazado"   },
  reopened:   { color: "#F97316", label: "Reabierto"   },
};

// Orden para el sidebar (contadores de estado)
export const STATUS_ORDER: TicketStatus[] = [
  "received",
  "analyzing",
  "queued",
  "approval",
  "inprogress",
  "completed",
  "rejected",
  "reopened",
];

// ─── Prioridad ───────────────────────────────────────────────
export const PRIORITY_CONFIG: Record<
  TicketPriority,
  { color: string; label: string; weight: number }
> = {
  LOW:      { color: "#22C55E", label: "Baja",     weight: 1 },
  MEDIUM:   { color: "#EAB308", label: "Media",    weight: 2 },
  HIGH:     { color: "#F97316", label: "Alta",     weight: 3 },
  CRITICAL: { color: "#EF4444", label: "Crítica",  weight: 4 },
};

// Orden para el pool (CRITICAL primero)
export const PRIORITY_ORDER: TicketPriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

// Lógica de escalado al reabrir
export const PRIORITY_ESCALATION: Record<TicketPriority, TicketPriority> = {
  LOW:      "MEDIUM",
  MEDIUM:   "HIGH",
  HIGH:     "HIGH",     // tope sin llegar a CRITICAL
  CRITICAL: "CRITICAL", // se mantiene
};

// ─── Tipo de ticket ──────────────────────────────────────────
export const TYPE_CONFIG: Record<
  TicketType,
  { label: string; color: string; bg: string }
> = {
  FE: { label: "Frontend", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  BE: { label: "Backend",  color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  DB: { label: "Base de datos", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
};

// ─── Diseño / Tema ───────────────────────────────────────────
export const THEME = {
  bg:      "#0A0A0F",
  surface: "#12121A",
  border:  "#1E1E30",
  accent:  "#6366F1",
} as const;

// ─── Modo AUTO — prioridades que requieren aprobación siempre ─
export const AUTO_REQUIRES_APPROVAL: TicketPriority[] = ["HIGH", "CRITICAL"];

// ─── Variables de entorno ────────────────────────────────────
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Credenciales demo (referencia visual, no usar en prod) ──
export const DEMO_CREDENTIALS = [
  { role: "admin",  email: "dev@devflow.app",    password: "admin123"  },
  { role: "client", email: "admin@techpyme.com", password: "client123" },
  { role: "client", email: "admin@cnorte.com",   password: "client456" },
] as const;
