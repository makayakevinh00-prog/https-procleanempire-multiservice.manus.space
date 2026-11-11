import type { Metadata } from "next";
import { MapPin, KeyRound, Clock, ChevronRight } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob } from "@/lib/agent";
import { cleanerFinishAction, cleanerReleaseAction } from "@/app/actions/nettoyeur";
import { JOB_STATUS, dayFr, eur, slot } from "@/lib/cleaner-ui";
import { Gate } from "@/components/agent/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes ménages — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TONE: Record<string, string> = { acceptee: "bg-[var(--a-soft)] text-[var(--a-pri)]", a_verifier: "bg-[var(--a-warnbg)] text-[var(--a-warn)]", a_reprendre: "bg-[var(--a-badbg)] text-[var(--a-bad)]", validee: "bg-[var(--a-okbg)] text-[var(--a-ok)]" };

/** Mes ménages : adresse et accès, terminer (avec un mot), se désister, ou reprendre si la direction le demande. */
export default async function CleanerMissions({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_my_jobs", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const jobs = (data as { jobs: CleanerJob[] }).jobs;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const card = "space-y-3 rounded-3xl bg-[var(--a-card)] p-4";
  return (
    <>
      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight">Mes ménages</h1>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      {!jobs.length && <p className="rounded-3xl bg-[var(--a-card)] p-8 text-center text-[16px] text-[var(--a-mute)]">Aucun ménage pour le moment. Acceptez-en un dans l&apos;onglet Demandes.</p>}
      <div className="space-y-3">
        {jobs.map((j) => {
          const canFinish = (j.status === "acceptee" || j.status === "a_reprendre") && j.date <= today;
          const canRelease = j.status === "acceptee" && j.date > today;
          return (
            <article key={j.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="text-[18px] font-extrabold leading-snug">{j.title}</div><div className="text-[14px] text-[var(--a-mute)]">{dayFr(j.date)}</div></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${TONE[j.status ?? ""] ?? ""}`}>{JOB_STATUS[j.status ?? ""] ?? j.status}</span>
              </div>
              <div className="flex items-center gap-2 text-[15px] font-bold"><Clock className="h-4 w-4 text-[var(--a-pri)]" />{slot(j.window_start, j.window_end)}{j.hours ? ` · environ ${j.hours} h` : ""}<span className="ml-auto num text-[var(--a-ok)]">{eur(j.amount)}</span></div>
              {j.status !== "validee" && j.address && <a className="flex items-start gap-2 rounded-2xl bg-[var(--a-bg)] p-3 text-[15px] font-bold text-[var(--a-pri)]" href={`https://maps.google.com/?q=${encodeURIComponent(`${j.address} ${j.postal_code ?? ""} ${j.city ?? ""}`)}`} target="_blank" rel="noopener noreferrer"><MapPin className="mt-0.5 h-5 w-5 shrink-0" />{j.address}, {j.postal_code} {j.city}</a>}
              {j.status !== "validee" && j.access_notes && <div className="flex items-start gap-2 rounded-2xl bg-[var(--a-warnbg)] p-3 text-[14px] text-[var(--a-warn)]"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Accès :</b> {j.access_notes}</span></div>}
              {j.status === "a_reprendre" && j.review_note && <div className="rounded-2xl bg-[var(--a-badbg)] p-3 text-[14px] text-[var(--a-bad)]"><b>La direction demande de repasser :</b> {j.review_note}</div>}
              {j.status === "a_verifier" && <p className="rounded-2xl bg-[var(--a-warnbg)] p-3 text-center text-[14px] font-bold text-[var(--a-warn)]">Envoyé à la direction. Vous serez payé après validation.</p>}
              {j.status === "validee" && <p className="rounded-2xl bg-[var(--a-okbg)] p-3 text-center text-[14px] font-bold text-[var(--a-ok)]">Validé : {eur(j.amount)} à venir sur votre prochain virement.</p>}
              {canFinish && (
                <form action={cleanerFinishAction.bind(null, token, j.id)} className="space-y-2">
                  <textarea name="note" rows={2} maxLength={1000} placeholder="Un mot pour la direction (facultatif) : ce qui a été fait, un souci…" className="w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-base" />
                  <button className="h-14 w-full rounded-2xl bg-[var(--a-ok)] text-lg font-extrabold text-[var(--a-bg)] active:opacity-90">J&apos;ai terminé le ménage</button>
                </form>
              )}
              {canRelease && (
                <form action={cleanerReleaseAction.bind(null, token, j.id)}><button className="flex w-full items-center justify-between rounded-2xl border border-[var(--a-line)] px-4 py-3 text-left text-[14px] font-bold text-[var(--a-mute)]">Je ne peux plus (au moins 24 h avant)<ChevronRight className="h-4 w-4" /></button></form>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
