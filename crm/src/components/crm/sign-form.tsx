"use client";

import { useEffect, useRef, useState } from "react";
import { refuseDocumentAction, signDocumentAction } from "@/app/actions/signer";

/** Zone de signature : accord, nom, signature dessinée au doigt ou à la souris. */
export function SignForm({ token, what }: { token: string; what: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState(false);
  const [name, setName] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<"signe" | "refuse" | null>(null);

  useEffect(() => { const c = canvas.current; if (!c) return; const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; c.width = r.width * d; c.height = r.height * d; const x = c.getContext("2d")!; x.scale(d, d); x.lineWidth = 2.4; x.lineCap = "round"; x.strokeStyle = "#0f172a"; }, []);
  const pos = (e: React.PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const down = (e: React.PointerEvent) => { e.preventDefault(); canvas.current!.setPointerCapture(e.pointerId); drawing.current = true; const [x, y] = pos(e); const g = canvas.current!.getContext("2d")!; g.beginPath(); g.moveTo(x, y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const [x, y] = pos(e); const g = canvas.current!.getContext("2d")!; g.lineTo(x, y); g.stroke(); setDrawn(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = canvas.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setDrawn(false); };

  async function sign() {
    setErr("");
    if (!drawn) { setErr("Dessinez votre signature dans le cadre."); return; }
    setBusy(true);
    const r = await signDocumentAction(token, name, canvas.current!.toDataURL("image/png"), ok).catch(() => ({ error: "Envoi impossible, réessayez." }));
    setBusy(false);
    if ("error" in r && r.error) setErr(r.error); else setDone("signe");
  }
  async function refuse() { setBusy(true); const r = await refuseDocumentAction(token, reason); setBusy(false); if ("error" in r) setErr(r.error); else setDone("refuse"); }

  if (done === "signe") return <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-5 text-emerald-900"><b className="text-lg">Merci, c&apos;est signé ✓</b><p className="mt-1">Vous allez recevoir le {what} signé par e-mail. <a className="underline" href={`/signer/${token}/pdf?signe=1`}>Le télécharger maintenant</a>.</p></div>;
  if (done === "refuse") return <div role="status" className="mt-6 rounded-xl bg-slate-100 p-5"><b>Votre réponse est enregistrée.</b> L&apos;entreprise va vous recontacter.</div>;
  return (
    <section className="mt-6 space-y-4 rounded-xl border bg-white p-5">
      <label className="flex items-start gap-3 text-[16px]"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-5 w-5" /><span><b>Lu et approuvé.</b> J&apos;ai lu le {what} et je l&apos;accepte. Ma signature en ligne a la même valeur qu&apos;une signature manuscrite entre nous.</span></label>
      <label className="block">Votre nom et prénom<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1 h-12 w-full rounded-lg border px-3 text-base" /></label>
      <div>
        <div className="mb-1 flex items-center justify-between"><span>Signez ici (au doigt ou à la souris)</span><button type="button" onClick={clear} className="text-sm text-blue-700 underline">Effacer</button></div>
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} className="h-40 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white" />
      </div>
      {err && <div role="alert" className="rounded-lg bg-red-50 p-3 font-medium text-red-800">{err}</div>}
      <button type="button" onClick={() => void sign()} disabled={busy} className="h-14 w-full rounded-xl bg-emerald-600 text-lg font-bold text-white disabled:opacity-60">{busy ? "Signature en cours…" : `Signer le ${what}`}</button>
      {!refusing ? <button type="button" onClick={() => setRefusing(true)} className="text-sm text-slate-500 underline">Je ne souhaite pas signer</button> : (
        <div className="space-y-2 border-t pt-3"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pourquoi ? (facultatif)" className="w-full rounded-lg border p-2" /><button type="button" onClick={() => void refuse()} disabled={busy} className="rounded-lg border px-4 py-2 font-medium">Refuser le {what}</button></div>
      )}
    </section>
  );
}
