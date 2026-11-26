import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { cleanerIbanAction } from "@/app/actions/nettoyeur";
import { Gate } from "@/components/agent/gate";

import { BackToProfile } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "IBAN pour mes virements — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";
const lab = "mb-1 block text-[14px] font-bold";
const hint = "mt-1 block text-xs text-[var(--a-mute)]";

export default async function CleanerIban({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; ok?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">IBAN pour mes virements</h1>
      {searchParams.error && <div role="alert" className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <form action={cleanerIbanAction.bind(null, token)} className="mt-5">
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="block"><span className={lab}>IBAN</span><input name="iban" autoComplete="off" required className={input} placeholder={o.has_iban ? `Enregistré (${o.iban_hint}) : saisissez pour le remplacer` : "FR76 …"} /><span className={hint}>Il n&apos;est jamais affiché en entier, ni à vous ni aux propriétaires.</span></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer l&apos;IBAN</button>
        </div>
      </form>
    </>
  );
}
