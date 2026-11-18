"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

type Msg = { id: string; from_owner: boolean; body: string; at: string };
const hhmm = (t: string) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

/** Conversation de l'agent avec la direction. La conversation se remet à jour toute seule (toutes les 4 secondes). */
export function AgentChat({ token }: { token: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try { const r = await fetch(`/api/agent/messages?token=${token}`, { cache: "no-store" }); const j = await r.json(); if (r.ok) setMsgs(j.messages as Msg[]); } catch { /* hors ligne */ }
  }, [token]);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 4000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/agent/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, body }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Envoi impossible.");
      setText(""); await load();
    } catch (x: any) { setErr(x.message ?? "Envoi impossible."); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="min-h-[50vh] space-y-2 rounded-3xl bg-[var(--a-card)] p-3">
        {!msgs.length && <p className="p-6 text-center text-[15px] text-[var(--a-mute)]">Aucun message. Écrivez à la direction ci-dessous.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from_owner ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[16px] ${m.from_owner ? "bg-[var(--a-soft)]" : "bg-[var(--a-pri)] text-white"}`}>
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
              <div className={`mt-0.5 text-right text-[11px] ${m.from_owner ? "text-[var(--a-mute)]" : "text-white/75"}`}>{m.from_owner ? "Direction · " : ""}{hhmm(m.at)}</div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {err && <div role="alert" className="rounded-xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{err}</div>}
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Votre message…" aria-label="Votre message" className="h-14 min-w-0 flex-1 rounded-2xl border border-[var(--a-line)] bg-[var(--a-card)] px-4 text-base" />
        <button disabled={busy || !text.trim()} aria-label="Envoyer" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-white disabled:opacity-50"><Send className="h-6 w-6" /></button>
      </form>
    </div>
  );
}
