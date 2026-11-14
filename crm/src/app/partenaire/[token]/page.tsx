import type { Metadata } from "next";
import { cookies } from "next/headers";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { partnerAnalyzeAction, partnerApiKeyAction, partnerLinenAction, partnerSaveListingAction } from "@/app/actions/nettoyeur";
import { JOB_STATUS, dayFr, eur } from "@/lib/cleaner-ui";
import { PLATFORMS } from "@/lib/concierge/ical";
import { FIELD_CSS } from "@/components/agent/theme";
import { Gate } from "@/components/agent/gate";
import { RefUpload } from "@/components/crm/ref-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Espace conciergerie — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Listing = { id: string; name: string; platform: string; has_ical: boolean; last_sync_at: string | null; last_sync_error: string | null; price: number | null; checkout_time: string; address: string | null; postal_code: string | null; city: string | null; access_notes: string | null; linen_clean: number; linen_dirty: number; linen_per_stay: number; has_guide: boolean; ref_photos: number; next_checkout: string | null };
type Job = { id: string; title: string; date: string; status: string; city: string | null; cleaner: string | null; arrived: boolean; ai_status: string | null; summary: string | null; validated_by: string | null };

const input = "h-11 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-[15px]";
const label = "mb-1 block text-[13px] font-bold";

function ListingForm({ token, l }: { token: string; l?: Listing }) {
  return (
    <form action={partnerSaveListingAction.bind(null, token, l?.id ?? null)} className="space-y-3">
      <label className="block"><span className={label}>Nom du logement *</span><input name="name" required minLength={2} defaultValue={l?.name ?? ""} className={input} placeholder="Studio Gare" /></label>
      <label className="block"><span className={label}>Adresse *</span><input name="address" required defaultValue={l?.address ?? ""} className={input} /></label>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <label className="block"><span className={label}>Code postal *</span><input name="postal_code" required inputMode="numeric" pattern="\d{5}" maxLength={5} defaultValue={l?.postal_code ?? ""} className={input} /></label>
        <label className="block"><span className={label}>Ville</span><input name="city" defaultValue={l?.city ?? ""} className={input} /></label>
      </div>
      <label className="block"><span className={label}>Accès (boîte à clés, code, étage)</span><input name="access_notes" defaultValue={l?.access_notes ?? ""} className={input} /><span className="text-xs text-[var(--a-mute)]">Montré au nettoyeur seulement après qu&apos;il a accepté le ménage.</span></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Plateforme</span><select name="platform" defaultValue={l?.platform ?? "airbnb"} className={input}>{Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block"><span className={label}>Heure de départ</span><input name="checkout_time" type="time" defaultValue={(l?.checkout_time ?? "11:00").slice(0, 5)} className={input} /></label>
      </div>
      <label className="block"><span className={label}>Lien du calendrier (iCal)</span><input name="ical_url" type="url" placeholder="https://www.airbnb.fr/calendar/ical/…" className={input} /><span className="text-xs text-[var(--a-mute)]">{l?.has_ical ? "Un calendrier est déjà relié : laissez vide pour le garder, ou collez un nouveau lien pour le remplacer." : "Airbnb, Booking, Abritel, SuperHote, Smoobu, Lodgify, Hostaway, Guesty, Beds24… : « exporter le calendrier », puis collez le lien ici."}</span></label>
      {l?.has_ical && <label className="flex items-center gap-2 text-[13px] text-[var(--a-mute)]"><input type="checkbox" name="remove_ical" /> Retirer le calendrier relié</label>}
      <button className="h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">{l ? "Enregistrer" : "Ajouter ce logement"}</button>
    </form>
  );
}

/** Espace des conciergeries partenaires : leurs logements et calendriers, la référence de chaque logement, leur linge, leurs ménages, et la clé d'API. */
export default async function PartnerPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const token = params.token;
  const shell = (children: React.ReactNode) => (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-5">{children}</div>
    </div>
  );
  if (!isToken(token)) return shell(<Gate text="Ce lien n'est pas valide. Demandez un nouveau lien à ProClean Empire." />);
  const c = agentClient();
  const { data, error } = await c.rpc("partner_overview", { p_secret: token });
  if (error) return shell(<Gate text={agentMessage(error.message)} />);
  const o = data as { name: string; has_api_key: boolean; listings: Listing[]; jobs: Job[] };
  const guides = new Map<string, any>(await Promise.all(o.listings.filter((l) => l.has_guide).map(async (l) => [l.id, (await c.rpc("partner_guide", { p_secret: token, p_listing: l.id })).data] as [string, any])));
  const fresh = cookies().get("partner_key")?.value ?? null;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const card = "rounded-3xl bg-[var(--a-card)] p-4";
  const h2 = "mb-2 mt-7 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]";
  return shell(
    <>
      <header className="mb-4">
        <span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">{o.name}</h1>
        <p className="text-[15px] text-[var(--a-mute)]">Reliez vos calendriers une fois : le ménage se crée tout seul à chaque départ, sans double saisie.</p>
      </header>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      <h2 className={h2}>Mes ménages</h2>
      {!o.jobs.length ? <p className={`${card} text-center text-[15px] text-[var(--a-mute)]`}>Aucun ménage pour le moment. Ils apparaissent ici dès qu&apos;une réservation arrive dans un calendrier relié.</p> : (
        <div className="space-y-2">{o.jobs.map((j) => (
          <div key={j.id} className={`${card} flex items-center gap-3`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-extrabold">{j.title}</div>
              <div className="text-[13px] text-[var(--a-mute)]">{j.date === today ? "Aujourd'hui" : dayFr(j.date)}{j.cleaner ? ` · ${j.cleaner}${j.arrived && j.status === "acceptee" ? " (sur place)" : ""}` : " · en recherche d'un nettoyeur"}</div>
              {j.status === "validee" && j.summary && <div className="mt-0.5 text-[12px] text-[var(--a-mute)]">Contrôle : {j.summary}</div>}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${j.status === "validee" ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : j.status === "ouverte" ? "bg-[var(--a-warnbg)] text-[var(--a-warn)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{j.status === "ouverte" ? "Publié" : j.status === "acceptee" ? "Accepté" : j.status === "validee" ? "Fait et contrôlé" : JOB_STATUS[j.status] ?? j.status}</span>
          </div>
        ))}</div>
      )}

      <h2 className={h2}>Mes logements ({o.listings.length})</h2>
      <div className="space-y-3">
        {o.listings.map((l) => { const g = guides.get(l.id); return (
          <details key={l.id} className={card}>
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-extrabold">{l.name}</div>
                <div className="text-[13px] text-[var(--a-mute)]">{l.city ?? ""} · {l.has_ical ? (l.last_sync_error ? "calendrier en erreur" : "calendrier relié") : "calendrier non relié"}{l.next_checkout ? ` · prochain départ ${dayFr(l.next_checkout)}` : ""}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className={`rounded-full px-2 py-0.5 ${l.price != null ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-warnbg)] text-[var(--a-warn)]"}`}>{l.price != null ? `Ménage ${eur(l.price)} HT` : "Tarif en attente (ProClean)"}</span>
                  <span className={`rounded-full px-2 py-0.5 ${l.linen_clean >= l.linen_per_stay ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-badbg)] text-[var(--a-bad)]"}`}>Linge propre : {l.linen_clean}</span>
                  <span className={`rounded-full px-2 py-0.5 ${l.has_guide ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{l.has_guide ? "Référence faite" : "Référence à faire"}</span>
                </div>
              </div>
              <span className="text-[13px] font-extrabold text-[var(--a-pri)]">Ouvrir</span>
            </summary>
            <div className="mt-4 space-y-5 border-t border-[var(--a-line)] pt-4">
              {l.last_sync_error && <p className="rounded-2xl bg-[var(--a-badbg)] p-3 text-[13px] font-semibold text-[var(--a-bad)]">Le calendrier ne répond pas : {l.last_sync_error}. Vérifiez le lien.</p>}
              <section>
                <b className="mb-2 block text-[15px]">Linge</b>
                <p className="mb-2 text-[13px] text-[var(--a-mute)]">Dans le logement : {l.linen_clean} parure{l.linen_clean > 1 ? "s" : ""} propre{l.linen_clean > 1 ? "s" : ""}, {l.linen_dirty} sale{l.linen_dirty > 1 ? "s" : ""}. Il en faut {l.linen_per_stay} par séjour. Le stock baisse à chaque ménage et remonte quand le livreur dépose du linge.</p>
                <form action={partnerLinenAction.bind(null, token, l.id)} className="flex items-end gap-2"><label className="flex-1"><span className={label}>Parures propres sur place (si vous en déposez vous-même)</span><input name="clean" type="number" min={0} max={200} defaultValue={l.linen_clean} className={input} /></label><button className="h-11 rounded-xl border border-[var(--a-pri)] px-4 text-sm font-extrabold text-[var(--a-pri)]">Mettre à jour</button></form>
              </section>
              <section>
                <b className="mb-1 block text-[15px]">Référence du logement ({l.ref_photos} image{l.ref_photos > 1 ? "s" : ""})</b>
                <p className="mb-2 text-[13px] text-[var(--a-mute)]">Filmez ou photographiez le logement propre, une fois. L&apos;IA en tire le guide de ménage pour le nettoyeur et compare ensuite chaque ménage à cet état.</p>
                <RefUpload listing={l.id} endpoint="/api/partenaire/photo" token={token} dark />
                {l.ref_photos > 0 && <form action={partnerAnalyzeAction.bind(null, token, l.id)} className="mt-2"><button className="h-11 rounded-xl bg-[var(--a-pri)] px-4 text-sm font-extrabold text-white">{l.has_guide ? "Refaire le guide" : "Faire rédiger le guide par l'IA"}</button></form>}
                {g && <div className="mt-3 rounded-2xl bg-[var(--a-bg)] p-3 text-[13px]">{g.summary && <p className="text-[var(--a-mute)]">{g.summary}</p>}{(g.rooms ?? []).map((r: any) => <div key={r.room} className="mt-1.5"><b>{r.room}</b><ul className="list-disc pl-5">{(r.steps ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>)}</div>}
              </section>
              <section><b className="mb-2 block text-[15px]">Informations et calendrier</b><ListingForm token={token} l={l} /></section>
            </div>
          </details>
        ); })}
        <details className={card} open={!o.listings.length}>
          <summary className="cursor-pointer list-none text-[16px] font-extrabold text-[var(--a-pri)]">+ Ajouter un logement</summary>
          <div className="mt-4"><ListingForm token={token} /></div>
        </details>
      </div>

      <h2 className={h2}>Connecter votre logiciel (API)</h2>
      <div className={`${card} space-y-3 text-[14px]`}>
        <p className="text-[var(--a-mute)]">Si votre logiciel ne propose pas de lien de calendrier, il peut nous envoyer les réservations directement avec une clé d&apos;API.</p>
        {fresh && <div className="rounded-2xl bg-[var(--a-okbg)] p-3"><b className="block text-[var(--a-ok)]">Votre clé (affichée une seule fois) :</b><input readOnly value={fresh} aria-label="Clé d'API" className="mt-1 w-full select-all rounded-lg border border-[var(--a-line)] bg-[var(--a-bg)] px-2 py-2 font-mono text-xs" /></div>}
        <form action={partnerApiKeyAction.bind(null, token)}><button className="h-11 rounded-xl border border-[var(--a-pri)] px-4 text-sm font-extrabold text-[var(--a-pri)]">{o.has_api_key ? "Créer une nouvelle clé (l'ancienne cesse de marcher)" : "Créer ma clé d'API"}</button></form>
        <details><summary className="cursor-pointer font-bold text-[var(--a-pri)]">Mode d&apos;emploi pour votre technicien</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--a-bg)] p-3 text-[11px] leading-relaxed">{`En-tête de chaque appel :
  Authorization: Bearer pk_…

Lire vos logements (avec leur id) et vos ménages :
  GET  https://proclean-crm.vercel.app/api/partenaire/menages

Envoyer, modifier ou annuler une réservation :
  POST https://proclean-crm.vercel.app/api/partenaire/reservations
  { "logement": "<id du logement>", "reference": "ABC123",
    "arrivee": "2026-12-01", "depart": "2026-12-05", "annulee": false }

Le ménage du jour du départ est créé, déplacé ou annulé.`}</pre>
        </details>
      </div>
      <p className="px-2 pt-6 text-center text-xs text-[var(--a-mute)]">Ce lien est privé : il donne accès à vos logements et à vos consignes d&apos;accès. Ne le partagez pas.</p>
    </>
  );
}
