// ============================================================
// DevFlow — Módulo 5
// app/clients/page.tsx — Admin: asignar repo de GitHub por cliente
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useToasts } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import api from "@/lib/api";
import { THEME } from "@/lib/constants";
import type { Client, TicketStatus } from "@/types";

export default function ClientsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { tickets } = useTickets();
  const { toasts, addToast, removeToast } = useToasts();

  const [activeStatus, setActiveStatus] = useState<TicketStatus | "all">("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [repos, setRepos]     = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Solo admin
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get<Client[]>("/clients/");
      setClients(data);
      setRepos(Object.fromEntries(data.map((c) => [c.id, c.githubRepo ?? ""])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function saveRepo(clientId: string) {
    setSavingId(clientId);
    try {
      const { data } = await api.patch<Client>(`/clients/${clientId}`, {
        github_repo: repos[clientId]?.trim() || null,
      });
      setClients((prev) => prev.map((c) => (c.id === clientId ? data : c)));
      addToast({
        ticketId: clientId,
        ticketTitle: data.name,
        newStatus: "completed",
      });
    } catch {
      addToast({
        ticketId: clientId,
        ticketTitle: "Error al guardar el repo",
        newStatus: "rejected",
      });
    } finally {
      setSavingId(null);
    }
  }

  if (authLoading || !user) return null;

  return (
    <AppShell
      user={user}
      tickets={tickets}
      toasts={toasts}
      onToastRemove={removeToast}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
    >
      <div className="p-8 max-w-3xl">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-100" style={{ fontFamily: "Syne, sans-serif" }}>
            Clientes
          </h1>
          <p className="text-sm font-mono text-gray-500 mt-1">
            Asigná el repositorio de GitHub de cada cliente. Al aprobar un ticket,
            su issue se crea en el repo del cliente correspondiente.
          </p>
        </header>

        {loading ? (
          <p className="text-sm font-mono text-gray-500">Cargando clientes…</p>
        ) : (
          <div className="space-y-3">
            {clients.map((c) => {
              const dirty = (repos[c.id] ?? "") !== (c.githubRepo ?? "");
              return (
                <div
                  key={c.id}
                  className="rounded-lg p-4"
                  style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-gray-200">{c.name}</span>
                    <span className="text-xs font-mono text-gray-600">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={repos[c.id] ?? ""}
                      onChange={(e) =>
                        setRepos((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="owner/repo"
                      className="flex-1 text-sm font-mono px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 transition-colors"
                      style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#E2E8F0" }}
                    />
                    <button
                      onClick={() => saveRepo(c.id)}
                      disabled={!dirty || savingId === c.id}
                      className="py-2 px-4 rounded-lg text-sm font-mono font-bold transition-colors"
                      style={{
                        backgroundColor: dirty ? THEME.accent : THEME.border,
                        color: dirty ? "white" : "#64748B",
                        opacity: savingId === c.id ? 0.6 : 1,
                      }}
                    >
                      {savingId === c.id ? "Guardando…" : "Guardar"}
                    </button>
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
