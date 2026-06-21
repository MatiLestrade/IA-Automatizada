// ============================================================
// DevFlow — Módulo 5
// components/ui/Sidebar.tsx
// ============================================================

"use client";

import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import { THEME } from "@/lib/constants";
import type { AnyTicket, TicketStatus, User } from "@/types";

interface SidebarProps {
  user: User;
  tickets: AnyTicket[];
  // Compat con páginas que aún los pasan (historial/pool); el sidebar ya no los usa.
  activeStatus?: TicketStatus | "all";
  onStatusChange?: (status: TicketStatus | "all") => void;
  autoMode?: boolean;
  onAutoModeToggle?: () => void;
  adminPrompt?: string;
  onAdminPromptChange?: (prompt: string) => void;
}

function NavItem({ href, label, count }: { href: string; label: string; count?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <button
      onClick={() => router.push(href)}
      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors"
      style={{
        backgroundColor: active ? `${THEME.accent}22` : "transparent",
        color: active ? THEME.accent : "#94A3B8",
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: THEME.border, color: "#94A3B8" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  user,
  tickets,
  autoMode = false,
  onAutoModeToggle,
  adminPrompt = "",
  onAdminPromptChange,
}: SidebarProps) {
  const isAdmin = user.role === "admin";

  const totalActive = tickets.filter(
    (t) => t.status !== "completed" && t.status !== "rejected"
  ).length;

  return (
    <aside
      className="flex flex-col h-full w-64 shrink-0 border-r"
      style={{ backgroundColor: THEME.surface, borderColor: THEME.border }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: THEME.border }}>
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "Syne, sans-serif", color: THEME.accent }}
        >
          DevFlow
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">{user.email}</p>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem href="/dashboard" label="Tickets" count={tickets.length} />
        <NavItem href="/history" label="Historial" count={tickets.length} />

        {/* Solo admin */}
        {isAdmin && (
          <div className="pt-2 space-y-1">
            <NavItem href="/metrics" label="Métricas" />
            <NavItem href="/pool" label="Pool de prioridades" count={totalActive} />
            <NavItem href="/clients" label="Clientes" />
          </div>
        )}

        {/* Modo AUTO — solo admin */}
        {isAdmin && onAutoModeToggle && (
          <div className="mx-1 mt-3 p-3 rounded-lg border" style={{ borderColor: THEME.border }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-gray-400">Modo AUTO</span>
              <button
                onClick={onAutoModeToggle}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                style={{ backgroundColor: autoMode ? THEME.accent : THEME.border }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: autoMode ? "translateX(18px)" : "translateX(2px)" }}
                />
              </button>
            </div>
            <p className="text-xs text-gray-600 font-mono">
              {autoMode ? "LOW/MED se ejecutan solos" : "Todos requieren aprobación"}
            </p>
          </div>
        )}

        {/* Prompt del agente — solo admin */}
        {isAdmin && onAdminPromptChange && (
          <div className="pt-3">
            <p className="px-3 text-xs text-gray-600 font-mono uppercase tracking-wider mb-2">
              Agente IA
            </p>
            <div className="mx-1">
              <textarea
                value={adminPrompt}
                onChange={(e) => onAdminPromptChange(e.target.value)}
                rows={4}
                placeholder="Prompt base del agente..."
                className="w-full text-xs font-mono p-2 rounded border resize-none focus:outline-none focus:border-indigo-500"
                style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: "#94A3B8" }}
              />
            </div>
          </div>
        )}
      </nav>

      {/* Footer — logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: THEME.border }}>
        <button
          onClick={logout}
          className="w-full text-xs font-mono text-gray-500 hover:text-red-400 transition-colors text-left px-3 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
