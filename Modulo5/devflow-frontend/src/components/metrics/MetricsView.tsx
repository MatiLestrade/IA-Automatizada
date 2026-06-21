// ============================================================
// DevFlow — Módulo 5
// components/metrics/MetricsView.tsx — Panel de KPIs
// Tarjetas de totales + barras de distribución (estado /
// criticidad) + tiempo promedio de resolución y vencidos.
// ============================================================

"use client";

import { THEME, STATUS_CONFIG, STATUS_ORDER, PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/constants";
import { computeMetrics, formatDuration } from "@/lib/metrics";
import type { AnyTicket } from "@/types";

// ─── Tarjeta KPI ────────────────────────────────────────────
function KpiCard({ label, value, color, hint }: { label: string; value: string | number; color: string; hint?: string }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
    >
      <span className="text-xs font-mono uppercase tracking-wider text-gray-600">{label}</span>
      <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
      {hint && <span className="text-xs font-mono text-gray-600">{hint}</span>}
    </div>
  );
}

// ─── Barra de distribución ──────────────────────────────────
function DistRow({ label, color, count, total }: { label: string; color: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-28 shrink-0 text-right" style={{ color }}>{label}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: THEME.bg }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono text-gray-500 w-14 shrink-0">{count} · {pct}%</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}>
      <h3 className="text-sm font-bold text-gray-200 mb-3" style={{ fontFamily: "var(--font-syne), sans-serif" }}>{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function MetricsView({ tickets }: { tickets: AnyTicket[] }) {
  const m = computeMetrics(tickets);

  return (
    <div className="flex flex-col gap-6">
      {/* Totales */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <KpiCard label="Total" value={m.total} color="#E2E8F0" />
        <KpiCard label="Abiertos" value={m.open} color={THEME.accent} hint="en curso (sin completar/rechazar)" />
        <KpiCard label="Completados" value={m.completed} color={STATUS_CONFIG.completed.color} />
        <KpiCard label="Rechazados" value={m.rejected} color={STATUS_CONFIG.rejected.color} />
        <KpiCard
          label="Tiempo prom. resolución"
          value={formatDuration(m.avgResolutionMs)}
          color="#A78BFA"
          hint={`${m.resolvedCount} ticket${m.resolvedCount !== 1 ? "s" : ""} con dato`}
        />
        <KpiCard
          label="Vencidos vs ETA"
          value={m.overdue}
          color={m.overdue > 0 ? STATUS_CONFIG.rejected.color : STATUS_CONFIG.completed.color}
          hint="abiertos que pasaron su ETA"
        />
      </div>

      {/* Distribuciones */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Panel title="Por estado">
          {STATUS_ORDER.filter((s) => (m.byStatus[s] ?? 0) > 0).length === 0 ? (
            <span className="text-xs font-mono text-gray-600">—</span>
          ) : (
            STATUS_ORDER.filter((s) => (m.byStatus[s] ?? 0) > 0).map((s) => (
              <DistRow key={s} label={STATUS_CONFIG[s].label} color={STATUS_CONFIG[s].color}
                count={m.byStatus[s] ?? 0} total={m.total} />
            ))
          )}
        </Panel>

        <Panel title="Por criticidad">
          {PRIORITY_ORDER.map((p) => (
            <DistRow key={p} label={PRIORITY_CONFIG[p].label} color={PRIORITY_CONFIG[p].color}
              count={m.byPriority[p] ?? 0} total={m.total} />
          ))}
          {(m.byPriority["none"] ?? 0) > 0 && (
            <DistRow label="Sin clasificar" color="#64748B" count={m.byPriority["none"]} total={m.total} />
          )}
        </Panel>
      </div>
    </div>
  );
}
