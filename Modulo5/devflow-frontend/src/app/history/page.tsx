// ============================================================
// DevFlow — Módulo 5
// app/history/page.tsx — Flujo de estados de cada ticket
// ============================================================

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useToasts } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { TicketModal } from "@/components/tickets/TicketModal";
import { THEME, STATUS_CONFIG, STATUS_ORDER } from "@/lib/constants";
import type { AnyTicket, TicketStatus } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────

function formatRelative(date: Date): string {
  if (isNaN(date.getTime())) return "—";
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "ahora";
  if (mins  < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days  === 1) return "ayer";
  if (days  <  7) return `hace ${days} días`;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

// Infiere el estado inmediatamente anterior en el flujo del ticket.
// Usa 'type' como señal de que la IA procesó el ticket (vino por analyzing/queued).
function prevStatus(ticket: AnyTicket): TicketStatus | null {
  switch (ticket.status) {
    case "received":   return null;
    case "analyzing":  return "received";
    case "queued":     return "analyzing";
    case "approval":   return "received";   // llegó directo sin IA
    case "inprogress": return ticket.type ? "queued" : "approval";
    case "completed":  return "inprogress";
    case "rejected":   return "approval";
    case "reopened":   return "rejected";
    default:           return null;
  }
}

// ─── Columnas en el orden estricto del flujo ─────────────────
// received → analyzing → queued → approval → inprogress → completed → rejected → reopened
const FLOW_COLUMNS = STATUS_ORDER.map((key) => ({
  key,
  label: STATUS_CONFIG[key].label,
  color: STATUS_CONFIG[key].color,
}));

// ─── Acciones inline disponibles por estado (solo admin) ─────
type ActionDef = {
  label: string;
  danger?: boolean;
  fn: (id: string, ticket: AnyTicket) => Promise<void>;
};

// ─── Componente principal ─────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    tickets, loading: ticketsLoading,
    updateTicket, approveTicket, rejectTicket, reopenTicket, deleteTicket,
  } = useTickets();
  const { toasts, addToast, removeToast } = useToasts();

  const [activeStatus, setActiveStatus] = useState<TicketStatus | "all">("all");
  const [selected, setSelected]         = useState<AnyTicket | null>(null);
  const [busy, setBusy]                 = useState<string | null>(null);

  // Hooks ANTES del early return — obligatorio por Rules of Hooks
  const handleApprove = useCallback(async (id: string) => {
    const t = await approveTicket(id);
    addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
  }, [approveTicket, addToast]);

  const handleReject = useCallback(async (id: string) => {
    const t = await rejectTicket(id);
    addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
  }, [rejectTicket, addToast]);

  const handleReopen = useCallback(async (id: string) => {
    const t = await reopenTicket(id);
    addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
  }, [reopenTicket, addToast]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTicket(id);
    setSelected(null);
  }, [deleteTicket]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  const sorted = [...tickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  function colTickets(status: TicketStatus): AnyTicket[] {
    return sorted.filter((t) => t.status === status);
  }

  function actionsFor(ticket: AnyTicket): ActionDef[] {
    if (!isAdmin) return [];
    switch (ticket.status) {
      case "received":
      case "queued":
        return [{
          label: "→ Aprobación",
          fn: async (id) => { await updateTicket(id, { status: "approval" }); },
        }];
      case "approval":
      case "reopened":
        return [
          { label: "✓ Aprobar",  fn: async (id) => { const t = await approveTicket(id); addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status }); } },
          { label: "✗ Rechazar", danger: true, fn: async (id) => { const t = await rejectTicket(id); addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status }); } },
        ];
      case "inprogress":
        return [{
          label: "✓ Completar",
          fn: async (id) => { await updateTicket(id, { status: "completed" }); },
        }];
      case "rejected":
        return [{
          label: "↺ Reabrir",
          fn: async (id) => { const t = await reopenTicket(id); addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status }); },
        }];
      default:
        return [];
    }
  }

  async function runAction(action: ActionDef, ticket: AnyTicket) {
    setBusy(ticket.id);
    try {
      await action.fn(ticket.id, ticket);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell
      user={user}
      tickets={tickets}
      toasts={toasts}
      onToastRemove={removeToast}
      activeStatus={activeStatus}
      onStatusChange={(s) => { setActiveStatus(s); router.push("/dashboard"); }}
    >
      <div className="flex flex-col h-full p-6">

        {/* Header */}
        <div className="shrink-0 mb-5">
          <h2
            className="text-xl font-bold text-gray-100"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            Historial
          </h2>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            {sorted.length} ticket{sorted.length !== 1 ? "s" : ""} · flujo de estados
          </p>
        </div>

        {/* Flujo del pipeline — leyenda */}
        <div className="shrink-0 flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {FLOW_COLUMNS.map((col, i) => (
            <div key={col.key} className="flex items-center gap-1 shrink-0">
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ color: col.color, backgroundColor: `${col.color}18`, border: `1px solid ${col.color}30` }}
              >
                {col.label}
              </span>
              {i < FLOW_COLUMNS.length - 1 && (
                <span className="text-gray-700 text-xs">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Tablero de columnas */}
        {ticketsLoading ? (
          <div className="flex items-center justify-center flex-1">
            <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando historial...</span>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto flex-1 min-h-0 pb-2">
            {FLOW_COLUMNS.map(({ key, label, color }) => {
              const items = colTickets(key);
              return (
                <div key={key} className="flex flex-col shrink-0 w-52">

                  {/* Cabecera de columna */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg mb-2 shrink-0"
                    style={{
                      backgroundColor: `${color}12`,
                      border: `1px solid ${color}28`,
                    }}
                  >
                    <span
                      className="text-xs font-mono font-bold uppercase tracking-wider"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: THEME.border, color: "#64748B" }}
                    >
                      {items.length}
                    </span>
                  </div>

                  {/* Tarjetas */}
                  <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
                    {items.length === 0 ? (
                      <div
                        className="rounded-lg py-8 text-center text-xs font-mono text-gray-700"
                        style={{ border: `1px dashed ${THEME.border}` }}
                      >
                        —
                      </div>
                    ) : (
                      items.map((ticket) => {
                        const prev    = prevStatus(ticket);
                        const actions = actionsFor(ticket);
                        const isBusy  = busy === ticket.id;

                        return (
                          <div
                            key={ticket.id}
                            className="rounded-lg p-3 cursor-pointer transition-all hover:brightness-110"
                            style={{
                              backgroundColor: THEME.surface,
                              border: `1px solid ${color}30`,
                            }}
                            onClick={() => setSelected(ticket)}
                          >
                            {/* ID */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-indigo-400 font-bold">
                                {ticket.id}
                              </span>
                            </div>

                            {/* Título */}
                            <p className="text-xs font-mono text-gray-300 line-clamp-2 mb-2">
                              {ticket.title}
                            </p>

                            {/* Antes → Después */}
                            <div className="flex items-center gap-1 mb-2">
                              {prev && (
                                <>
                                  <span
                                    className="text-xs font-mono"
                                    style={{ color: "#475569" }}
                                  >
                                    {STATUS_CONFIG[prev].label}
                                  </span>
                                  <span className="text-xs text-gray-700">→</span>
                                </>
                              )}
                              <span
                                className="text-xs font-mono font-bold"
                                style={{ color }}
                              >
                                {label}
                              </span>
                            </div>

                            {/* Footer: empresa + fecha */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              {isAdmin && ticket.clientName && (
                                <span className="text-xs font-mono text-gray-600 truncate">
                                  {ticket.clientName}
                                </span>
                              )}
                              <span className="text-xs font-mono text-gray-700 ml-auto shrink-0">
                                {formatRelative(new Date(ticket.createdAt))}
                              </span>
                            </div>

                            {/* Acciones admin */}
                            {actions.length > 0 && (
                              <div
                                className="flex gap-1 flex-wrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {actions.map((action) => (
                                  <button
                                    key={action.label}
                                    disabled={isBusy}
                                    onClick={() => runAction(action, ticket)}
                                    className="text-xs font-mono px-2 py-0.5 rounded transition-all"
                                    style={{
                                      backgroundColor: action.danger ? "#EF444418" : `${color}18`,
                                      color: action.danger ? "#EF4444" : color,
                                      border: `1px solid ${action.danger ? "#EF444430" : `${color}30`}`,
                                      opacity: isBusy ? 0.5 : 1,
                                    }}
                                  >
                                    {isBusy ? "..." : action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <TicketModal
          ticket={selected}
          user={user}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onReopen={handleReopen}
          onDelete={handleDelete}
        />
      )}
    </AppShell>
  );
}
