// ============================================================
// DevFlow — Módulo 5
// components/layout/AppShell.tsx — Layout principal
// ============================================================

"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";
import { THEME } from "@/lib/constants";
import type { AnyTicket, TicketStatus, User, ToastItem } from "@/types";

interface AppShellProps {
  user: User;
  tickets: AnyTicket[];
  toasts: ToastItem[];
  onToastRemove: (id: string) => void;
  activeStatus?: TicketStatus | "all";
  onStatusChange?: (status: TicketStatus | "all") => void;
  autoMode?: boolean;
  onAutoModeToggle?: () => void;
  adminPrompt?: string;
  onAdminPromptChange?: (prompt: string) => void;
  children: React.ReactNode;
}

export function AppShell({
  user,
  tickets,
  toasts,
  onToastRemove,
  activeStatus,
  onStatusChange,
  autoMode,
  onAutoModeToggle,
  adminPrompt,
  onAdminPromptChange,
  children,
}: AppShellProps) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: THEME.bg }}
    >
      {/* Sidebar */}
      <Sidebar
        user={user}
        tickets={tickets}
        activeStatus={activeStatus}
        onStatusChange={onStatusChange}
        autoMode={autoMode}
        onAutoModeToggle={onAutoModeToggle}
        adminPrompt={adminPrompt}
        onAdminPromptChange={onAdminPromptChange}
      />

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={onToastRemove} />
    </div>
  );
}
