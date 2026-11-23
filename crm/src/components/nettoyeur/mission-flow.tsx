"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, KeyRound, Clock } from "lucide-react";
import {
  cleanerArriveFlowAction,
  cleanerFinishFlowAction,
  cleanerTaskAction,
} from "@/app/actions/nettoyeur";
import { TripPanel } from "@/components/nettoyeur/trip-panel";
import { VideoCapture } from "@/components/nettoyeur/video-capture";

export type MissionJob = {
  id: string;
  title: string;
  status: string;
  date: string;
  window_start: string;
  window_end: string;
  hours: number | null;
  amount: number;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  access_notes: string | null;
  arrived_at: string | null;
  photos_before: number;
  photos_after: number;
  review_note: string | null;
  departure: "rester" | "partir" | null;
  before_report: {
    summary?: string;
    state?: string;
    tidy?: string;
    level?: number | null;
    minutes?: number | null;
    tasks?: string[];
    seen?: string;
    tips?: { surface: string; product: string; how: string }[];
  } | null;
  ai_report: {
    summary?: string;
    remaining?: { zone: string; why: string }[];
  } | null;
};
export type MissionTask = { label: string; done: boolean };

const hm = (t: string) =>
  t
    .slice(0, 5)
    .replace(":", " h ")
    .replace(/ h 00$/, " h");
const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const dur = (m: number) =>
  m >= 60
    ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`
    : `${m} min`;
const WAIT_AI_MS = 75_000;

/** Cache la barre du bas : pendant une mission, le nettoyeur ne voit rien d'autre que sa mission. */
const FOCUS_CSS = 'nav[aria-label="Navigation"]{display:none!important}';

/**
 * Mission guidée : un seul écran, une seule action à la fois. Le nettoyeur part, pointe son arrivée, filme le logement ; l'IA fait les captures,
 * le compte rendu et la liste des tâches dans l'ordre. En fin de ménage il filme à nouveau : l'IA vérifie chaque tâche d'après la vidéo.
 */
export function MissionFlow({
  token,
  job,
  tasks,
}: {
  token: string;
  job: MissionJob;
  tasks: MissionTask[];
}) {
  const router = useRouter();
  const [cam, setCam] = useState<"avant" | "apres" | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [waited, setWaited] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [useStd, setUseStd] = useState(false);
  const [items, setItems] = useState(tasks);
  useEffect(() => setItems(tasks), [tasks]);

  const hasBefore = job.photos_before > 0,
    report = job.before_report;
  const phase =
    job.status === "validee"
      ? "ok"
      : job.status === "a_verifier"
        ? "attente"
        : job.status === "a_reprendre"
          ? "reprise"
          : !job.arrived_at && !hasBefore
            ? "depart"
            : !hasBefore
              ? "film_avant"
              : !report && !waited
                ? "analyse"
                : "menage";

  // L'écran se met à jour tout seul tant que l'IA travaille ou que la direction vérifie.
  useEffect(() => {
    if (phase !== "analyse" && phase !== "attente") return;
    const id = setInterval(
      () => {
        if (document.visibilityState === "visible") router.refresh();
      },
      phase === "analyse" ? 2000 : 8000,
    );
    return () => clearInterval(id);
  }, [phase, router]);
  // L'analyse peut échouer (IA indisponible) : après un moment, la liste de tâches standard prend le relais.
  useEffect(() => {
    if (phase !== "analyse") return;
    const t = setTimeout(() => setWaited(true), WAIT_AI_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Relance du relevé par l'IA (une fois toute seule après 20 s, puis sur demande) ; la raison de l'échec est affichée telle quelle.
  const analyse = async () => {
    setRetrying(true);
    setAiErr("");
    try {
      const r = await fetch("/api/nettoyeur/analyse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, job: job.id }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string | null };
      if (!j.ok) setAiErr(j.error ?? "l'IA n'a pas répondu");
      else router.refresh();
    } catch {
      setAiErr("pas de réseau");
    }
    setRetrying(false);
  };
  useEffect(() => {
    if (phase !== "analyse") return;
    const t = setTimeout(() => void analyse(), 20_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const arrive = async () => {
    setBusy("Arrivée pointée…");
    setErr("");
    const r = await cleanerArriveFlowAction(token, job.id);
    setBusy("");
    if (!r.ok) {
      setErr(r.error ?? "Impossible de pointer l'arrivée.");
      return;
    }
    router.refresh();
    setCam("avant");
  };
  const finish = async () => {
    setCam(null);
    setBusy("L'IA vérifie votre travail…");
    setErr("");
    const r = await cleanerFinishFlowAction(token, job.id);
    setBusy("");
    if (!r.ok) setErr(r.error ?? "Impossible de terminer pour le moment.");
    router.refresh();
  };
  const toggle = async (i: number) => {
    const next = !items[i]!.done;
    setItems((l) => l.map((t, k) => (k === i ? { ...t, done: next } : t)));
    const r = await cleanerTaskAction(token, job.id, i, next);
    if (!r.ok) {
      setItems((l) => l.map((t, k) => (k === i ? { ...t, done: !next } : t)));
      setErr(r.error ?? "Non enregistré, réessayez.");
    }
  };
  const dismiss = () => {
    try {
      document.cookie = `pce_mission_ok=${job.id}; path=/nettoyeur; max-age=86400; samesite=lax`;
    } catch {
      /* ignoré */
    }
    router.refresh();
  };

  const left = items.filter((t) => !t.done).length;
  const maps = job.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${job.address} ${job.postal_code ?? ""} ${job.city ?? ""}`)}`
    : null;
  const big =
    "h-16 w-full rounded-full text-[18px] font-extrabold active:scale-[0.98] disabled:opacity-60";

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: FOCUS_CSS }} />
      <header className="flex items-center justify-between">
        <span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">
          ProClean
        </span>
        <span className="num rounded-full bg-[var(--a-okbg)] px-3 py-1 text-[15px] font-extrabold text-[var(--a-ok)]">
          {eur(job.amount)}
        </span>
      </header>

      <section className="space-y-2 rounded-3xl bg-[var(--a-card)] p-4">
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight">
          {job.title}
        </h1>
        <p className="flex items-center gap-2 text-[15px] font-bold">
          <Clock className="h-4 w-4 text-[var(--a-pri)]" />
          {hm(job.window_start)} – {hm(job.window_end)}
          {job.hours ? ` · environ ${job.hours} h` : ""}
        </p>
        {maps && (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-[15px] font-bold text-[var(--a-pri)]"
          >
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            {job.address}, {job.postal_code} {job.city}
          </a>
        )}
        {job.access_notes && phase !== "ok" && (
          <p className="flex items-start gap-2 rounded-2xl bg-[var(--a-warnbg)] p-3 text-[14px] text-[var(--a-warn)]">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Accès :</b> {job.access_notes}
            </span>
          </p>
        )}
      </section>

      {err && (
        <p
          role="alert"
          className="rounded-2xl bg-[var(--a-badbg)] p-3 text-[14px] font-bold text-[var(--a-bad)]"
        >
          {err}
        </p>
      )}
      {busy && (
        <p
          role="status"
          className="rounded-3xl bg-[var(--a-soft)] p-5 text-center text-[17px] font-extrabold text-[var(--a-pri)]"
        >
          <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--a-pri)]" />
          {busy}
        </p>
      )}

      {!busy && phase === "depart" && (
        <>
          <TripPanel token={token} />
          <button
            type="button"
            onClick={arrive}
            className={`${big} bg-[var(--a-pri)] text-white`}
          >
            Je suis sur place
          </button>
          <p className="text-center text-[13px] text-[var(--a-mute)]">
            Dès que vous êtes là, appuyez : la caméra s&apos;ouvre et c&apos;est
            tout.
          </p>
        </>
      )}

      {!busy && phase === "film_avant" && (
        <>
          <p className="rounded-3xl bg-[var(--a-card)] p-4 text-[15px]">
            Filmez le logement avant de commencer : faites le tour de chaque
            pièce, lentement, en insistant sur les coins sales. L&apos;IA fait
            les captures et prépare vos tâches.
          </p>
          <button
            type="button"
            onClick={() => setCam("avant")}
            className={`${big} bg-[var(--a-pri)] text-white`}
          >
            ● Filmer le logement
          </button>
        </>
      )}

      {!busy && phase === "analyse" && (
        <div
          role="status"
          className="rounded-3xl bg-[var(--a-soft)] p-6 text-center"
        >
          <span className="mx-auto mb-3 block h-4 w-4 animate-pulse rounded-full bg-[var(--a-pri)]" />
          <p className="text-[18px] font-extrabold text-[var(--a-pri)]">
            L&apos;IA analyse le logement…
          </p>
          <p className="mt-1 text-[14px] text-[var(--a-mute)]">
            {retrying ? "Nouvel essai en cours…" : "Vos tâches arrivent dans un instant."}
          </p>
          {aiErr && <p className="mt-2 text-[13px] font-semibold text-[var(--a-bad)]">L&apos;IA n&apos;a pas pu analyser : {aiErr}.</p>}
        </div>
      )}

      {!busy && phase === "menage" && (
        <>
          {!report && (
            <section role="alert" className="space-y-2 rounded-3xl bg-[var(--a-warnbg)] p-4 text-[14px]">
              <b className="block text-[15px] text-[var(--a-warn)]">L&apos;IA n&apos;a pas pu analyser le logement{aiErr ? ` : ${aiErr}` : ""}.</b>
              <p>{useStd ? "La liste ci-dessous est la liste standard : elle ne vient pas de votre vidéo." : "Aucune tâche n'est inventée : relancez l'analyse pour recevoir les tâches tirées de votre vidéo."}</p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={retrying} onClick={() => void analyse()} className="h-11 rounded-full bg-[var(--a-pri)] px-5 font-extrabold text-white disabled:opacity-60">
                  {retrying ? "Analyse en cours…" : "Relancer l'analyse"}
                </button>
                {!useStd && <button type="button" onClick={() => setUseStd(true)} className="text-[13px] font-bold text-[var(--a-mute)] underline">Continuer avec la liste standard</button>}
              </div>
            </section>
          )}
          {report?.seen && (
            <section className="space-y-1 rounded-3xl bg-[var(--a-card)] p-4 text-[14px]">
              <b className="block text-[15px] text-[var(--a-pri)]">Ce que l&apos;IA voit sur votre vidéo</b>
              <p>{report.seen}</p>
            </section>
          )}
          {report && (report.summary || report.state) && (
            <section className="space-y-1 rounded-3xl bg-[var(--a-soft)] p-4 text-[14px]">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[15px] text-[var(--a-pri)]">
                  Compte rendu de l&apos;IA
                </b>
                {report.level ? (
                  <span className="rounded-full bg-[var(--a-bg)] px-2.5 py-0.5 text-[12px] font-extrabold">
                    Saleté {report.level}/5
                  </span>
                ) : null}
                {report.minutes ? (
                  <span className="rounded-full bg-[var(--a-bg)] px-2.5 py-0.5 text-[12px] font-extrabold">
                    ≈ {dur(report.minutes)}
                  </span>
                ) : null}
              </div>
              <p>{report.summary || report.state}</p>
              {report.tidy && (
                <p className="text-[var(--a-mute)]">
                  <b>Rangement :</b> {report.tidy}
                </p>
              )}
            </section>
          )}
          {(report?.tips?.length ?? 0) > 0 && (
            <details className="rounded-3xl bg-[var(--a-card)] p-4 text-[14px]">
              <summary className="cursor-pointer text-[15px] font-extrabold text-[var(--a-pri)]">Conseils et produits pour ce lieu</summary>
              <ul className="mt-2 space-y-2">
                {report!.tips!.map((t, i) => (
                  <li key={i}>
                    <b>{t.surface}</b>
                    {t.product && <span> — {t.product}</span>}
                    {t.how && <p className="text-[var(--a-mute)]">{t.how}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {(report || useStd) && (<>
          <section className="rounded-3xl bg-[var(--a-card)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <b className="text-[17px]">À faire, dans l&apos;ordre</b>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${left ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "bg-[var(--a-okbg)] text-[var(--a-ok)]"}`}
              >
                {left
                  ? `${items.length - left}/${items.length}`
                  : "Tout est fait ✔"}
              </span>
            </div>
            <ol className="space-y-1">
              {items.map((t, i) => (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={t.done}
                    onClick={() => toggle(i)}
                    className="flex w-full items-start gap-3 rounded-2xl p-2 text-left active:bg-[var(--a-bg)]"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[14px] font-extrabold ${t.done ? "border-[var(--a-ok)] bg-[var(--a-ok)] text-[var(--a-bg)]" : "border-[var(--a-line)] text-[var(--a-mute)]"}`}
                    >
                      {t.done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`pt-1 text-[16px] ${t.done ? "text-[var(--a-mute)] line-through" : "font-semibold"}`}
                    >
                      {t.label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <button
            type="button"
            onClick={() => setCam("apres")}
            className={`${big} bg-[var(--a-ok)] text-[var(--a-bg)]`}
          >
            J&apos;ai terminé · filmer la fin
          </button>
          </>)}
          <p className="text-center text-[13px] text-[var(--a-mute)]">
            Refaites le même tour : l&apos;IA compare avec l&apos;arrivée et
            valide vos tâches.
          </p>
        </>
      )}

      {!busy && phase === "reprise" && (
        <>
          <section className="space-y-2 rounded-3xl bg-[var(--a-badbg)] p-4 text-[15px] text-[var(--a-bad)]">
            <b className="block text-[17px]">À reprendre avant de partir</b>
            {job.ai_report?.remaining?.length ? (
              <ol className="list-decimal space-y-1.5 pl-5">
                {job.ai_report.remaining.map((r, i) => (
                  <li key={i} className="text-[var(--a-ink)]">
                    <b>{r.zone}</b>
                    {r.why ? ` : ${r.why}` : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[var(--a-ink)]">
                {job.review_note ?? "Des points restent à nettoyer."}
              </p>
            )}
          </section>
          <button
            type="button"
            onClick={() => setCam("apres")}
            className={`${big} bg-[var(--a-pri)] text-white`}
          >
            Reprendre, puis filmer à nouveau
          </button>
        </>
      )}

      {!busy && phase === "attente" && (
        <section
          role="status"
          className="space-y-1 rounded-3xl bg-[var(--a-warnbg)] p-5 text-center text-[var(--a-warn)]"
        >
          <p className="text-[18px] font-extrabold">Envoyé pour vérification</p>
          <p className="text-[14px]">
            {job.departure === "partir"
              ? "Vous pouvez partir. Merci !"
              : "Restez sur place jusqu'à l'accord de la direction. Vous serez payé après validation."}
          </p>
        </section>
      )}

      {!busy && phase === "ok" && (
        <>
          <section className="space-y-1 rounded-3xl bg-[var(--a-okbg)] p-6 text-center text-[var(--a-ok)]">
            <p className="text-[22px] font-extrabold">Ménage validé ✔</p>
            <p className="text-[15px]">
              Vous pouvez partir. {eur(job.amount)} entrent dans vos gains.
            </p>
          </section>
          <button
            type="button"
            onClick={dismiss}
            className={`${big} bg-[var(--a-pri)] text-white`}
          >
            Terminer
          </button>
        </>
      )}

      {cam && (
        <VideoCapture
          token={token}
          job={job.id}
          kind={cam}
          title={
            cam === "avant"
              ? "Filmez le logement"
              : "Filmez le logement, ménage fait"
          }
          hint={
            cam === "avant"
              ? "Cuisine, salon, chambre, salle de bain, WC : lentement, en insistant sur les coins sales."
              : "Refaites le même tour, sous les mêmes angles, pour que l'IA valide vos tâches."
          }
          onCancel={() => setCam(null)}
          onDone={() => {
            if (cam === "apres") void finish();
            else {
              setCam(null);
              router.refresh();
            }
          }}
        />
      )}
    </div>
  );
}
