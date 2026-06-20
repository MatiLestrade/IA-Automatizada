// ============================================================
// DevFlow — Módulo 5
// hooks/useTickets.ts — Fetch y mutaciones de tickets
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type {
  AnyTicket,
  CreateTicketPayload,
  UpdateTicketPayload,
  ReorderPayload,
} from "@/types";

interface UseTicketsReturn {
  tickets: AnyTicket[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTicket: (payload: CreateTicketPayload) => Promise<AnyTicket>;
  analyzeTicket: (id: string, opts: { autoMode: boolean; adminPrompt: string }) => Promise<AnyTicket>;
  updateTicket: (id: string, payload: UpdateTicketPayload) => Promise<AnyTicket>;
  approveTicket: (id: string) => Promise<AnyTicket>;
  rejectTicket: (id: string) => Promise<AnyTicket>;
  reopenTicket: (id: string) => Promise<AnyTicket>;
  reorderPool: (payload: ReorderPayload) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
}

export function useTickets(): UseTicketsReturn {
  const [tickets, setTickets] = useState<AnyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ─── Fetch ────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<AnyTicket[]>("/tickets/");
      setTickets(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al cargar tickets";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Crear ticket ─────────────────────────────────────────
  const createTicket = useCallback(
    async (payload: CreateTicketPayload): Promise<AnyTicket> => {
      const { data } = await api.post<AnyTicket>("/tickets/", payload);
      setTickets((prev) => [data, ...prev]);
      return data;
    },
    []
  );

  // ─── Analizar ticket (agente IA en el backend) ────────────
  const analyzeTicket = useCallback(
    async (id: string, opts: { autoMode: boolean; adminPrompt: string }): Promise<AnyTicket> => {
      const { data } = await api.post<AnyTicket>(`/tickets/${id}/analyze`, {
        autoMode: opts.autoMode,
        adminPrompt: opts.adminPrompt,
      });
      setTickets((prev) => prev.map((t) => (t.id === id ? data : t)));
      return data;
    },
    []
  );

  // ─── Actualizar ticket (PATCH genérico) ───────────────────
  const updateTicket = useCallback(
    async (id: string, payload: UpdateTicketPayload): Promise<AnyTicket> => {
      const { data } = await api.patch<AnyTicket>(`/tickets/${id}`, payload);
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? data : t))
      );
      return data;
    },
    []
  );

  // ─── Aprobar ──────────────────────────────────────────────
  const approveTicket = useCallback(async (id: string): Promise<AnyTicket> => {
    const { data } = await api.post<AnyTicket>(`/tickets/${id}/approve`, { approved: true });
    setTickets((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }, []);
    // ─── Borrar ──────────────────────────────────────────────
  const deleteTicket = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/tickets/${id}`);
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);
  // ─── Rechazar ─────────────────────────────────────────────
  const rejectTicket = useCallback(async (id: string): Promise<AnyTicket> => {
    const { data } = await api.post<AnyTicket>(`/tickets/${id}/approve`, { approved: false });
    setTickets((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }, []);

  // ─── Reabrir ──────────────────────────────────────────────
  const reopenTicket = useCallback(async (id: string): Promise<AnyTicket> => {
    const { data } = await api.post<AnyTicket>(`/tickets/${id}/reopen`);
    setTickets((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }, []);

  // ─── Reordenar pool ───────────────────────────────────────
  const reorderPool = useCallback(async (payload: ReorderPayload): Promise<void> => {
    // El backend espera { ordered_ids: [...] } en el orden deseado
    const ordered_ids = [...payload.order]
      .sort((a, b) => a.poolPosition - b.poolPosition)
      .map((o) => o.id);
    await api.post("/tickets/pool/reorder", { ordered_ids });
    // Actualiza poolPosition localmente para no refetchear todo
    setTickets((prev) =>
      prev.map((t) => {
        const entry = payload.order.find((o) => o.id === t.id);
        return entry ? { ...t, poolPosition: entry.poolPosition } : t;
      })
    );
  }, []);

  return {
    tickets,
    loading,
    error,
    refresh,
    createTicket,
    analyzeTicket,
    updateTicket,
    approveTicket,
    rejectTicket,
    reopenTicket,
    reorderPool,
    deleteTicket,
  };
}
