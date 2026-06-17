// ============================================================
// DevFlow — Módulo 5
// app/pool/page.tsx — Pool de prioridades con drag & drop
// ============================================================

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useToasts } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { PoolRow } from "@/components/pool/PoolRow";
import { TicketModal } from "@/components/tickets/TicketModal";
import { StatusBadge } from "@/components/ui/Badge";
import { THEME, PRIORITY_ORDER } from "@/lib/constants";
import type { AnyTicket, TicketStatus } from "@/types";

export default function PoolPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { tickets, approveTicket, rejectTicket, reopenTicket, reorderPool, deleteTicket } = useTickets();
  const { toasts, addToast, removeToast } = useToasts();

  const [activeStatus, setActiveStatus]     = useState<TicketStatus | "all">("all");
  const [selectedTicket, setSelectedTicket] = useState<AnyTicket | null>(null);
  const [poolOrder, setPoolOrder]           = useState<AnyTicket[]>([]);
  const [draggingIdx, setDraggingIdx]       = useState<number | null>(null);
  const [saving, setSaving]                 = useState(false);

  const dragIdx = useRef<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Redirigir si no es admin
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  // Orden IA por defecto
  const aiOrder = useCallback((list: AnyTicket[]) =>
    [...list].sort((a, b) => {
      const pa = PRIORITY_ORDER.indexOf(a.priority);
      const pb = PRIORITY_ORDER.indexOf(b.priority);
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }), []);

  // Tickets activos: con análisis (tienen priority) y sin análisis
  const activeTickets = tickets.filter(
    (t) => t.status !== "completed" && t.status !== "rejected"
  );
  const analyzed = activeTickets.filter((t) => !!t.priority);
  const pending  = activeTickets.filter((t) => !t.priority);

  // Inicializar poolOrder solo con tickets que tienen análisis de IA
  useEffect(() => {
    if (analyzed.length === 0) {
      setPoolOrder([]);
      return;
    }
    setPoolOrder((prev) => {
      if (prev.length === 0) return aiOrder(analyzed);
      const ids      = new Set(analyzed.map((t) => t.id));
      const filtered = prev.filter((t) => ids.has(t.id));
      const existing = new Set(filtered.map((t) => t.id));
      const newOnes  = analyzed.filter((t) => !existing.has(t.id));
      return [...filtered, ...newOnes];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  // ─── Drag & drop ──────────────────────────────────────────
  function getIndexFromY(clientY: number): number {
    if (!listRef.current) return dragIdx.current;
    const children = Array.from(listRef.current.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      if (clientY < mid) return i;
    }
    return children.length - 1;
  }

  function handleMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();

    const idx = poolOrder.findIndex((t) => t.id === id);
    if (idx === -1) return;

    dragIdx.current = idx;
    setDraggingIdx(idx);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const newIdx  = getIndexFromY(ev.clientY);
      const fromIdx = dragIdx.current;
      if (newIdx === fromIdx) return;

      dragIdx.current = newIdx;
      setDraggingIdx(newIdx);

      setPoolOrder((prev) => {
        const next      = [...prev];
        const [removed] = next.splice(fromIdx, 1);
        next.splice(newIdx, 0, removed);
        return next;
      });
    };

    const onUp = () => {
      dragIdx.current = -1;
      setDraggingIdx(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ─── Guardar orden ────────────────────────────────────────
  async function handleSaveOrder() {
    setSaving(true);
    try {
      await reorderPool({
        order: poolOrder.map((t, i) => ({ id: t.id, poolPosition: i })),
      });
    } finally {
      setSaving(false);
    }
  }

  // ─── Revertir al orden IA ─────────────────────────────────
  function handleRevertOrder() {
    if (!confirm("¿Revertir al orden sugerido por la IA?")) return;
    setPoolOrder(aiOrder(activeTickets));
  }

  // ─── Acciones ─────────────────────────────────────────────
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
  }, [deleteTicket]);

  const aiPositions = aiOrder(analyzed);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
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
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-xl font-bold text-gray-100"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              Pool de prioridades
            </h2>
            <p className="text-xs font-mono text-gray-600 mt-0.5">
              {poolOrder.length} en pool · arrastrá para reordenar
              {pending.length > 0 && (
                <span style={{ color: "#EF4444" }}> · {pending.length} sin análisis</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRevertOrder}
              className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded border"
              style={{ borderColor: THEME.border }}
            >
              ↺ Orden IA
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="text-sm font-mono font-bold px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: saving ? `${THEME.accent}66` : THEME.accent,
                color: "white",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Guardando..." : "Guardar orden"}
            </button>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 mb-4 px-1">
          <span className="text-xs font-mono text-gray-600">Delta vs IA:</span>
          <span className="text-xs font-mono text-green-400">▲ subió</span>
          <span className="text-xs font-mono text-red-400">▼ bajó</span>
          <span className="text-xs font-mono text-gray-600">— sin cambios</span>
        </div>

        {/* Lista */}
        {poolOrder.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-mono text-gray-600">No hay tickets activos</p>
          </div>
        ) : (
          <div
            ref={listRef}
            className="flex flex-col gap-2"
            style={{ userSelect: "none" }}
          >
            {poolOrder.map((ticket, index) => {
              const aiIndex = aiPositions.findIndex((t) => t.id === ticket.id);
              return (
                <PoolRow
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  aiIndex={aiIndex}
                  isDragging={draggingIdx === index}
                  onMouseDown={handleMouseDown}
                  onClick={(t) => {
                    if (draggingIdx === null) setSelectedTicket(t);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Tickets sin análisis de IA — al fondo, borde rojo */}
        {pending.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "#EF444428" }} />
              <span className="text-xs font-mono" style={{ color: "#EF4444" }}>
                Sin análisis de IA · {pending.length}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "#EF444428" }} />
            </div>

            <div className="flex flex-col gap-2">
              {pending.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all hover:brightness-110"
                  style={{
                    backgroundColor: "#EF444408",
                    border: "1px solid #EF444440",
                  }}
                >
                  {/* Barra izquierda roja */}
                  <div
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: "#EF4444" }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-indigo-400 font-bold">
                        {ticket.id}
                      </span>
                      <span className="text-xs font-mono text-gray-500 truncate">
                        {ticket.clientName}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-300 truncate">
                      {ticket.title}
                    </p>
                  </div>

                  {/* Estado */}
                  <div className="shrink-0">
                    <StatusBadge status={ticket.status} />
                  </div>

                  {/* Etiqueta */}
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: "#EF444488" }}
                  >
                    pendiente
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
    </AppShell>
  );
}