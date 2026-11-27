"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { AnimatedValue } from "@/components/ui/animated-value";
import { cn } from "@/lib/utils";

export type CockpitActivity = {
  key: string;
  label: string;
  short: string;
  /** Montant mensuel HT signé (contrats actifs). */
  monthly: number;
  clients: { id: string; name: string; monthly: number; contracts: number }[];
};
export type CockpitDay = {
  date: string;
  weekday: string;
  day: string;
  today: boolean;
  past: boolean;
  items: {
    id: string;
    time: string | null;
    title: string;
    client: string;
    done: boolean;
  }[];
};
export type CockpitGoal = {
  billed: number;
  target: number | null;
  suggested: boolean;
  recurring: number;
  monthLabel: string;
  day: number;
  days: number;
};

const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const COLORS: Record<string, string> = {
  nettoyage_airbnb: "#2b4c7e",
  nettoyage_pro: "#2f7a55",
  gestion_locative: "#6b3f86",
  ponctuel: "#b0721a",
};
const colorOf = (key: string) => COLORS[key] ?? "#2b4c7e";

function useMounted() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

/** Anneau de progression : le trait se dessine à l'ouverture de la page. */
function Ring({
  pct,
  size,
  stroke,
  color,
  track = "hsl(var(--secondary))",
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const on = useMounted();
  const r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  const shown = on ? Math.max(0, Math.min(pct, 100)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          className="transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/**
 * Accueil-cockpit : l'objectif du mois au centre, un cercle par activité autour.
 * Un clic sur un cercle ouvre les clients qui ont signé cette activité, et pour combien.
 */
export function Cockpit({
  goal,
  activities,
  week,
}: {
  goal: CockpitGoal;
  activities: CockpitActivity[];
  week: CockpitDay[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const total = activities.reduce((a, x) => a + x.monthly, 0);
  const pct =
    goal.target && goal.target > 0
      ? Math.round((goal.billed / goal.target) * 100)
      : 0;
  const current = activities.find((a) => a.key === open) ?? null;
  const planned = week.reduce((a, d) => a + d.items.length, 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section
      aria-label="Vue d'ensemble"
      className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      {/* Objectif du mois et activités */}
      <div className="rounded-2xl border border-[#dbe6fc] bg-gradient-to-br from-[#f0f4fc] to-[#dbe6fc] p-5 shadow-[0_1px_2px_rgba(30,58,110,0.06),0_10px_28px_rgba(30,58,110,0.08)] sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            Objectif de {goal.monthLabel}
          </h2>
          <span className="text-xs text-muted-foreground">
            jour {goal.day} sur {goal.days}
          </span>
        </div>

        <div className="mt-6 flex flex-col items-center gap-7 md:flex-row md:items-center md:gap-9">
          <Ring pct={pct} size={208} stroke={14} color="hsl(var(--primary))">
            <span className="num text-[46px] font-semibold leading-none tracking-[-0.04em] text-foreground">
              <AnimatedValue value={`${pct} %`} />
            </span>
            <span className="mt-2 text-[12px] leading-tight text-muted-foreground">
              {eur0(goal.billed)} facturés
              <br />
              {goal.target ? (
                <>sur {eur0(goal.target)} HT</>
              ) : (
                "aucun objectif fixé"
              )}
            </span>
          </Ring>

          <div className="min-w-0 flex-1 self-stretch">
            <p className="text-[13px] text-muted-foreground">
              Vos activités :{" "}
              <b className="num font-medium text-foreground">{eur0(total)}</b>{" "}
              HT signés par mois. Touchez un cercle pour voir les clients.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2 2xl:grid-cols-4">
              {activities.map((a, index) => {
                const share =
                  total > 0 ? Math.round((a.monthly / total) * 100) : 0;
                const active = open === a.key;
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(active ? null : a.key);
                        if (!active)
                          requestAnimationFrame(() =>
                            panelRef.current?.scrollIntoView({
                              block: "nearest",
                              behavior: "smooth",
                            }),
                          );
                      }}
                      aria-expanded={active}
                      aria-controls="cockpit-activite"
                      className={cn(
                        "group flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        active ? "bg-secondary" : "hover:bg-secondary/60",
                      )}
                      style={{
                        animation: `cockpit-in 700ms cubic-bezier(0.16,1,0.3,1) ${120 + index * 90}ms both`,
                      }}
                    >
                      <Ring
                        pct={share}
                        size={84}
                        stroke={7}
                        color={colorOf(a.key)}
                      >
                        <span className="num text-[17px] font-semibold leading-none tracking-tight text-foreground">
                          {share}
                          <small className="text-[11px] font-medium text-muted-foreground">
                            {" "}
                            %
                          </small>
                        </span>
                      </Ring>
                      <span className="text-[13px] font-medium leading-tight text-foreground">
                        {a.short}
                      </span>
                      <span className="num text-[12px] leading-none text-muted-foreground">
                        {eur0(a.monthly)} · {a.clients.length} client
                        {a.clients.length > 1 ? "s" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className="mt-5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
          {goal.suggested && goal.target
            ? "Objectif suggéré d'après vos chiffres (à adopter plus bas). "
            : ""}
          La facturation part en fin de mois : {eur0(goal.recurring)} HT de
          contrats récurrents sont attendus.
        </p>

        <div id="cockpit-activite" ref={panelRef} aria-live="polite">
          {current && (
            <div
              key={current.key}
              className="mt-4 rounded-xl bg-secondary/60 p-4"
              style={{
                animation: "cockpit-in 450ms cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: colorOf(current.key) }}
                    />
                    {current.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {current.clients.length ? (
                      <>
                        {current.clients.length} client
                        {current.clients.length > 1 ? "s ont" : " a"} signé,
                        pour{" "}
                        <b className="num font-medium text-foreground">
                          {eur0(current.monthly)}
                        </b>{" "}
                        HT par mois.
                      </>
                    ) : (
                      "Aucun contrat actif dans cette activité pour l'instant."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Fermer le détail"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {current.clients.length > 0 && (
                <ul className="mt-3 space-y-2.5">
                  {current.clients.map((c) => {
                    const w =
                      current.monthly > 0
                        ? Math.max(
                            (c.monthly / current.clients[0].monthly) * 100,
                            2,
                          )
                        : 0;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/clients/${c.id}`}
                          className="group block rounded-lg px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-foreground group-hover:underline">
                              {c.name}
                            </span>
                            <span className="num shrink-0 text-foreground">
                              {c.monthly > 0
                                ? `${eur0(c.monthly)} / mois`
                                : "montant non renseigné"}
                            </span>
                          </span>
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-card">
                            <span
                              className="block h-full origin-left rounded-full"
                              style={{
                                width: `${w}%`,
                                background: colorOf(current.key),
                                animation:
                                  "cockpit-grow 800ms cubic-bezier(0.16,1,0.3,1) both",
                              }}
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href={`/activites?famille=${current.key}`}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
              >
                Tout le détail de cette activité{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Programme de la semaine */}
      <div className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(17,18,20,0.04),0_8px_24px_rgba(17,18,20,0.04)] sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            Programme de la semaine
          </h2>
          <Link
            href="/planning"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Ouvrir le planning
          </Link>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          <b className="num font-medium text-foreground">{planned}</b>{" "}
          intervention{planned > 1 ? "s" : ""} prévue{planned > 1 ? "s" : ""} du
          lundi au dimanche.
        </p>
        <ol className="mt-4 divide-y divide-border/70">
          {week.map((d, index) => (
            <li
              key={d.date}
              className={cn(
                "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 py-2.5",
                d.past && !d.today && "opacity-55",
              )}
              style={{
                animation: `cockpit-in 600ms cubic-bezier(0.16,1,0.3,1) ${80 + index * 50}ms both`,
              }}
            >
              <div
                className={cn(
                  "flex h-11 w-11 flex-col items-center justify-center rounded-xl text-center leading-none",
                  d.today
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {d.weekday}
                </span>
                <span className="num mt-0.5 text-[15px] font-semibold">
                  {d.day}
                </span>
              </div>
              <div className="min-w-0 self-center">
                {d.items.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">
                    Rien de prévu
                  </span>
                ) : (
                  <ul className="space-y-1">
                    {d.items.slice(0, 3).map((it) => (
                      <li
                        key={it.id}
                        className="flex items-baseline gap-2 text-[13px]"
                      >
                        <span className="num w-10 shrink-0 text-muted-foreground">
                          {it.time ?? "—"}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 truncate text-foreground",
                            it.done && "text-muted-foreground line-through",
                          )}
                        >
                          <b className="font-medium">{it.client}</b>
                          {it.title ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {it.title}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                    {d.items.length > 3 && (
                      <li className="text-xs text-muted-foreground">
                        et {d.items.length - 3} de plus
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export type CurvePoint = {
  label: string;
  value: number;
  current?: boolean;
  href?: string;
  selected?: boolean;
};

/** Courbe du chiffre d'affaires : un repère suit la souris (ou le doigt) et affiche le mois survolé. Un clic ouvre le détail du mois. */
export function RevenueCurve({ data }: { data: CurvePoint[] }) {
  const W = 640,
    H = 240,
    padL = 46,
    padR = 14,
    padT = 22,
    padB = 28;
  const ref = useRef<SVGSVGElement>(null);
  const on = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const xs = (i: number) =>
    padL + (i / Math.max(data.length - 1, 1)) * (W - padL - padR);
  const ys = (v: number) => H - padB - (v / top) * (H - padB - padT);
  const pts = data.map((d, i) => [xs(i), ys(d.value)] as const);
  // Courbe lissée (segments de Bézier à tangentes horizontales).
  const line = pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = pts[i - 1],
        mx = (px + x) / 2;
      return `C${mx.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - padB} L${pts[0][0].toFixed(1)} ${H - padB} Z`;
  const short = (n: number) =>
    n >= 1000
      ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€`
      : `${Math.round(n)} €`;
  const move = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < pts.length; i++)
      if (Math.abs(pts[i][0] - x) < Math.abs(pts[best][0] - x)) best = i;
    setHover(best);
  };
  const h = hover != null ? data[hover] : null;
  const hx = hover != null ? pts[hover][0] : 0,
    hy = hover != null ? pts[hover][1] : 0;
  const tipW = 132,
    tipX = Math.min(Math.max(hx - tipW / 2, padL), W - padR - tipW);

  return (
    <div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label="Chiffre d'affaires facturé par mois (HT), courbe sur 12 mois"
        onMouseMove={(e) => move(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => move(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
      >
        <defs>
          <linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0"
            />
          </linearGradient>
          <clipPath id="curve-reveal">
            <rect
              x="0"
              y="0"
              height={H}
              width={on ? W : 0}
              className="transition-[width] duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            />
          </clipPath>
        </defs>
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={ys(t)}
              y2={ys(t)}
              stroke="hsl(var(--border))"
              strokeDasharray={t ? "3 3" : undefined}
            />
            <text
              x={padL - 8}
              y={ys(t) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {short(t)}
            </text>
          </g>
        ))}
        <g clipPath="url(#curve-reveal)">
          <path d={area} fill="url(#curve-fill)" />
          <path
            d={line}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {data.map((d, i) => (
          <text
            key={d.label + i}
            x={pts[i][0]}
            y={H - 8}
            textAnchor="middle"
            className={cn(
              "text-[11px]",
              d.selected
                ? "fill-foreground font-bold underline"
                : hover === i
                  ? "fill-foreground font-semibold"
                  : "fill-muted-foreground",
            )}
          >
            {d.label}
          </text>
        ))}
        {h && (
          <g className="pointer-events-none">
            <line
              x1={hx}
              x2={hx}
              y1={padT - 6}
              y2={H - padB}
              stroke="hsl(var(--foreground))"
              strokeOpacity={0.25}
            />
            <circle
              cx={hx}
              cy={hy}
              r={9}
              fill="hsl(var(--primary))"
              fillOpacity={0.18}
            />
            <circle
              cx={hx}
              cy={hy}
              r={4.5}
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
            />
            <rect
              x={tipX}
              y={Math.max(hy - 46, 0)}
              width={tipW}
              height={32}
              rx={8}
              fill="#111214"
            />
            <text
              x={tipX + tipW / 2}
              y={Math.max(hy - 46, 0) + 21}
              textAnchor="middle"
              className="fill-white text-[12px] font-semibold"
            >
              {h.label} · {Math.round(h.value).toLocaleString("fr-FR")} € HT
            </text>
          </g>
        )}
        {/* Zones cliquables, par-dessus tout : un mois = un lien vers son détail. */}
        {data.map((d, i) => {
          const w = (W - padL - padR) / Math.max(data.length - 1, 1);
          const zone = (
            <rect
              x={pts[i][0] - w / 2}
              y={0}
              width={w}
              height={H}
              fill="transparent"
            />
          );
          return d.href ? (
            <Link
              key={`z${i}`}
              href={d.href}
              scroll={false}
              aria-label={`${d.label} : ${Math.round(d.value).toLocaleString("fr-FR")} € HT, voir les clients`}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              {zone}
            </Link>
          ) : (
            <g key={`z${i}`}>{zone}</g>
          );
        })}
      </svg>
    </div>
  );
}
