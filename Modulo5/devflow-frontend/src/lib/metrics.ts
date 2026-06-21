// ============================================================
// DevFlow — Módulo 5
// lib/metrics.ts — Cálculo de KPIs a partir del array de tickets
// Todo se deriva en el cliente (sin endpoints nuevos).
// ============================================================

import type { AnyTicket, TicketStatus, TicketPriority } from "@/types";

// "30m" | "2h" | "1d" | "3d" → milisegundos (o null si no se entiende).
export function parseEta(eta: string | null | undefined): number | null {
  if (!eta) return null;
  const m = eta.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(m|h|d)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2];
  const factor = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * factor;
}

const OPEN_EXCLUDED: TicketStatus[] = ["completed", "rejected"];

export interface TicketMetrics {
  total: number;
  open: number;
  completed: number;
  rejected: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>; // incluye "none"
  avgResolutionMs: number | null;     // null si no hay completados con timestamp
  resolvedCount: number;
  overdue: number;
}

// Busca en el change_log el instante en que el ticket pasó a "completed".
function completedAt(t: AnyTicket): number | null {
  const log = t.changeLog ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const ev = log[i];
    if (ev.changes?.some((c) => c.field === "status" && c.new === "completed")) {
      const ms = new Date(ev.at).getTime();
      return isNaN(ms) ? null : ms;
    }
  }
  return null;
}

export function computeMetrics(tickets: AnyTicket[]): TicketMetrics {
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let open = 0, completed = 0, rejected = 0;
  let resolutionSum = 0, resolvedCount = 0, overdue = 0;
  const now = Date.now();

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const pKey: TicketPriority | "none" = t.priority ?? "none";
    byPriority[pKey] = (byPriority[pKey] ?? 0) + 1;

    if (t.status === "completed") completed++;
    else if (t.status === "rejected") rejected++;
    else open++;

    // Tiempo de resolución (solo completados con timestamp en el log)
    if (t.status === "completed") {
      const done = completedAt(t);
      const created = new Date(t.createdAt).getTime();
      if (done && !isNaN(created) && done >= created) {
        resolutionSum += done - created;
        resolvedCount++;
      }
    }

    // Vencidos: abiertos cuyo created_at + eta ya pasó
    if (!OPEN_EXCLUDED.includes(t.status)) {
      const etaMs = parseEta(t.eta);
      const created = new Date(t.createdAt).getTime();
      if (etaMs != null && !isNaN(created) && created + etaMs < now) overdue++;
    }
  }

  return {
    total: tickets.length,
    open,
    completed,
    rejected,
    byStatus,
    byPriority,
    avgResolutionMs: resolvedCount ? resolutionSum / resolvedCount : null,
    resolvedCount,
    overdue,
  };
}

// Formatea una duración en ms a algo legible: "2h 15m", "1d 4h", "45m".
export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}
