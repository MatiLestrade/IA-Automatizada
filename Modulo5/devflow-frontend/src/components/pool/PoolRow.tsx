// ============================================================
// DevFlow — Módulo 5
// components/pool/PoolRow.tsx — Fila del pool de prioridades
// ============================================================

"use client";

import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/ui/Badge";
import { PRIORITY_CONFIG, THEME } from "@/lib/constants";
import type { AnyTicket } from "@/types";

interface PoolRowProps {
  ticket: AnyTicket;
  index: number;           // posición actual (manual)
  aiIndex: number;         // posición sugerida por la IA
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onClick: (ticket: AnyTicket) => void;
}

export function PoolRow({
  ticket,
  index,
  aiIndex,
  isDragging,
  onMouseDown,
  onClick,
}: PoolRowProps) {
  const delta    = index - aiIndex; // positivo = bajó, negativo = subió
  const priority = PRIORITY_CONFIG[ticket.priority] ?? { color: "#64748B", label: "—", weight: 0 };

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, ticket.id)}
      onClick={() => onClick(ticket)}
      className="flex items-center gap-4 px-4 py-3 rounded-lg cursor-grab active:cursor-grabbing select-none transition-all"
      style={{
        backgroundColor: isDragging ? `${THEME.accent}18` : THEME.surface,
        border: `1px solid ${isDragging ? THEME.accent : THEME.border}`,
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      {/* Número de posición */}
      <div
        className="w-7 h-7 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0"
        style={{ backgroundColor: THEME.border, color: "#64748B" }}
      >
        {index + 1}
      </div>

      {/* Indicador de prioridad */}
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: priority.color }}
      />

      {/* Info del ticket */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono text-indigo-400 font-bold">
            {ticket.id}
          </span>
          <span className="text-xs font-mono text-gray-500 truncate">
            {ticket.clientName}
          </span>
        </div>
        <p className="text-sm font-mono text-gray-200 truncate">
          {ticket.title}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        <TypeBadge type={ticket.type} />
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
      </div>

      {/* ETA */}
      {ticket.eta && (
        <span className="text-xs font-mono text-gray-600 shrink-0 w-12 text-right">
          {ticket.eta}
        </span>
      )}

      {/* Delta vs orden IA */}
      <div className="w-10 text-right shrink-0">
        {delta === 0 ? (
          <span className="text-xs font-mono text-gray-600">—</span>
        ) : delta > 0 ? (
          <span className="text-xs font-mono text-red-400">▼ {delta}</span>
        ) : (
          <span className="text-xs font-mono text-green-400">▲ {Math.abs(delta)}</span>
        )}
      </div>

      {/* Handle de drag */}
      <div className="text-gray-600 shrink-0 text-sm select-none">⠿</div>
    </div>
  );
}
