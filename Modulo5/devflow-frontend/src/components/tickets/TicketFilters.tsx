// ============================================================
// DevFlow — Módulo 5
// components/tickets/TicketFilters.tsx — Búsqueda + filtros
// Barra de búsqueda por texto + chips de estado / criticidad /
// cliente. Filtra en el cliente sobre el array ya cargado.
// ============================================================

"use client";

import { THEME, STATUS_CONFIG, STATUS_ORDER, PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/constants";
import type { AnyTicket, TicketStatus, TicketPriority } from "@/types";

// ─── Estado del filtro ──────────────────────────────────────
export interface TicketFilterState {
  query: string;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  clients: string[]; // clientName
}

export const EMPTY_FILTERS: TicketFilterState = {
  query: "",
  statuses: [],
  priorities: [],
  clients: [],
};

export function filtersActive(f: TicketFilterState): boolean {
  return (
    f.query.trim() !== "" ||
    f.statuses.length > 0 ||
    f.priorities.length > 0 ||
    f.clients.length > 0
  );
}

// Aplica el filtro a un arreglo de tickets.
export function applyFilters(tickets: AnyTicket[], f: TicketFilterState): AnyTicket[] {
  const q = f.query.trim().toLowerCase();
  return tickets.filter((t) => {
    if (q) {
      const hay = `${t.id} ${t.title} ${t.description} ${t.clientName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    if (f.priorities.length && !(t.priority && f.priorities.includes(t.priority))) return false;
    if (f.clients.length && !f.clients.includes(t.clientName)) return false;
    return true;
  });
}

// ─── Chip toggleable ────────────────────────────────────────
function Chip({
  label, color, active, onClick,
}: { label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-mono px-2.5 py-1 rounded-md transition-colors"
      style={{
        backgroundColor: active ? `${color}22` : THEME.surface,
        color: active ? color : "#94A3B8",
        border: `1px solid ${active ? color : THEME.border}`,
      }}
    >
      {label}
    </button>
  );
}

interface TicketFiltersProps {
  tickets: AnyTicket[]; // todos (para derivar la lista de clientes)
  isAdmin: boolean;
  value: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
}

export function TicketFilters({ tickets, isAdmin, value, onChange }: TicketFiltersProps) {
  const clientNames = isAdmin
    ? Array.from(new Set(tickets.map((t) => t.clientName))).sort()
    : [];

  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const active = filtersActive(value);

  return (
    <div className="flex flex-col gap-2 mb-4 shrink-0">
      {/* Búsqueda + limpiar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
          <input
            type="text"
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Buscar por ID, título, descripción o cliente…"
            className="w-full text-xs font-mono pl-8 pr-3 py-2 rounded-md focus:outline-none focus:border-indigo-500"
            style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, color: "#E2E8F0" }}
          />
        </div>
        {active && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs font-mono text-gray-500 hover:text-red-400 transition-colors px-2.5 py-2 rounded-md border"
            style={{ borderColor: THEME.border }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Chips de estado */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-mono text-gray-600 mr-1">Estado:</span>
        {STATUS_ORDER.map((s) => (
          <Chip
            key={s}
            label={STATUS_CONFIG[s].label}
            color={STATUS_CONFIG[s].color}
            active={value.statuses.includes(s)}
            onClick={() => onChange({ ...value, statuses: toggle(value.statuses, s) })}
          />
        ))}
      </div>

      {/* Chips de criticidad */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-mono text-gray-600 mr-1">Criticidad:</span>
        {PRIORITY_ORDER.map((p) => (
          <Chip
            key={p}
            label={PRIORITY_CONFIG[p].label}
            color={PRIORITY_CONFIG[p].color}
            active={value.priorities.includes(p)}
            onClick={() => onChange({ ...value, priorities: toggle(value.priorities, p) })}
          />
        ))}
      </div>

      {/* Chips de cliente (solo admin, si hay más de uno) */}
      {isAdmin && clientNames.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-gray-600 mr-1">Cliente:</span>
          {clientNames.map((name) => (
            <Chip
              key={name}
              label={name}
              color={THEME.accent}
              active={value.clients.includes(name)}
              onClick={() => onChange({ ...value, clients: toggle(value.clients, name) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
