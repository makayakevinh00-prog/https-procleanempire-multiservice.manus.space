"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

const GOAL_PERCENT = 72;
const REVENUE = 8640;
const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const activities = [
  { label: "Bureaux", share: "46 %", dot: "bg-[#4f8df5]" },
  { label: "Locations courtes", share: "31 %", dot: "bg-emerald-400" },
  { label: "Commerces", share: "15 %", dot: "bg-amber-300" },
  { label: "Remise en état", share: "8 %", dot: "bg-fuchsia-300" },
];

const week = [
  {
    day: "Lun",
    task: "Relances devis",
    tag: "Commercial",
    tone: "text-amber-200 bg-amber-300/15",
  },
  {
    day: "Mar",
    task: "Bureaux · 3 sites",
    tag: "Terrain",
    tone: "text-sky-200 bg-sky-300/15",
  },
  {
    day: "Mer",
    task: "Airbnb · 2 ménages",
    tag: "Terrain",
    tone: "text-sky-200 bg-sky-300/15",
  },
  {
    day: "Jeu",
    task: "Factures à valider",
    tag: "Gestion",
    tone: "text-emerald-200 bg-emerald-300/15",
  },
];

/** Aperçu illustratif du cockpit Empire OS : données d'exemple, aucune donnée réelle. */
export function CockpitPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [percent, setPercent] = useState(reduce ? GOAL_PERCENT : 0);
  const [revenue, setRevenue] = useState(reduce ? REVENUE : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setPercent(GOAL_PERCENT);
      setRevenue(REVENUE);
      return;
    }
    const a = animate(0, GOAL_PERCENT, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setPercent(Math.round(v)),
    });
    const b = animate(0, REVENUE, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setRevenue(Math.round(v)),
    });
    return () => {
      a.stop();
      b.stop();
    };
  }, [inView, reduce]);

  return (
    <figure ref={ref} className="relative mx-auto w-full max-w-xl">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[#1d6fe0]/30 blur-3xl"
      />
      <div
        role="img"
        aria-label="Aperçu du cockpit Empire OS : objectif du mois atteint à 72 %, répartition du chiffre d'affaires par activité et programme de la semaine. Données d'exemple."
        className="rounded-3xl border border-white/15 bg-white/[0.07] p-4 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-5"
      >
        <div aria-hidden>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200">
              Cockpit · novembre
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/10 bg-[#0b1326]/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-300">
                Objectif du mois
              </p>
              <div className="mt-2 flex items-center gap-4">
                <svg
                  viewBox="0 0 120 120"
                  className="h-24 w-24 shrink-0 -rotate-90"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="10"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="#4f8df5"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_LENGTH}
                    initial={{
                      strokeDashoffset: reduce
                        ? RING_LENGTH * (1 - GOAL_PERCENT / 100)
                        : RING_LENGTH,
                    }}
                    animate={
                      inView
                        ? {
                            strokeDashoffset:
                              RING_LENGTH * (1 - GOAL_PERCENT / 100),
                          }
                        : undefined
                    }
                    transition={{
                      duration: reduce ? 0 : 1.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </svg>
                <p className="whitespace-nowrap font-display text-4xl font-semibold tabular-nums text-white">
                  {percent} %
                </p>
              </div>
              <p className="mt-3 text-sm tabular-nums text-slate-300">
                {revenue.toLocaleString("fr-FR")} € sur 12 000 €
              </p>
              <ul className="mt-4 space-y-2">
                {activities.map((activity) => (
                  <li
                    key={activity.label}
                    className="flex items-center gap-2 text-xs text-slate-200"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${activity.dot}`}
                    />
                    <span>{activity.label}</span>
                    <span className="ml-auto whitespace-nowrap tabular-nums text-slate-300">
                      {activity.share}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b1326]/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-300">
                  Cette semaine
                </p>
                <ul className="mt-2 space-y-2">
                  {week.map((item) => (
                    <li
                      key={item.day}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="w-7 shrink-0 font-semibold text-slate-300">
                        {item.day}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-100">
                        {item.task}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${item.tone}`}
                      >
                        {item.tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1326]/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-300">
                    Encaissements
                  </p>
                  <p className="whitespace-nowrap text-xs font-semibold text-emerald-300">
                    3 factures à relancer
                  </p>
                </div>
                <svg
                  viewBox="0 0 200 56"
                  className="mt-2 h-14 w-full"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M2 46 C 22 44, 30 30, 48 32 S 78 44, 96 28 S 128 10, 148 18 S 178 12, 198 6"
                    fill="none"
                    stroke="#4f8df5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={inView ? { pathLength: 1 } : undefined}
                    transition={{
                      duration: reduce ? 0 : 1.6,
                      ease: "easeOut",
                      delay: reduce ? 0 : 0.2,
                    }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-slate-300">
        Aperçu illustratif. Données d&apos;exemple.
      </figcaption>
    </figure>
  );
}
