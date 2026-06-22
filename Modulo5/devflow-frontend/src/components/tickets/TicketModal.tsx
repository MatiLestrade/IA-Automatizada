// ============================================================
// DevFlow — Módulo 5
// components/tickets/TicketModal.tsx
// ============================================================

"use client";

import { useState } from "react";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/ui/Badge";
import { useComments } from "@/hooks/useComments";
import { THEME } from "@/lib/constants";
import type { AnyTicket, Ticket, User, UpdateTicketPayload, TicketPriority, TicketType } from "@/types";

interface TicketModalProps {
  ticket: AnyTicket;
  user: User;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onReopen?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, payload: UpdateTicketPayload) => Promise<void>;
}

export function TicketModal({
  ticket,
  user,
  onClose,
  onApprove,
  onReject,
  onReopen,
  onDelete,
  onUpdate,
}: TicketModalProps) {
  const isAdmin    = user.role === "admin";
  const adminTicket = ticket as Ticket; // cast para acceder a campos IA

  // ─── Edición (solo admin) ──────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    title: "", description: "",
    priority: "" as TicketPriority | "", type: "" as TicketType | "", eta: "",
  });

  function startEdit() {
    setForm({
      title: ticket.title,
      description: ticket.description,
      priority: (ticket.priority ?? "") as TicketPriority | "",
      type: (ticket.type ?? "") as TicketType | "",
      eta: ticket.eta ?? "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!onUpdate) return;
    const p: UpdateTicketPayload = {};
    if (form.title.trim() && form.title !== ticket.title) p.title = form.title.trim();
    if (form.description !== ticket.description) p.description = form.description;
    if (form.priority && form.priority !== ticket.priority) p.priority = form.priority;
    if (form.type && form.type !== ticket.type) p.type = form.type;
    if (form.eta !== (ticket.eta ?? "")) p.eta = form.eta;
    if (Object.keys(p).length > 0) {
      setSaving(true);
      try { await onUpdate(ticket.id, p); } finally { setSaving(false); }
    }
    setEditing(false);
  }

  const canApproveReject =
    isAdmin && ticket.status === "approval";

  const canReopen =
    ticket.status === "rejected";

  const canDelete =
    ticket.status === "received" || ticket.status === "rejected";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-start justify-between p-6 border-b"
          style={{ backgroundColor: THEME.surface, borderColor: THEME.border }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-mono font-bold text-indigo-400">
                {ticket.id}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <TypeBadge type={ticket.type} />
              {ticket.autoExecuted && (
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ backgroundColor: "#6366F118", color: "#6366F1" }}
                >
                  ⚡ Ejecución automática
                </span>
              )}
            </div>
            <h2 className="text-base font-mono text-gray-100">
              {ticket.title}
            </h2>
            {isAdmin && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {ticket.clientName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {isAdmin && onUpdate && !editing && (
              <button
                onClick={startEdit}
                className="text-xs font-mono px-2 py-1 rounded border transition-colors hover:text-gray-200"
                style={{ borderColor: THEME.border, color: "#94A3B8" }}
              >
                ✎ Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-5">

          {editing && onUpdate ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">Título</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-sm font-mono px-3 py-2 rounded border focus:outline-none focus:border-indigo-500"
                style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full text-sm font-mono px-3 py-2 rounded border resize-none focus:outline-none focus:border-indigo-500"
                style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority | "" })}
                  className="w-full text-sm font-mono px-2 py-2 rounded border focus:outline-none focus:border-indigo-500"
                  style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
                >
                  <option value="">—</option>
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as TicketType | "" })}
                  className="w-full text-sm font-mono px-2 py-2 rounded border focus:outline-none focus:border-indigo-500"
                  style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
                >
                  <option value="">—</option>
                  <option value="FE">Frontend</option>
                  <option value="BE">Backend</option>
                  <option value="DB">Base de datos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">ETA</label>
                <input
                  value={form.eta}
                  onChange={(e) => setForm({ ...form, eta: e.target.value })}
                  placeholder="2h"
                  className="w-full text-sm font-mono px-2 py-2 rounded border focus:outline-none focus:border-indigo-500"
                  style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-mono font-bold transition-colors"
                style={{ backgroundColor: THEME.accent, color: "white", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg text-sm font-mono"
                style={{ border: `1px solid ${THEME.border}`, color: "#94A3B8" }}
              >
                Cancelar
              </button>
            </div>
          </div>
          ) : (
          <>

          {/* Descripción */}
          <Section title="Descripción">
            <p className="text-sm font-mono text-gray-400">{ticket.description}</p>
          </Section>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <MetaItem label="ETA" value={ticket.eta || "—"} />
            <MetaItem
              label="Página"
              value={
                ticket.page ? (
                  <a
                    href={ticket.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    {ticket.pageName || ticket.page}
                  </a>
                ) : "—"
              }
            />
            <MetaItem
              label="Creado"
              value={new Date(ticket.createdAt).toLocaleString("es-AR")}
            />
            <MetaItem
              label="Checkpoint"
              value={"stepCheckpoint" in ticket ? ticket.stepCheckpoint || "—" : "—"}
            />
          </div>

          {/* Sugerencia IA — solo admin */}
          {isAdmin && adminTicket.aiSuggestion && (
            <Section title="💡 Sugerencia IA">
              <p className="text-sm font-mono text-gray-400 whitespace-pre-wrap">
                {adminTicket.aiSuggestion}
              </p>
            </Section>
          )}

          {/* Análisis de página — solo admin */}
          {isAdmin && adminTicket.pageAnalysis && (
            <Section title="🔍 Análisis de página">
              <p className="text-sm font-mono text-gray-400 whitespace-pre-wrap">
                {adminTicket.pageAnalysis}
              </p>
              {adminTicket.pageFetched === false && (
                <p className="text-xs text-yellow-500 font-mono mt-2">
                  ⚠ No se pudo obtener el contenido de la página
                </p>
              )}
            </Section>
          )}

          {/* Code hints — solo admin */}
          {isAdmin &&
            adminTicket.codeHints &&
            adminTicket.codeHints.length > 0 && (
              <Section title="🛠 Code hints">
                <div className="space-y-3">
                  {adminTicket.codeHints.map((hint, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-indigo-300 font-bold">
                          {hint.file}
                        </span>
                        <span className="text-xs font-mono text-gray-600">
                          {hint.lines}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-400 mb-2">
                        {hint.description}
                      </p>
                      {hint.fix && (
                        <pre
                          className="text-xs font-mono p-2 rounded overflow-x-auto"
                          style={{ backgroundColor: "#0A0A0F", color: "#34D399" }}
                        >
                          {hint.fix}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

          {/* Error de IA */}
          {ticket.aiError && (
            <div
              className="px-4 py-3 rounded-lg text-sm font-mono"
              style={{ backgroundColor: "#EF444418", color: "#EF4444" }}
            >
              ⚠ {ticket.aiError}
            </div>
          )}

          {/* GitHub — solo admin, link al issue (se crea automáticamente al aprobar) */}
          {isAdmin && adminTicket.githubIssueUrl && (
            <Section title="🐙 GitHub">
              <a
                href={adminTicket.githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-mono text-indigo-400 hover:text-indigo-300"
              >
                Ver issue
                {adminTicket.githubIssueNumber ? ` #${adminTicket.githubIssueNumber}` : ""} en GitHub ↗
              </a>
            </Section>
          )}

          {/* Comentarios — visible para ambos roles */}
          <CommentsThread ticketId={ticket.id} user={user} />
          </>
          )}
        </div>

        {/* Acciones */}
        {!editing && (canApproveReject || canReopen || canDelete) && (
          <div
            className="sticky bottom-0 flex items-center gap-3 p-6 border-t"
            style={{ backgroundColor: THEME.surface, borderColor: THEME.border }}
          >
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm("¿Borrar este ticket?")) {
                    onDelete?.(ticket.id);
                    onClose();
                  }
                }}
                className="py-2 px-4 rounded-lg text-sm font-mono font-bold transition-colors mr-auto"
                style={{ backgroundColor: "#EF444422", color: "#EF4444", border: "1px solid #EF444444" }}
              >
                Borrar
              </button>
            )}
            {canApproveReject && (
              <>
                <button
                  onClick={() => { onApprove?.(ticket.id); onClose(); }}
                  className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-colors"
                  style={{ backgroundColor: "#22C55E22", color: "#22C55E", border: "1px solid #22C55E44" }}
                >
                  ✓ Aprobar
                </button>
                <button
                  onClick={() => { onReject?.(ticket.id); onClose(); }}
                  className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-colors"
                  style={{ backgroundColor: "#EF444422", color: "#EF4444", border: "1px solid #EF444444" }}
                >
                  ✕ Rechazar
                </button>
              </>
            )}
            {canReopen && (
              <button
                onClick={() => { onReopen?.(ticket.id); onClose(); }}
                className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-colors"
                style={{ backgroundColor: "#F9731622", color: "#F97316", border: "1px solid #F9731644" }}
              >
                ↺ Reabrir ticket
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers de UI ───────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
    >
      <p className="text-xs text-gray-600 font-mono mb-0.5">{label}</p>
      <p className="text-xs text-gray-300 font-mono">{value}</p>
    </div>
  );
}

// ─── Hilo de comentarios ─────────────────────────────────────
function CommentsThread({ ticketId, user }: { ticketId: string; user: User }) {
  const { comments, loading, error, add } = useComments(ticketId);
  const [draft, setDraft]   = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await add(body);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  const fmt = (at: string) => {
    const d = new Date(at);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Section title={`💬 Comentarios${comments.length ? ` (${comments.length})` : ""}`}>
      <div className="space-y-2 mb-3">
        {loading ? (
          <p className="text-xs font-mono text-gray-600 animate-pulse">Cargando comentarios...</p>
        ) : error ? (
          <p className="text-xs font-mono text-red-400">{error}</p>
        ) : comments.length === 0 ? (
          <p className="text-xs font-mono text-gray-600">Sin comentarios todavía.</p>
        ) : (
          comments.map((c) => {
            const mine = c.authorId === user.id;
            const isAdminAuthor = c.authorRole === "admin";
            return (
              <div
                key={c.id}
                className="rounded-lg p-3"
                style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono font-bold" style={{ color: isAdminAuthor ? THEME.accent : "#A5B4FC" }}>
                    {c.authorName}{mine ? " (vos)" : ""}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: THEME.border, color: "#94A3B8" }}
                  >
                    {isAdminAuthor ? "Soporte" : "Cliente"}
                  </span>
                  <span className="text-[10px] font-mono text-gray-600 ml-auto">{fmt(c.createdAt)}</span>
                </div>
                <p className="text-sm font-mono text-gray-300 whitespace-pre-wrap">{c.body}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Nuevo comentario */}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
          }}
          rows={2}
          placeholder="Escribí un comentario… (Ctrl+Enter para enviar)"
          className="flex-1 text-sm font-mono px-3 py-2 rounded border resize-none focus:outline-none focus:border-indigo-500"
          style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="px-4 py-2 rounded-lg text-sm font-mono font-bold transition-colors shrink-0"
          style={{ backgroundColor: THEME.accent, color: "white", opacity: sending || !draft.trim() ? 0.5 : 1 }}
        >
          {sending ? "..." : "Enviar"}
        </button>
      </div>
    </Section>
  );
}
