"use client";

import { useState } from "react";

/**
 * Bouton « position + action » : lit la position du téléphone (une seule fois, au moment du clic),
 * puis envoie l'action avec les coordonnées. Aucune position n'est suivie en continu.
 */
export function GeoButton({ action, label, className, optional = false }: { action: (lat: number | null, lng: number | null, acc: number | null) => Promise<{ error?: string } | void>; label: string; className?: string; optional?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function go() {
    setMsg("");
    if (!navigator.geolocation) {
      if (optional) { void run(null, null, null); return; }
      setMsg("La localisation n'est pas disponible sur ce téléphone.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => void run(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      (e) => {
        if (optional) { void run(null, null, null); return; }
        setBusy(false);
        setMsg(e.code === 1 ? "Localisation refusée : autorisez-la dans les réglages du téléphone (Safari › Localisation), puis réessayez." : "Position introuvable : sortez à l'air libre ou réessayez.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }
  async function run(lat: number | null, lng: number | null, acc: number | null) {
    try {
      const r = await action(lat, lng, acc);
      if (r && r.error) setMsg(r.error);
    } catch {
      setMsg("Envoi impossible, réessayez.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={go} disabled={busy} className={className}>{busy ? "Localisation en cours…" : label}</button>
      {msg && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">{msg}</div>}
    </div>
  );
}
