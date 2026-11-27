import type { Metadata } from "next";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { cleanerLinenPrefAction } from "@/app/actions/nettoyeur";
import { Gate } from "@/components/agent/gate";
import { BackToProfile } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lavage du linge — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";

export default async function CleanerLinen({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; ok?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_linen_pref", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as { lave_linge: boolean; note: string | null };
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">Lavage du linge</h1>
      {searchParams.error && <div role="alert" className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <form action={cleanerLinenPrefAction.bind(null, token)} className="mt-5">
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="flex min-h-12 items-center gap-3 text-[16px] font-bold"><input type="checkbox" name="lave_linge" defaultChecked={o.lave_linge} className="h-6 w-6" />Je peux laver du linge chez moi</label>
          <label className="block"><span className="mb-1 block text-[14px] font-bold">Précisions (facultatif)</span><input name="note" defaultValue={o.note ?? ""} maxLength={200} className={input} placeholder="Machine 8 kg, séchoir, repassage…" /></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer</button>
        </div>
      </form>
    </>
  );
}
