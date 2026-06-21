// ============================================================
// DevFlow — Módulo 5
// components/tickets/TicketBoard.tsx
// Tablero KANBAN: columnas (estado / criticidad / cliente / fecha /
// todos) de izquierda a derecha, tarjetas apiladas verticalmente.
// En modo "estado" (solo admin) se arrastran las tarjetas entre
// columnas para cambiar el estado. El arrastre usa eventos de mouse
// (no el drag nativo de HTML5, que es poco confiable).
// ============================================================

"use client";

import { useRef, useState } from "react";
import { TicketCard } from "@/components/tickets/TicketCard";
import {
  THEME,
  STATUS_CONFIG,
  STATUS_ORDER,
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
} from "@/lib/constants";
import type { AnyTicket, TicketStatus, TicketPriority, User } from "@/types";

export type GroupBy = "none" | "status" | "priority" | "client" | "date";

interface Column {
  key: string;
  label: string;
  color: string;
  status?: TicketStatus; // presente solo en groupBy === "status" (target de drop)
  tickets: AnyTicket[];
}

interface TicketBoardProps {
  tickets: AnyTicket[];
  user: User;
  groupBy: GroupBy;
  onCardClick: (t: AnyTicket) => void;
  onChangeStatus?: (id: string, status: TicketStatus) => void;
}

// ─── Helpers de agrupación ───────────────────────────────────
function dayKey(d: Date): string {
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR");
}
function dayLabel(key: string): string {
  const today = new Date().toLocaleDateString("es-AR");
  const yest = new Date(Date.now() - 86_400_000).toLocaleDateString("es-AR");
  if (key === today) return "Hoy";
  if (key === yest) return "Ayer";
  return key;
}
function byDateDesc(a: AnyTicket, b: AnyTicket): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// Estados que NO se muestran en el tablero (transitorios): quedan en el historial.
const HIDDEN_STATUSES: TicketStatus[] = ["received", "analyzing"];

function buildColumns(tickets: AnyTicket[], groupBy: GroupBy): Column[] {
  const sorted = [...tickets]
    .filter((t) => !HIDDEN_STATUSES.includes(t.status))
    .sort(byDateDesc);

  if (groupBy === "status") {
    return STATUS_ORDER.filter((s) => !HIDDEN_STATUSES.includes(s)).map((s) => ({
      key: s,
      label: STATUS_CONFIG[s].label,
      color: STATUS_CONFIG[s].color,
      status: s,
      tickets: sorted.filter((t) => t.status === s),
    }));
  }
  if (groupBy === "priority") {
    // De menor a mayor criticidad (Baja → Crítica). PRIORITY_ORDER viene al revés.
    const lowToCrit = [...PRIORITY_ORDER].reverse();
    const cols: Array<{ key: TicketPriority | "none"; label: string; color: string }> = [
      { key: "none", label: "Sin clasificar", color: "#475569" },
      ...lowToCrit.map((p) => ({ key: p, label: PRIORITY_CONFIG[p].label, color: PRIORITY_CONFIG[p].color })),
    ];
    return cols.map((c) => ({
      key: c.key, label: c.label, color: c.color,
      tickets: sorted.filter((t) => (t.priority ?? "none") === c.key),
    }));
  }
  if (groupBy === "client") {
    const names = Array.from(new Set(sorted.map((t) => t.clientName))).sort();
    return names.map((name) => ({
      key: name || "—", label: name || "—", color: THEME.accent,
      tickets: sorted.filter((t) => t.clientName === name),
    }));
  }
  if (groupBy === "date") {
    // Columnas de menor a mayor fecha (más viejo a la izquierda). `sorted` viene
    // de más nuevo a más viejo, así que invertimos el orden de las columnas.
    const keys = Array.from(new Set(sorted.map((t) => dayKey(new Date(t.createdAt))))).reverse();
    return keys.map((k) => ({
      key: k, label: dayLabel(k), color: THEME.accent,
      tickets: sorted.filter((t) => dayKey(new Date(t.createdAt)) === k),
    }));
  }
  // none: una sola columna con todos
  return [{ key: "all", label: "Todos", color: THEME.accent, tickets: sorted }];
}

// ─── Componente ──────────────────────────────────────────────
export function TicketBoard({
  tickets, user, groupBy, onCardClick, onChangeStatus,
}: TicketBoardProps) {
  const isAdmin = user.role === "admin";
  const draggable = groupBy === "status" && isAdmin && !!onChangeStatus;

  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const justDragged = useRef(false);

  const columns = buildColumns(tickets, groupBy);

  // ─── "Todos": grilla de tarjetas que envuelve en filas/columnas ──
  // En vez del kanban de una sola columna angosta, las tarjetas llenan
  // el ancho y bajan en filas al exceder la pantalla.
  if (groupBy === "none") {
    const all = columns[0]?.tickets ?? [];
    if (all.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <span className="text-3xl">📭</span>
          <p className="text-sm font-mono text-gray-600">No hay tickets para mostrar</p>
        </div>
      );
    }
    return (
      <div
        className="overflow-y-auto h-full pb-2 grid gap-3 content-start"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
      >
        {all.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} user={user} onClick={onCardClick} />
        ))}
      </div>
    );
  }

  function statusUnderPointer(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const col = el?.closest("[data-status]");
    return col ? col.getAttribute("data-status") : null;
  }

  function startDrag(e: React.MouseEvent, ticket: AnyTicket) {
    if (!draggable || e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const fromStatus = ticket.status;
    const id = ticket.id;
    let moved = false;

    const onMove = (ev: MouseEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 5) {
        moved = true;
        setDragId(id);
        document.body.style.userSelect = "none";
      }
      if (moved) setOverStatus(statusUnderPointer(ev.clientX, ev.clientY));
    };

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      setDragId(null);
      setOverStatus(null);
      if (!moved) return; // fue un clic, no un arrastre
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 0);
      const target = statusUnderPointer(ev.clientX, ev.clientY);
      if (target && target !== fromStatus) onChangeStatus?.(id, target as TicketStatus);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Suprime el clic (abrir modal) inmediatamente después de un arrastre
  const handleCardClick = (t: AnyTicket) => {
    if (justDragged.current) return;
    onCardClick(t);
  };

  return (
    <div className="flex gap-3 overflow-x-auto h-full pb-2">
      {columns.map((col) => {
        const isOver = draggable && overStatus === col.status && col.status != null;
        return (
          <div key={col.key} className="flex flex-col shrink-0 w-72">
            {/* Cabecera de columna */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg mb-2 shrink-0"
              style={{ backgroundColor: `${col.color}15`, border: `1px solid ${col.color}30` }}
            >
              <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: col.color }}>
                {col.label}
              </span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: THEME.border, color: "#64748B" }}>
                {col.tickets.length}
              </span>
            </div>

            {/* Tarjetas (apiladas verticalmente). Toda la columna es zona de drop. */}
            <div
              data-status={col.status ?? undefined}
              className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 rounded-lg p-1 transition-colors"
              style={{
                backgroundColor: isOver ? `${col.color}12` : "transparent",
                outline: isOver ? `1px dashed ${col.color}66` : "none",
              }}
            >
              {col.tickets.length === 0 ? (
                <div
                  className="rounded-lg py-8 text-center text-xs font-mono text-gray-700"
                  style={{ border: `1px dashed ${THEME.border}` }}
                >
                  —
                </div>
              ) : (
                col.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onMouseDown={draggable ? (e) => startDrag(e, ticket) : undefined}
                    style={{
                      opacity: dragId === ticket.id ? 0.4 : 1,
                      cursor: draggable ? "grab" : undefined,
                    }}
                  >
                    <TicketCard ticket={ticket} user={user} onClick={handleCardClick} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
