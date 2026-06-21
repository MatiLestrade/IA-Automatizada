// ============================================================
// DevFlow — Módulo 5
// components/tickets/TicketTimeline.tsx — Línea de tiempo de cambios
// Tickets ordenados por número; cada uno muestra horizontalmente sus
// eventos de cambio (estado, descripción, etc.) con viejo → nuevo.
// ============================================================

"use client";

import { Fragment } from "react";
import { THEME, STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG } from "@/lib/constants";
import type { AnyTicket, FieldChange, ChangeEvent, User } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  status: "Estado", title: "Título", description: "Descripción",
  priority: "Prioridad", type: "Tipo", eta: "ETA", page: "Página", page_name: "Ruta",
};

const CAT: Record<string, Record<string, { color: string; label: string }>> = {
  status: STATUS_CONFIG,
  priority: PRIORITY_CONFIG,
  type: TYPE_CONFIG,
};

function ticketNum(id: string): number {
  const m = id.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}
function fmt(at: string): string {
  const d = new Date(at);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CatPill({ field, value }: { field: string; value: string | null }) {
  if (!value) return null;
  const cfg = CAT[field]?.[value] ?? { color: "#64748B", label: value };
  return (
    <span
      className="text-xs font-mono px-1.5 py-0.5 rounded"
      style={{ color: cfg.color, backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.label}
    </span>
  );
}

function ChangeRow({ c }: { c: FieldChange }) {
  const label = FIELD_LABELS[c.field] ?? c.field;
  if (CAT[c.field]) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[11px] font-mono text-gray-500">{label}:</span>
        {c.old && <CatPill field={c.field} value={c.old} />}
        {c.old && <span className="text-gray-600 text-xs">→</span>}
        <CatPill field={c.field} value={c.new} />
      </div>
    );
  }
  const Empty = () => <span className="italic text-gray-700">vacío</span>;
  return (
    <div className="text-[11px] font-mono leading-relaxed">
      <span className="text-gray-500">{label}: </span>
      {c.old ? <span className="line-through text-gray-600">{c.old}</span> : <Empty />}
      <span className="text-gray-600 mx-1">→</span>
      {c.new ? <span className="text-gray-200">{c.new}</span> : <Empty />}
    </div>
  );
}

function EventBlock({ ev }: { ev: ChangeEvent }) {
  return (
    <div
      className="shrink-0 min-w-[170px] max-w-[320px] rounded-lg p-2.5"
      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
    >
      <div className="text-[10px] font-mono text-gray-600 mb-1.5">{fmt(ev.at)}</div>
      <div className="flex flex-col gap-1.5">
        {ev.changes.map((c, i) => <ChangeRow key={i} c={c} />)}
      </div>
    </div>
  );
}

export function TicketTimeline({
  tickets, user, onCardClick,
}: {
  tickets: AnyTicket[];
  user: User;
  onCardClick: (t: AnyTicket) => void;
}) {
  const isAdmin = user.role === "admin";
  const sorted = [...tickets].sort((a, b) => ticketNum(a.id) - ticketNum(b.id));

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <span className="text-3xl">🕓</span>
        <p className="text-sm font-mono text-gray-600">No hay tickets</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((ticket) => {
        const events: ChangeEvent[] = ticket.changeLog?.length
          ? ticket.changeLog
          : [{ at: ticket.createdAt, changes: [{ field: "status", old: null, new: ticket.status }] }];
        return (
          <div
            key={ticket.id}
            onClick={() => onCardClick(ticket)}
            className="rounded-lg p-4 cursor-pointer transition-all hover:brightness-110"
            style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-sm font-mono text-indigo-400 font-bold">{ticket.id}</span>
              <span className="text-sm font-mono text-gray-200 truncate">{ticket.title}</span>
              {isAdmin && ticket.clientName && (
                <span className="text-xs font-mono text-gray-600">· {ticket.clientName}</span>
              )}
            </div>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-1" onClick={(e) => e.stopPropagation()}>
              {events.map((ev, i) => (
                <Fragment key={i}>
                  <EventBlock ev={ev} />
                  {i < events.length - 1 && (
                    <div className="flex items-center text-gray-600 shrink-0">→</div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
