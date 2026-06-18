// ============================================================
// DevFlow — Módulo 5
// app/dashboard/page.tsx — Dashboard principal
// ============================================================

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTickets } from "../../hooks/useTickets";
import { useToasts } from "../../components/ui/Toast";
import { AppShell } from "../../components/layout/AppShell";
import { TicketCard } from "../../components/tickets/TicketCard";
import { TicketModal } from "../../components/tickets/TicketModal";
import { TicketForm } from "../../components/tickets/TicketForm";
import { THEME, PRIORITY_ORDER } from "../../lib/constants";
import type {
  AnyTicket,
  TicketStatus,
  CreateTicketPayload,
} from "../../types";

const DEFAULT_PROMPT =
  "Sos DevFlow AI, un agente de soporte técnico especializado en desarrollo web. Analizá el ticket y respondé únicamente con el JSON solicitado.";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    tickets,
    loading: ticketsLoading,
    refresh,
    createTicket,
    analyzeTicket,
    approveTicket,
    rejectTicket,
    reopenTicket,
    deleteTicket,
  } = useTickets();

  const { toasts, addToast, removeToast } = useToasts();

  const [activeStatus, setActiveStatus]   = useState<TicketStatus | "all">("all");
  const [selectedTicket, setSelectedTicket] = useState<AnyTicket | null>(null);
  const [showForm, setShowForm]           = useState(false);
  const [autoMode, setAutoMode]           = useState(false);
  const [adminPrompt, setAdminPrompt]     = useState(DEFAULT_PROMPT);

  // ─── Filtrado ──────────────────────────────────────────────
  const filtered =
    activeStatus === "all"
      ? tickets
      : tickets.filter((t) => t.status === activeStatus);

  // ─── Agente IA (corre en el backend) ──────────────────────
  const runAgent = useCallback(
    async (ticketId: string, ticketTitle: string): Promise<void> => {
      try {
        const updated = await analyzeTicket(ticketId, { autoMode, adminPrompt });
        addToast({ ticketId, ticketTitle, newStatus: updated.status });
      } catch {
        // El backend ya deja el ticket en 'received' con ai_error; refrescamos
        await refresh();
      }
    },
    [autoMode, adminPrompt, analyzeTicket, addToast, refresh]
  );

  // ─── Crear ticket ─────────────────────────────────────────
  const handleCreate = useCallback(
    async (payload: CreateTicketPayload) => {
      const ticket = await createTicket({
        ...payload,
        status: "received",
        stepCheckpoint: "created",
        createdAt: new Date().toISOString(),
      });

      if (user?.role === "client") {
        addToast({
          ticketId: ticket.id,
          ticketTitle: payload.title,
          newStatus: "received",
        });
      }

      // Lanzar agente en background (corre en el backend)
      runAgent(ticket.id, payload.title);
    },
    [createTicket, runAgent, user, addToast]
  );

  // ─── Borrar ───────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTicket(id);
    },
    [deleteTicket]
  );

  // ─── Aprobar ──────────────────────────────────────────────
  const handleApprove = useCallback(
    async (id: string) => {
      const t = await approveTicket(id);
      addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
    },
    [approveTicket, addToast]
  );

  // ─── Rechazar ─────────────────────────────────────────────
  const handleReject = useCallback(
    async (id: string) => {
      const t = await rejectTicket(id);
      addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
    },
    [rejectTicket, addToast]
  );

  // ─── Reabrir ──────────────────────────────────────────────
  const handleReopen = useCallback(
    async (id: string) => {
      const t = await reopenTicket(id);
      addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
    },
    [reopenTicket, addToast]
  );

  // ─── Loading ──────────────────────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <AppShell
      user={user}
      tickets={tickets}
      toasts={toasts}
      onToastRemove={removeToast}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      autoMode={autoMode}
      onAutoModeToggle={() => setAutoMode((v) => !v)}
      adminPrompt={adminPrompt}
      onAdminPromptChange={setAdminPrompt}
    >
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-xl font-bold text-gray-100"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              {activeStatus === "all"
                ? "Todos los tickets"
                : `Tickets · ${activeStatus}`}
            </h2>
            <p className="text-xs font-mono text-gray-600 mt-0.5">
              {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
              {isAdmin && ` · ${tickets.length} total`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded border"
              style={{ borderColor: THEME.border }}
            >
              ↻ Actualizar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm font-mono font-bold px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: THEME.accent, color: "white" }}
            >
              + Nuevo ticket
            </button>
          </div>
        </div>

        {/* Stats bar — solo admin */}
        {isAdmin && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {(["approval", "inprogress", "completed", "rejected"] as TicketStatus[]).map((s) => {
              const count = tickets.filter((t) => t.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className="rounded-lg px-4 py-3 text-left transition-colors hover:brightness-110"
                  style={{
                    backgroundColor: THEME.surface,
                    border: `1px solid ${activeStatus === s ? THEME.accent : THEME.border}`,
                  }}
                >
                  <p className="text-2xl font-bold font-mono text-gray-100">{count}</p>
                  <p className="text-xs font-mono text-gray-500 capitalize mt-0.5">{s}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Lista de tickets */}
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm font-mono text-gray-600 animate-pulse">
              Cargando tickets...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-mono text-gray-600">No hay tickets para mostrar</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered
              .slice()
              .sort((a, b) => {
                const pa = PRIORITY_ORDER.indexOf(a.priority);
                const pb = PRIORITY_ORDER.indexOf(b.priority);
                return pa - pb;
              })
              .map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  user={user}
                  onClick={setSelectedTicket}
                />
              ))}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          user={user}
          onClose={() => setSelectedTicket(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onReopen={handleReopen}
          onDelete={handleDelete}
        />
      )}

      {/* Formulario nuevo ticket */}
      {showForm && (
        <TicketForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppShell>
  );
}
