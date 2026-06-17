// ============================================================
// DevFlow — Módulo 5
// components/ui/Toast.tsx — Sistema de toasts
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { STATUS_CONFIG } from "@/lib/constants";
import type { ToastItem } from "@/types";

const TOAST_DURATION = 4000;
const MAX_TOASTS = 4;

// ─── Hook para manejar toasts ────────────────────────────────
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (item: Omit<ToastItem, "id" | "timestamp">) => {
    const newToast: ToastItem = {
      ...item,
      id: `toast-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setToasts((prev) => {
      const next = [newToast, ...prev];
      return next.slice(0, MAX_TOASTS);
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

// ─── Componente individual ───────────────────────────────────
interface ToastCardProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

function ToastCard({ toast, onRemove }: ToastCardProps) {
  const [progress, setProgress] = useState(100);
  const config = STATUS_CONFIG[toast.newStatus];

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onRemove(toast.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [toast.id, onRemove]);

  return (
    <div
      onClick={() => onRemove(toast.id)}
      className="relative overflow-hidden rounded-lg cursor-pointer select-none"
      style={{
        backgroundColor: "#12121A",
        border: `1px solid ${config.color}44`,
        minWidth: "260px",
        maxWidth: "320px",
      }}
    >
      {/* Contenido */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-mono font-bold"
            style={{ color: "#6366F1" }}
          >
            {toast.ticketId}
          </span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              color: config.color,
              backgroundColor: `${config.color}18`,
            }}
          >
            {config.label}
          </span>
        </div>
        <p className="text-xs text-gray-300 font-mono truncate">
          {toast.ticketTitle}
        </p>
      </div>

      {/* Barra de progreso */}
      <div
        className="absolute bottom-0 left-0 h-0.5 transition-all"
        style={{
          width: `${progress}%`,
          backgroundColor: config.color,
          transition: "width 50ms linear",
        }}
      />
    </div>
  );
}

// ─── Contenedor de toasts ────────────────────────────────────
interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
