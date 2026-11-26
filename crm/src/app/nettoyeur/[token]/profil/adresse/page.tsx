import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { cleanerProfileAction } from "@/app/actions/nettoyeur";
import { Gate } from "@/components/agent/gate";
import { GpsButton } from "@/components/nettoyeur/live";
import { BackToProfile } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Adresse et secteur — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";
const lab = "mb-1 block text-[14px] font-bold";
const hint = "mt-1 block text-xs text-[var(--a-mute)]";

export default async function CleanerAdresse({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; ok?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">Adresse et secteur</h1>
      {searchParams.error && <div role="alert" className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <form action={cleanerProfileAction.bind(null, token)} className="mt-5">
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="block"><span className={lab}>Votre adresse</span><input name="address_line" defaultValue={o.address_line ?? ""} className={input} autoComplete="street-address" /></label>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <label className="block"><span className={lab}>Code postal</span><input name="postal_code" defaultValue={o.postal_code ?? ""} required inputMode="numeric" pattern="\d{5}" maxLength={5} className={input} /></label>
            <label className="block"><span className={lab}>Ville</span><input name="city" defaultValue={o.city ?? ""} className={input} /></label>
          </div>
          <GpsButton />
          <label className="block"><span className={lab}>Rayon de déplacement (km)</span><input name="radius_km" type="number" min={1} max={100} defaultValue={o.radius_km} required className={input} /><span className={hint}>{o.has_location ? "Adresse localisée : vous voyez les ménages dans ce rayon, avec la distance." : "Adresse non localisée : vous voyez les ménages de votre département. Complétez l'adresse pour activer le rayon."}</span></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer l&apos;adresse</button>
        </div>
      </form>
    </>
  );
}
