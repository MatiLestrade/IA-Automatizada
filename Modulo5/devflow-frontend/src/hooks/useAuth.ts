// ============================================================
// DevFlow — Módulo 5
// hooks/useAuth.ts — Verificación de sesión + redirect
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifySession, getUserFromCookie, isAdmin } from "@/lib/auth";
import type { User } from "@/types";

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  admin: boolean;
}

export function useAuth(redirectIfUnauthenticated = true): UseAuthReturn {
  const router = useRouter();
  // Inicializa con la cookie para evitar flash de pantalla vacía
  const [user, setUser] = useState<User | null>(getUserFromCookie());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const verified = await verifySession();

      if (cancelled) return;

      if (!verified) {
        setUser(null);
        if (redirectIfUnauthenticated) {
          router.replace("/login");
        }
      } else {
        setUser(verified);
      }

      setLoading(false);
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router, redirectIfUnauthenticated]);

  return {
    user,
    loading,
    admin: isAdmin(user),
  };
}
