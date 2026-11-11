"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY = "pc_cleaner_link", SKIP = "pc_cleaner_skip";

/** Mémorise le lien du nettoyeur sur ce téléphone : en rouvrant l'application, il retrouve directement ses ménages. */
export function Remember({ token }: { token: string }) {
  useEffect(() => { try { localStorage.setItem(KEY, token); } catch { /* navigation privée */ } }, [token]);
  return null;
}

/** Page d'accueil de l'application : redirige vers le compte mémorisé sinon affiche son contenu. */
export function Resume({ reset, children }: { reset?: boolean; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (reset) localStorage.removeItem(KEY);
      else { const t = localStorage.getItem(KEY); if (t && /^[0-9a-f]{64}$/.test(t)) { window.location.replace(`/nettoyeur/${t}`); return; } }
    } catch { /* ignoré */ }
    setReady(true);
  }, [reset]);
  return ready ? <>{children}</> : <p className="py-24 text-center text-[var(--a-mute)]">Chargement…</p>;
}

/** Les demandes arrivent en direct : la liste se rafraîchit toute seule tant que l'écran est ouvert. */
export function LiveRefresh({ every = 15 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, every * 1000);
    const onVis = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [router, every]);
  return <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--a-ok)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--a-ok)]" />En direct</span>;
}

/** Une demande de ménage : « J'accepte » ou « Passer » (Passer la masque sur ce téléphone, sans rien changer pour les autres). */
export function RequestCard({ id, children, accept }: { id: string; children: React.ReactNode; accept: React.ReactNode }) {
  const [skipped, setSkipped] = useState(false);
  useEffect(() => { try { setSkipped((JSON.parse(localStorage.getItem(SKIP) ?? "[]") as string[]).includes(id)); } catch { /* ignoré */ } }, [id]);
  if (skipped) return null;
  const skip = () => {
    try { const l = JSON.parse(localStorage.getItem(SKIP) ?? "[]") as string[]; localStorage.setItem(SKIP, JSON.stringify([id, ...l].slice(0, 200))); } catch { /* ignoré */ }
    setSkipped(true);
  };
  return (
    <article className="space-y-3 rounded-3xl bg-[var(--a-card)] p-4">
      {children}
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button type="button" onClick={skip} className="h-14 rounded-2xl border border-[var(--a-line)] text-[17px] font-extrabold text-[var(--a-mute)] active:opacity-80">Passer</button>
        {accept}
      </div>
    </article>
  );
}

/** « Utiliser ma position » : le téléphone donne sa position GPS, envoyée avec le profil (rayon calculé depuis ce point). */
export function GpsButton() {
  const [msg, setMsg] = useState<string>("");
  const use = () => {
    if (!navigator.geolocation) { setMsg("La localisation n'est pas disponible sur cet appareil."); return; }
    setMsg("Localisation en cours…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const f = document.getElementById("gps-lat") as HTMLInputElement | null, g = document.getElementById("gps-lng") as HTMLInputElement | null;
        if (f && g) { f.value = String(p.coords.latitude); g.value = String(p.coords.longitude); }
        setMsg("Position GPS prise : enregistrez le profil pour l'utiliser.");
      },
      () => setMsg("Autorisez la localisation dans votre navigateur, ou renseignez votre adresse."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  return (
    <div>
      <input type="hidden" name="gps_lat" id="gps-lat" /><input type="hidden" name="gps_lng" id="gps-lng" />
      <button type="button" onClick={use} className="h-12 w-full rounded-2xl border border-[var(--a-pri)] text-base font-extrabold text-[var(--a-pri)]">📍 Utiliser ma position GPS</button>
      {msg && <p role="status" className="mt-1 text-xs text-[var(--a-mute)]">{msg}</p>}
    </div>
  );
}
