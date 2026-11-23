"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Page de suivi du client : se met à jour toute seule tant que le ménage n'est pas terminé (onglet visible uniquement). */
export function TrackRefresh({ every = 20 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, every * 1000);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
