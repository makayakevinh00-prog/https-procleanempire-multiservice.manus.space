"use client";

import { useRef, useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import type { Advice } from "@/lib/ai-advisor";

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("Photo illisible"))), "image/jpeg", 0.72));
}

/** « Je suis bloqué » : l'agent photographie ce qui le gêne, l'IA répond avec la méthode et les produits. */
export function AiHelp({ token, mission }: { token: string; mission: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Blob[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [advice, setAdvice] = useState<Advice | null>(null);

  async function add(list: FileList | null) {
    if (!list) return;
    try { const b = await Promise.all([...list].slice(0, 3 - files.length).map(shrink)); setFiles((f) => [...f, ...b].slice(0, 3)); } catch { setErr("Photo illisible, réessayez."); }
    if (input.current) input.current.value = "";
  }
  async function ask() {
    setBusy(true); setErr(""); setAdvice(null);
    try {
      const fd = new FormData(); fd.set("token", token); fd.set("mission", mission); fd.set("question", q);
      files.forEach((f, i) => fd.append("file", f, `p${i}.jpg`));
      const r = await fetch("/api/agent/aide", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Aide indisponible.");
      setAdvice(j.advice as Advice);
    } catch (e: any) { setErr(e.message ?? "Aide indisponible."); }
    setBusy(false);
  }
  return (
    <details className="rounded-2xl border border-[var(--a-line)]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[16px] font-extrabold text-[var(--a-pri)]"><Sparkles className="h-5 w-5" /> Je suis bloqué : demander de l&apos;aide</summary>
      <div className="space-y-2 border-t border-[var(--a-line)] p-3">
        <p className="text-[14px] text-[var(--a-mute)]">Photographiez ce qui vous gêne (tache, surface, matériel). L&apos;aide vous dit comment faire et avec quoi.</p>
        <button type="button" onClick={() => input.current?.click()} disabled={files.length >= 3} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--a-line)] text-base font-semibold"><Camera className="h-5 w-5" /> Ajouter une photo ({files.length}/3)</button>
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void add(e.target.files)} />
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} placeholder="Votre question (facultatif)" className="w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-base" />
        <button type="button" onClick={() => void ask()} disabled={busy || !files.length} className="h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white disabled:opacity-60">{busy ? "Analyse en cours…" : "Demander à l'aide"}</button>
        {err && <div role="alert" className="rounded-xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{err}</div>}
        {advice && (
          <div className="space-y-2 rounded-xl bg-[var(--a-soft)] p-3 text-[15px]">
            {advice.diagnostic && <p><b>Ce que je vois :</b> {advice.diagnostic}</p>}
            {advice.steps.length > 0 && <div><b>Comment faire :</b><ol className="list-decimal pl-5">{advice.steps.map((x, i) => <li key={i}>{x}</li>)}</ol></div>}
            {advice.products.length > 0 && <div><b>Produits / outils :</b><ul className="list-disc pl-5">{advice.products.map((p, i) => <li key={i}>{p.name}{p.why ? ` — ${p.why}` : ""}</li>)}</ul></div>}
            {advice.warnings.map((w, i) => <p key={i} className="font-semibold text-[var(--a-warn)]">⚠ {w}</p>)}
            {advice.escalate && <p className="font-extrabold text-[var(--a-bad)]">Trop risqué ou trop long à faire seul : utilisez « Signaler un problème » pour prévenir votre responsable.</p>}
          </div>
        )}
      </div>
    </details>
  );
}
