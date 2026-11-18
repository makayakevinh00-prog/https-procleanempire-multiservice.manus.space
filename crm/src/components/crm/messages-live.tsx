"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { markAgentMessagesReadAction, sendToAgentAction } from "@/app/actions/messages";

type Msg = { id: string; fromOwner: boolean; body: string; at: string; read: boolean };
export type Conversation = { id: string; name: string; messages: Msg[] };
const hhmm = (t: string) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const day = (t: string) => new Date(t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "short" });

/** Conversations avec les agents. Les messages reçus arrivent en temps réel (Supabase Realtime) ; l'envoi apparaît tout de suite. */
export function MessagesLive({ initial, selected }: { initial: Conversation[]; selected: string | null }) {
  const [convs, setConvs] = useState(initial);
  const [current, setCurrent] = useState<string | null>(selected ?? initial[0]?.id ?? null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [live, setLive] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  const add = useCallback((row: { id: string; staff_id: string; from_owner: boolean; body: string; created_at: string; read_at: string | null }) => {
    setConvs((cs) => cs.map((c) => (c.id !== row.staff_id || c.messages.some((m) => m.id === row.id) ? c : { ...c, messages: [...c.messages, { id: row.id, fromOwner: row.from_owner, body: row.body, at: row.created_at, read: !!row.read_at }] })));
    if (!row.from_owner && currentRef.current === row.staff_id) void markAgentMessagesReadAction(row.staff_id);
  }, []);

  useEffect(() => {
    const sb = createClient();
    const ch = sb.channel("team-messages").on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, (p) => add(p.new as any)).subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => { void sb.removeChannel(ch); };
  }, [add]);
  useEffect(() => { if (current) void markAgentMessagesReadAction(current).then(() => setConvs((cs) => cs.map((c) => (c.id === current ? { ...c, messages: c.messages.map((m) => (m.fromOwner ? m : { ...m, read: true })) } : c)))); }, [current]);

  const conv = convs.find((c) => c.id === current) ?? null;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [conv?.messages.length, current]);
  const unread = (c: Conversation) => c.messages.filter((m) => !m.fromOwner && !m.read).length;
  const sorted = useMemo(() => [...convs].sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? "") || a.name.localeCompare(b.name)), [convs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!conv || !body) return;
    setText(""); setErr("");
    const tmp: Msg = { id: `tmp-${Date.now()}`, fromOwner: true, body, at: new Date().toISOString(), read: false };
    setConvs((cs) => cs.map((c) => (c.id === conv.id ? { ...c, messages: [...c.messages, tmp] } : c)));
    const r = await sendToAgentAction(conv.id, body);
    if (r.error) { setErr(r.error); setConvs((cs) => cs.map((c) => (c.id === conv.id ? { ...c, messages: c.messages.filter((m) => m.id !== tmp.id) } : c))); }
  }

  if (!convs.length) return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Aucun agent actif. Ajoutez-en dans Équipe.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <ul className="space-y-1 rounded-2xl border bg-card p-2">
        {sorted.map((c) => (
          <li key={c.id}><button type="button" onClick={() => setCurrent(c.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition ${c.id === current ? "bg-primary/15" : "hover:bg-secondary/70"}`}>
            <span className="min-w-0"><b className="block truncate text-[14px]">{c.name}</b><span className="block truncate text-xs text-muted-foreground">{c.messages.at(-1)?.body ?? "Aucun message"}</span></span>
            {unread(c) > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{unread(c)}</span>}
          </button></li>
        ))}
        <li className="px-3 pt-2 text-[11px] text-muted-foreground"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-slate-400"}`} />{live ? "En direct" : "Connexion…"}</li>
      </ul>
      <div className="flex min-h-[60vh] flex-col rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-[15px] font-semibold">{conv?.name}</div>
        <div className="flex-1 space-y-2 overflow-auto p-4" style={{ maxHeight: "60vh" }}>
          {!conv?.messages.length && <p className="py-10 text-center text-sm text-muted-foreground">Aucun message. Écrivez le premier ci-dessous.</p>}
          {conv?.messages.map((m, i) => {
            const prev = conv.messages[i - 1];
            return (
              <div key={m.id}>
                {(!prev || day(prev.at) !== day(m.at)) && <div className="my-2 text-center text-[11px] text-muted-foreground">{day(m.at)}</div>}
                <div className={`flex ${m.fromOwner ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-[14px] ${m.fromOwner ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className="mt-0.5 text-right text-[10px] opacity-70">{hhmm(m.at)}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={end} />
        </div>
        {err && <div role="alert" className="mx-4 mb-2 rounded-md bg-red-50 p-2 text-sm text-red-800">{err}</div>}
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={`Écrire à ${conv?.name ?? ""}…`} aria-label="Message" className="h-11 min-w-0 flex-1 rounded-xl border bg-transparent px-4 text-[14px]" />
          <button disabled={!text.trim()} aria-label="Envoyer" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-5 w-5" /></button>
        </form>
      </div>
    </div>
  );
}
