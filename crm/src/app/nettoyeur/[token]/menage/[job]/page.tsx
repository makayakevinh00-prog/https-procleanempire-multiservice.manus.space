import type { Metadata } from "next";
import Link from "next/link";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { cleanerPostMessageAction, cleanerReportProblemAction } from "@/app/actions/nettoyeur";
import { Thread, type Msg } from "@/components/agent/thread";
import { Gate } from "@/components/agent/gate";
import { dayFr } from "@/lib/cleaner-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages du ménage — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };
const field = "w-full rounded-2xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 py-2.5 text-[15px]";

/** Messages d'un ménage + signalement d'un problème. */
export default async function CleanerJobThread({ params, searchParams }: { params: { token: string; job: string }; searchParams: { ok?: string; error?: string } }) {
  const { token, job } = params;
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(job)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_job_thread", { p_token: token, p_job: job });
  if (error) return <Gate text={agentMessage(error.message)} back={{ href: `/nettoyeur/${token}/missions`, label: "Mes ménages" }} />;
  const t = data as { job: { title: string; date: string }; messages: Msg[] };
  return (
    <>
      <Link href={`/nettoyeur/${token}/missions`} className="text-[14px] font-bold text-[var(--a-pri)]">← Mes ménages</Link>
      <h1 className="mb-1 mt-2 text-[24px] font-extrabold leading-tight tracking-tight">{t.job.title}</h1>
      <p className="mb-3 text-[14px] text-[var(--a-mute)]">{dayFr(t.job.date)}</p>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <Thread messages={t.messages} me="nettoyeur" />
      <form action={cleanerPostMessageAction.bind(null, token, job)} className="mt-3 space-y-2">
        <textarea name="body" required maxLength={1000} rows={3} placeholder="Votre message à la conciergerie et à ProClean…" className={field} />
        <button className="h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Envoyer</button>
      </form>
      <details className="mt-6 rounded-3xl bg-[var(--a-card)] p-4">
        <summary className="cursor-pointer text-[16px] font-extrabold">⚠️ Signaler un problème</summary>
        <form action={cleanerReportProblemAction.bind(null, token, job)} className="mt-3 space-y-2">
          <select name="kind" className={field} defaultValue="degat">
            <option value="degat">Dégât constaté</option><option value="acces">Accès impossible</option><option value="sale">Logement très sale</option><option value="manque">Matériel ou linge manquant</option><option value="autre">Autre</option>
          </select>
          <textarea name="text" required minLength={3} maxLength={800} rows={3} placeholder="Décrivez ce que vous voyez" className={field} />
          <p className="text-[12px] text-[var(--a-mute)]">Pensez à prendre une photo avec le bouton photo de la mission. La direction et la conciergerie sont prévenues tout de suite.</p>
          <button className="h-12 w-full rounded-2xl bg-[var(--a-bad)] text-base font-extrabold text-white">Signaler</button>
        </form>
      </details>
    </>
  );
}
