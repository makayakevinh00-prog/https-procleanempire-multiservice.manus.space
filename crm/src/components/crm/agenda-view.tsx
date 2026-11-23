"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { AgendaEvent, AgendaKind } from "@/lib/domain/agenda";

const KIND: Record<AgendaKind, { label: string; dot: string; block: string }> = {
  operationnel: { label: "Opérationnel", dot: "bg-[#1d6fe0]", block: "border-l-[#1d6fe0] bg-[#e4eefd] text-[#143a73]" },
  commercial: { label: "Commercial", dot: "bg-[#1f9d6b]", block: "border-l-[#1f9d6b] bg-[#e2f4ec] text-[#14553b]" },
  personnel: { label: "Personnel", dot: "bg-[#8a94a6]", block: "border-l-[#8a94a6] bg-[#eef0f4] text-[#3b4252]" },
  sejour: { label: "Séjour de voyageurs", dot: "bg-[#d98a1f]", block: "border-l-[#d98a1f] bg-[#fdf3e2] text-[#7a4a06]" }
};
const DAY_NAMES = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const FIRST_HOUR = 6, LAST_HOUR = 22, HOUR_PX = 52;
const minutesOf = (wall: string) => +wall.slice(11, 13) * 60 + +wall.slice(14, 16);
const hhmm = (wall: string) => `${+wall.slice(11, 13)} h${wall.slice(14, 16) === "00" ? "" : ` ${wall.slice(14, 16)}`}`;

type Placed = { e: AgendaEvent; top: number; height: number; col: number; cols: number; startLabel: string };

/** Découpe les évènements du jour et range ceux qui se chevauchent côte à côte. */
function layoutDay(day: string, events: AgendaEvent[]): Placed[] {
  const items = events.filter((e) => !e.allDay && e.start.slice(0, 10) <= day && e.end > `${day}T00:00` && (e.end.slice(0, 10) > day || e.end.slice(0, 10) === day)).filter((e) => e.start.slice(0, 10) === day || e.end.slice(0, 10) >= day).map((e) => {
    const s = e.start.slice(0, 10) < day ? 0 : minutesOf(e.start);
    const en = e.end.slice(0, 10) > day ? 24 * 60 : minutesOf(e.end);
    return { e, s: Math.max(s, FIRST_HOUR * 60), en: Math.min(Math.max(en, s + 20), LAST_HOUR * 60) };
  }).filter((x) => x.en > x.s).sort((a, b) => a.s - b.s || b.en - a.en);
  const out: Placed[] = [];
  let group: (typeof items[number] & { col: number })[] = [], groupEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...group.map((g) => g.col + 1));
    for (const g of group) out.push({ e: g.e, top: ((g.s - FIRST_HOUR * 60) / 60) * HOUR_PX, height: Math.max(((g.en - g.s) / 60) * HOUR_PX - 2, 20), col: g.col, cols, startLabel: hhmm(g.e.start) });
    group = [];
  };
  for (const it of items) {
    if (group.length && it.s >= groupEnd) flush();
    const used = new Set(group.filter((g) => g.en > it.s).map((g) => g.col));
    let col = 0; while (used.has(col)) col++;
    group.push({ ...it, col }); groupEnd = Math.max(groupEnd, it.en);
  }
  if (group.length) flush();
  return out;
}

export function AgendaView({ days, today, events, sources }: { days: string[]; today: string; events: AgendaEvent[]; sources: { label: string; kind: AgendaKind }[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<AgendaEvent | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () => { const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); setNowMin(+p.slice(0, 2) * 60 + +p.slice(3, 5)); };
    tick(); const t = setInterval(tick, 60_000); return () => clearInterval(t);
  }, []);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = (8 - FIRST_HOUR) * HOUR_PX - 12; }, []);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => events.filter((e) => !hidden.has(e.source)), [events, hidden]);
  const toggle = (label: string) => setHidden((h) => { const n = new Set(h); if (n.has(label)) n.delete(label); else n.add(label); return n; });
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const allDay = (day: string) => visible.filter((e) => e.allDay && e.start.slice(0, 10) <= day && (e.end.slice(0, 10) > day || e.start.slice(0, 10) === day));
  const anyAllDay = days.some((d) => allDay(d).length > 0);

  return (
    <div>
      {sources.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2">
        {sources.map((s) => {
          const off = hidden.has(s.label);
          return (
            <button key={s.label} type="button" onClick={() => toggle(s.label)} aria-pressed={!off}
              className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${off ? "border-border bg-white text-muted-foreground line-through decoration-1" : "border-transparent bg-secondary text-foreground"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${off ? "bg-slate-300" : KIND[s.kind].dot}`} />
              {s.label}
            </button>
          );
        })}
      </div>}

      {/* Grille de la semaine (ordinateur et tablette) */}
      <div className="hidden overflow-hidden rounded-2xl border bg-white md:block">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b">
          <div />
          {days.map((d, i) => (
            <div key={d} className="border-l px-2 py-2.5 text-center">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{DAY_NAMES[i]}</span>
              <span className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold ${d === today ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{+d.slice(8, 10)}</span>
            </div>
          ))}
        </div>
        {anyAllDay && (
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b bg-[#f7f9fd]">
            <div className="px-1 py-2 text-right text-[10px] leading-tight text-muted-foreground">journée</div>
            {days.map((d) => (
              <div key={d} className="min-h-[34px] space-y-1 border-l p-1">
                {allDay(d).map((e) => (
                  <button key={e.id} type="button" onClick={() => setOpen(e)} className={`block w-full truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11.5px] font-medium ${KIND[e.kind].block}`}>{e.title}</button>
                ))}
              </div>
            ))}
          </div>
        )}
        <div ref={scroller} className="max-h-[640px] overflow-y-auto">
          <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
            <div className="relative">
              {hours.map((h, i) => <span key={h} className="num absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground" style={{ top: i * HOUR_PX }}>{i === 0 ? "" : `${h} h`}</span>)}
            </div>
            {days.map((d) => (
              <div key={d} className={`relative border-l ${d === today ? "bg-[#f7f9fd]" : ""}`}>
                {hours.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * HOUR_PX }} />)}
                {d === today && nowMin != null && nowMin >= FIRST_HOUR * 60 && nowMin <= LAST_HOUR * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMin - FIRST_HOUR * 60) / 60) * HOUR_PX }}>
                    <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-[#e5484d]" /><span className="h-px flex-1 bg-[#e5484d]" />
                  </div>
                )}
                {layoutDay(d, visible).map((p) => (
                  <button key={p.e.id} type="button" onClick={() => setOpen(p.e)} title={p.e.title}
                    className={`absolute z-10 flex flex-col justify-start overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition-shadow hover:z-30 hover:shadow-md focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${KIND[p.e.kind].block}`}
                    style={{ top: p.top, height: p.height, left: `calc(${(p.col / p.cols) * 100}% + 2px)`, width: `calc(${100 / p.cols}% - 4px)` }}>
                    <span className="block truncate text-[12px] font-semibold leading-tight">{p.e.title}</span>
                    {p.height > 34 && <span className="num block truncate text-[11px] opacity-80">{p.startLabel}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liste jour par jour (téléphone) */}
      <div className="space-y-4 md:hidden">
        {days.map((d, i) => {
          const list = visible.filter((e) => e.start.slice(0, 10) === d);
          return (
            <section key={d}>
              <h3 className={`mb-2 text-[13px] font-semibold uppercase tracking-wide ${d === today ? "text-primary" : "text-muted-foreground"}`}>{DAY_NAMES[i]} {+d.slice(8, 10)}{d === today ? " · aujourd'hui" : ""}</h3>
              {list.length ? (
                <ul className="space-y-2">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => setOpen(e)} className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border-l-4 px-3 py-2 text-left ${KIND[e.kind].block}`}>
                        <span className="num w-14 shrink-0 text-[13px] font-semibold">{e.allDay ? "journée" : hhmm(e.start)}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{e.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl bg-white px-3 py-3 text-[13px] text-muted-foreground">Rien de prévu.</p>}
            </section>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101828]/30 p-4 sm:items-center" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal="true" aria-label={open.title} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <span className="inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground"><span className={`h-2.5 w-2.5 rounded-full ${KIND[open.kind].dot}`} />{KIND[open.kind].label} · {open.source}</span>
            <h3 className="mt-2 text-[19px] font-bold leading-snug text-foreground">{open.title}</h3>
            <p className="num mt-2 text-[14px] text-foreground">
              {new Date(`${open.start.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
              {open.allDay ? " · toute la journée" : ` · ${hhmm(open.start)} à ${hhmm(open.end)}`}
            </p>
            {open.location && <p className="mt-2 flex items-start gap-2 text-[14px] text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{open.location}</p>}
            <div className="mt-5 flex justify-end gap-2">
              {open.href && <Link href={open.href} className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground">{open.kind === "sejour" ? "Ouvrir la conciergerie" : "Ouvrir la mission"}</Link>}
              <button type="button" onClick={() => setOpen(null)} className="inline-flex min-h-[44px] items-center rounded-full border px-5 text-[14px] font-semibold">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
