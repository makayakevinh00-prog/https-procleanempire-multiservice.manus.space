import type { Metadata } from "next";
import Link from "next/link";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { partnerPostMessageAction, partnerRateAction } from "@/app/actions/nettoyeur";
import { Thread, type Msg } from "@/components/agent/thread";
import { Gate } from "@/components/agent/gate";
import { FIELD_CSS } from "@/components/agent/theme";
import { dayFr } from "@/lib/cleaner-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages du ménage — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };
const field = "w-full rounded-2xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 py-2.5 text-[15px]";

/** Messages d'un ménage et avis de la conciergerie. */
export default async function PartnerJobThread({ params, searchParams }: { params: { token: string; job: string }; searchParams: { ok?: string; error?: string } }) {
  const { token, job } = params;
  const shell = (c: React.ReactNode) => (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-xl px-4 pb-16 pt-5">{c}</div>
    </div>
  );
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(job)) return shell(<Gate text="Ce lien n'est pas valide." />);
  const { data, error } = await agentClient().rpc("partner_job_thread", { p_secret: token, p_job: job });
  if (error) return shell(<Gate text={agentMessage(error.message)} back={{ href: `/partenaire/${token}?v=menages`, label: "Ménages" }} />);
  const t = data as { job: { title: string; date: string; status: string; cleaner: string | null }; review: { rating: number; comment: string | null } | null; messages: Msg[] };
  const canRate = !!t.job.cleaner && ["a_verifier", "validee", "a_reprendre"].includes(t.job.status);
  return shell(
    <>
      <Link href={`/partenaire/${token}?v=menages`} className="text-[14px] font-bold text-[var(--a-pri)]">← Ménages</Link>
      <h1 className="mb-1 mt-2 text-[24px] font-extrabold leading-tight tracking-tight">{t.job.title}</h1>
      <p className="mb-3 text-[14px] text-[var(--a-mute)]">{dayFr(t.job.date)}{t.job.cleaner ? ` · ${t.job.cleaner}` : ""}</p>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      {canRate && (
        <form action={partnerRateAction.bind(null, token, job)} className="mb-4 space-y-2 rounded-3xl bg-[var(--a-card)] p-4">
          <div className="text-[16px] font-extrabold">{t.review ? `Votre note : ${"★".repeat(t.review.rating)}${"☆".repeat(5 - t.review.rating)}` : "Notez ce ménage"}</div>
          <div className="flex gap-2" role="radiogroup" aria-label="Note de 1 à 5">
            {[1, 2, 3, 4, 5].map((n) => <label key={n} className="flex-1"><input type="radio" name="rating" value={n} required defaultChecked={t.review?.rating === n} className="peer sr-only" /><span className="block cursor-pointer rounded-2xl bg-[var(--a-bg)] py-2 text-center text-[18px] font-extrabold peer-checked:bg-[var(--a-pri)] peer-checked:text-white">{n}★</span></label>)}
          </div>
          <input name="comment" maxLength={500} defaultValue={t.review?.comment ?? ""} placeholder="Un commentaire (facultatif)" className={field} />
          <button className="h-11 w-full rounded-2xl bg-[var(--a-pri)] text-[15px] font-extrabold text-white">{t.review ? "Modifier mon avis" : "Envoyer mon avis"}</button>
        </form>
      )}
      <Thread messages={t.messages} me="conciergerie" />
      <form action={partnerPostMessageAction.bind(null, token, job)} className="mt-3 space-y-2">
        <textarea name="body" required maxLength={1000} rows={3} placeholder="Votre message au nettoyeur et à ProClean…" className={field} />
        <button className="h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Envoyer</button>
      </form>
    </>
  );
}
