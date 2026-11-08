"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { instructAgentAction } from "@/app/actions/jarvis";
import { AGENT_BY_KEY } from "@/lib/jarvis/registry";
import type { Activity, Desk, OpenSpaceState } from "@/lib/jarvis/openspace";
import type { AgentKey } from "@/lib/jarvis/types";
import {
  DESKS,
  DESK_OF,
  HUB,
  POIS,
  PROPS,
  findPath,
  type Tile,
} from "@/lib/jarvis/habbo/map";
import {
  agentVisits,
  baseGoal,
  freshInstructions,
  jarvisRounds,
  type Bubble,
  type Goal,
  type Pose,
} from "@/lib/jarvis/habbo/brain";
import {
  CANVAS_H,
  CANVAS_W,
  LOOKS,
  drawActor,
  drawBubble,
  drawChair,
  drawFloor,
  drawProp,
  drawRing,
  drawTag,
  drawWalls,
  proj,
  sortKey,
  type ScreenMode,
} from "./habbo-draw";

type Id = AgentKey | "owner";
interface Errand {
  tile: Tile;
  bubble: Bubble;
  dwell: number;
  tag: string;
}
interface Actor {
  id: Id;
  x: number;
  y: number;
  path: Tile[];
  errands: Errand[];
  dwellLeft: number;
  dwellBubble: Bubble;
  dwellTag: string | null;
  home: Goal | null;
  pose: Pose;
  bubble: Bubble;
  count?: number;
  face: 1 | -1;
  walking: boolean;
  present: boolean;
  nextWander: number;
}

const ACT_LABEL: Record<Activity, { text: string; dot: string }> = {
  absent: { text: "Pas encore construit", dot: "bg-slate-400" },
  repos: { text: "Au repos", dot: "bg-emerald-400" },
  travaille: { text: "Travaille", dot: "bg-sky-400" },
  attend_validation: { text: "Attend votre validation", dot: "bg-amber-400" },
  alerte: { text: "Alerte ouverte", dot: "bg-red-500" },
};
const SPEED = 2.5; // cases par seconde
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const screenOf = (a: Activity | undefined): ScreenMode =>
  a === "travaille"
    ? "work"
    : a === "attend_validation"
      ? "validate"
      : a === "alerte"
        ? "alert"
        : a === "repos"
          ? "idle"
          : "off";

function newActor(id: Id, tile: Tile): Actor {
  return {
    id,
    x: tile[0],
    y: tile[1],
    path: [],
    errands: [],
    dwellLeft: 0,
    dwellBubble: null,
    dwellTag: null,
    home: null,
    pose: "stand",
    bubble: null,
    face: 1,
    walking: false,
    present: true,
    nextWander: Date.now() + rnd(6000, 16000),
  };
}

export function HabboOffice({
  initial,
  demo,
  demoNext,
  initialAgent,
  forcedDemo,
}: {
  initial: OpenSpaceState;
  demo?: boolean;
  demoNext?: (tick: number, now: Date) => OpenSpaceState;
  initialAgent?: string;
  forcedDemo?: boolean;
}) {
  const [state, setState] = useState<OpenSpaceState>(initial);
  const [selected, setSelected] = useState<Id | null>(
    (initialAgent && initialAgent in AGENT_BY_KEY
      ? initialAgent
      : null) as Id | null,
  );
  const [hover, setHover] = useState<Id | null>(null);
  const [online, setOnline] = useState(true);
  const [writing, setWriting] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const selRef = useRef(selected);
  selRef.current = selected;
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const actors = useRef<Map<Id, Actor>>(new Map());
  const delivered = useRef<Set<string>>(new Set());
  const visitedAt = useRef<Map<string, number>>(new Map());
  const roundSig = useRef("");
  const roundAt = useRef(0);
  const reduce = useRef(false);
  const tick = useRef(0);

  // ── Données : réel (sondage) ou démonstration ─────────────────────────────
  useEffect(() => {
    if (demo) {
      const id = setInterval(() => {
        tick.current += 1;
        if (demoNext) setState(demoNext(tick.current, new Date()));
      }, 4000);
      return () => clearInterval(id);
    }
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/jarvis/openspace", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const s: OpenSpaceState = await r.json();
        if (!stop) {
          setState(s);
          setOnline(true);
        }
      } catch {
        if (!stop) setOnline(false);
      }
    };
    const id = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [demo, demoNext]);

  // ── Synchronisation état → personnages ────────────────────────────────────
  const ensure = useCallback((id: Id, tile: Tile) => {
    let a = actors.current.get(id);
    if (!a) {
      a = newActor(id, tile);
      actors.current.set(id, a);
    }
    return a;
  }, []);
  const send = useCallback((a: Actor, e: Errand, front = false) => {
    if (front) a.errands.unshift(e);
    else a.errands.push(e);
  }, []);

  useEffect(() => {
    const now = Date.now();
    reduce.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const owner = ensure("owner", DESK_OF.owner.chair);
    owner.home = { tile: DESK_OF.owner.chair, pose: "sit_idle", bubble: null };
    const jarvis = ensure("core", HUB);
    jarvis.home = { tile: HUB, pose: "stand", bubble: null };
    for (const d of state.desks) {
      if (d.key === "core") continue;
      const g = baseGoal(d),
        a = ensure(
          d.key,
          g ? g.tile : DESK_OF[d.key as keyof typeof DESK_OF].chair,
        );
      a.present = !!g;
      a.home = g;
      if (g && !a.walking && !a.errands.length && a.dwellLeft <= 0) {
        a.bubble = g.bubble;
        a.count = g.count;
      }
    }
    // demandes entre agents : le demandeur va voir l'autre (une fois, puis toutes les 45 s tant que la demande dure)
    for (const v of agentVisits(state)) {
      const k = `${v.who}>${v.for}:${v.reason}`,
        last = visitedAt.current.get(k) ?? 0;
      if (now - last < 45_000) continue;
      visitedAt.current.set(k, now);
      const a = actors.current.get(v.who);
      if (a?.present)
        send(a, {
          tile: v.tile,
          bubble: v.bubble,
          dwell: 5200,
          tag: AGENT_BY_KEY[v.for as AgentKey]?.name ?? "",
        });
    }
    // JARVIS : nouvelles consignes du patron d'abord, puis tournée des postes qui ont une alerte / une validation
    for (const i of freshInstructions(state, now)) {
      if (delivered.current.has(i.id)) continue;
      delivered.current.add(i.id);
      send(
        jarvis,
        {
          tile: DESK_OF[i.agent].visit,
          bubble: "doc",
          dwell: 6000,
          tag: AGENT_BY_KEY[i.agent].name,
        },
        true,
      );
    }
    const rounds = jarvisRounds(state),
      sig = rounds.map((r) => `${r.to}:${r.reason}`).join("|");
    if (sig && (sig !== roundSig.current || now - roundAt.current > 40_000)) {
      roundSig.current = sig;
      roundAt.current = now;
      for (const r of rounds)
        send(jarvis, {
          tile: DESK_OF[r.to].visit,
          bubble: r.bubble,
          dwell: 4500,
          tag: AGENT_BY_KEY[r.to].name,
        });
    }
    if (!sig) roundSig.current = "";
  }, [state, ensure, send]);

  // ── Boucle d'animation ────────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0,
      last = performance.now(),
      alive = true;
    const t0 = performance.now();

    const goTo = (a: Actor, to: Tile) => {
      const from: Tile = [Math.round(a.x), Math.round(a.y)];
      const p = findPath(from, to);
      if (!p) {
        a.x = to[0];
        a.y = to[1];
        a.path = [];
        return;
      }
      a.path = p.slice(1);
      if (reduce.current) {
        a.x = to[0];
        a.y = to[1];
        a.path = [];
      }
    };

    const stepActor = (a: Actor, dt: number, nowMs: number) => {
      if (!a.present) {
        a.walking = false;
        return;
      }
      if (a.path.length) {
        a.walking = true;
        a.pose = "stand";
        a.bubble = null;
        const [tx, ty] = a.path[0],
          dx = tx - a.x,
          dy = ty - a.y,
          dist = Math.hypot(dx, dy),
          mv = SPEED * dt;
        if (dx - dy !== 0) a.face = dx - dy > 0 ? 1 : -1;
        if (dist <= mv) {
          a.x = tx;
          a.y = ty;
          a.path.shift();
        } else {
          a.x += (dx / dist) * mv;
          a.y += (dy / dist) * mv;
        }
        return;
      }
      a.walking = false;
      if (a.dwellLeft > 0) {
        a.dwellLeft -= dt * 1000;
        a.bubble = a.dwellBubble;
        a.pose = "stand";
        if (a.dwellLeft <= 0) {
          a.dwellBubble = null;
          a.dwellTag = null;
        }
        return;
      }
      if (a.errands.length) {
        const e = a.errands[0],
          at = Math.round(a.x) === e.tile[0] && Math.round(a.y) === e.tile[1];
        if (at) {
          a.errands.shift();
          a.dwellLeft = e.dwell;
          a.dwellBubble = e.bubble;
          a.dwellTag = e.tag;
          a.pose = "stand";
          a.bubble = e.bubble;
        } else goTo(a, e.tile);
        return;
      }
      // retour au poste, puis posture du poste
      const h = a.home;
      if (h) {
        const home =
          Math.round(a.x) === h.tile[0] && Math.round(a.y) === h.tile[1];
        if (!home) {
          goTo(a, h.tile);
          return;
        }
        a.pose = h.pose;
        a.bubble = h.bubble;
        a.count = h.count;
        a.face = 1;
        // promenade d'un agent AU REPOS seulement (jamais en travail, jamais en alerte)
        const d = stateRef.current.desks.find((x) => x.key === a.id);
        if (
          !reduce.current &&
          d?.activity === "repos" &&
          a.id !== "owner" &&
          a.id !== "core" &&
          nowMs > a.nextWander &&
          selRef.current !== a.id
        ) {
          a.nextWander = nowMs + rnd(14000, 34000);
          const spots: [Tile, Bubble][] = [
            [POIS.cooler, "coffee"],
            [POIS.coffee, "coffee"],
            [POIS.sofa, null],
            [POIS.plant, null],
            [POIS.window, null],
            ...DESKS.filter((x) => x.agent !== a.id).map(
              (x): [Tile, Bubble] => [x.visit2, "talk"],
            ),
          ];
          const [tile, bubble] =
            spots[Math.floor(Math.random() * spots.length)];
          a.errands.push({ tile, bubble, dwell: rnd(3000, 6500), tag: "" });
        }
      }
    };

    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (document.visibilityState === "hidden") {
        last = now;
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = now - t0,
        wall = Date.now(),
        st = stateRef.current;
      for (const a of actors.current.values()) stepActor(a, dt, wall);

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(1, "#1e293b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      drawWalls(ctx, t);
      drawFloor(ctx);

      const byKey = new Map(st.desks.map((d) => [d.key, d]));
      type Item = { z: number; draw: () => void };
      const items: Item[] = [];
      for (const p of PROPS) {
        const spot =
          p.kind === "desk"
            ? DESKS.find((d) => d.x === p.x && d.y === p.y)
            : undefined;
        const desk =
          spot && spot.agent !== "owner"
            ? byKey.get(spot.agent as AgentKey)
            : undefined;
        const mode: ScreenMode =
          spot?.agent === "owner" ? "idle" : screenOf(desk?.activity);
        items.push({
          z: sortKey(p),
          draw: () => drawProp(ctx, p, t, mode, desk?.activity === "absent"),
        });
      }
      for (const d of DESKS)
        items.push({
          z: d.chair[0] + d.chair[1] + 1 - 0.02,
          draw: () => drawChair(ctx, d.chair[0], d.chair[1], d.color),
        });
      const sel = selRef.current,
        hov = hoverRef.current;
      for (const a of actors.current.values()) {
        if (!a.present) continue;
        const look = LOOKS[a.id];
        items.push({
          z: a.x + a.y + 1 + (a.pose === "stand" ? 0.01 : 0),
          draw: () => {
            drawActor(ctx, {
              x: a.x,
              y: a.y,
              look,
              pose: a.pose,
              walking: a.walking,
              face: a.face,
              t,
            });
            if (sel === a.id) drawRing(ctx, a.x, a.y, "#fde047", t);
          },
        });
      }
      items.sort((p, q) => p.z - q.z).forEach((i) => i.draw());
      // bulles et étiquettes au-dessus de tout
      for (const a of actors.current.values()) {
        if (!a.present) continue;
        const sitting = a.pose !== "stand";
        if (a.bubble) drawBubble(ctx, a.x, a.y, a.bubble, t, a.count, sitting);
        const tag =
          sel === a.id || hov === a.id || (a.dwellTag && a.id === "core")
            ? a.id === "owner"
              ? "Vous"
              : a.id === "core"
                ? a.dwellTag
                  ? `JARVIS → ${a.dwellTag}`
                  : "JARVIS"
                : AGENT_BY_KEY[a.id as AgentKey].name.split(" ")[0]
            : null;
        if (tag) drawTag(ctx, a.x, a.y, tag, sitting);
      }
      // étiquette d'un bureau absent
      const pj =
        hov && hov !== "owner" ? DESK_OF[hov as keyof typeof DESK_OF] : null;
      if (pj && byKey.get(hov as AgentKey)?.activity === "absent")
        drawTag(
          ctx,
          pj.chair[0],
          pj.chair[1],
          `${AGENT_BY_KEY[hov as AgentKey].name.split(" ")[0]} · à connecter`,
          false,
        );
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Clic / survol : on retrouve le personnage ou le bureau sous le pointeur ──
  const pick = useCallback(
    (ev: React.PointerEvent<HTMLCanvasElement>): Id | null => {
      const cv = canvas.current;
      if (!cv) return null;
      const r = cv.getBoundingClientRect(),
        px = ((ev.clientX - r.left) / r.width) * CANVAS_W,
        py = ((ev.clientY - r.top) / r.height) * CANVAS_H;
      let best: Id | null = null,
        bestY = -1e9;
      for (const a of actors.current.values()) {
        if (!a.present) continue;
        const [fx, fy] = proj(a.x + 0.5, a.y + 0.5);
        if (
          Math.abs(px - fx) < 13 &&
          py > fy - 40 &&
          py < fy + 6 &&
          fy > bestY
        ) {
          best = a.id;
          bestY = fy;
        }
      }
      if (best) return best;
      for (const d of DESKS) {
        // bureau (même vide)
        const [cx, cy] = proj(d.x + 1, d.y + 0.5, 10);
        if (Math.abs(px - cx) < 42 && Math.abs(py - cy) < 22) return d.agent;
      }
      return null;
    },
    [],
  );

  const desk: Desk | undefined =
    selected && selected !== "owner"
      ? state.desks.find((d) => d.key === selected)
      : undefined;
  const spec =
    selected && selected !== "owner"
      ? AGENT_BY_KEY[selected as AgentKey]
      : null;
  const act = desk ? ACT_LABEL[desk.activity] : null;
  const summary = useMemo(
    () =>
      state.desks
        .map((d) => `${d.name} : ${ACT_LABEL[d.activity].text}`)
        .join(" ; "),
    [state.desks],
  );

  return (
    <div className="overflow-hidden rounded-3xl bg-[#0b1220] p-2 text-slate-100 shadow-xl sm:p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 px-1 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-bold ${demo ? "bg-amber-400 text-slate-900" : "bg-emerald-500/20 text-emerald-300"}`}
        >
          {demo
            ? "DÉMONSTRATION · scénario fictif"
            : "EN DIRECT · données réelles"}
        </span>
        {!demo && !online && (
          <span className="font-semibold text-red-300">connexion perdue</span>
        )}
        {forcedDemo && (
          <span className="text-amber-300">
            Socle JARVIS non installé sur cette base : démonstration affichée.
          </span>
        )}
        <span className="ml-auto flex gap-3 text-slate-300">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-sky-400" />
            travaille
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-amber-400" />à valider ·{" "}
            {state.totals.pending}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full bg-red-500" />
            alerte · {state.totals.alerts}
          </span>
        </span>
      </div>

      <div className="relative">
        <canvas
          ref={canvas}
          width={CANVAS_W}
          height={CANVAS_H}
          role="img"
          aria-label={`Les locaux ProClean Empire. ${summary}`}
          className="block w-full cursor-pointer touch-manipulation rounded-2xl [image-rendering:pixelated]"
          onPointerMove={(e) => {
            const p = pick(e);
            if (p !== hoverRef.current) setHover(p);
          }}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const p = pick(
              e as unknown as React.PointerEvent<HTMLCanvasElement>,
            );
            setSelected(p);
            setWriting(false);
          }}
        />

        {selected && (
          <div className="absolute left-3 right-3 top-3 z-10 max-w-sm rounded-2xl border border-white/15 bg-[#0b1220]/95 p-3.5 shadow-2xl backdrop-blur sm:right-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-extrabold text-white">
                  {selected === "owner" ? "Vous · Direction" : spec!.name}
                </div>
                {act && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-300">
                    <i className={`h-2 w-2 rounded-full ${act.dot}`} />
                    {act.text}
                    {desk &&
                    desk.activity !== "absent" &&
                    desk.label &&
                    !["Au repos"].includes(desk.label)
                      ? ` · ${desk.label}`
                      : ""}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer"
                className="rounded-md px-2 text-lg leading-none text-slate-400 hover:bg-white/10"
              >
                ×
              </button>
            </div>
            {selected === "owner" && (
              <p className="mt-2 text-[12.5px] text-slate-300">
                Cliquez sur un agent pour lui parler. JARVIS apporte vos
                consignes en marchant jusqu&apos;à son bureau.
              </p>
            )}
            {selected === "core" && (
              <p className="mt-2 text-[12.5px] text-slate-300">
                JARVIS passe voir les postes qui ont une alerte ou une
                validation en attente, et apporte vos nouvelles consignes.
              </p>
            )}
            {desk && desk.activity !== "absent" && (
              <div className="mt-2 flex gap-3 text-[12.5px] text-slate-300">
                {desk.urgent + desk.alerts > 0 && (
                  <span className="text-red-300">⚠ {desk.alerts}</span>
                )}
                {desk.pending > 0 && (
                  <span className="text-amber-300">⏳ {desk.pending}</span>
                )}
                {desk.tasks > 0 && <span>☐ {desk.tasks}</span>}
                {desk.alerts + desk.pending + desk.tasks === 0 && (
                  <span className="text-slate-400">rien en attente</span>
                )}
              </div>
            )}
            {desk && desk.activity === "absent" && (
              <p className="mt-2 text-[12.5px] text-amber-200">
                Cet agent n&apos;est pas encore construit : son bureau est vide.
              </p>
            )}
            {desk && desk.activity !== "absent" && !demo && (
              <div className="mt-3 space-y-2">
                {!writing ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setWriting(true)}
                      className="rounded-lg bg-sky-500 px-3 py-1.5 text-[13px] font-bold text-slate-900 hover:bg-sky-400"
                    >
                      Donner une consigne
                    </button>
                    {selected === "finance" && (
                      <form action={instructAgentAction.bind(null, "finance")}>
                        <input type="hidden" name="command" value="run" />
                        <button className="rounded-lg border border-white/25 px-3 py-1.5 text-[13px] font-semibold hover:bg-white/10">
                          Lancer un passage
                        </button>
                      </form>
                    )}
                    <Link
                      href={`/jarvis/${selected}`}
                      className="self-center text-[12.5px] font-semibold text-sky-300 underline"
                    >
                      Fiche
                    </Link>
                  </div>
                ) : (
                  <form
                    action={instructAgentAction.bind(null, selected as string)}
                    className="space-y-2"
                  >
                    <textarea
                      name="body"
                      rows={2}
                      maxLength={500}
                      autoFocus
                      placeholder="Ex. : surveille les factures en retard"
                      className="w-full rounded-lg border border-white/15 bg-black/30 p-2 text-[16px] text-white placeholder:text-slate-500 sm:text-sm"
                    />
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-sky-500 px-3 py-1.5 text-[13px] font-bold text-slate-900">
                        Envoyer
                      </button>
                      <button
                        type="button"
                        onClick={() => setWriting(false)}
                        className="rounded-lg px-3 py-1.5 text-[13px] text-slate-300 hover:bg-white/10"
                      >
                        Annuler
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      JARVIS ira la porter. Le texte libre reste en attente tant
                      qu&apos;aucune IA n&apos;est branchée sur cet agent.
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
