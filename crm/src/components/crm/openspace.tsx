"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { instructAgentAction } from "@/app/actions/jarvis";
import { AGENT_BY_KEY } from "@/lib/jarvis/registry";
import { relTime, type Activity, type Desk, type FeedItem, type OpenSpaceState } from "@/lib/jarvis/openspace";
import type { AgentKey } from "@/lib/jarvis/types";

/** Position de chaque poste dans le bureau (3 × 3) : JARVIS Core au centre, les départements autour. */
const GRID: Record<AgentKey, [number, number]> = {
  commercial: [0, 0], marketing: [1, 0], studio: [2, 0],
  relation: [0, 1], core: [1, 1], rh: [2, 1],
  finance: [0, 2], operations: [1, 2], juridique: [2, 2]
};
const COLOR: Record<AgentKey, string> = {
  core: "#a78bfa", finance: "#34d399", commercial: "#60a5fa", operations: "#2dd4bf", relation: "#f472b6", marketing: "#fbbf24", studio: "#fb7185", rh: "#818cf8", juridique: "#94a3b8"
};
const INITIALS: Record<AgentKey, string> = { core: "JC", finance: "FA", commercial: "CD", operations: "OE", relation: "RC", marketing: "MC", studio: "CS", rh: "RH", juridique: "JC" };
const ACT: Record<Activity, { ring: string; dot: string; text: string }> = {
  absent: { ring: "ring-slate-600", dot: "bg-slate-500", text: "text-slate-400" },
  repos: { ring: "ring-emerald-500/40", dot: "bg-emerald-400", text: "text-emerald-300" },
  travaille: { ring: "ring-sky-400", dot: "bg-sky-400", text: "text-sky-300" },
  attend_validation: { ring: "ring-amber-400", dot: "bg-amber-400", text: "text-amber-300" },
  alerte: { ring: "ring-red-500", dot: "bg-red-500", text: "text-red-300" }
};
const TONE: Record<FeedItem["tone"], string> = { info: "border-slate-600 text-slate-200", ok: "border-emerald-500/60 text-emerald-100", warn: "border-amber-400/70 text-amber-100", alert: "border-red-500/70 text-red-100" };
// Géométrie du bureau en % de la grille (gaps : 4 % en largeur, ~5 % en hauteur). Les liaisons se calculent sur ces mêmes valeurs.
const GAPX = 4, GAPY = 5;
const CW = (100 - 2 * GAPX) / 3, CH = (100 - 2 * GAPY) / 3;
const cx = (c: number) => c * (CW + GAPX) + CW / 2;
const cy = (r: number) => r * (CH + GAPY) + CH / 2;

/** Liaison entre deux postes : segment direct entre postes voisins ; arc SOUS la rangée si le poste intermédiaire gênerait ; sinon trait de bord à bord. */
function linkPath(from: AgentKey, to: AgentKey): string {
  const [c1, r1] = GRID[from], [c2, r2] = GRID[to];
  const dc = c2 - c1, dr = r2 - r1;
  if (Math.abs(dc) + Math.abs(dr) === 1) {
    return dc !== 0
      ? `M ${cx(c1) + Math.sign(dc) * CW / 2} ${cy(r1)} L ${cx(c2) - Math.sign(dc) * CW / 2} ${cy(r2)}`
      : `M ${cx(c1)} ${cy(r1) + Math.sign(dr) * CH / 2} L ${cx(c2)} ${cy(r2) - Math.sign(dr) * CH / 2}`;
  }
  if (dr === 0) {
    const y = cy(r1) + CH / 2;
    return `M ${cx(c1)} ${y} Q ${(cx(c1) + cx(c2)) / 2} ${y + 16} ${cx(c2)} ${y}`;
  }
  const ax = cx(c1), ay = cy(r1), bx = cx(c2), by = cy(r2), x = bx - ax, y = by - ay;
  const t = Math.min(x ? CW / 2 / Math.abs(x) : Infinity, y ? CH / 2 / Math.abs(y) : Infinity);
  return `M ${ax + x * t} ${ay + y * t} L ${bx - x * t} ${by - y * t}`;
}

function DeskCard({ d, selected, onSelect }: { d: Desk; selected: boolean; onSelect: () => void }) {
  const a = ACT[d.activity];
  const absent = d.activity === "absent";
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${d.name} : ${d.label}`}
      className={`relative flex h-full min-h-[132px] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border p-3 text-center transition ${selected ? "border-white/70 bg-[#1b2740]" : "border-white/10 bg-[#101828] hover:bg-[#162036]"} ${absent ? "opacity-75" : ""}`}>
      {absent && <span className="absolute -right-7 top-2.5 rotate-45 bg-amber-400 px-7 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-900">Prévu</span>}
      <span className={`relative flex h-14 w-14 items-center justify-center rounded-full text-base font-extrabold text-slate-900 ring-4 ${a.ring} ${d.activity === "travaille" ? "motion-safe:animate-pulse" : ""} ${absent ? "grayscale" : ""}`} style={{ backgroundColor: COLOR[d.key] }}>
        {INITIALS[d.key]}
        {d.activity === "attend_validation" && <span className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-1.5 text-[11px] font-extrabold text-slate-900">{d.pending}</span>}
        {d.urgent > 0 && <span className="absolute -left-2 -top-2 rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold text-white">!</span>}
      </span>
      <span className="text-[13px] font-bold leading-tight text-white">{d.name}</span>
      <span className={`flex items-center gap-1.5 text-[12px] ${a.text}`}>
        <span className={`h-2 w-2 rounded-full ${a.dot}`} />
        {d.activity === "travaille" ? (
          <span>{d.label} <span className="inline-flex gap-0.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="inline-block h-1 w-1 rounded-full bg-sky-300 motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}</span></span>
        ) : d.label}
      </span>
      {!absent && (d.alerts > 0 || d.tasks > 0) && (
        <span className="flex gap-2 text-[11px] text-slate-400">{d.alerts > 0 && <span>{d.alerts} alerte(s)</span>}{d.tasks > 0 && <span>{d.tasks} tâche(s)</span>}</span>
      )}
    </button>
  );
}

export function OpenSpace({ initial, selectedKey, forcedDemo, demoNext }: { initial: OpenSpaceState; selectedKey?: string; forcedDemo?: boolean; demoNext?: (tick: number, now: Date) => OpenSpaceState }) {
  const [state, setState] = useState<OpenSpaceState>(initial);
  const [selected, setSelected] = useState<AgentKey>((selectedKey && selectedKey in AGENT_BY_KEY ? selectedKey : "finance") as AgentKey);
  const [now, setNow] = useState(() => Date.parse(initial.generatedAt));
  const [online, setOnline] = useState(true);
  const tick = useRef(0);
  const demo = state.mode === "demo";

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (demo) {
      const id = setInterval(() => { tick.current += 1; if (demoNext) setState(demoNext(tick.current, new Date())); }, 3500);
      return () => clearInterval(id);
    }
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/jarvis/openspace", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const s: OpenSpaceState = await r.json();
        if (!stop) { setState(s); setOnline(true); }
      } catch { if (!stop) setOnline(false); }
    };
    const id = setInterval(poll, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [demo]);

  const desk = state.desks.find((d) => d.key === selected)!;
  const spec = AGENT_BY_KEY[selected];
  const pendingLinks = state.links.filter((l) => l.status === "pending");
  const grid = useMemo(() => state.desks.map((d) => ({ d, pos: GRID[d.key] })), [state.desks]);

  return (
    <div className="rounded-3xl bg-[#0b1220] p-3 text-slate-100 shadow-xl sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-3 py-1 font-bold ${demo ? "bg-amber-400 text-slate-900" : "bg-emerald-500/20 text-emerald-300"}`}>
          {demo ? "DÉMONSTRATION · données fictives, rien n'est écrit" : "DONNÉES RÉELLES · actualisation toutes les 5 s"}
        </span>
        {!demo && <span className={online ? "text-slate-400" : "font-semibold text-red-300"}>{online ? `mis à jour ${relTime(state.generatedAt, now)}` : "connexion perdue : dernières données affichées"}</span>}
        {forcedDemo && <span className="text-amber-300">Le socle JARVIS n&apos;est pas installé sur cette base : démonstration affichée à la place.</span>}
        <span className="ml-auto flex gap-3 text-slate-400"><span>{state.totals.pending} à valider</span><span>{state.totals.alerts} alerte(s)</span><span>{state.totals.links} demande(s) entre agents</span></span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="relative sm:pb-10">
            <svg className="pointer-events-none absolute left-0 top-0 z-20 hidden w-full overflow-visible sm:block sm:h-[calc(100%-2.5rem)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {state.links.map((l) => (
                <path key={l.id} d={linkPath(l.from, l.to)} fill="none" stroke={l.status === "pending" ? "#38bdf8" : "#64748b"} strokeWidth={l.status === "pending" ? 3 : 1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" className={l.status === "pending" ? "jarvis-flow" : ""} opacity={l.status === "pending" ? 1 : 0.55} />
              ))}
            </svg>
            <div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-x-[4%] sm:gap-y-6" style={{ gridAutoRows: "1fr" }}>
              {grid.map(({ d, pos }) => (
                <div key={d.key} className="min-w-0 sm:[grid-column:var(--c)] sm:[grid-row:var(--r)]" style={{ ["--c" as any]: pos[0] + 1, ["--r" as any]: pos[1] + 1 }}>
                  <DeskCard d={d} selected={selected === d.key} onSelect={() => setSelected(d.key)} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-[12px] text-slate-400" aria-live="polite">
            {pendingLinks.length ? pendingLinks.map((l) => <div key={l.id} className="text-sky-300">↔ {AGENT_BY_KEY[l.from].name} → {AGENT_BY_KEY[l.to].name} : {l.label}{AGENT_BY_KEY[l.to].status === "prevu" ? " (en attente : agent pas encore construit)" : ""}</div>) : <span>Aucune demande en cours entre agents.</span>}
          </div>
        </div>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-2"><h2 className="text-base font-extrabold text-white">{spec.name}</h2><span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200">{demo ? "Démonstration" : spec.status === "actif" ? "Construit" : "Prévu"}</span></div>
            <p className="mt-1 text-[13px] text-slate-300">{spec.mission}</p>
            {desk.lastSummary && !demo && <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 font-sans text-[12px] text-slate-300">{desk.lastSummary}</pre>}
            {demo && <p className="mt-3 text-[12px] text-amber-300">Démonstration : aucun résultat réel.</p>}
            {desk.topAlerts.length > 0 && <ul className="mt-3 space-y-1 text-[12px]">{desk.topAlerts.map((a, i) => <li key={i} className={a.severity === "urgent" ? "text-red-300" : "text-amber-200"}>● {a.title}</li>)}</ul>}
            {desk.openTasks.length > 0 && <ul className="mt-2 space-y-1 text-[12px] text-slate-300">{desk.openTasks.map((t, i) => <li key={i}>☐ {t.title}</li>)}</ul>}
            <a href={`/jarvis/${selected}`} className="mt-3 inline-block text-[12px] font-semibold text-sky-300 underline">Voir la fiche complète, la feuille de route et les preuves</a>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="mb-2 text-sm font-bold text-white">Donner une instruction</h3>
            {demo ? <p className="text-[12px] text-amber-300">Désactivé en démonstration.</p> : (
              <div className="space-y-3">
                <form action={instructAgentAction.bind(null, selected)}>
                  <input type="hidden" name="command" value="run" />
                  <button disabled={spec.status !== "actif" || selected !== "finance"} className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                    {spec.status === "actif" && selected === "finance" ? "Lancer un passage maintenant" : "Lancer un passage (agent pas encore construit)"}
                  </button>
                </form>
                <form action={instructAgentAction.bind(null, selected)} className="space-y-2">
                  <label htmlFor="body" className="sr-only">Instruction en texte libre</label>
                  <textarea id="body" name="body" rows={3} maxLength={500} placeholder="Ex. : surveille en priorité les factures de SWYFO" className="w-full rounded-lg border border-white/15 bg-black/30 p-2 text-[16px] text-white placeholder:text-slate-500 sm:text-sm" />
                  <button className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Enregistrer l&apos;instruction</button>
                  <p className="text-[11px] text-slate-400">Le texte libre est conservé tel quel et reste <b>en attente</b> : aucun agent ne le comprend encore (pas d&apos;IA connectée). Les commandes, elles, s&apos;exécutent.</p>
                </form>
                {desk.instructions.length > 0 && <ul className="space-y-1 border-t border-white/10 pt-2 text-[12px] text-slate-300">{desk.instructions.map((i) => <li key={i.id}><b>{i.kind === "commande" ? "Commande : passage" : `« ${i.body} »`}</b> — {i.status === "en_attente" ? "en attente" : i.status === "executee" ? "exécutée" : "refusée"}{i.result ? <span className="block text-slate-400">{i.result}</span> : null}</li>)}</ul>}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="mb-2 text-sm font-bold text-white">Activité</h3>
            <ol className="max-h-72 space-y-1.5 overflow-auto pr-1" aria-live="polite">
              {state.feed.length === 0 && <li className="text-[12px] text-slate-400">Rien pour l&apos;instant. Lancez un passage de l&apos;agent Finance.</li>}
              {state.feed.slice(0, 20).map((f) => (
                <li key={f.id} className={`rounded-lg border-l-4 bg-black/20 px-2.5 py-1.5 text-[12px] ${TONE[f.tone]}`}>
                  <span className="block text-[10px] text-slate-400">{relTime(f.at, now)}</span>{f.text}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
