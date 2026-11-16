"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { QuoteEstimate } from "@/lib/ai-advisor";

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("Photo illisible"))), "image/jpeg", 0.75));
}
const FLOOR = 27;

/** Devis par photos : on photographie le site, l'IA estime travail, équipe, produits ; le prix minimum se calcule avec le plancher de 27 € HT / heure. */
export function QuoteAi({ clients }: { clients: { id: string; name: string }[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Blob[]>([]);
  const [notes, setNotes] = useState("");
  const [client, setClient] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [est, setEst] = useState<QuoteEstimate | null>(null);

  async function add(list: FileList | null) {
    if (!list) return;
    try { const b = await Promise.all([...list].slice(0, 8 - files.length).map(shrink)); setFiles((f) => [...f, ...b].slice(0, 8)); } catch { setErr("Photo illisible."); }
    if (input.current) input.current.value = "";
  }
  async function run() {
    setBusy(true); setErr(""); setEst(null);
    try {
      const fd = new FormData(); fd.set("notes", notes); fd.set("client", client);
      files.forEach((f, i) => fd.append("file", f, `s${i}.jpg`));
      const r = await fetch("/api/devis/ia", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Analyse impossible.");
      setEst(j.estimate as QuoteEstimate);
    } catch (e: any) { setErr(e.message ?? "Analyse impossible."); }
    setBusy(false);
  }
  const hours = est?.hours_per_visit ? est.hours_per_visit * (est.agents ?? 1) : null;
  const floor = hours ? Math.round(hours * FLOOR * 100) / 100 : null;
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-white p-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">Client (facultatif : l&apos;analyse est gardée dans sa fiche)<select value={client} onChange={(e) => setClient(e.target.value)} className="mt-1 h-10 w-full rounded-md border px-2"><option value="">— aucun —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <div><div className="mb-1">Photos du site ({files.length}/8)</div><button type="button" onClick={() => input.current?.click()} className="h-10 rounded-md border px-4 font-medium hover:bg-secondary">Prendre / choisir des photos</button><input ref={input} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => void add(e.target.files)} /></div>
        </div>
        <label className="block">Ce que vous savez (m², étages, fréquence voulue, horaires, particularités)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-md border p-2" /></label>
        <button type="button" onClick={() => void run()} disabled={busy || !files.length} className="h-10 rounded-md bg-foreground px-5 font-medium text-background disabled:opacity-60">{busy ? "Analyse en cours…" : "Analyser avec l'IA"}</button>
        {err && <div role="alert" className="rounded-md bg-red-50 p-3 font-medium text-red-800">{err}</div>}
      </div>
      {est && (
        <div className="space-y-3 rounded-xl border bg-white p-4 text-sm">
          <p className="font-medium">{est.summary} <span className="text-xs text-muted-foreground">(fiabilité {est.confidence})</span></p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary p-3"><div className="text-xs text-muted-foreground">Surface estimée</div><b className="text-lg">{est.area_m2 ? `${est.area_m2} m²` : "à confirmer"}</b></div>
            <div className="rounded-lg bg-secondary p-3"><div className="text-xs text-muted-foreground">Temps par passage</div><b className="text-lg">{est.hours_per_visit ? `${est.hours_per_visit} h × ${est.agents ?? 1} agent(s)` : "à confirmer"}</b><div className="text-xs">{est.frequency}</div></div>
            <div className="rounded-lg bg-secondary p-3"><div className="text-xs text-muted-foreground">Prix minimum / passage (27 € HT/h)</div><b className="text-lg">{floor ? `${floor.toLocaleString("fr-FR")} € HT` : "—"}</b></div>
          </div>
          {est.zones.length > 0 && <div><b>Zones et tâches</b><ul className="list-disc pl-5">{est.zones.map((z, i) => <li key={i}><b>{z.zone}</b> : {z.tasks}</li>)}</ul></div>}
          {est.products.length > 0 && <div><b>Produits et matériel à prévoir / acheter</b><ul className="list-disc pl-5">{est.products.map((p, i) => <li key={i}>{p.name} — {p.qty}</li>)}</ul></div>}
          {est.questions.length > 0 && <div><b>À demander au client pour chiffrer juste</b><ul className="list-disc pl-5">{est.questions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          <Link href={client ? `/devis/new?client=${client}` : "/devis/new"} className="inline-flex h-10 items-center rounded-md bg-foreground px-5 font-medium text-background">Faire le devis avec ces chiffres</Link>
          <p className="text-xs text-muted-foreground">L&apos;IA estime d&apos;après les photos : à vérifier sur place. Le prix ne descend jamais sous 27 € HT de l&apos;heure.</p>
        </div>
      )}
    </div>
  );
}
