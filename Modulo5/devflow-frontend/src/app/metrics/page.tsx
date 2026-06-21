// ============================================================
// DevFlow — Módulo 5
// app/metrics/page.tsx — Panel de métricas / KPIs (solo admin)
// ============================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { useToasts } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { MetricsView } from "@/components/metrics/MetricsView";
import { THEME } from "@/lib/constants";

export default function MetricsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { tickets, loading: ticketsLoading } = useTickets();
  const { toasts, removeToast } = useToasts();

  // Solo admin
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: THEME.bg }}>
        <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
  }

  return (
    <AppShell user={user} tickets={tickets} toasts={toasts} onToastRemove={removeToast}>
      <div className="p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-100" style={{ fontFamily: "var(--font-syne), sans-serif" }}>
            Métricas
          </h2>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            Indicadores en vivo calculados sobre {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>

        {ticketsLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm font-mono text-gray-600 animate-pulse">Cargando métricas...</span>
          </div>
        ) : (
          <MetricsView tickets={tickets} />
        )}
      </div>
    </AppShell>
  );
}
