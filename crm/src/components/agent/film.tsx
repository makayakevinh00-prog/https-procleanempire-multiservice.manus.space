"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoCapture } from "@/components/nettoyeur/video-capture";

type Before = { seen?: string; summary?: string; state?: string; minutes?: number | null; items?: { zone: string; todo: string }[]; refilm?: { zone: string; why: string }[]; tips?: { surface: string; product: string; how: string }[] } | null;
type After = { verdict?: "ok" | "reprise"; summary?: string; remaining?: { zone: string; why: string }[]; missing?: string[] } | null;

/**
 * Film d'arrivée et film de fin d'un agent ProClean, analysés par l'IA (qui connaît le site décrit dans le CRM).
 * Arrivée : ce que l'IA voit, les zones à refilmer, les conseils et produits ; la liste des tâches arrive dans la check-list de la mission.
 * Fin : l'IA compare avec l'arrivée et dit ce qui reste à reprendre.
 */
export function AgentFilm({ token, mission, before, after, aiStatus, nBefore, nAfter, site, autoOpen = false, children }: { token: string; mission: string; before: Before; after: After; aiStatus: string | null; nBefore: number; nAfter: number; site: string;
  /** Mission guidée : à l'arrivée, la caméra s'ouvre toute seule (une fois). */
  autoOpen?: boolean;
  /** Les tâches à cocher, affichées entre le compte rendu de l'IA et le film de fin. */
  children?: React.ReactNode }) {
  const router = useRouter();
  const [cam, setCam] = useState<"avant" | "apres" | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [refilmDone, setRefilmDone] = useState(true);
  useEffect(() => { try { setRefilmDone(localStorage.getItem(`ap:refilm:${mission}`) === "1"); } catch { setRefilmDone(false); } }, [mission]);
  useEffect(() => {
    if (!autoOpen || nBefore > 0) return;
    try { if (sessionStorage.getItem(`ap:cam:${mission}`) === "1") return; sessionStorage.setItem(`ap:cam:${mission}`, "1"); } catch { /* on ouvre quand même */ }
    setCam("avant");
  }, [autoOpen, nBefore, mission]);
  const waitingBefore = nBefore > 0 && !before, waitingAfter = nAfter > 0 && !aiStatus;
  // Tant que l'IA travaille, la page se met à jour toute seule.
  useEffect(() => {
    if (!waitingBefore && !waitingAfter) return;
    const i = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 3000);
    return () => clearInterval(i);
  }, [waitingBefore, waitingAfter, router]);

  const analyse = async (kind: "avant" | "apres") => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/agent/analyse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, mission, kind }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string | null };
      if (j.error) setErr(j.error);
      router.refresh();
    } catch { setErr("connexion impossible"); }
    setBusy(false);
  };
  const closeRefilm = (film: boolean) => { try { localStorage.setItem(`ap:refilm:${mission}`, "1"); } catch { /* ignoré */ } setRefilmDone(true); if (film) setCam("avant"); };

  if (cam) return (
    <VideoCapture
      token={token} job={mission} kind={cam} endpoint="/api/agent/photo"
      title={cam === "avant" ? "Filmez le lieu avant de commencer" : "Filmez le lieu une fois terminé"}
      hint={cam === "avant" ? "Faites le tour lentement, une seconde sur chaque zone. L'IA vous dit ensuite quoi faire." : "Refaites le même tour qu'à l'arrivée : l'IA compare et contrôle."}
      onDone={() => { setCam(null); router.refresh(); }}
      onCancel={() => setCam(null)}
    />
  );
  const card = "rounded-2xl bg-[var(--a-card)] p-4 text-[15px]";
  const big = "h-14 w-full rounded-2xl text-lg font-extrabold active:opacity-90 disabled:opacity-60";
  return (
    <div className="space-y-3">
      {nBefore === 0 && (
        <section className="rounded-2xl border-2 border-[var(--a-pri)] p-4">
          <b className="block text-[17px]">Vous êtes arrivé : filmez {site}</b>
          <p className="mb-3 mt-1 text-[14px] text-[var(--a-mute)]">Un tour du lieu, lentement. L&apos;IA vous donne ensuite vos tâches, des conseils et les produits à utiliser.</p>
          <button type="button" onClick={() => setCam("avant")} className={`${big} bg-[var(--a-pri)] text-white`}>● Filmer le lieu</button>
        </section>
      )}
      {waitingBefore && (
        <section className={`${card} text-center`} aria-live="polite">
          <b className="block text-[17px] text-[var(--a-pri)]">L&apos;IA analyse le lieu…</b>
          <p className="text-[var(--a-mute)]">Vos tâches arrivent dans un instant.</p>
          {err && <p role="alert" className="mt-2 font-semibold text-[var(--a-bad)]">L&apos;IA n&apos;a pas pu analyser : {err}</p>}
          <button type="button" disabled={busy} onClick={() => void analyse("avant")} className="mt-3 h-11 rounded-full border border-[var(--a-pri)] px-5 font-extrabold text-[var(--a-pri)] disabled:opacity-60">{busy ? "Analyse en cours…" : "Relancer l'analyse"}</button>
        </section>
      )}
      {before?.seen && (
        <section className={card}>
          <b className="block text-[var(--a-pri)]">Ce que l&apos;IA voit sur votre film</b>
          <p>{before.seen}</p>
          {before.minutes ? <p className="mt-1 text-[13px] text-[var(--a-mute)]">Temps estimé : environ {before.minutes} min</p> : null}
        </section>
      )}
      {before && !refilmDone && (before.refilm?.length ?? 0) > 0 && (
        <section role="alert" className="space-y-2 rounded-2xl bg-[var(--a-warnbg)] p-4 text-[14px]">
          <b className="block text-[16px] text-[var(--a-warn)]">À filmer encore, pour un relevé précis</b>
          <ul className="space-y-1">{before.refilm!.map((z, i) => <li key={i}><b>{z.zone}</b>{z.why ? ` — ${z.why}` : ""}</li>)}</ul>
          <button type="button" onClick={() => closeRefilm(true)} className="h-12 w-full rounded-full bg-[var(--a-pri)] text-[16px] font-extrabold text-white">● Filmer ces zones</button>
          <button type="button" onClick={() => closeRefilm(false)} className="mx-auto block text-[13px] font-bold text-[var(--a-mute)] underline">Continuer sans refilmer</button>
        </section>
      )}
      {(before?.items?.length ?? 0) > 0 && (
        <details className={card}>
          <summary className="cursor-pointer font-extrabold text-[var(--a-pri)]">Ce qu&apos;il y a à nettoyer ({before!.items!.length})</summary>
          <ul className="mt-2 space-y-1">{before!.items!.map((x, i) => <li key={i}><b>{x.zone}</b> — {x.todo}</li>)}</ul>
        </details>
      )}
      {(before?.tips?.length ?? 0) > 0 && (
        <details className={card}>
          <summary className="cursor-pointer font-extrabold text-[var(--a-pri)]">Conseils et produits pour ce lieu</summary>
          <ul className="mt-2 space-y-2">{before!.tips!.map((x, i) => <li key={i}><b>{x.surface}</b>{x.product && <span> — {x.product}</span>}{x.how && <p className="text-[var(--a-mute)]">{x.how}</p>}</li>)}</ul>
        </details>
      )}

      {before && children}
      {before && nAfter === 0 && (
        <button type="button" onClick={() => setCam("apres")} className="h-16 w-full rounded-full bg-[var(--a-ok)] text-[18px] font-extrabold text-white active:scale-[0.98]">● J&apos;ai fini : filmer la fin</button>
      )}
      {waitingAfter && (
        <section className={`${card} text-center`} aria-live="polite">
          <b className="block text-[17px] text-[var(--a-pri)]">L&apos;IA contrôle votre travail…</b>
          {err && <p role="alert" className="mt-2 font-semibold text-[var(--a-bad)]">{err}</p>}
          <button type="button" disabled={busy} onClick={() => void analyse("apres")} className="mt-3 h-11 rounded-full border border-[var(--a-pri)] px-5 font-extrabold text-[var(--a-pri)] disabled:opacity-60">{busy ? "Contrôle en cours…" : "Relancer le contrôle"}</button>
        </section>
      )}
      {aiStatus === "ok" && (
        <section className="rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] text-[var(--a-ok)]"><b className="block text-[17px]">Contrôle réussi : rien à reprendre</b>{after?.summary && <p>{after.summary}</p>}<p className="mt-1 font-bold">Il ne reste qu&apos;à terminer la mission.</p></section>
      )}
      {aiStatus === "reprise" && (
        <section role="alert" className="space-y-2 rounded-2xl bg-[var(--a-warnbg)] p-4 text-[15px]">
          <b className="block text-[17px] text-[var(--a-warn)]">À reprendre avant de partir</b>
          <ul className="space-y-1">
            {(after?.remaining ?? []).map((x, i) => <li key={i}><b>{x.zone}</b>{x.why ? ` — ${x.why}` : ""}</li>)}
            {(after?.missing ?? []).map((x, i) => <li key={`m${i}`}><b>{x}</b> — pas filmé à la fin</li>)}
          </ul>
          <button type="button" onClick={() => setCam("apres")} className="h-12 w-full rounded-full bg-[var(--a-pri)] text-[16px] font-extrabold text-white">● C&apos;est repris : refilmer la fin</button>
        </section>
      )}
      {aiStatus === "indisponible" && (
        <section className={card}>
          <b className="block text-[var(--a-warn)]">L&apos;IA n&apos;a pas pu contrôler le film de fin</b>
          <p className="text-[var(--a-mute)]">{after?.summary ?? "Votre responsable vérifiera lui-même."}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void analyse("apres")} className="h-11 rounded-full border border-[var(--a-pri)] px-5 font-extrabold text-[var(--a-pri)] disabled:opacity-60">{busy ? "Contrôle en cours…" : "Relancer le contrôle"}</button>
            <button type="button" onClick={() => setCam("apres")} className="h-11 rounded-full border border-[var(--a-line)] px-5 font-bold">Refilmer la fin</button>
          </div>
        </section>
      )}
    </div>
  );
}
