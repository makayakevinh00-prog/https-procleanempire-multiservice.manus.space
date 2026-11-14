import type { Metadata } from "next";
import { MapPin, KeyRound, Clock, ChevronRight } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerJob } from "@/lib/agent";
import { cleanerArriveAction, cleanerFinishAction, cleanerLinenAction, cleanerReleaseAction } from "@/app/actions/nettoyeur";
import { CleanerVideoButton } from "@/components/nettoyeur/live";
import { CleanerPhotoButton } from "@/components/agent/cleaner-photo";
import { JOB_STATUS, LINEN_STEP, dayFr, eur, slot } from "@/lib/cleaner-ui";
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
  const jobs = (data as { jobs: CleanerJob[]; require_photos: boolean }).jobs, needPhotos = (data as { require_photos: boolean }).require_photos;
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
              {j.clean_linen && j.status !== "validee" && (
                <div className={`rounded-2xl p-3 text-[14px] font-bold ${j.clean_linen.status === "sur_place" ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : j.clean_linen.status === "en_route" ? "bg-[var(--a-warnbg)] text-[var(--a-warn)]" : "bg-[var(--a-bg)] text-[var(--a-mute)]"}`}>
                  {j.clean_linen.status === "sur_place" && <>🧺 Linge propre sur place{j.clean_linen.done_at ? ` (déposé à ${new Date(j.clean_linen.done_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })})` : ""}</>}
                  {j.clean_linen.status === "en_route" && (
                    <>🚚 Linge propre en route{j.clean_linen.courier ? ` avec ${j.clean_linen.courier.split(" ")[0]}` : ""}{j.clean_linen.km != null ? ` · à ${String(j.clean_linen.km).replace(".", ",")} km` : ""}
                      <span className="mt-1 flex flex-wrap gap-3 text-[13px]">
                        {j.clean_linen.lat != null && <a className="underline" href={`https://maps.google.com/?q=${j.clean_linen.lat},${j.clean_linen.lng}`} target="_blank" rel="noopener noreferrer">Voir sa position</a>}
                        {j.clean_linen.phone && <a className="underline" href={`tel:${j.clean_linen.phone.replace(/[^+\d]/g, "")}`}>Appeler le livreur</a>}
                        {j.clean_linen.lat == null && <span className="font-normal">Position pas encore partagée.</span>}
                      </span></>
                  )}
                  {j.clean_linen.status === "a_venir" && <>🧺 Linge propre pas encore livré. Vous serez informé ici quand le livreur part.</>}
                </div>
              )}
              {j.guide && j.status !== "validee" && (
                <details className="rounded-2xl bg-[var(--a-bg)] p-3 text-[14px]" open={j.status === "acceptee" && !!j.arrived_at && (j.photos_after ?? 0) === 0}>
                  <summary className="cursor-pointer text-[15px] font-extrabold text-[var(--a-pri)]">Comment nettoyer ce logement</summary>
                  {j.guide.summary && <p className="mt-1 text-[var(--a-mute)]">{j.guide.summary}</p>}
                  {j.guide.rooms.map((r) => <div key={r.room} className="mt-2"><b>{r.room}</b><ul className="mt-0.5 list-disc space-y-0.5 pl-5">{r.steps.map((x, i) => <li key={i}>{x}</li>)}</ul></div>)}
                  {j.guide.attention.length > 0 && <div className="mt-2 rounded-xl bg-[var(--a-warnbg)] p-2 text-[var(--a-warn)]"><b>Attention</b><ul className="mt-0.5 list-disc pl-5">{j.guide.attention.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                </details>
              )}
              {j.status === "a_reprendre" && j.review_note && <div className="rounded-2xl bg-[var(--a-badbg)] p-3 text-[14px] text-[var(--a-bad)]"><b>{j.ai_status === "reprise" ? "À reprendre" : "La direction demande de repasser"} :</b> {j.review_note}</div>}
              {j.status === "acceptee" && j.date === today && !j.arrived_at && (
                <form action={cleanerArriveAction.bind(null, token, j.id)}><button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90">📍 Je suis sur place</button><p className="mt-1 text-center text-xs text-[var(--a-mute)]">Pointez en arrivant : sans pointage à l&apos;heure, le ménage est proposé à un autre nettoyeur.</p></form>
              )}
              {j.status === "acceptee" && j.arrived_at && <p className="rounded-2xl bg-[var(--a-okbg)] p-2 text-center text-[13px] font-bold text-[var(--a-ok)]">Arrivée pointée ✔</p>}
              {j.status === "a_verifier" && <p className="rounded-2xl bg-[var(--a-warnbg)] p-3 text-center text-[14px] font-bold text-[var(--a-warn)]">Envoyé pour vérification. Vous serez payé après validation.</p>}
              {j.status === "validee" && <p className="rounded-2xl bg-[var(--a-okbg)] p-3 text-center text-[14px] font-bold text-[var(--a-ok)]">{j.validated_by === "ia" ? "Validé automatiquement (contrôle des photos)" : "Validé"} : {eur(j.amount)} à venir sur votre prochain virement.</p>}
              {j.departure && j.status !== "validee" && (
                <div role="status" className={`rounded-2xl p-3 text-center text-[15px] font-extrabold ${j.departure === "partir" ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-badbg)] text-[var(--a-bad)]"}`}>
                  {j.departure === "partir" ? "La direction vous autorise à partir. Merci !" : "Restez sur place : la direction vous demande de reprendre."}
                </div>
              )}
              {(j.status === "acceptee" || j.status === "a_reprendre") && j.date <= today && (
                <div className="space-y-3">
                  <CleanerPhotoButton token={token} job={j.id} kind="avant" label="1. Photos avant le ménage" count={j.photos_before ?? 0} />
                  <CleanerVideoButton token={token} job={j.id} kind="avant" label="ou filmer les pièces (avant)" />
                  {j.before_report && j.before_report.items.length > 0 && (
                    <div className="rounded-2xl bg-[var(--a-bg)] p-3 text-[14px]">
                      <b className="block text-[15px]">À nettoyer (relevé automatique des photos)</b>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">{j.before_report.items.map((it, i) => <li key={i}><b>{it.zone}</b>{it.todo ? ` : ${it.todo}` : ""}</li>)}</ul>
                    </div>
                  )}
                  <CleanerPhotoButton token={token} job={j.id} kind="apres" label="2. Photos après le ménage" count={j.photos_after ?? 0} />
                  <CleanerVideoButton token={token} job={j.id} kind="apres" label="ou filmer les pièces (après)" />
                </div>
              )}
              {j.ai_status === "reprise" && j.ai_report?.remaining && j.ai_report.remaining.length > 0 && j.status === "a_reprendre" && (
                <div className="space-y-2 rounded-2xl bg-[var(--a-badbg)] p-3 text-[14px] text-[var(--a-bad)]">
                  <b className="block text-[15px]">Points à reprendre avant de partir</b>
                  {j.ai_report.remaining.map((r, i) => (
                    <div key={i} className="space-y-1.5 rounded-xl bg-[var(--a-bg)] p-2.5 text-[var(--a-ink)]">
                      <div><b>{i + 1}. {r.zone}</b>{r.why ? ` : ${r.why}` : ""}</div>
                      <CleanerPhotoButton token={token} job={j.id} kind="apres" label={`Reprendre la photo : ${r.zone}`} count={0} />
                    </div>
                  ))}
                  <p className="text-xs">Reprenez chaque point, refaites sa photo, puis appuyez de nouveau sur « J&apos;ai terminé ».</p>
                </div>
              )}
              {canFinish && (
                <form action={cleanerFinishAction.bind(null, token, j.id)} className="space-y-2">
                  <textarea name="note" rows={2} maxLength={1000} placeholder="Un mot pour la direction (facultatif) : ce qui a été fait, un souci…" className="w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-base" />
                  <button disabled={needPhotos && ((j.photos_before ?? 0) === 0 || (j.photos_after ?? 0) === 0)} className="h-14 w-full rounded-2xl bg-[var(--a-ok)] text-lg font-extrabold text-[var(--a-bg)] active:opacity-90 disabled:opacity-40">3. J&apos;ai terminé le ménage</button>
                  {needPhotos && ((j.photos_before ?? 0) === 0 || (j.photos_after ?? 0) === 0) && <p className="text-center text-xs text-[var(--a-mute)]">Ajoutez au moins une photo avant et une photo après pour terminer.</p>}
                </form>
              )}
              {j.linen && j.status !== "annulee" && (
                <div className="space-y-2 rounded-2xl bg-[var(--a-bg)] p-3 text-[14px]">
                  <b className="block text-[15px]">Draps : {LINEN_STEP[j.linen.status]}</b>
                  {j.linen.tracking && <span className="text-[var(--a-mute)]">Suivi : {j.linen.tracking} ({j.linen.method === "poste" ? "poste" : "livreur"})</span>}
                  {j.linen.status === "a_deposer" && (
                    <form action={cleanerLinenAction.bind(null, token, j.id)} className="space-y-2">
                      <input type="hidden" name="status" value="depose" />
                      <select name="method" defaultValue="poste" className="h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-card)] px-3 text-base"><option value="poste">Je dépose au bureau de poste</option><option value="livreur">Un livreur de colis vient les prendre</option></select>
                      <input name="tracking" placeholder="Numéro de suivi du colis (facultatif)" maxLength={80} className="h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-card)] px-3 text-base" />
                      <button className="h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">J&apos;ai déposé / expédié les draps</button>
                    </form>
                  )}
                  {j.linen.status === "renvoye" && <form action={cleanerLinenAction.bind(null, token, j.id)}><input type="hidden" name="status" value="recupere" /><button className="h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">J&apos;ai récupéré les draps propres</button></form>}
                  {j.linen.status === "recupere" && <form action={cleanerLinenAction.bind(null, token, j.id)}><input type="hidden" name="status" value="remis" /><button className="h-12 w-full rounded-2xl bg-[var(--a-ok)] text-base font-extrabold text-[var(--a-bg)]">J&apos;ai remis les draps dans le logement</button></form>}
                </div>
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
