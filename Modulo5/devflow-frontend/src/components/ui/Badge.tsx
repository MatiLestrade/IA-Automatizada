// ============================================================
// DevFlow — Módulo 5
// components/ui/Badge.tsx — PriorityBadge, StatusBadge, TypeBadge
// ============================================================

import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG } from "@/lib/constants";
import type { TicketStatus, TicketPriority, TicketType } from "@/types";

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
