"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Rafraîchit la page toute seule (données en direct) tant que l'onglet est visible. */
export function LiveRefreshBadge({ every = 15 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, every * 1000);
    return () => clearInterval(id);
  }, [router, every]);
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Mise à jour automatique</span>;
}
