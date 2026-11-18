"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const checklist = [
  "Chambres : lits refaits, draps changés",
  "Salle de bain désinfectée",
  "Cuisine et vaisselle vérifiées",
  "Sols aspirés et lavés",
  "Consommables contrôlés",
  "Tour complet avant de partir",
];

/** Carte « passage du jour » : la checklist Airbnb se coche ligne par ligne. Illustration, aucune donnée réelle. */
export function ChecklistCard({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [done, setDone] = useState(reduce ? checklist.length : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDone(checklist.length);
      return;
    }
    const id = setInterval(
      () => setDone((n) => (n >= checklist.length ? n : n + 1)),
      420,
    );
    return () => clearInterval(id);
  }, [inView, reduce]);

  const dark = tone === "dark";
  return (
    <figure ref={ref} className="relative mx-auto w-full max-w-md">
      {dark ? (
        <div
          aria-hidden
          className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[#1d6fe0]/30 blur-3xl"
        />
      ) : null}
      <div
        role="img"
        aria-label="Illustration : la checklist d'un ménage Airbnb, cochée point par point, du changement des draps au tour complet du logement."
        className={`rounded-3xl border p-5 shadow-[0_40px_80px_-35px_rgba(11,19,38,0.6)] ${dark ? "border-white/15 bg-white/[0.08] text-white backdrop-blur-xl" : "border-slate-200 bg-white text-ink"}`}
      >
        <div aria-hidden>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-slate-300" : "text-slate-500"}`}
              >
                Ménage Airbnb
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-tight">
                Passage de 11h à 14h
              </p>
            </div>
            <span
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${done === checklist.length ? (dark ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-50 text-emerald-700") : dark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"}`}
            >
              {done === checklist.length
                ? "Logement prêt"
                : `${done} sur ${checklist.length}`}
            </span>
          </div>
          <div
            className={`mt-4 h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"}`}
          >
            <motion.div
              className="h-full origin-left rounded-full bg-[#4f8df5]"
              initial={false}
              animate={{ scaleX: done / checklist.length }}
              transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
            />
          </div>
          <ul className="mt-4 space-y-2.5">
            {checklist.map((item, index) => {
              const checked = index < done;
              return (
                <li key={item} className="flex items-center gap-3 text-[15px]">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${checked ? "border-[#4f8df5] bg-[#4f8df5]" : dark ? "border-white/30" : "border-slate-300"}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3.5 w-3.5 text-white transition-opacity duration-300 ${checked ? "opacity-100" : "opacity-0"}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <span
                    className={`transition-opacity duration-300 ${checked ? "opacity-100" : "opacity-60"}`}
                  >
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </figure>
  );
}

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const slots = [
  { label: "Tôt le matin", cells: [1, 0, 1, 0, 1, 0] },
  { label: "En soirée", cells: [0, 1, 0, 1, 0, 0] },
  { label: "Week-end", cells: [0, 0, 0, 0, 0, 1] },
];

/** Carte « planning » : des passages calés en dehors des heures d'ouverture. Illustration. */
export function PlanningCard() {
  const reduce = useReducedMotion();
  return (
    <figure className="mx-auto w-full max-w-md">
      <div
        role="img"
        aria-label="Illustration : un planning hebdomadaire d'entretien de bureaux, avec des passages tôt le matin, en soirée et le week-end."
        className="rounded-3xl border border-slate-200 bg-white p-5 text-ink shadow-[0_40px_80px_-35px_rgba(11,19,38,0.45)]"
      >
        <div aria-hidden>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bureaux et commerces
          </p>
          <p className="mt-0.5 font-display text-xl font-semibold tracking-tight">
            Vos passages de la semaine
          </p>
          <div className="mt-5 grid grid-cols-[5.5rem_repeat(6,minmax(0,1fr))] items-center gap-x-1.5 gap-y-2.5">
            <span />
            {days.map((day) => (
              <span
                key={day}
                className="text-center text-xs font-semibold text-slate-500"
              >
                {day}
              </span>
            ))}
            {slots.map((slot, row) => (
              <div key={slot.label} className="contents">
                <span className="text-xs font-semibold text-slate-600">
                  {slot.label}
                </span>
                {slot.cells.map((on, col) => (
                  <motion.span
                    key={`${slot.label}-${col}`}
                    className={`h-9 rounded-xl ${on ? "bg-[#1d6fe0]" : "bg-slate-100"}`}
                    initial={reduce || !on ? false : { opacity: 0, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      duration: 0.35,
                      delay: (row * 6 + col) * 0.04,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-mist px-4 py-3">
            <span className="text-sm font-semibold">Un seul interlocuteur</span>
            <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Prévenu au moindre imprévu
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
