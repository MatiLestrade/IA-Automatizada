// ============================================================
// DevFlow — Módulo 5
// components/tickets/TicketForm.tsx — Formulario de nuevo ticket
// ============================================================

"use client";

import { useState } from "react";
import { THEME, PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/constants";
import type { CreateTicketPayload, TicketPriority } from "@/types";

interface TicketFormProps {
  onSubmit: (payload: CreateTicketPayload) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM: CreateTicketPayload = {
  title: "",
  description: "",
  page: "",
  page_name: "",
};

export function TicketForm({ onSubmit, onClose }: TicketFormProps) {
  const [form, setForm]       = useState<CreateTicketPayload>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.description.trim()) {
      setError("El título y la descripción son obligatorios.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al crear el ticket";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl"
        style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: THEME.border }}
        >
          <h2 className="text-sm font-mono font-bold text-gray-200">
            Nuevo ticket
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          <Field label="Título *">
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ej: El botón de login no responde"
              className="w-full text-sm font-mono px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors"
              style={{
                backgroundColor: THEME.bg,
                borderColor: THEME.border,
                color: "#E2E8F0",
              }}
            />
          </Field>

          <Field label="Descripción *">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describí el problema con el mayor detalle posible..."
              className="w-full text-sm font-mono px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              style={{
                backgroundColor: THEME.bg,
                borderColor: THEME.border,
                color: "#E2E8F0",
              }}
            />
          </Field>

          <Field label="Criticidad">
            <div className="flex gap-2">
              {PRIORITY_ORDER.map((level) => {
                const cfg      = PRIORITY_CONFIG[level];
                const selected = form.priority === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        priority: selected ? undefined : (level as TicketPriority),
                      }))
                    }
                    className="flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                    style={{
                      color:           selected ? "#0A0A0F" : cfg.color,
                      backgroundColor: selected ? cfg.color : `${cfg.color}18`,
                      border:          `1px solid ${cfg.color}${selected ? "FF" : "44"}`,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="URL de la página">
              <input
                name="page"
                value={form.page}
                onChange={handleChange}
                placeholder="https://app.ejemplo.com/login"
                className="w-full text-sm font-mono px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors"
                style={{
                  backgroundColor: THEME.bg,
                  borderColor: THEME.border,
                  color: "#E2E8F0",
                }}
              />
            </Field>

            <Field label="Nombre de ruta">
              <input
                name="page_name"
                value={form.page_name}
                onChange={handleChange}
                placeholder="/login"
                className="w-full text-sm font-mono px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors"
                style={{
                  backgroundColor: THEME.bg,
                  borderColor: THEME.border,
                  color: "#E2E8F0",
                }}
              />
            </Field>
          </div>

          {error && (
            <p
              className="text-xs font-mono px-3 py-2 rounded"
              style={{ backgroundColor: "#EF444418", color: "#EF4444" }}
            >
              {error}
            </p>
          )}

          <p className="text-xs text-gray-600 font-mono">
            La criticidad es opcional — el agente IA la ajustará automáticamente.
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4 border-t"
          style={{ borderColor: THEME.border }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-mono transition-colors"
            style={{
              backgroundColor: THEME.border,
              color: "#94A3B8",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-colors"
            style={{
              backgroundColor: loading ? `${THEME.accent}44` : THEME.accent,
              color: "white",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Analizando..." : "Crear ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-mono text-gray-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
