// ============================================================
// DevFlow — Módulo 5
// components/tickets/TicketCard.tsx
// ============================================================

"use client";

import { StatusBadge, PriorityBadge, TypeBadge, ClientBadge } from "@/components/ui/Badge";
import { THEME } from "@/lib/constants";
import type { AnyTicket, User } from "@/types";

interface TicketCardProps {
  ticket: AnyTicket;
  user: User;
  onClick: (ticket: AnyTicket) => void;
}

export function TicketCard({ ticket, user, onClick }: TicketCardProps) {
  const isAdmin = user.role === "admin";

  const borderColor =
    ticket.status === "rejected"
      ? "#EF4444"
      : ticket.status === "reopened"
      ? "#F97316"
      : ticket.status === "analyzing"
      ? "#60A5FA"
      : THEME.border;

  const isAnalyzing = ticket.status === "analyzing";

  return (
    <div
      onClick={() => onClick(ticket)}
      className="rounded-lg p-4 cursor-pointer transition-all hover:brightness-110"
      style={{
        backgroundColor: THEME.surface,
        border: `1px solid ${borderColor}`,
        animation: isAnalyzing ? "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-indigo-400 font-bold">
              {ticket.id}
            </span>
            {ticket.autoExecuted && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "#6366F118", color: "#6366F1" }}>
                ⚡ Auto
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="mb-1">
              <ClientBadge name={ticket.clientName} />
            </div>
          )}
          <h3 className="text-sm font-mono text-gray-200 truncate">
            {ticket.title}
          </h3>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {isAdmin && <TypeBadge type={ticket.type} />}
        </div>
      </div>

      {/* Descripción */}
      <p className="text-xs text-gray-500 font-mono line-clamp-2 mb-3">
        {ticket.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isAdmin && <TypeBadge type={ticket.type} />}
          {ticket.eta && (
            <span className="text-xs font-mono text-gray-600">
              ETA: {ticket.eta}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ticket.page && (
            <a
              href={ticket.page}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {ticket.pageName || "↗ Ver página"}
            </a>
          )}
          <span className="text-xs text-gray-600 font-mono">
            {new Date(ticket.createdAt).toLocaleDateString("es-AR")}
          </span>
        </div>
      </div>

      {/* Error de IA */}
      {ticket.aiError && (
        <div
          className="mt-3 px-3 py-2 rounded text-xs font-mono"
          style={{ backgroundColor: "#EF444418", color: "#EF4444" }}
        >
          ⚠ {ticket.aiError}
        </div>
      )}
    </div>
  );
}
