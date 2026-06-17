// ============================================================
// DevFlow — Módulo 5
// app/criticality/page.tsx — Tablero por criticidad (estilo Jira)
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useToasts } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/Badge";
import { THEME, PRIORITY_CONFIG } from "@/lib/constants";
import type { AnyTicket, TicketPriority, TicketStatus } from "@/types";

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

// Columnas: izquierda = menos importante → derecha = más importante
const COLUMNS: Array<{ key: TicketPriority | null; label: string; color: string }> = [
  { key: null,       label: "Sin clasificar", color: "#475569"                       },
  { key: "LOW",      label: PRIORITY_CONFIG.LOW.label,      color: PRIORITY_CONFIG.LOW.color      },
  { key: "MEDIUM",   label: PRIORITY_CONFIG.MEDIUM.label,   color: PRIORITY_CONFIG.MEDIUM.color   },
  { key: "HIGH",     label: PRIORITY_CONFIG.HIGH.label,     color: PRIORITY_CONFIG.HIGH.color     },
  { key: "CRITICAL", label: PRIORITY_CONFIG.CRITICAL.label, color: PRIORITY_CONFIG.CRITICAL.color },
];

export default function CriticalityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { tickets, loading: ticketsLoading } = useTickets();
  const { toasts, removeToast } = useToasts();
  const [activeStatus, setActiveStatus] = useState<TicketStatus | "all">("all");

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

  function columnTickets(key: TicketPriority | null): AnyTicket[] {
    return sorted.filter((t) => (t.priority ?? null) === key);
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
            Tickets · Criticidad
          </h2>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            {sorted.length} ticket{sorted.length !== 1 ? "s" : ""} · ordenados por criticidad
          </p>
        </div>

        {/* Tablero */}
        {ticketsLoading ? (
          <div className="flex items-center justify-center flex-1">
            <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto flex-1 min-h-0 pb-2">
            {COLUMNS.map(({ key, label, color }) => {
              const items = columnTickets(key);
              return (
                <div key={key ?? "none"} className="flex flex-col shrink-0 w-56">

                  {/* Cabecera de columna */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg mb-2 shrink-0"
                    style={{
                      backgroundColor: `${color}15`,
                      border: `1px solid ${color}30`,
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
                      items.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="rounded-lg p-3"
                          style={{
                            backgroundColor: THEME.surface,
                            border: `1px solid ${THEME.border}`,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-mono text-indigo-400 font-bold shrink-0">
                              {ticket.id}
                            </span>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <p className="text-xs font-mono text-gray-300 line-clamp-2 mb-2">
                            {ticket.title}
                          </p>
                          <div className="flex items-center justify-between gap-1">
                            {isAdmin && (
                              <span className="text-xs font-mono text-gray-600 truncate">
                                {ticket.clientName}
                              </span>
                            )}
                            <span className="text-xs font-mono text-gray-700 ml-auto shrink-0">
                              {formatRelative(new Date(ticket.createdAt))}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
