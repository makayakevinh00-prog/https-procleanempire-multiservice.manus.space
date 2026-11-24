"use client";

import { useEffect, useState } from "react";

type Task = { label: string; done: boolean };

/** « À faire, dans l'ordre » : la même liste que dans l'application des nettoyeurs indépendants (numéros, coche immédiate, compteur). */
export function AgentTasks({ items: initial, toggle, locked = false }: { items: Task[]; toggle: (index: number, done: boolean) => Promise<{ ok: boolean; error?: string }>; locked?: boolean }) {
  const [items, setItems] = useState(initial);
  const [err, setErr] = useState("");
  useEffect(() => setItems(initial), [initial]);
  if (!items.length) return null;
  const left = items.filter((t) => !t.done).length;
  const tap = async (i: number) => {
    if (locked) return;
    const next = !items[i]!.done;
    setErr("");
    setItems((l) => l.map((t, k) => (k === i ? { ...t, done: next } : t)));
    const r = await toggle(i, next).catch(() => ({ ok: false, error: "Pas de réseau." }));
    if (!r.ok) { setItems((l) => l.map((t, k) => (k === i ? { ...t, done: !next } : t))); setErr(r.error ?? "Non enregistré, réessayez."); }
  };
  return (
    <section className="rounded-3xl bg-[var(--a-card)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-[17px]">À faire, dans l&apos;ordre</b>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${left ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "bg-[var(--a-okbg)] text-[var(--a-ok)]"}`}>{left ? `${items.length - left}/${items.length}` : "Tout est fait ✔"}</span>
      </div>
      {err && <p role="alert" className="mb-2 rounded-2xl bg-[var(--a-badbg)] p-2 text-[13px] font-bold text-[var(--a-bad)]">{err}</p>}
      <ol className="space-y-1">
        {items.map((t, i) => (
          <li key={i}>
            <button type="button" role="checkbox" aria-checked={t.done} disabled={locked} onClick={() => void tap(i)} className="flex w-full items-start gap-3 rounded-2xl p-2 text-left active:bg-[var(--a-bg)]">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[14px] font-extrabold ${t.done ? "border-[var(--a-ok)] bg-[var(--a-ok)] text-[var(--a-bg)]" : "border-[var(--a-line)] text-[var(--a-mute)]"}`}>{t.done ? "✓" : i + 1}</span>
              <span className={`pt-1 text-[16px] ${t.done ? "text-[var(--a-mute)] line-through" : "font-semibold"}`}>{t.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
