// ============================================================
// DevFlow — Módulo 5
// app/history/page.tsx — Historial (línea de tiempo de cambios)
// Cada ticket muestra horizontalmente todos sus cambios (estado,
// descripción, prioridad, etc.) con viejo → nuevo.
// ============================================================

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useToasts } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { TicketModal } from "@/components/tickets/TicketModal";
import { TicketTimeline } from "@/components/tickets/TicketTimeline";
import { THEME } from "@/lib/constants";
import type { AnyTicket, UpdateTicketPayload } from "@/types";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    tickets, loading: ticketsLoading,
    updateTicket, approveTicket, rejectTicket, reopenTicket, deleteTicket,
  } = useTickets();
  const { toasts, addToast, removeToast } = useToasts();
  const [selected, setSelected] = useState<AnyTicket | null>(null);

  const handleApprove = useCallback(async (id: string) => {
    const t = await approveTicket(id); addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
  }, [approveTicket, addToast]);
  const handleReject = useCallback(async (id: string) => {
    const t = await rejectTicket(id); addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
  }, [rejectTicket, addToast]);
  const handleReopen = useCallback(async (id: string) => {
    const t = await reopenTicket(id); addToast({ ticketId: id, ticketTitle: t.title, newStatus: t.status });
  }, [reopenTicket, addToast]);
  const handleDelete = useCallback(async (id: string) => {
    await deleteTicket(id); setSelected(null);
  }, [deleteTicket]);
  const handleUpdate = useCallback(async (id: string, payload: UpdateTicketPayload) => {
    const updated = await updateTicket(id, payload); setSelected(updated);
  }, [updateTicket]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
  }

  return (
    <AppShell user={user} tickets={tickets} toasts={toasts} onToastRemove={removeToast}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-100" style={{ fontFamily: "var(--font-syne), sans-serif" }}>
            Historial
          </h2>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} · todos los cambios de cada ticket (viejo → nuevo)
          </p>
        </div>

        {ticketsLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando historial...</span>
          </div>
        ) : (
          <TicketTimeline tickets={tickets} user={user} onCardClick={setSelected} />
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
          onUpdate={handleUpdate}
        />
      )}
    </AppShell>
  );
}
