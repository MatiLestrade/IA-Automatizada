// ============================================================
// DevFlow — Módulo 5
// app/dashboard/page.tsx — Tablero principal de tickets
// Lista vertical agrupable (estado / criticidad / cliente / fecha /
// sin agrupar). En modo "estado" (admin) se arrastra para cambiar estado.
// ============================================================

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTickets } from "../../hooks/useTickets";
import { useToasts } from "../../components/ui/Toast";
import { AppShell } from "../../components/layout/AppShell";
import { TicketBoard, type GroupBy } from "../../components/tickets/TicketBoard";
import {
  TicketFilters,
  applyFilters,
  EMPTY_FILTERS,
  type TicketFilterState,
} from "../../components/tickets/TicketFilters";
import { TicketModal } from "../../components/tickets/TicketModal";
import { TicketForm } from "../../components/tickets/TicketForm";
import { THEME } from "../../lib/constants";
import type {
  AnyTicket,
  TicketStatus,
  CreateTicketPayload,
  UpdateTicketPayload,
} from "../../types";

const DEFAULT_PROMPT =
  "Sos DevFlow AI, un agente de soporte técnico especializado en desarrollo web. Analizá el ticket y respondé únicamente con el JSON solicitado.";

const GROUP_OPTIONS: Array<{ key: GroupBy; label: string; adminOnly?: boolean }> = [
  { key: "none",     label: "Todos" },
  { key: "status",   label: "Estado" },
  { key: "priority", label: "Criticidad" },
  { key: "client",   label: "Cliente", adminOnly: true },
  { key: "date",     label: "Fecha" },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    tickets,
    loading: ticketsLoading,
    refresh,
    createTicket,
    analyzeTicket,
    updateTicket,
    approveTicket,
    rejectTicket,
    reopenTicket,
    deleteTicket,
  } = useTickets();

  const { toasts, addToast, removeToast } = useToasts();

  const [groupBy, setGroupBy]               = useState<GroupBy>("status");
  const [filters, setFilters]               = useState<TicketFilterState>(EMPTY_FILTERS);
  const [selectedTicket, setSelectedTicket] = useState<AnyTicket | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [autoMode, setAutoMode]             = useState(false);
  const [adminPrompt, setAdminPrompt]       = useState(DEFAULT_PROMPT);

  // ─── Agente IA (corre en el backend) ──────────────────────
  const runAgent = useCallback(
    async (ticketId: string, ticketTitle: string): Promise<void> => {
      try {
        const updated = await analyzeTicket(ticketId, { autoMode, adminPrompt });
        addToast({ ticketId, ticketTitle, newStatus: updated.status });
      } catch {
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
        addToast({ ticketId: ticket.id, ticketTitle: payload.title, newStatus: "received" });
      }
      runAgent(ticket.id, payload.title);
    },
    [createTicket, runAgent, user, addToast]
  );

  // ─── Cambiar estado arrastrando (solo admin, vista por estado) ─
  const handleChangeStatus = useCallback(
    async (id: string, status: TicketStatus) => {
      const updated = await updateTicket(id, { status });
      addToast({ ticketId: id, ticketTitle: updated.title, newStatus: status });
    },
    [updateTicket, addToast]
  );

  // ─── Acciones del modal ───────────────────────────────────
  const handleUpdate = useCallback(async (id: string, payload: UpdateTicketPayload) => {
    const updated = await updateTicket(id, payload);
    setSelectedTicket(updated);
  }, [updateTicket]);
  const handleDelete = useCallback(async (id: string) => { await deleteTicket(id); }, [deleteTicket]);
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

  // ─── Loading ──────────────────────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const options = GROUP_OPTIONS.filter((o) => !o.adminOnly || isAdmin);
  const visibleTickets = applyFilters(tickets, filters);

  return (
    <AppShell
      user={user}
      tickets={tickets}
      toasts={toasts}
      onToastRemove={removeToast}
      autoMode={autoMode}
      onAutoModeToggle={() => setAutoMode((v) => !v)}
      adminPrompt={adminPrompt}
      onAdminPromptChange={setAdminPrompt}
    >
      <div className="flex flex-col h-full p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2
              className="text-xl font-bold text-gray-100"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              Tickets
            </h2>
            <p className="text-xs font-mono text-gray-600 mt-0.5">
              {visibleTickets.length !== tickets.length
                ? `${visibleTickets.length} de ${tickets.length} tickets`
                : `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`}
              {groupBy === "status" && isAdmin && " · arrastrá una tarjeta para cambiar su estado"}
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

        {/* Selector: agrupar por */}
        <div className="flex items-center gap-2 mb-5 shrink-0">
          <span className="text-xs font-mono text-gray-600 mr-1">Agrupar por:</span>
          {options.map((o) => {
            const active = groupBy === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setGroupBy(o.key)}
                className="text-xs font-mono px-3 py-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: active ? `${THEME.accent}22` : THEME.surface,
                  color: active ? THEME.accent : "#94A3B8",
                  border: `1px solid ${active ? THEME.accent : THEME.border}`,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {/* Búsqueda + filtros */}
        {!ticketsLoading && tickets.length > 0 && (
          <TicketFilters
            tickets={tickets}
            isAdmin={isAdmin}
            value={filters}
            onChange={setFilters}
          />
        )}

        {/* Tablero (kanban) */}
        <div className="flex-1 min-h-0">
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-mono text-gray-600">No hay tickets para mostrar</p>
            </div>
          ) : visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-mono text-gray-600">Ningún ticket coincide con los filtros</p>
            </div>
          ) : (
            <TicketBoard
              tickets={visibleTickets}
              user={user}
              groupBy={groupBy}
              onCardClick={setSelectedTicket}
              onChangeStatus={handleChangeStatus}
            />
          )}
        </div>
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
          onUpdate={handleUpdate}
        />
      )}

      {/* Formulario nuevo ticket */}
      {showForm && (
        <TicketForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </AppShell>
  );
}
