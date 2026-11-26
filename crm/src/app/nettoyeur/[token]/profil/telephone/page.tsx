import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { cleanerPhoneAction } from "@/app/actions/nettoyeur";
import { Gate } from "@/components/agent/gate";

import { BackToProfile } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Téléphone — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";
const lab = "mb-1 block text-[14px] font-bold";
const hint = "mt-1 block text-xs text-[var(--a-mute)]";

export default async function CleanerTelephone({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; ok?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">Téléphone</h1>
      {searchParams.error && <div role="alert" className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <form action={cleanerPhoneAction.bind(null, token)} className="mt-5">
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="block"><span className={lab}>Votre numéro</span><input name="phone" defaultValue={o.phone ?? ""} inputMode="tel" className={input} /><span className={hint}>Utilisé si la direction doit vous joindre pendant un ménage.</span></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer le téléphone</button>
        </div>
      </form>
    </>
  );
}
