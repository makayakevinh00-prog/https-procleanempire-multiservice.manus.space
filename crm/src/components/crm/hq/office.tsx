"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { instructAgentAction } from "@/app/actions/jarvis";
import type { KpiSet } from "@/lib/jarvis/kpis";
import type { AlertSummary } from "@/lib/jarvis/alerts";
import {
  relTime,
  type FeedItem,
  type OpenSpaceState,
} from "@/lib/jarvis/openspace";
import { AGENT_BY_KEY } from "@/lib/jarvis/registry";
import type { AgentKey } from "@/lib/jarvis/types";
import {
  POSE_LABEL,
  ROOMS,
  ROOM_BY_ID,
  collaborators,
  deskViewOf,
  poseOf,
  viewOf,
  type Rect,
  type RoomId,
} from "@/lib/jarvis/hq/layout";
import { HqScene, lightNow, type Light } from "./scene";

type Zoom = "all" | "dept" | "desk";
type Tab = "mission" | "progress" | "results" | "history" | "tools";
const TABS: { id: Tab; label: string }[] = [
  { id: "mission", label: "Mission" },
  { id: "progress", label: "Progression" },
  { id: "results", label: "Résultats" },
  { id: "history", label: "Historique" },
  { id: "tools", label: "Outils et limites" },
];
const ICON: Record<FeedItem["kind"], string> = {
  passage: "✓",
  alerte: "▲",
  proposition: "●",
  decision: "✓",
  tache: "☐",
  demande: "↔",
  instruction: "▶",
};
const TONE: Record<FeedItem["tone"], string> = {
  info: "border-sky-400",
  ok: "border-emerald-400",
  warn: "border-amber-400",
  alert: "border-red-500",
};

export interface HqOfficeProps {
  initial: OpenSpaceState;
  kpis: KpiSet | null;
  alerts: AlertSummary | null;
  demo: boolean;
  forcedDemo?: boolean;
  /** Démonstration seulement : scénario fictif fourni par l'enveloppe de démonstration. Jamais en mode réel. */
  demoNext?: (tick: number, now: Date) => OpenSpaceState;
  initialAgent?: string;
}

/** Les locaux ProClean Empire : scène + caméra + espace de travail des agents + notifications réelles. */
export function HqOffice({
  initial,
  kpis: kpis0,
  alerts: alerts0,
  demo,
  forcedDemo,
  demoNext,
  initialAgent,
}: HqOfficeProps) {
  const [state, setState] = useState(initial);
  const [kpis, setKpis] = useState(kpis0);
  const [alerts, setAlerts] = useState(alerts0);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [light, setLight] = useState<Light | "auto">("auto");
  const startRoom =
    initialAgent && initialAgent in AGENT_BY_KEY
      ? ROOMS.find((r) => r.agent === initialAgent)!.id
      : null;
  const [room, setRoom] = useState<RoomId | null>(startRoom);
  const [zoom, setZoom] = useState<Zoom>(startRoom ? "dept" : "all");
  const [tab, setTab] = useState<Tab>("mission");
  const [toasts, setToasts] = useState<(FeedItem & { until: number })[]>([]);
  const [pulses, setPulses] = useState<Partial<Record<AgentKey, number>>>({});
  const seen = useRef<Set<string>>(new Set(initial.feed.map((f) => f.id)));
  const tick = useRef(0);

  useEffect(() => {
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(c);
  }, []);

  /** Notifications : UNIQUEMENT à partir d'événements nouveaux dans le fil (enregistrés en base, ou scénario étiqueté en démo). */
  const absorb = (s: OpenSpaceState) => {
    const fresh = s.feed.filter((f) => !seen.current.has(f.id));
    for (const f of fresh) seen.current.add(f.id);
    if (fresh.length) {
      const t = Date.now();
      setToasts((xs) =>
        [
          ...fresh.slice(0, 3).map((f) => ({ ...f, until: t + 6500 })),
          ...xs,
        ].slice(0, 4),
      );
      setPulses((p) => {
        const n = { ...p };
        for (const f of fresh) n[f.agent] = t;
        return n;
      });
    }
    setState(s);
  };
  useEffect(() => {
    const c = setInterval(
      () => setToasts((xs) => xs.filter((x) => x.until > Date.now())),
      1000,
    );
    return () => clearInterval(c);
  }, []);

  useEffect(() => {
    if (demo) {
      if (!demoNext) return;
      const id = setInterval(() => {
        tick.current += 1;
        absorb(demoNext(tick.current, new Date()));
      }, 3500);
      return () => clearInterval(id);
    }
    let stop = false;
    const get = async <T,>(url: string): Promise<T | null> => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as T;
      } catch {
        return null;
      }
    };
    const pollState = async () => {
      const s = await get<OpenSpaceState>("/api/jarvis/openspace");
      if (stop) return;
      if (s) {
        absorb(s);
        setOnline(true);
      } else setOnline(false);
    };
    const pollKpis = async () => {
      const k = await get<KpiSet>("/api/jarvis/kpis");
      if (!stop && k) setKpis(k);
    };
    const pollAlerts = async () => {
      const a = await get<{ summary: AlertSummary }>("/api/jarvis/alerts");
      if (!stop && a) setAlerts(a.summary);
    };
    const a = setInterval(pollState, 5000),
      b = setInterval(pollKpis, 20_000),
      c = setInterval(pollAlerts, 30_000);
    return () => {
      stop = true;
      clearInterval(a);
      clearInterval(b);
      clearInterval(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, demoNext]);

  const target: Rect = useMemo(
    () =>
      zoom === "all" || !room
        ? viewOf("all")
        : zoom === "dept"
          ? viewOf(room)
          : deskViewOf(room),
    [zoom, room],
  );
  const pick = (id: RoomId, kind: "dept" | "desk") => {
    setRoom(id);
    setZoom(kind);
    setTab("mission");
  };
  const theLight: Light = light === "auto" ? lightNow(new Date(now)) : light;

  const agentKey = room ? ROOM_BY_ID[room].agent : undefined;
  const desk = agentKey
    ? state.desks.find((d) => d.key === agentKey)
    : undefined;
  const spec = agentKey ? AGENT_BY_KEY[agentKey] : undefined;
  const activity = useMemo(
    () => Object.fromEntries(state.desks.map((d) => [d.key, d.activity])),
    [state.desks],
  ) as Record<AgentKey, OpenSpaceState["desks"][number]["activity"]>;
  const meet = useMemo(
    () => collaborators(state.links, activity),
    [state.links, activity],
  );
  const pose = desk ? poseOf(desk.activity, meet.has(desk.key)) : null;
  const history = agentKey
    ? state.feed.filter((f) => f.agent === agentKey)
    : [];
  const nom = (k: AgentKey) => AGENT_BY_KEY[k]?.name ?? k;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs sm:px-4">
        <span
          className={`rounded-full px-3 py-1 font-bold ${demo ? "bg-amber-400 text-slate-900" : "bg-emerald-100 text-emerald-800"}`}
        >
          {demo
            ? "DÉMONSTRATION · scénario fictif, rien n'est lu ni écrit"
            : "RÉEL · locaux lus dans votre CRM"}
        </span>
        {!demo && (
          <span
            className={online ? "text-slate-500" : "font-semibold text-red-600"}
          >
            {online
              ? `mis à jour ${relTime(state.generatedAt, now)}`
              : "connexion perdue : dernier état affiché"}
          </span>
        )}
        {forcedDemo && (
          <span className="text-amber-700">
            Socle JARVIS absent de cette base : démonstration affichée.
          </span>
        )}
        <div
          className="ml-auto flex items-center gap-1"
          role="group"
          aria-label="Caméra"
        >
          {(
            [
              ["all", "Vue générale"],
              ["dept", "Département"],
              ["desk", "Gros plan"],
            ] as [Zoom, string][]
          ).map(([z, l]) => (
            <button
              key={z}
              type="button"
              disabled={z !== "all" && !room}
              onClick={() => setZoom(z)}
              aria-pressed={zoom === z}
              className={`rounded-lg border px-2.5 py-1 font-semibold disabled:opacity-40 ${zoom === z ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 hover:bg-slate-100"}`}
            >
              {l}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setLight(
                light === "auto" ? "day" : light === "day" ? "eve" : "auto",
              )
            }
            className="ml-2 rounded-lg border border-slate-300 px-2.5 py-1 font-semibold hover:bg-slate-100"
            title="Éclairage : automatique selon l'heure, jour ou soir"
          >
            {light === "auto"
              ? `Lumière auto (${theLight === "day" ? "jour" : "soir"})`
              : light === "day"
                ? "Jour"
                : "Soir"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative min-w-0">
          <div className="aspect-[16/10] w-full lg:aspect-auto lg:h-[640px]">
            <HqScene
              state={state}
              kpis={kpis}
              alerts={alerts}
              light={theLight}
              target={target}
              demo={demo}
              selected={room}
              pulses={pulses}
              onPick={pick}
            />
          </div>
          <div
            className="pointer-events-none absolute right-3 top-3 flex w-[min(300px,70%)] flex-col gap-2"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border-l-4 bg-slate-900/95 px-3 py-2 text-[12.5px] text-slate-100 shadow-lg ${TONE[t.tone]}`}
              >
                <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  {ICON[t.kind]} {nom(t.agent)}
                  {demo ? " · démo" : ""}
                </span>
                {t.text}
              </div>
            ))}
          </div>
          <p className="pointer-events-none absolute bottom-2 right-3 hidden rounded-md bg-white/85 px-2 py-1 text-[11px] text-slate-600 sm:block">
            Cliquez sur une pièce pour entrer, sur un personnage pour le gros
            plan. Un agent immobile ne fait rien.
          </p>
        </div>

        <aside className="flex min-h-[320px] flex-col border-t border-slate-200 lg:border-l lg:border-t-0">
          {!room ? (
            <div className="p-4 text-sm text-slate-600">
              <h2 className="text-base font-bold text-slate-900">
                Locaux ProClean Empire
              </h2>
              <p className="mt-1">
                Vue générale. {state.totals.pending} proposition(s) à valider,{" "}
                {state.totals.alerts} alerte(s) d&apos;agent,{" "}
                {meet.size
                  ? `${meet.size} agents en réunion`
                  : "aucune réunion en cours"}
                .
              </p>
              {alerts && (
                <p className="mt-2">
                  <Link
                    href="/jarvis/alertes"
                    className="font-semibold text-primary underline"
                  >
                    Tableau des alertes : {alerts.open} ouverte(s),{" "}
                    {alerts.priority} prioritaire(s)
                  </Link>
                </p>
              )}
              <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                {ROOMS.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pick(r.id, "dept")}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-left hover:bg-slate-50"
                    >
                      {r.short}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : !agentKey || !desk || !spec || !pose ? (
            <RoomPanel
              room={room}
              state={state}
              kpis={kpis}
              alerts={alerts}
              meet={meet}
              onBack={() => {
                setRoom(null);
                setZoom("all");
              }}
            />
          ) : (
            <>
              <div className="flex items-start gap-2 p-4 pb-2">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900">
                    {spec.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {ROOM_BY_ID[room].label}
                  </p>
                  <p
                    className={`mt-1 text-[12.5px] font-semibold ${pose === "working" ? "text-sky-700" : pose === "struggling" ? "text-red-700" : pose === "reading" ? "text-amber-700" : pose === "meeting" ? "text-violet-700" : "text-slate-600"}`}
                  >
                    {POSE_LABEL[pose]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRoom(null);
                    setZoom("all");
                  }}
                  className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-100"
                >
                  ← Locaux
                </button>
              </div>
              <div
                className="flex gap-0.5 overflow-x-auto border-b border-slate-200 px-2"
                role="tablist"
              >
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-semibold ${tab === t.id ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4 text-sm">
                {tab === "mission" && (
                  <div className="space-y-3">
                    {desk.activity === "absent" ? (
                      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-600">
                        Cet agent n&apos;est pas encore construit : il ne reçoit
                        aucune mission et reste grisé. Sa construction est
                        planifiée dans sa fiche.
                      </p>
                    ) : desk.pending ? (
                      <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
                        {desk.pending} proposition(s) attendent votre décision.{" "}
                        <Link
                          href="/jarvis"
                          className="font-semibold underline"
                        >
                          Décider
                        </Link>
                      </p>
                    ) : desk.lastSummary ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Dernier passage{" "}
                          {desk.lastRunAt ? relTime(desk.lastRunAt, now) : ""}
                        </p>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-sans text-[12.5px] text-slate-700">
                          {desk.lastSummary}
                        </pre>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-600">
                        Aucune mission en cours. L&apos;agent est immobile à son
                        poste, parce qu&apos;il ne fait rien.
                      </p>
                    )}
                    {!demo && spec.status === "actif" && (
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <form action={instructAgentAction.bind(null, agentKey)}>
                          <input type="hidden" name="command" value="run" />
                          <button
                            disabled={agentKey !== "finance"}
                            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {agentKey === "finance"
                              ? "Lancer un passage maintenant"
                              : "Passage indisponible (agent pas encore construit)"}
                          </button>
                        </form>
                        <form
                          action={instructAgentAction.bind(null, agentKey)}
                          className="space-y-2"
                        >
                          <label htmlFor="hq-body" className="sr-only">
                            Instruction en texte libre
                          </label>
                          <textarea
                            id="hq-body"
                            name="body"
                            rows={2}
                            maxLength={500}
                            placeholder="Instruction libre (enregistrée, en attente du moteur de missions)"
                            className="w-full rounded-lg border border-slate-300 p-2 text-[16px] sm:text-sm"
                          />
                          <button className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                            Enregistrer l&apos;instruction
                          </button>
                        </form>
                      </div>
                    )}
                    {desk.instructions.length > 0 && (
                      <ul className="space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600">
                        {desk.instructions.map((i) => (
                          <li key={i.id}>
                            <b>
                              {i.kind === "commande"
                                ? "Commande : passage"
                                : `« ${i.body} »`}
                            </b>{" "}
                            —{" "}
                            {i.status === "en_attente"
                              ? "en attente"
                              : i.status === "executee"
                                ? "exécutée"
                                : "refusée"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {tab === "progress" && (
                  <div className="space-y-2">
                    {[
                      ["Réception", true],
                      ["Compréhension", true],
                      ["Préparation", true],
                      ["Exécution", !!desk.lastRunAt],
                      [
                        "Collaboration",
                        state.links.some(
                          (l) => l.from === agentKey || l.to === agentKey,
                        ),
                      ],
                      ["Résultat", !!desk.lastSummary],
                      [
                        "Validation humaine",
                        desk.pending === 0 && !!desk.lastSummary,
                      ],
                    ].map(([n, done], i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[13px]"
                      >
                        <i
                          className={`grid h-5 w-5 place-items-center rounded-full border-2 text-[10px] font-bold not-italic ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-400"}`}
                        >
                          {done ? "✓" : i + 1}
                        </i>
                        <span
                          className={done ? "text-slate-800" : "text-slate-400"}
                        >
                          {n as string}
                        </span>
                      </div>
                    ))}
                    <p className="pt-2 text-xs text-slate-500">
                      Étapes déduites du dernier passage enregistré. Le suivi
                      étape par étape d&apos;une mission arrivera avec le moteur
                      de missions, qui n&apos;est pas encore construit.
                    </p>
                  </div>
                )}
                {tab === "results" && (
                  <div className="space-y-2">
                    {desk.topAlerts.length === 0 &&
                      desk.openTasks.length === 0 &&
                      !desk.lastSummary && (
                        <p className="text-slate-500">
                          Aucun résultat produit{demo ? " (démonstration)" : ""}
                          .
                        </p>
                      )}
                    {desk.topAlerts.map((a, i) => (
                      <p
                        key={i}
                        className={`rounded-lg border-l-4 bg-slate-50 px-3 py-2 text-[13px] ${a.severity === "urgent" ? "border-red-500" : a.severity === "attention" ? "border-amber-400" : "border-sky-400"}`}
                      >
                        {a.title}
                      </p>
                    ))}
                    {desk.openTasks.map((t, i) => (
                      <p
                        key={i}
                        className="rounded-lg border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-[13px]"
                      >
                        ☐ {t.title}
                      </p>
                    ))}
                    {desk.lastSummary && (
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 font-sans text-[12.5px] text-slate-700">
                        {desk.lastSummary}
                      </pre>
                    )}
                    <Link
                      href={`/jarvis/${agentKey}`}
                      className="inline-block text-xs font-semibold text-primary underline"
                    >
                      Fiche complète et feuille de route
                    </Link>
                  </div>
                )}
                {tab === "history" && (
                  <ol className="space-y-1.5">
                    {history.length === 0 && (
                      <li className="text-slate-500">
                        Aucun événement pour cet agent.
                      </li>
                    )}
                    {history.slice(0, 40).map((f) => (
                      <li
                        key={f.id}
                        className={`rounded-lg border-l-4 bg-slate-50 px-2.5 py-1.5 text-[12.5px] ${TONE[f.tone]}`}
                      >
                        <span className="block text-[10px] text-slate-500">
                          {relTime(f.at, now)}
                          {demo ? " · démo" : ""}
                        </span>
                        {ICON[f.kind]} {f.text}
                      </li>
                    ))}
                  </ol>
                )}
                {tab === "tools" && (
                  <div className="space-y-3 text-[13px]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Outils
                      </p>
                      <ul className="mt-1 list-disc pl-5">
                        {spec.tools.map((t) => (
                          <li key={t.name}>
                            {t.name}{" "}
                            <span className="text-slate-500">
                              (
                              {t.state === "disponible"
                                ? "disponible"
                                : t.state === "a_connecter"
                                  ? "à connecter"
                                  : "à décider"}
                              )
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Autonomie
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        <li>
                          <b>L1</b> seul : {spec.autonomy.L1.join(" · ")}
                        </li>
                        <li>
                          <b>L2</b> vous validez :{" "}
                          {spec.autonomy.L2.join(" · ")}
                        </li>
                        <li>
                          <b>L3</b> bloqué : {spec.autonomy.L3.join(" · ")}
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ne fait jamais
                      </p>
                      <ul className="mt-1 list-disc pl-5">
                        {spec.limits.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function RoomPanel({
  room,
  state,
  kpis,
  alerts,
  meet,
  onBack,
}: {
  room: RoomId;
  state: OpenSpaceState;
  kpis: KpiSet | null;
  alerts: AlertSummary | null;
  meet: Map<AgentKey, AgentKey>;
  onBack: () => void;
}) {
  const r = ROOM_BY_ID[room];
  const k = (id: string) => kpis?.kpis.find((x) => x.id === id);
  const show = (id: string) => {
    const x = k(id);
    return !x || x.value === null
      ? "non disponible"
      : x.unit === "eur"
        ? `${Math.round(x.value).toLocaleString("fr-FR")} €`
        : String(x.value);
  };
  const nom = (a: AgentKey) => AGENT_BY_KEY[a].name;
  return (
    <div className="p-4 text-sm text-slate-700">
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold text-slate-900">{r.label}</h2>
        <button
          type="button"
          onClick={onBack}
          className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-100"
        >
          ← Locaux
        </button>
      </div>
      {room === "reception" && (
        <div className="mt-2 space-y-1">
          <p>
            Comptoir d&apos;accueil, logo ProClean Empire et espace
            d&apos;attente.
          </p>
          <p>
            Demandes de devis à traiter : <b>{show("com.demandes")}</b> ·
            Prospects : <b>{show("com.prospects")}</b>
          </p>
          <Link
            href="/demandes"
            className="font-semibold text-primary underline"
          >
            Voir les demandes
          </Link>
        </div>
      )}
      {room === "direction" && (
        <div className="mt-2 space-y-1">
          <p>
            Votre bureau. CA du mois : <b>{show("fin.ca_mois")}</b>.
          </p>
          {alerts ? (
            <p>
              Alertes ouvertes : <b>{alerts.open}</b>, prioritaires :{" "}
              <b>{alerts.priority}</b>.
            </p>
          ) : (
            <p>Alertes : chargement…</p>
          )}
          <Link
            href="/jarvis/alertes"
            className="font-semibold text-primary underline"
          >
            Tableau des alertes
          </Link>
        </div>
      )}
      {room === "collab" && (
        <div className="mt-2 space-y-1">
          {meet.size ? (
            <>
              {[
                ...new Set(
                  [...meet.entries()].map(([a, b]) => [a, b].sort().join("|")),
                ),
              ].map((p) => {
                const [a, b] = p.split("|") as AgentKey[];
                return (
                  <p key={p}>
                    {nom(a)} ↔ {nom(b)} :{" "}
                    {
                      state.links.find(
                        (l) =>
                          l.status === "pending" &&
                          ((l.from === a && l.to === b) ||
                            (l.from === b && l.to === a)),
                      )?.label
                    }
                  </p>
                );
              })}
            </>
          ) : (
            <p>
              Salle libre : aucune demande entre agents n&apos;est en cours. Les
              agents s&apos;y réunissent seulement quand une demande réelle
              existe entre eux.
            </p>
          )}
        </div>
      )}
      {room === "lounge" && (
        <p className="mt-2">Espace détente. Rien ne s&apos;y mesure.</p>
      )}
    </div>
  );
}
