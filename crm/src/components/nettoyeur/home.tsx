"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BellRing, MapPin, Navigation, Zap } from "lucide-react";
import { useOnlineToggle } from "@/components/nettoyeur/live";

const BRAND = "#1e3a6e";

/** Minutes restantes, recalculées toutes les 20 s à partir de la valeur du serveur (qui se rafraîchit aussi seule). */
function useMinutes(initial: number) {
  const [at, setAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setAt(Date.now());
    setNow(Date.now());
  }, [initial]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  return initial - Math.floor((now - at) / 60_000);
}

const when = (m: number) =>
  m <= 0
    ? "C'est l'heure !"
    : m < 60
      ? `dans ${m} min`
      : m < 1440
        ? `dans ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`
        : m < 2880
          ? "demain"
          : `dans ${Math.round(m / 1440)} jours`;

export type HeroJob = {
  title: string;
  city: string | null;
  day: string;
  slot: string;
  amount: string;
  hours: number | null;
  maps: string | null;
};

/** Le prochain ménage, en grand : compte à rebours, gain, ouverture et itinéraire en un geste. */
export function NextMissionHero({
  href,
  job,
  inMin,
}: {
  href: string;
  job: HeroJob;
  inMin: number;
}) {
  const m = useMinutes(inMin);
  return (
    <section className="fx-hero fx-shine fx-in relative rounded-[32px] p-5 text-white shadow-[0_24px_44px_-20px_rgba(30,58,110,0.75)]">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-extrabold uppercase tracking-wider">
          Prochain ménage
        </span>
        <span className="num text-[16px] font-extrabold" aria-live="off">
          {when(m)}
        </span>
      </div>
      <h2 className="mt-4 text-[28px] font-extrabold leading-[1.05] tracking-tight">
        {job.title}
      </h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[15px] font-semibold text-white/85">
        <MapPin className="h-4 w-4 shrink-0" />
        {[job.city, job.day, job.slot].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[12px] font-bold uppercase tracking-wider text-white/70">
            Vous gagnez
          </div>
          <div className="num text-[42px] font-extrabold leading-none">
            {job.amount}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={href}
            className="fx-press inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-5 text-[16px] font-extrabold"
            style={{ color: BRAND }}
          >
            Ouvrir
            <ArrowRight className="h-5 w-5" />
          </Link>
          {job.maps && (
            <a
              href={job.maps}
              target="_blank"
              rel="noreferrer"
              className="fx-press inline-flex h-10 items-center gap-1.5 rounded-full bg-white/20 px-4 text-[14px] font-extrabold"
            >
              <Navigation className="h-4 w-4" />
              Itinéraire
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Pas de ménage : GO lumineux quand on est hors ligne, radar qui cherche quand on est en ligne. */
export function OnlineHero({
  token,
  online,
  hasPush,
  zone,
  openCount,
  openTotal,
}: {
  token: string;
  online: boolean;
  hasPush: boolean;
  zone: string;
  openCount: number;
  openTotal: string;
}) {
  const { busy, note, toggle } = useOnlineToggle(token, online, hasPush);
  const requests = `/nettoyeur/${token}/demandes`;
  return (
    <section className="fx-hero fx-in relative overflow-hidden rounded-[32px] px-5 pb-6 pt-7 text-center text-white shadow-[0_24px_44px_-20px_rgba(30,58,110,0.75)]">
      <div
        aria-hidden
        className="fx-float pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="fx-float pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-[#7fb0ff]/20 blur-3xl"
        style={{ animationDelay: "-3s" }}
      />
      {online ? (
        <>
          <p className="relative text-[13px] font-extrabold uppercase tracking-wider text-white/80">
            ● En ligne
          </p>
          <div className="relative mx-auto mt-3 h-48 w-48">
            {[0, 1.1, 2.2].map((d) => (
              <span
                key={d}
                aria-hidden
                className="fx-radar"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
            <span
              className="absolute inset-[34%] flex items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(10,20,50,0.5)]"
              style={{ color: BRAND }}
            >
              <MapPin className="h-9 w-9" strokeWidth={2.4} />
            </span>
          </div>
          <h2 className="relative mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Vous êtes visible
          </h2>
          <p className="relative mt-1 text-[15px] font-semibold text-white/85">
            Nous cherchons des ménages autour de {zone}.
          </p>
          {openCount > 0 && (
            <Link
              href={requests}
              className="fx-press relative mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[16px] font-extrabold"
              style={{ color: BRAND }}
            >
              <span
                className="fx-pop flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] text-white"
                style={{ background: "#1d6fe0" }}
              >
                {openCount}
              </span>
              {openCount > 1 ? "demandes à saisir" : "demande à saisir"}
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          <div className="relative mt-4">
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className="fx-press inline-flex h-10 items-center rounded-full bg-white/15 px-4 text-[14px] font-bold disabled:opacity-60"
            >
              {busy ? "…" : "Me mettre hors ligne"}
            </button>
          </div>
          <p className="relative mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white/70">
            <BellRing className="h-3.5 w-3.5" />
            {hasPush
              ? "Notifications activées"
              : "Vous serez aussi prévenu par e-mail"}
          </p>
        </>
      ) : (
        <>
          <p className="relative text-[13px] font-extrabold uppercase tracking-wider text-white/75">
            Hors ligne
          </p>
          <h2 className="relative mt-1 text-[30px] font-extrabold leading-tight tracking-tight">
            Prêt à gagner ?
          </h2>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-label="Se mettre en ligne"
            className="fx-glow fx-press relative mx-auto mt-5 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white disabled:opacity-70"
            style={{ color: BRAND }}
          >
            <Zap className="h-8 w-8" fill="currentColor" strokeWidth={1.5} />
            <span className="text-[34px] font-extrabold leading-none tracking-tight">
              {busy ? "…" : "GO"}
            </span>
          </button>
          <p className="relative mt-5 text-[16px] font-bold">
            {openCount > 0
              ? `${openCount} ménage${openCount > 1 ? "s" : ""} à saisir · ${openTotal} à gagner`
              : "On vous prévient dès qu'un ménage tombe."}
          </p>
          <p className="relative mt-0.5 text-[13px] font-semibold text-white/75">
            Passez en ligne pour être prévenu en premier.
          </p>
          {openCount > 0 && (
            <Link
              href={requests}
              className="fx-press relative mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-[14px] font-bold"
            >
              Voir les demandes
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </>
      )}
      {note && (
        <p
          role="status"
          className="relative mx-auto mt-3 max-w-xs rounded-2xl bg-white/15 p-2.5 text-[13px] font-semibold"
        >
          {note}
        </p>
      )}
    </section>
  );
}

/** Interrupteur discret : quand un ménage occupe le haut de l'écran, on reste joignable pour d'autres demandes. */
export function OnlineSwitch({
  token,
  online,
  hasPush,
}: {
  token: string;
  online: boolean;
  hasPush: boolean;
}) {
  const { busy, note, toggle } = useOnlineToggle(token, online, hasPush);
  return (
    <div className="fx-in mt-3" style={{ animationDelay: "80ms" }}>
      <button
        type="button"
        role="switch"
        aria-checked={online}
        onClick={toggle}
        disabled={busy}
        className="fx-press flex w-full items-center justify-between gap-3 rounded-3xl bg-[var(--a-card)] px-4 py-3 text-left disabled:opacity-60"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[16px] font-extrabold">
            <span
              className={`h-2.5 w-2.5 rounded-full ${online ? "animate-pulse bg-[var(--a-ok)]" : "bg-[var(--a-mute)]"}`}
            />
            {online ? "En ligne" : "Hors ligne"}
          </span>
          <span className="block text-[13px] text-[var(--a-mute)]">
            {online
              ? "Vous recevez les nouvelles demandes."
              : "Touchez pour recevoir des demandes."}
          </span>
        </span>
        <span
          aria-hidden
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${online ? "bg-[var(--a-ok)]" : "bg-[var(--a-line)]"}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${online ? "left-7" : "left-1"}`}
          />
        </span>
      </button>
      {note && (
        <p
          role="status"
          className="mt-2 px-1 text-[13px] font-semibold text-[var(--a-warn)]"
        >
          {note}
        </p>
      )}
    </div>
  );
}
