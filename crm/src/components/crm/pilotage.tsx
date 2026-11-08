"use client";

import { useEffect, useState } from "react";
import { freshnessOf, type Dept, type Kpi, type KpiSet } from "@/lib/jarvis/kpis";
import { relTime } from "@/lib/jarvis/openspace";

const DEPTS: { key: Dept; label: string; color: string }[] = [
  { key: "finance", label: "Finance", color: "#5fb3a1" },
  { key: "commercial", label: "Commercial", color: "#e08a5a" },
  { key: "operations", label: "Opérations", color: "#7aa2e0" }
];
const FRESH = { ok: "bg-emerald-400", warn: "bg-amber-400", old: "bg-red-500", none: "bg-slate-500" } as const;
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const show = (k: Kpi) => (k.value === null ? null : k.unit === "eur" ? eur(k.value) : k.unit === "pct" ? `${k.value} %` : String(k.value));

function Tile({ k, demo, now, computedAt, open, onToggle }: { k: Kpi; demo: boolean; now: number; computedAt: string; open: boolean; onToggle: () => void }) {
  const v = show(k);
  const f = demo ? null : freshnessOf(computedAt, now);
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} title={`Source : ${k.source}`}
      className={`flex min-w-[176px] flex-1 flex-col rounded-xl border p-2.5 text-left transition ${open ? "border-amber-300/70 bg-[#1f1a10]" : "border-white/10 bg-[#161e2e] hover:border-white/30"}`}>
      <span className="text-[11.5px] text-slate-400">{k.label}{demo && <span className="ml-1.5 rounded bg-amber-400/15 px-1 text-[9.5px] font-bold uppercase tracking-wide text-amber-300">exemple</span>}</span>
      {v === null
        ? <span className="py-1 text-[13px] text-slate-400">non disponible</span>
        : <span className="font-mono text-xl font-semibold tabular-nums text-slate-50">{v}</span>}
      <span className="text-[11px] text-slate-400">{v === null ? k.reason : k.detail}</span>
      <span className="mt-1.5 flex flex-col gap-0.5 text-[10.5px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <i className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${demo ? "bg-amber-400" : k.failed ? "bg-red-500" : FRESH[f!.level]}`} />
          {demo ? "exemple, rien n'est lu dans le CRM" : k.failed ? "lecture en échec" : f!.label}
        </span>
        {!demo && !k.failed && k.lastChangeAt && <span className="pl-[13px] text-slate-500">modifié {relTime(k.lastChangeAt, now)}</span>}
      </span>
      {open && (
        <span className="mt-2 block border-t border-white/10 pt-2 text-[11.5px] text-slate-300">
          <span className="block text-slate-400">Source : {k.source}</span>
          {k.lines?.length ? k.lines.map((l, i) => <span key={i} className="mt-0.5 flex justify-between gap-2"><span className="truncate">{l.label}</span><span className="shrink-0 font-mono">{l.value}</span></span>) : null}
        </span>
      )}
    </button>
  );
}

/** Tableau de pilotage. Réel : lit /api/jarvis/kpis (CRM, lecture seule). Démonstration : affiche le jeu fourni, jamais mélangé aux vrais chiffres. */
export function Pilotage({ initial, demo, startCollapsed }: { initial: KpiSet | null; demo: boolean; startCollapsed?: boolean }) {
  const [set, setSet] = useState<KpiSet | null>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(!!startCollapsed);

  useEffect(() => { const c = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(c); }, []);
  useEffect(() => {
    if (demo) return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/jarvis/kpis", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const s: KpiSet = await r.json();
        if (!stop) { setSet(s); setOnline(true); }
      } catch { if (!stop) setOnline(false); }
    };
    const id = setInterval(poll, 20_000);
    return () => { stop = true; clearInterval(id); };
  }, [demo]);

  return (
    <section aria-label="Pilotage de ProClean Empire" className="sticky bottom-0 z-30 mt-4 rounded-t-2xl border border-white/10 bg-[#0e1522]/95 p-3 text-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,.4)] backdrop-blur">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <h2 className="text-sm font-bold">Pilotage</h2>
        <span className={`rounded px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide ${demo ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"}`}>{demo ? "DÉMO · exemples" : "RÉEL · lecture seule"}</span>
        <span className={online || demo ? "text-slate-400" : "font-semibold text-red-300"}>
          {demo ? "Chiffres fictifs, rien n'est lu dans votre CRM." : online ? "Lu directement dans votre CRM, actualisé toutes les 20 s." : "Connexion perdue : derniers chiffres affichés."}
        </span>
        <button type="button" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} className="ml-auto rounded-lg border border-white/15 px-2.5 py-0.5 text-slate-200 hover:border-white/40">{collapsed ? "Afficher" : "Réduire"}</button>
      </div>
      {!collapsed && (!set ? <p className="text-sm text-slate-400">Aucun chiffre pour l&apos;instant.</p> : (
        <div className="grid gap-3 xl:grid-cols-3">
          {DEPTS.map((d) => {
            const ks = set.kpis.filter((k) => k.dept === d.key);
            return (
              <div key={d.key} className="min-w-0">
                <h3 className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ color: d.color }}>{d.label}</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ks.map((k) => <Tile key={k.id} k={k} demo={demo} now={now} computedAt={set.computedAt} open={openId === k.id} onToggle={() => setOpenId(openId === k.id ? null : k.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
