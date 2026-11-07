"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { syncQontoQuietAction } from "@/app/actions/payments";

const KEY = "qonto_sync";
type Last = { t: number; inserted: number; error?: string };
const read = (): Last | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } };

/**
 * Importe les virements Qonto à l'ouverture du CRM puis toutes les 5 minutes tant qu'il reste ouvert (session du patron, lecture seule côté banque).
 * Rien n'est rapproché sans certitude : voir lib/qonto.ts.
 */
export function QontoAutoSync({ everyMinutes = 5 }: { everyMinutes?: number }) {
  const router = useRouter();
  useEffect(() => {
    let stop = false, busy = false;
    const run = async () => {
      if (busy || stop || document.visibilityState !== "visible") return;
      const last = read();
      if (last && !last.error && Date.now() - last.t < (everyMinutes * 60_000) - 5_000) return;   // une seule synchro par fenêtre, même avec plusieurs onglets
      busy = true;
      try {
        const r = await syncQontoQuietAction();
        const v: Last = { t: Date.now(), inserted: r.inserted, error: r.ok ? undefined : r.error };
        try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
        window.dispatchEvent(new Event("qonto-sync"));
        if (r.inserted > 0) router.refresh();
      } finally { busy = false; }
    };
    run();
    const id = setInterval(run, 30_000);
    const vis = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [router, everyMinutes]);
  return null;
}

/** Ligne d'état affichée sur la page Paiements : dernière synchronisation réussie, ou l'erreur exacte. */
export function QontoStatus() {
  const [last, setLast] = useState<Last | null>(null);
  useEffect(() => { const f = () => setLast(read()); f(); window.addEventListener("qonto-sync", f); return () => window.removeEventListener("qonto-sync", f); }, []);
  if (!last) return <span className="text-[13px] text-muted-foreground">Synchronisation Qonto en cours…</span>;
  const hhmm = new Date(last.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  return last.error
    ? <span className="text-[13px] text-destructive">Qonto : échec à {hhmm} — {last.error}</span>
    : <span className="text-[13px] text-muted-foreground">Qonto synchronisé à {hhmm}{last.inserted ? ` · ${last.inserted} nouveau(x) virement(s)` : ""}. Mise à jour automatique toutes les 5 minutes.</span>;
}
