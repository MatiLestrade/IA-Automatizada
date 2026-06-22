// ============================================================
// DevFlow — Módulo 5
// hooks/useComments.ts — Hilo de comentarios de un ticket
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { Comment } from "@/types";

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  add: (body: string) => Promise<void>;
}

export function useComments(ticketId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<Comment[]>(`/tickets/${ticketId}/comments`);
      setComments(data);
    } catch {
      setError("No se pudieron cargar los comentarios");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (body: string) => {
    const { data } = await api.post<Comment>(`/tickets/${ticketId}/comments`, { body });
    setComments((prev) => [...prev, data]);
  }, [ticketId]);

  return { comments, loading, error, add };
}
