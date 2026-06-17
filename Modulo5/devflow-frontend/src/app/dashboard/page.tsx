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
import { THEME, PRIORITY_ORDER, AUTO_REQUIRES_APPROVAL } from "../../lib/constants";
import type {
  AnyTicket,
  TicketStatus,
  CreateTicketPayload,
  AIAnalysisResult,
  AgentMessage,
} from "../../types";

const DEFAULT_PROMPT =
  "Sos DevFlow AI, un agente de soporte técnico especializado en desarrollo web. Analizá el ticket y respondé únicamente con el JSON solicitado.";

const ANTHROPIC_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    tickets,
    loading: ticketsLoading,
    refresh,
    createTicket,
    updateTicket,
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

  // ─── Agente IA ────────────────────────────────────────────
  const runAgent = useCallback(
    async (ticketId: string, payload: CreateTicketPayload): Promise<void> => {
      // 1. Marcar como analizando
      await updateTicket(ticketId, { status: "analyzing", stepCheckpoint: "analyzing" });

      // 2. Intentar fetch de la página
      let pageContent = "";
      let pageFetched = false;
      if (payload.page) {
        try {
          const res = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(payload.page)}`
          );
          const json = await res.json();
          if (json.contents) {
            pageContent = json.contents
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 2000);
            pageFetched = true;
          }
        } catch {
          pageFetched = false;
        }
      }

      // 3. Construir mensajes para Claude
      const userMessage = `
      Ticket ID: ${ticketId}
      Título: ${payload.title}
      Descripción: ${payload.description}
      Página: ${payload.page || "no especificada"}
      Ruta: ${payload.page_name || "no especificada"}
      ${pageContent ? `\nContenido de la página:\n${pageContent}` : ""}

      Prompt adicional del admin: ${adminPrompt}

      Respondé ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
      {
        "type": "FE" | "BE" | "DB",
        "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "eta": "tiempo estimado en español",
        "aiSuggestion": "solución técnica detallada en español con pasos numerados",
        "pageAnalysis": "análisis del contenido de la página en español o null",
        "codeHints": [
          {
            "file": "NombreArchivo.jsx",
            "lines": "línea 40 o entre 20 y 40",
            "description": "qué cambiar en español",
            "fix": "snippet de código"
          }
        ]
      }`;

      const messages: AgentMessage[] = [{ role: "user", content: userMessage }];

      // 4. Llamar a Claude API
      //ESTO ES UNA PRUEBA Y CON ESTE METODO MAS FIABLE, SE NECESITA PAGAR .
      let aiResult: AIAnalysisResult | null = null;
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            system:
              "You are DevFlow AI, a technical support agent specialized in web development. Always respond ONLY with the requested JSON. No markdown, no explanation, just the raw JSON object. All text fields must be in Spanish.",
            messages,
          }),
        });

        const data = await response.json();
        const raw  = data.content?.[0]?.text ?? "";
        const clean = raw.replace(/```json|```/g, "").trim();
        aiResult = JSON.parse(clean) as AIAnalysisResult;
      } catch {
        await updateTicket(ticketId, {
          status: "received",
          aiError: "No se pudo analizar el ticket. Verificá tu API key de Anthropic.",
          stepCheckpoint: "error",
        });
        return;
      }

      // 5. Determinar siguiente estado según prioridad + autoMode
      const requiresApproval =
        !autoMode || AUTO_REQUIRES_APPROVAL.includes(aiResult.priority);

      const nextStatus: TicketStatus = requiresApproval ? "approval" : "queued";

      // 6. Actualizar ticket con resultado completo
      await updateTicket(ticketId, {
        type:          aiResult.type,
        ...(payload.priority == null ? { priority: aiResult.priority } : {}),
        eta:           aiResult.eta,
        aiSuggestion:  aiResult.aiSuggestion,
        pageAnalysis:  aiResult.pageAnalysis ?? "",
        codeHints:     aiResult.codeHints,
        pageFetched,
        autoExecuted:  !requiresApproval,
        status:        nextStatus,
        aiError:       null,
        stepCheckpoint: "completed",
        agentHistory:  messages,
      });

      addToast({
        ticketId,
        ticketTitle: payload.title,
        newStatus: nextStatus,
      });
    },
    [autoMode, adminPrompt, updateTicket, addToast]
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

      // Lanzar agente en background
      runAgent(ticket.id, payload);
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
