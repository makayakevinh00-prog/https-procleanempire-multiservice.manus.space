import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { cleanerProfileAction } from "@/app/actions/nettoyeur";
import { initials } from "@/lib/field-ui";
import { Gate } from "@/components/agent/gate";
import { GpsButton } from "@/components/nettoyeur/live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";

export default async function CleanerProfile({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  if (!isToken(params.token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: params.token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  return (
    <>
      <section className="rounded-3xl border border-[var(--a-line)] p-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--a-soft)] bg-[var(--a-card)] text-[34px] font-extrabold text-[var(--a-pri)]">{initials(o.name)}</div>
        <h1 className="mt-3 text-[26px] font-extrabold tracking-tight">{o.name}</h1>
        <p className="text-[15px] text-[var(--a-mute)]">{o.email}</p>
        <div className="mt-3 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--a-mute)]">Ménages validés</div>
        <b className="num text-[44px] leading-tight text-[var(--a-pri)]">{o.done}</b>
      </section>
      {searchParams.error && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <form action={cleanerProfileAction.bind(null, params.token)} className="mt-4 space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
        <label className="block"><span className="mb-1 block text-[14px] font-bold">Votre adresse</span><input name="address_line" defaultValue={o.address_line ?? ""} className={input} autoComplete="street-address" /></label>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <label className="block"><span className="mb-1 block text-[14px] font-bold">Code postal</span><input name="postal_code" defaultValue={o.postal_code ?? ""} required inputMode="numeric" pattern="\d{5}" maxLength={5} className={input} /></label>
          <label className="block"><span className="mb-1 block text-[14px] font-bold">Ville</span><input name="city" defaultValue={o.city ?? ""} className={input} /></label>
        </div>
        <GpsButton />
        <label className="block"><span className="mb-1 block text-[14px] font-bold">Rayon de déplacement (km)</span><input name="radius_km" type="number" min={1} max={100} defaultValue={o.radius_km} required className={input} /><span className="text-xs text-[var(--a-mute)]">{o.has_location ? "Adresse localisée : vous voyez les ménages dans ce rayon, avec la distance." : "Adresse non localisée : vous voyez les ménages de votre département. Complétez l'adresse pour activer le rayon."}</span></label>
        <label className="block"><span className="mb-1 block text-[14px] font-bold">Téléphone</span><input name="phone" defaultValue={o.phone ?? ""} inputMode="tel" className={input} /></label>
        <label className="block"><span className="mb-1 block text-[14px] font-bold">IBAN pour vos virements</span><input name="iban" autoComplete="off" className={input} placeholder={o.has_iban ? `Enregistré (${o.iban_hint}) : saisissez pour le remplacer` : "FR76 …"} /><span className="text-xs text-[var(--a-mute)]">Il n&apos;est jamais affiché en entier, ni à vous ni aux propriétaires.</span></label>
        <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Enregistrer</button>
      </form>
      <a href="/connexion?choisir=1" className="mt-4 flex h-12 items-center justify-center rounded-2xl border border-[var(--a-line)] text-[15px] font-extrabold text-[var(--a-mute)]">Changer d&apos;espace ou me déconnecter</a>
      <section className="mt-4 rounded-3xl bg-[var(--a-card)] p-4 text-[14px] text-[var(--a-mute)]">
        <b className="block text-[16px] text-[var(--a-ink)]">Comment ça marche</b>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Les ménages ont lieu entre {o.window_start.slice(0, 5).replace(":", "h")} et {o.window_end.slice(0, 5).replace(":", "h")}, jamais après {o.max_end.slice(0, 5).replace(":", "h")}.</li>
          <li>Le premier qui accepte obtient le ménage ; les favoris du propriétaire passent d&apos;abord.</li>
          <li>Les ménages s&apos;affichent autour de votre adresse, du plus proche au plus loin.</li>
          <li>Vous travaillez en indépendant : vous choisissez vos ménages.</li>
        </ul>
      </section>
    </>
  );
}
