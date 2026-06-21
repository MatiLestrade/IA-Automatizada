// ============================================================
// DevFlow — Módulo 5
// components/ui/Badge.tsx — PriorityBadge, StatusBadge, TypeBadge
// ============================================================

import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG, THEME } from "@/lib/constants";
import type { TicketStatus, TicketPriority, TicketType } from "@/types";

// ─── PriorityNumber ─────────────────────────────────────────
// Cuadradito chico con el nº de prioridad INVERTIDO: 1 = máxima
// prioridad (Crítica) … 4 = mínima (Baja). Color apagado (tinte).
export function PriorityNumber({ priority }: { priority?: TicketPriority | null }) {
  const config = priority ? PRIORITY_CONFIG[priority] : null;
  if (!config) {
    return (
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0"
        style={{ backgroundColor: `${THEME.border}80`, color: "#64748B" }}
        title="Sin clasificar"
      >
        —
      </div>
    );
  }
  const rank = 5 - config.weight; // Crítica(4)→1, Alta→2, Media→3, Baja(1)→4
  return (
    <div
      className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0"
      style={{ backgroundColor: `${config.color}22`, color: config.color, border: `1px solid ${config.color}40` }}
      title={`Prioridad: ${config.label} (${rank})`}
    >
      {rank}
    </div>
  );
}

// ─── StatusBadge ────────────────────────────────────────────
interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{
        color: config.color,
        border: `1px solid ${config.color}33`,
        backgroundColor: `${config.color}18`,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}

// ─── PriorityBadge ──────────────────────────────────────────
interface PriorityBadgeProps {
  priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;
  return (
    <span
      style={{
        color: config.color,
        border: `1px solid ${config.color}33`,
        backgroundColor: `${config.color}18`,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}

// ─── ClientBadge ─────────────────────────────────────────────
export function ClientBadge({ name }: { name: string }) {
  return (
    <span
      style={{ color: "#A5B4FC", border: "1px solid #A5B4FC33", backgroundColor: "#A5B4FC18" }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap"
    >
      {name}
    </span>
  );
}

// ─── TypeBadge ──────────────────────────────────────────────
interface TypeBadgeProps {
  type: TicketType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  return (
    <span
      style={{
        color: config.color,
        border: `1px solid ${config.color}33`,
        backgroundColor: config.bg,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}
