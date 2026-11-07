"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import type { KpiSet, Kpi } from "@/lib/jarvis/kpis";
import type { AlertSummary } from "@/lib/jarvis/alerts";
import type { Activity, OpenSpaceState } from "@/lib/jarvis/openspace";
import type { AgentKey } from "@/lib/jarvis/types";
import {
  MEET_SEATS,
  MEET_TABLE,
  OWNER_SEAT,
  ROOMS,
  ROOM_BY_ID,
  WORLD,
  collaborators,
  poseOf,
  seatOf,
  viewOf,
  type CameraView,
  type Pose,
  type Rect,
  type Room,
  type RoomId,
} from "@/lib/jarvis/hq/layout";
import {
  Avatar,
  Chair,
  DeskFront,
  DeskProps,
  HQ_CSS,
  Plant,
  WallScreen,
} from "./parts";

export type Light = "day" | "eve";
const THEME: Record<Light, Record<string, string>> = {
  day: {
    "--hq-floor": "#e4dfd4",
    "--hq-room": "#f4f1ea",
    "--hq-glass": "rgba(170,205,225,.22)",
    "--hq-line": "#8fb0c4",
    "--hq-desk": "#c19466",
    "--hq-desk2": "#a07446",
    "--hq-chair": "#3b4352",
    "--hq-text": "#2a3444",
    "--hq-sky1": "#bcdcf2",
    "--hq-sky2": "#f1f8fd",
    "--hq-rug": "#e8e2d4",
  },
  eve: {
    "--hq-floor": "#1a212c",
    "--hq-room": "#222b38",
    "--hq-glass": "rgba(90,125,155,.2)",
    "--hq-line": "#4b6479",
    "--hq-desk": "#76563a",
    "--hq-desk2": "#5c422b",
    "--hq-chair": "#10151c",
    "--hq-text": "#d6dfeb",
    "--hq-sky1": "#22304f",
    "--hq-sky2": "#4a3a58",
    "--hq-rug": "#2a3442",
  },
};
export const lightNow = (d = new Date()): Light => {
  const h = Number(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hour12: false,
    }).format(d),
  );
  return h >= 7 && h < 19 ? "day" : "eve";
};

const ACCENT: Record<string, string> = {
  finance: "#3f8f80",
  commercial: "#c0683a",
  operations: "#4a74b0",
  relation: "#8a67a8",
  marketing: "#c79a2e",
  studio: "#c2587f",
  rh: "#6e9a4d",
  juridique: "#6a768c",
  hub: "#c9b57f",
  direction: "#26344d",
  collab: "#5aa1b8",
  reception: "#b0895a",
  lounge: "#7a9a78",
};
const accentOf = (r: Room) => ACCENT[r.id] ?? "#888";

const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const val = (k: Kpi | undefined) =>
  !k || k.value === null
    ? null
    : k.unit === "eur"
      ? eur0(k.value)
      : k.unit === "pct"
        ? `${k.value} %`
        : String(k.value);

type Line = { text: string; dim?: boolean };
/** Contenu de l'écran mural d'une pièce : chiffres RÉELS du CRM ou « non disponible ». */
export function screenOf(
  id: RoomId,
  kpis: KpiSet | null,
  alerts: AlertSummary | null,
  state: OpenSpaceState,
): { title: string; lines: Line[] } {
  const K = (kid: string) => kpis?.kpis.find((k) => k.id === kid);
  const L = (label: string, kid: string): Line => {
    const v = val(K(kid));
    return v === null
      ? { text: `${label} : non disponible`, dim: true }
      : { text: `${label} ${v}` };
  };
  switch (id) {
    case "finance":
      return {
        title: "FINANCE",
        lines: [
          L("Encaissé", "fin.encaisse_mois"),
          L("En attente", "fin.en_attente"),
        ],
      };
    case "commercial":
      return {
        title: "COMMERCIAL",
        lines: [
          L("Devis", "com.devis_attente"),
          L("Demandes", "com.demandes"),
        ],
      };
    case "operations":
      return {
        title: "OPÉRATIONS",
        lines: [
          L("À venir", "ops.a_venir"),
          L("À confirmer", "ops.a_confirmer"),
        ],
      };
    case "relation":
      return {
        title: "RELATION CLIENT",
        lines: [
          L("Demandes", "com.demandes"),
          { text: "Réclamations : voir alertes", dim: true },
        ],
      };
    case "reception":
      return {
        title: "ACCUEIL",
        lines: [L("Demandes", "com.demandes"), L("Prospects", "com.prospects")],
      };
    case "direction":
      return {
        title: "DIRECTION",
        lines: [
          L("CA du mois", "fin.ca_mois"),
          alerts
            ? { text: `Alertes ${alerts.open} · prio ${alerts.priority}` }
            : { text: "Alertes : chargement…", dim: true },
        ],
      };
    case "hub":
      return {
        title: "JARVIS CORE",
        lines: [
          alerts
            ? { text: `Alertes ouvertes ${alerts.open}` }
            : { text: "Alertes : chargement…", dim: true },
          { text: `À valider ${state.totals.pending}` },
        ],
      };
    default:
      return {
        title: id.toUpperCase(),
        lines: [
          { text: "Non connecté", dim: true },
          { text: "Prévu plus tard", dim: true },
        ],
      };
  }
}

const Windows = memo(function Windows({ r }: { r: Room }) {
  const n = Math.max(2, Math.floor((r.w - 28) / 70)),
    w = (r.w - 28) / n;
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect
            x={r.x + 14 + i * w}
            y={r.y + 14}
            width={w - 4}
            height={34}
            rx={3}
            fill="url(#hq-sky)"
            stroke="var(--hq-line)"
            strokeWidth={1.5}
          />
          <line
            x1={r.x + 14 + i * w + (w - 4) / 2}
            y1={r.y + 14}
            x2={r.x + 14 + i * w + (w - 4) / 2}
            y2={r.y + 48}
            stroke="var(--hq-line)"
            strokeWidth={1}
          />
        </g>
      ))}
    </g>
  );
});

/** Cadre d'une pièce : sol, cloison vitrée, étiquette. */
const Shell = memo(function Shell({
  r,
  children,
}: {
  r: Room;
  children?: React.ReactNode;
}) {
  return (
    <g>
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={10}
        fill="var(--hq-room)"
      />
      <rect
        x={r.x + 4}
        y={r.y + r.h - 12}
        width={r.w - 8}
        height={8}
        rx={4}
        fill="#000"
        opacity={0.05}
      />
      <rect
        className="hq-glass"
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={10}
        fill="var(--hq-glass)"
        stroke="var(--hq-line)"
        strokeWidth={3}
        strokeOpacity={0.75}
      />
      {children}
      <rect
        x={r.x + 12}
        y={r.y + r.h - 30}
        width={Math.min(r.w - 24, 12 + r.label.length * 6.4)}
        height={20}
        rx={10}
        fill={accentOf(r)}
        opacity={0.92}
      />
      <text
        x={r.x + 22}
        y={r.y + r.h - 16}
        fontSize={11}
        fontWeight={700}
        fill="#fff"
        letterSpacing={0.4}
      >
        {r.label}
      </text>
    </g>
  );
});

const Shelf = memo(function Shelf({
  x,
  y,
  w = 100,
  h = 52,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
}) {
  const cols = [
    "#5b7fa3",
    "#c0683a",
    "#6e9a4d",
    "#c79a2e",
    "#8a67a8",
    "#c2587f",
    "#3f8f80",
  ];
  return (
    <g aria-hidden>
      <rect x={x} y={y} width={w} height={h} rx={3} fill="var(--hq-desk2)" />
      {[0, 1].map((row) => (
        <g key={row}>
          {Array.from({ length: Math.floor((w - 12) / 9) }, (_, i) => (
            <rect
              key={i}
              x={x + 6 + i * 9}
              y={y + 5 + row * 24 + (i % 3)}
              width={6}
              height={17 - (i % 3)}
              fill={cols[(i + row * 3) % cols.length]}
            />
          ))}
        </g>
      ))}
    </g>
  );
});

function Office({
  r,
  who,
  pose,
  screen,
  state,
}: {
  r: Room;
  who: AgentKey;
  pose: Pose;
  screen: ReturnType<typeof screenOf>;
  state: "ok" | "stale" | "demo" | "none";
}) {
  const [sx, sy] = seatOf(who);
  const lit = pose === "working";
  return (
    <g className={`hq-office ${lit ? "on" : ""}`}>
      <Shell r={r}>
        <Windows r={r} />
        <WallScreen
          x={r.x + 16}
          y={r.y + 58}
          accent={accentOf(r)}
          title={screen.title}
          lines={screen.lines}
          state={state}
          w={128}
        />
        <Shelf x={r.x + r.w - 118} y={r.y + 62} />
        <Plant x={r.x + r.w - 26} y={r.y + r.h - 44} />
        <Plant x={r.x + 22} y={r.y + r.h - 50} s={0.8} />
      </Shell>
      <Chair x={sx} y={sy + 6} />
    </g>
  );
}
function OfficeFront({
  r,
  who,
  name,
  sub,
  pose,
}: {
  r: Room;
  who: AgentKey;
  name: string;
  sub: string;
  pose: Pose;
}) {
  const [sx, sy] = seatOf(who);
  return (
    <g>
      <DeskFront
        x={sx}
        y={sy - 20}
        accent={accentOf(r)}
        lit={pose === "working"}
        label={name}
        sub={sub}
      />
      <DeskProps agent={who} x={sx} y={sy - 20} />
    </g>
  );
}

const Logo = memo(function Logo({ x, y }: { x: number; y: number }) {
  return (
    <g aria-label="ProClean Empire">
      <rect x={x} y={y} width={44} height={44} rx={10} fill="#1d3b5c" />
      <path
        d={`M${x + 12} ${y + 33} L${x + 12} ${y + 11} L${x + 25} ${y + 11} Q${x + 34} ${y + 11} ${x + 34} ${y + 19} Q${x + 34} ${y + 27} ${x + 25} ${y + 27} L${x + 12} ${y + 27}`}
        fill="none"
        stroke="#f4d58a"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <text
        x={x + 56}
        y={y + 20}
        fontSize={19}
        fontWeight={800}
        fill="var(--hq-text)"
        letterSpacing={1}
      >
        PROCLEAN
      </text>
      <text
        x={x + 56}
        y={y + 40}
        fontSize={13}
        fontWeight={600}
        fill="#8a6d2f"
        letterSpacing={5}
      >
        EMPIRE
      </text>
    </g>
  );
});

export interface SceneProps {
  state: OpenSpaceState;
  kpis: KpiSet | null;
  alerts: AlertSummary | null;
  light: Light;
  target: Rect;
  demo: boolean;
  selected: RoomId | null;
  pulses: Partial<Record<AgentKey, number>>;
  onPick: (room: RoomId, kind: "dept" | "desk") => void;
}

export function HqScene({
  state,
  kpis,
  alerts,
  light,
  target,
  demo,
  selected,
  pulses,
  onPick,
}: SceneProps) {
  const ref = useRef<SVGSVGElement>(null);
  const cur = useRef<Rect>(viewOf("all"));
  const activity = useMemo(
    () =>
      Object.fromEntries(state.desks.map((d) => [d.key, d.activity])) as Record<
        AgentKey,
        Activity
      >,
    [state.desks],
  );
  const meet = useMemo(
    () => collaborators(state.links, activity),
    [state.links, activity],
  );
  const meetKeys = useMemo(() => [...meet.keys()], [meet]);
  const poses = useMemo(
    () =>
      Object.fromEntries(
        state.desks.map((d) => [d.key, poseOf(d.activity, meet.has(d.key))]),
      ) as Record<AgentKey, Pose>,
    [state.desks, meet],
  );
  const dataState: "ok" | "stale" | "demo" | "none" = demo
    ? "demo"
    : !kpis
      ? "none"
      : Date.now() - Date.parse(kpis.computedAt) > 15 * 60_000
        ? "stale"
        : "ok";
  const deskName = (k: AgentKey) =>
    state.desks.find((d) => d.key === k)?.name ?? k;

  // Caméra : seule la fenêtre (viewBox) bouge ; la scène n'est jamais redessinée pendant le vol.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (r: Rect) => {
      cur.current = r;
      el.setAttribute("viewBox", `${r.x} ${r.y} ${r.w} ${r.h}`);
    };
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      apply(target);
      return;
    }
    const from = { ...cur.current },
      t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 480),
        e = 1 - Math.pow(1 - k, 3),
        l = (a: number, b: number) => a + (b - a) * e;
      apply({
        x: l(from.x, target.x),
        y: l(from.y, target.y),
        w: l(from.w, target.w),
        h: l(from.h, target.h),
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target.x, target.y, target.w, target.h]);

  const keyOpen = (id: RoomId) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(id, "dept");
    }
  };
  const hit = (r: Room, label: string, children: React.ReactNode) => (
    <g
      key={r.id}
      className="hq-hit"
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected === r.id}
      onClick={() => onPick(r.id, "dept")}
      onKeyDown={keyOpen(r.id)}
    >
      {children}
    </g>
  );
  const desks = state.desks;
  const agents = ROOMS.filter((r) => r.agent && r.kind === "office");
  const hub = ROOM_BY_ID.hub,
    collab = ROOM_BY_ID.collab,
    rec = ROOM_BY_ID.reception,
    dir = ROOM_BY_ID.direction,
    lounge = ROOM_BY_ID.lounge;

  return (
    <div
      style={THEME[light] as React.CSSProperties}
      className="relative h-full w-full select-none bg-[var(--hq-floor)] text-[var(--hq-text)]"
    >
      <svg
        ref={ref}
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        className="block h-full w-full touch-manipulation"
        role="group"
        aria-label="Plan des locaux ProClean Empire"
        preserveAspectRatio="xMidYMid meet"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        <defs>
          <linearGradient id="hq-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--hq-sky1)" />
            <stop offset="1" stopColor="var(--hq-sky2)" />
          </linearGradient>
          <pattern
            id="hq-floorp"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <rect width="40" height="40" fill="var(--hq-floor)" />
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="#000"
              strokeOpacity={0.045}
            />
          </pattern>
        </defs>
        <style>{HQ_CSS}</style>
        <rect width={WORLD.w} height={WORLD.h} fill="url(#hq-floorp)" />
        <text
          x={WORLD.w - 24}
          y={WORLD.h - 12}
          textAnchor="end"
          fontSize={12}
          fontWeight={700}
          letterSpacing={2}
          fill={demo ? "#c98a1a" : "#3f8f80"}
          opacity={0.85}
        >
          {demo ? "MODE DÉMONSTRATION" : "MODE RÉEL"}
        </text>

        {/* Pièces (fond) */}
        {agents.map((r) => {
          const k = r.agent as AgentKey;
          return hit(
            r,
            `${r.label} : ${deskName(k)}`,
            <Office
              r={r}
              who={k}
              pose={poses[k]}
              screen={screenOf(r.id, kpis, alerts, state)}
              state={
                ["finance", "commercial", "operations", "relation"].includes(
                  r.id,
                )
                  ? dataState
                  : "none"
              }
            />,
          );
        })}

        {hit(
          dir,
          "Bureau de direction de KevinH",
          <g>
            <Shell r={dir}>
              <Windows r={dir} />
              <WallScreen
                x={dir.x + 16}
                y={dir.y + 58}
                accent={accentOf(dir)}
                {...screenOf("direction", kpis, alerts, state)}
                state={dataState}
                w={140}
              />
              <Shelf x={dir.x + dir.w - 118} y={dir.y + 62} />
              <Plant x={dir.x + dir.w - 26} y={dir.y + dir.h - 44} />
            </Shell>
            <Chair x={OWNER_SEAT[0]} y={OWNER_SEAT[1] + 6} color="#1f2937" />
          </g>,
        )}

        {hit(
          rec,
          "Accueil ProClean Empire",
          <g>
            <Shell r={rec}>
              <Windows r={rec} />
              <Logo x={rec.x + 24} y={rec.y + 62} />
              <WallScreen
                x={rec.x + 240}
                y={rec.y + 60}
                accent={accentOf(rec)}
                {...screenOf("reception", kpis, alerts, state)}
                state={dataState}
                w={150}
              />
              <rect
                x={rec.x + 28}
                y={rec.y + 150}
                width={230}
                height={46}
                rx={8}
                fill="var(--hq-desk)"
              />
              <rect
                x={rec.x + 28}
                y={rec.y + 176}
                width={230}
                height={26}
                rx={6}
                fill="var(--hq-desk2)"
              />
              <text
                x={rec.x + 143}
                y={rec.y + 194}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#fff"
                letterSpacing={2}
              >
                ACCUEIL
              </text>
              <rect
                x={rec.x + 290}
                y={rec.y + 150}
                width={92}
                height={32}
                rx={9}
                fill="#586579"
              />
              <rect
                x={rec.x + 290}
                y={rec.y + 138}
                width={92}
                height={16}
                rx={8}
                fill="#6b7890"
              />
              <rect
                x={rec.x + 400}
                y={rec.y + 158}
                width={64}
                height={30}
                rx={9}
                fill="#586579"
              />
              <rect
                x={rec.x + 400}
                y={rec.y + 146}
                width={64}
                height={16}
                rx={8}
                fill="#6b7890"
              />
              <ellipse
                cx={rec.x + 385}
                cy={rec.y + 205}
                rx={30}
                ry={11}
                fill="#d8cdb6"
              />
              <Plant x={rec.x + 470} y={rec.y + 205} s={1.1} />
              <rect
                x={rec.x + 200}
                y={rec.y + rec.h - 14}
                width={110}
                height={8}
                rx={3}
                fill="#9a7b4f"
              />
              <text
                x={rec.x + 255}
                y={rec.y + rec.h - 18}
                textAnchor="middle"
                fontSize={9}
                fill="var(--hq-text)"
                opacity={0.7}
              >
                ENTRÉE
              </text>
            </Shell>
          </g>,
        )}

        {hit(
          lounge,
          "Espace détente",
          <g>
            <Shell r={lounge}>
              <Windows r={lounge} />
              <rect
                x={lounge.x + 30}
                y={lounge.y + 120}
                width={110}
                height={36}
                rx={10}
                fill="#586579"
              />
              <rect
                x={lounge.x + 30}
                y={lounge.y + 106}
                width={110}
                height={18}
                rx={9}
                fill="#6b7890"
              />
              <rect
                x={lounge.x + 170}
                y={lounge.y + 100}
                width={60}
                height={92}
                rx={6}
                fill="#2a3340"
              />
              <circle
                cx={lounge.x + 200}
                cy={lounge.y + 130}
                r={14}
                fill="#d9e2ee"
                opacity={0.85}
              />
              <Plant x={lounge.x + 250} y={lounge.y + 200} s={1.2} />
            </Shell>
          </g>,
        )}

        {hit(
          collab,
          "Espace central de collaboration",
          <g>
            <Shell r={collab}>
              <Windows r={collab} />
              <WallScreen
                x={collab.x + 24}
                y={collab.y + 60}
                w={collab.w - 48}
                h={56}
                accent={accentOf(collab)}
                state={demo ? "demo" : "ok"}
                title="ESPACE DE COLLABORATION"
                lines={
                  meetKeys.length
                    ? [
                        {
                          text: `${meetKeys.map(deskName).slice(0, 2).join(" ↔ ")}`,
                        },
                        {
                          text:
                            state.links
                              .find((l) => l.status === "pending")
                              ?.label.slice(0, 40) ?? "",
                          dim: true,
                        },
                      ]
                    : [
                        { text: "Salle libre" },
                        { text: "Aucune réunion en cours", dim: true },
                      ]
                }
              />
              <ellipse
                cx={MEET_TABLE.cx}
                cy={MEET_TABLE.cy + 12}
                rx={MEET_TABLE.rx + 18}
                ry={MEET_TABLE.ry + 8}
                fill="#000"
                opacity={0.08}
              />
              {MEET_SEATS.map(([x, y], i) => (
                <ellipse
                  key={i}
                  cx={x}
                  cy={y - 14}
                  rx={19}
                  ry={9}
                  fill="var(--hq-chair)"
                  opacity={0.85}
                />
              ))}
              <ellipse
                cx={MEET_TABLE.cx}
                cy={MEET_TABLE.cy}
                rx={MEET_TABLE.rx}
                ry={MEET_TABLE.ry}
                fill="var(--hq-desk2)"
              />
              <ellipse
                cx={MEET_TABLE.cx}
                cy={MEET_TABLE.cy - 4}
                rx={MEET_TABLE.rx - 8}
                ry={MEET_TABLE.ry - 6}
                fill="var(--hq-desk)"
              />
            </Shell>
          </g>,
        )}

        {hit(
          hub,
          "Poste central JARVIS",
          <g>
            <Shell r={hub}>
              <Windows r={hub} />
              <WallScreen
                x={hub.x + 24}
                y={hub.y + 60}
                w={150}
                accent={accentOf(hub)}
                {...screenOf("hub", kpis, alerts, state)}
                state={dataState}
              />
              <ellipse
                cx={hub.x + hub.w / 2}
                cy={hub.y + hub.h / 2 + 70}
                rx={120}
                ry={38}
                fill="var(--hq-rug)"
              />
              <ellipse
                cx={hub.x + hub.w / 2}
                cy={hub.y + hub.h / 2 + 62}
                rx={96}
                ry={28}
                fill="#0f141b"
                stroke="#c9b57f"
                strokeWidth={2}
              />
              <ellipse
                cx={hub.x + hub.w / 2}
                cy={hub.y + hub.h / 2 + 58}
                rx={70}
                ry={18}
                fill="none"
                stroke="#c9b57f"
                strokeOpacity={0.5}
                strokeDasharray="6 6"
              />
              <Plant x={hub.x + hub.w - 26} y={hub.y + hub.h - 46} />
            </Shell>
          </g>,
        )}

        {/* Personnages (au-dessus des pièces, sous les bureaux) */}
        <g>
          <Avatar who="owner" pose="idle" x={OWNER_SEAT[0]} y={OWNER_SEAT[1]} />
          {desks.map((d) => {
            const inMeet = meet.has(d.key),
              mi = meetKeys.indexOf(d.key);
            const [x, y] = inMeet
              ? MEET_SEATS[mi % MEET_SEATS.length]
              : seatOf(d.key);
            return (
              <g
                key={d.key}
                className="hq-hit"
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(ROOMS.find((r) => r.agent === d.key)!.id, "desk");
                }}
              >
                <Avatar
                  who={d.key}
                  pose={poses[d.key]}
                  x={x}
                  y={y}
                  dim={d.activity === "absent"}
                />
              </g>
            );
          })}
        </g>

        {/* Bureaux (devant les personnages) */}
        {agents.map((r) => {
          const k = r.agent as AgentKey;
          return (
            <OfficeFront
              key={r.id}
              r={r}
              who={k}
              pose={poses[k]}
              name={deskName(k).split(" & ")[0]}
              sub={
                desks.find((d) => d.key === k)?.activity === "absent"
                  ? "Pas encore construit"
                  : poseLabel(poses[k])
              }
            />
          );
        })}
        <g>
          <DeskFront
            x={OWNER_SEAT[0]}
            y={OWNER_SEAT[1] - 20}
            accent={accentOf(dir)}
            lit={false}
            label="KevinH"
            sub="Dirigeant"
          />
          <DeskProps agent="owner" x={OWNER_SEAT[0]} y={OWNER_SEAT[1] - 20} />
        </g>
        <g aria-hidden>
          <rect x={rec.x + 28 - 0} y={rec.y + 150} width={0} height={0} />
        </g>
        <g>
          <text
            x={hub.x + hub.w / 2}
            y={hub.y + hub.h / 2 + 100}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--hq-text)"
            opacity={0.85}
          >
            {poses.core === "absent" ? "Pas construit" : poseLabel(poses.core)}
          </text>
        </g>

        {/* Impulsions : un événement réel vient d'arriver dans ce service */}
        {ROOMS.filter((r) => r.agent && pulses[r.agent]).map((r) => (
          <circle
            key={`${r.id}-${pulses[r.agent!]}`}
            className="hq-ring go"
            cx={r.x + r.w / 2}
            cy={r.y + r.h / 2}
            r={Math.min(r.w, r.h) / 2}
            stroke={accentOf(r)}
          />
        ))}
      </svg>
    </div>
  );
}

const SHORT: Record<Pose, string> = {
  absent: "Pas encore construit",
  idle: "En attente d'instruction",
  working: "Au travail",
  reading: "Documents : à valider",
  struggling: "En difficulté",
  meeting: "En réunion",
};
const poseLabel = (p: Pose) => SHORT[p];
