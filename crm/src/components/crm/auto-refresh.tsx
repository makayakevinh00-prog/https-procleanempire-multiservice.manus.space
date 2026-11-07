"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Relit la page toutes les `seconds` secondes (données du serveur, lecture seule). Suspendu quand l'onglet est caché. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
