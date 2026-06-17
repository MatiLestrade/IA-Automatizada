// ============================================================
// DevFlow — Módulo 5
// components/ui/Sidebar.tsx
// ============================================================

"use client";

import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import { STATUS_CONFIG, STATUS_ORDER, THEME } from "@/lib/constants";
import type { AnyTicket, TicketStatus, User } from "@/types";

interface SidebarProps {
  user: User;
  tickets: AnyTicket[];
  activeStatus: TicketStatus | "all";
  onStatusChange: (status: TicketStatus | "all") => void;
  autoMode?: boolean;
  onAutoModeToggle?: () => void;
  adminPrompt?: string;
  onAdminPromptChange?: (prompt: string) => void;
}

export function Sidebar({
  user,
  tickets,
  activeStatus,
  onStatusChange,
  autoMode = false,
  onAutoModeToggle,
  adminPrompt = "",
  onAdminPromptChange,
}: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const isAdmin = user.role === "admin";

  // Conteo por estado
  const countByStatus = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status).length;

  const totalActive = tickets.filter(
    (t) => t.status !== "completed" && t.status !== "rejected"
  ).length;

  function handleLogout() {
    logout();
  }

  return (
    <aside
      className="flex flex-col h-full w-64 shrink-0 border-r"
      style={{
        backgroundColor: THEME.surface,
        borderColor: THEME.border,
      }}
    >
      {/* Logo */}
      <div
        className="px-6 py-5 border-b"
        style={{ borderColor: THEME.border }}
      >
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

        {/* Todos los tickets */}
        <button
          onClick={() => { onStatusChange("all"); router.push("/dashboard"); }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors"
          style={{
            backgroundColor: activeStatus === "all" && pathname === "/dashboard"
              ? `${THEME.accent}22`
              : "transparent",
            color: activeStatus === "all" && pathname === "/dashboard"
              ? THEME.accent
              : "#94A3B8",
          }}
        >
          <span>Todos los tickets</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: THEME.border, color: "#94A3B8" }}
          >
            {tickets.length}
          </span>
        </button>

        {/* Historial — flujo de estados */}
        <button
          onClick={() => router.push("/history")}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors"
          style={{
            backgroundColor: pathname === "/history"
              ? `${THEME.accent}22`
              : "transparent",
            color: pathname === "/history" ? THEME.accent : "#94A3B8",
          }}
        >
          <span>Historial</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: THEME.border, color: "#94A3B8" }}
          >
            {tickets.length}
          </span>
        </button>

        {/* Tickets · Criticidad — kanban por prioridad */}
        <button
          onClick={() => router.push("/criticality")}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors"
          style={{
            backgroundColor: pathname === "/criticality"
              ? `${THEME.accent}22`
              : "transparent",
            color: pathname === "/criticality" ? THEME.accent : "#94A3B8",
          }}
        >
          <span>Tickets · Criticidad</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: THEME.border, color: "#94A3B8" }}
          >
            {tickets.length}
          </span>
        </button>

        {/* Filtros por estado */}
        <div className="pt-2 pb-1">
          <p className="px-3 text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Estados
          </p>
          {STATUS_ORDER.map((status) => {
            const count  = countByStatus(status);
            const config = STATUS_CONFIG[status];
            const active = activeStatus === status && pathname === "/dashboard";
            return (
              <button
                key={status}
                onClick={() => { onStatusChange(status); router.push("/dashboard"); }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-mono transition-colors"
                style={{
                  opacity: count === 0 ? 0.4 : 1,
                  backgroundColor: active ? `${config.color}18` : "transparent",
                  color: active ? config.color : "#64748B",
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  {config.label}
                </span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Pool de prioridades — solo admin */}
        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => router.push("/pool")}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors"
              style={{
                backgroundColor: pathname === "/pool"
                  ? `${THEME.accent}22`
                  : "transparent",
                color: pathname === "/pool" ? THEME.accent : "#94A3B8",
              }}
            >
              <span>Pool de prioridades</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: THEME.border, color: "#94A3B8" }}
              >
                {totalActive}
              </span>
            </button>

            {/* Clientes — config de repos de GitHub */}
            <button
              onClick={() => router.push("/clients")}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors mt-1"
              style={{
                backgroundColor: pathname === "/clients" ? `${THEME.accent}22` : "transparent",
                color: pathname === "/clients" ? THEME.accent : "#94A3B8",
              }}
            >
              <span>Clientes</span>
            </button>
          </div>
        )}

        {/* Modo AUTO — solo admin */}
        {isAdmin && onAutoModeToggle && (
          <div
            className="mx-1 mt-3 p-3 rounded-lg border"
            style={{ borderColor: THEME.border }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-gray-400">Modo AUTO</span>
              <button
                onClick={onAutoModeToggle}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: autoMode ? THEME.accent : THEME.border,
                }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: autoMode ? "translateX(18px)" : "translateX(2px)" }}
                />
              </button>
            </div>
            <p className="text-xs text-gray-600 font-mono">
              {autoMode
                ? "LOW/MED se ejecutan solos"
                : "Todos requieren aprobación"}
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
                style={{
                  backgroundColor: THEME.bg,
                  borderColor: THEME.border,
                  color: "#94A3B8",
                }}
              />
            </div>
          </div>
        )}
      </nav>

      {/* Footer — logout */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: THEME.border }}
      >
        <button
          onClick={handleLogout}
          className="w-full text-xs font-mono text-gray-500 hover:text-red-400 transition-colors text-left px-3 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
