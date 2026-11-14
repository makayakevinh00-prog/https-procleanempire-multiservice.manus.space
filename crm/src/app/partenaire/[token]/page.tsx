import type { Metadata } from "next";
import { cookies } from "next/headers";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { partnerAnalyzeAction, partnerApiKeyAction, partnerLinenAction, partnerRoomsAction, partnerSaveListingAction } from "@/app/actions/nettoyeur";
import Link from "next/link";
import { JOB_STATUS, dayFr, eur, slot } from "@/lib/cleaner-ui";
import { PLATFORMS } from "@/lib/concierge/ical";
import { FIELD_CSS } from "@/components/agent/theme";
import { Gate } from "@/components/agent/gate";
import { RefUpload } from "@/components/crm/ref-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Espace conciergerie — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Stats = { upcoming: number; searching: number; in_progress: number; done_month: number; spend_month: number; done_total: number; redo_month: number };
type Listing = { rooms: string[] | null; stays: number; id: string; name: string; platform: string; has_ical: boolean; last_sync_at: string | null; last_sync_error: string | null; price: number | null; checkout_time: string; address: string | null; postal_code: string | null; city: string | null; access_notes: string | null; linen_clean: number; linen_dirty: number; linen_per_stay: number; has_guide: boolean; ref_photos: number; next_checkout: string | null };
type Job = { price: number | null; window_start: string; window_end: string; redo: boolean; tasks_done: number; tasks: number; photos: number; id: string; title: string; date: string; status: string; city: string | null; cleaner: string | null; arrived: boolean; ai_status: string | null; summary: string | null; validated_by: string | null };

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

/** Espace des conciergeries partenaires : tableau de bord, ménages, logements (calendriers, référence, pièces), linge, et connexion par clé d'API. */
export default async function PartnerPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string; v?: string } }) {
  const token = params.token;
  const shell = (children: React.ReactNode) => (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5">{children}</div>
    </div>
  );
  if (!isToken(token)) return shell(<Gate text="Ce lien n'est pas valide. Demandez un nouveau lien à ProClean Empire." />);
  const c = agentClient();
  const { data, error } = await c.rpc("partner_overview", { p_secret: token });
  if (error) return shell(<Gate text={agentMessage(error.message)} />);
  const o = data as { name: string; today: string; has_api_key: boolean; stats: Stats; listings: Listing[]; jobs: Job[] };
  const VIEWS = [["tableau", "Tableau de bord"], ["menages", "Ménages"], ["logements", "Logements"], ["linge", "Linge"], ["api", "Connexion"]] as const;
  const view = VIEWS.some(([k]) => k === searchParams.v) ? searchParams.v! : "tableau";
  const guides = view === "logements" ? new Map<string, any>(await Promise.all(o.listings.filter((l) => l.has_guide).map(async (l) => [l.id, (await c.rpc("partner_guide", { p_secret: token, p_listing: l.id })).data] as [string, any]))) : new Map<string, any>();
  const fresh = cookies().get("partner_key")?.value ?? null;
  const today = o.today, s = o.stats;
  const href = (v: string) => `/partenaire/${token}?v=${v}`;
  const card = "rounded-3xl bg-[var(--a-card)] p-4";
  const h2 = "mb-2 mt-6 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]";
  const upcoming = o.jobs.filter((j) => j.date >= today && j.status !== "validee"), past = o.jobs.filter((j) => j.date < today || j.status === "validee").reverse();
  const pill = (j: Job) => <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${j.status === "validee" ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : j.status === "ouverte" ? "bg-[var(--a-warnbg)] text-[var(--a-warn)]" : j.status === "a_reprendre" ? "bg-[var(--a-badbg)] text-[var(--a-bad)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{j.status === "ouverte" ? "Recherche d'un nettoyeur" : j.status === "acceptee" ? (j.arrived ? "En cours" : "Accepté") : j.status === "validee" ? "Fait et contrôlé" : j.status === "a_verifier" ? "En contrôle" : JOB_STATUS[j.status] ?? j.status}</span>;
  const jobRow = (j: Job) => (
    <div key={j.id} className={`${card} flex items-center gap-3`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-extrabold">{j.title}</div>
        <div className="text-[13px] text-[var(--a-mute)]">{j.date === today ? "Aujourd'hui" : dayFr(j.date)} · {slot(j.window_start, j.window_end)}{j.cleaner ? ` · ${j.cleaner}` : ""}{j.price != null ? ` · ${eur(j.price)} HT` : ""}</div>
        {(j.tasks > 0 || j.photos > 0) && j.status !== "ouverte" && <div className="text-[12px] text-[var(--a-mute)]">{j.tasks > 0 ? `Tâches ${j.tasks_done}/${j.tasks}` : ""}{j.tasks > 0 && j.photos > 0 ? " · " : ""}{j.photos > 0 ? `${j.photos} photo${j.photos > 1 ? "s" : ""}` : ""}{j.redo ? " · reprise demandée" : ""}</div>}
        {j.status === "validee" && j.summary && j.ai_status === "ok" && <div className="mt-0.5 text-[12px] text-[var(--a-mute)]">Contrôle : {j.summary}</div>}
      </div>
      {pill(j)}
    </div>
  );
  // Ce qu'il reste à faire pour que tout tourne tout seul.
  const todo: { text: string; v: string }[] = [];
  if (!o.listings.length) todo.push({ text: "Ajoutez votre premier logement", v: "logements" });
  for (const l of o.listings) {
    if (!l.has_ical) todo.push({ text: `${l.name} : reliez son calendrier pour que les ménages se créent tout seuls`, v: "logements" });
    else if (l.last_sync_error) todo.push({ text: `${l.name} : le calendrier ne répond pas, vérifiez le lien`, v: "logements" });
    if (l.price == null) todo.push({ text: `${l.name} : tarif du ménage en attente chez ProClean (rien n'est publié avant)`, v: "logements" });
    if (l.linen_per_stay > 0 && l.linen_clean < l.linen_per_stay) todo.push({ text: `${l.name} : pas assez de linge propre (${l.linen_clean} sur ${l.linen_per_stay})`, v: "linge" });
    if (!l.has_guide) todo.push({ text: `${l.name} : faites la référence du logement (photos ou vidéo)`, v: "logements" });
  }
  return shell(
    <>
      <header className="mb-3">
        <span className="text-[26px] font-extrabold tracking-tight text-[var(--a-pri)]">ProClean</span>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">{o.name}</h1>
      </header>
      <nav aria-label="Rubriques" className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1">
        {VIEWS.map(([k, label]) => <Link key={k} href={href(k)} aria-current={view === k ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-extrabold ${view === k ? "bg-[var(--a-pri)] text-white" : "bg-[var(--a-card)] text-[var(--a-mute)]"}`}>{label}</Link>)}
      </nav>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}

      {view === "tableau" && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([["Aujourd'hui", String(s.in_progress), "ménage(s) en cours", "menages"], ["7 prochains jours", String(s.upcoming), "ménage(s) prévus", "menages"], ["Ce mois-ci", String(s.done_month), "ménage(s) faits", "menages"], ["Ce mois-ci", eur(s.spend_month), "HT de ménages", "menages"]] as [string, string, string, string][]).map(([l, v, sub, to], i) => (
              <Link key={i} href={href(to)} className={card}><div className="text-[12px] font-bold text-[var(--a-mute)]">{l}</div><div className="num mt-1 text-[26px] font-extrabold leading-none text-[var(--a-pri)]">{v}</div><div className="mt-1 text-[12px] text-[var(--a-mute)]">{sub}</div></Link>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Link href={href("logements")} className={card}><div className="num text-[20px] font-extrabold">{o.listings.filter((l) => l.has_ical).length}/{o.listings.length}</div><div className="text-[12px] text-[var(--a-mute)]">calendriers reliés</div></Link>
            <Link href={href("menages")} className={card}><div className={`num text-[20px] font-extrabold ${s.searching ? "text-[var(--a-warn)]" : ""}`}>{s.searching}</div><div className="text-[12px] text-[var(--a-mute)]">en recherche d&apos;un nettoyeur</div></Link>
            <Link href={href("menages")} className={card}><div className={`num text-[20px] font-extrabold ${s.redo_month ? "text-[var(--a-bad)]" : ""}`}>{s.redo_month}</div><div className="text-[12px] text-[var(--a-mute)]">reprise(s) ce mois-ci</div></Link>
          </div>

          <h2 className={h2}>À faire</h2>
          {!todo.length ? <p className={`${card} text-[15px] font-bold text-[var(--a-ok)]`}>Tout est en place : vos ménages se créent et se suivent tout seuls. ✔</p> : (
            <div className="space-y-2">{todo.slice(0, 8).map((t, i) => <Link key={i} href={href(t.v)} className={`${card} flex items-center justify-between gap-3 text-[14px] font-semibold`}><span>{t.text}</span><span className="shrink-0 text-[13px] font-extrabold text-[var(--a-pri)]">Ouvrir</span></Link>)}</div>
          )}

          <h2 className={h2}>Prochains ménages</h2>
          {!upcoming.length ? <p className={`${card} text-center text-[15px] text-[var(--a-mute)]`}>Aucun ménage prévu. Ils apparaissent dès qu&apos;une réservation arrive dans un calendrier relié.</p> : <div className="space-y-2">{upcoming.slice(0, 5).map(jobRow)}</div>}
          {upcoming.length > 5 && <Link href={href("menages")} className="mt-2 block text-center text-[14px] font-extrabold text-[var(--a-pri)]">Voir les {upcoming.length} ménages à venir</Link>}

          <h2 className={h2}>Prochains départs par logement</h2>
          {!o.listings.length ? <p className={`${card} text-center text-[15px] text-[var(--a-mute)]`}>Aucun logement.</p> : (
            <div className={`${card} divide-y divide-[var(--a-line)] !p-0`}>{o.listings.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-[14px]"><div className="min-w-0 flex-1"><b className="block truncate">{l.name}</b><span className="text-[12px] text-[var(--a-mute)]">{l.stays} réservation{l.stays > 1 ? "s" : ""} à venir · linge propre {l.linen_clean}</span></div><span className="shrink-0 text-right text-[13px] font-bold">{l.next_checkout ? dayFr(l.next_checkout) : <span className="font-normal text-[var(--a-mute)]">aucun départ connu</span>}</span></div>
            ))}</div>
          )}
        </>
      )}

      {view === "menages" && (
        <>
          <h2 className={h2}>À venir et en cours ({upcoming.length})</h2>
          {!upcoming.length ? <p className={`${card} text-center text-[15px] text-[var(--a-mute)]`}>Aucun ménage prévu.</p> : <div className="space-y-2">{upcoming.map(jobRow)}</div>}
          <h2 className={h2}>Faits (30 derniers jours)</h2>
          {!past.length ? <p className={`${card} text-center text-[15px] text-[var(--a-mute)]`}>Aucun ménage terminé pour l&apos;instant.</p> : <div className="space-y-2">{past.map(jobRow)}</div>}
          <p className="px-2 pt-4 text-center text-xs text-[var(--a-mute)]">Depuis le début : {s.done_total} ménage{s.done_total > 1 ? "s" : ""} fait{s.done_total > 1 ? "s" : ""} et contrôlé{s.done_total > 1 ? "s" : ""}.</p>
        </>
      )}

      {view === "logements" && (
        <div className="space-y-3">
          {o.listings.map((l) => { const g = guides.get(l.id); return (
            <details key={l.id} className={card}>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-extrabold">{l.name}</div>
                  <div className="text-[13px] text-[var(--a-mute)]">{l.city ?? ""} · {l.has_ical ? (l.last_sync_error ? "calendrier en erreur" : "calendrier relié") : "calendrier non relié"}{l.next_checkout ? ` · prochain départ ${dayFr(l.next_checkout)}` : ""}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                    <span className={`rounded-full px-2 py-0.5 ${l.price != null ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-warnbg)] text-[var(--a-warn)]"}`}>{l.price != null ? `Ménage ${eur(l.price)} HT` : "Tarif en attente (ProClean)"}</span>
                    <span className={`rounded-full px-2 py-0.5 ${l.has_guide ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{l.has_guide ? "Référence faite" : "Référence à faire"}</span>
                  </div>
                </div>
                <span className="text-[13px] font-extrabold text-[var(--a-pri)]">Ouvrir</span>
              </summary>
              <div className="mt-4 space-y-5 border-t border-[var(--a-line)] pt-4">
                {l.last_sync_error && <p className="rounded-2xl bg-[var(--a-badbg)] p-3 text-[13px] font-semibold text-[var(--a-bad)]">Le calendrier ne répond pas : {l.last_sync_error}. Vérifiez le lien.</p>}
                <section>
                  <b className="mb-1 block text-[15px]">Référence du logement ({l.ref_photos} image{l.ref_photos > 1 ? "s" : ""})</b>
                  <p className="mb-2 text-[13px] text-[var(--a-mute)]">Filmez ou photographiez le logement propre, une fois. L&apos;IA en tire le guide de ménage pour le nettoyeur et compare ensuite chaque ménage à cet état.</p>
                  <RefUpload listing={l.id} endpoint="/api/partenaire/photo" token={token} dark />
                  {l.ref_photos > 0 && <form action={partnerAnalyzeAction.bind(null, token, l.id)} className="mt-2"><button className="h-11 rounded-xl bg-[var(--a-pri)] px-4 text-sm font-extrabold text-white">{l.has_guide ? "Refaire le guide" : "Faire rédiger le guide par l'IA"}</button></form>}
                  {g && <div className="mt-3 rounded-2xl bg-[var(--a-bg)] p-3 text-[13px]">{g.summary && <p className="text-[var(--a-mute)]">{g.summary}</p>}{(g.rooms ?? []).map((r: any) => <div key={r.room} className="mt-1.5"><b>{r.room}</b><ul className="list-disc pl-5">{(r.steps ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>)}</div>}
                </section>
                <section>
                  <b className="mb-1 block text-[15px]">Pièces à photographier</b>
                  <p className="mb-2 text-[13px] text-[var(--a-mute)]">Le nettoyeur prend une photo avant et après de chaque pièce. Une pièce par ligne. Vide : les pièces du guide, sinon cuisine, séjour, chambre, salle de bain, WC.</p>
                  <form action={partnerRoomsAction.bind(null, token, l.id)} className="space-y-2"><textarea name="rooms" rows={5} defaultValue={(l.rooms ?? []).join("\n")} placeholder={"Cuisine\nSalon\nChambre 1\nChambre 2\nDouche\nWC"} className="w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-[15px]" /><button className="h-11 rounded-xl border border-[var(--a-pri)] px-4 text-sm font-extrabold text-[var(--a-pri)]">Enregistrer les pièces</button></form>
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
      )}

      {view === "linge" && (
        <>
          <p className="mb-3 text-[14px] text-[var(--a-mute)]">Le stock baisse à chaque ménage et remonte quand le livreur dépose du linge propre. Corrigez le nombre si vous déposez du linge vous-même.</p>
          {!o.listings.length ? <p className={`${card} text-center text-[15px] text-[var(--a-mute)]`}>Aucun logement.</p> : (
            <div className="space-y-2">{o.listings.map((l) => (
              <div key={l.id} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><b className="block truncate text-[16px]">{l.name}</b><span className="text-[13px] text-[var(--a-mute)]">{l.linen_clean} propre{l.linen_clean > 1 ? "s" : ""} · {l.linen_dirty} sale{l.linen_dirty > 1 ? "s" : ""} · {l.linen_per_stay} par séjour</span></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${l.linen_clean >= l.linen_per_stay ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-badbg)] text-[var(--a-bad)]"}`}>{l.linen_clean >= l.linen_per_stay ? `Assez pour ${l.linen_per_stay ? Math.floor(l.linen_clean / l.linen_per_stay) : "∞"} séjour(s)` : "À réapprovisionner"}</span>
                </div>
                <form action={partnerLinenAction.bind(null, token, l.id)} className="mt-3 flex items-end gap-2"><label className="flex-1"><span className={label}>Parures propres sur place</span><input name="clean" type="number" min={0} max={200} defaultValue={l.linen_clean} className={input} /></label><button className="h-11 rounded-xl border border-[var(--a-pri)] px-4 text-sm font-extrabold text-[var(--a-pri)]">Mettre à jour</button></form>
              </div>
            ))}</div>
          )}
        </>
      )}

      {view === "api" && (
        <div className={`${card} space-y-3 text-[14px]`}>
          <b className="block text-[16px]">Connecter votre logiciel</b>
          <p className="text-[var(--a-mute)]">Le plus simple est le lien de calendrier de chaque logement (rubrique Logements). Si votre logiciel n&apos;en propose pas, il peut nous envoyer les réservations directement avec une clé d&apos;API.</p>
          {fresh && <div className="rounded-2xl bg-[var(--a-okbg)] p-3"><b className="block text-[var(--a-ok)]">Votre clé (affichée une seule fois) :</b><input readOnly value={fresh} aria-label="Clé d'API" className="mt-1 w-full select-all rounded-lg border border-[var(--a-line)] bg-[var(--a-bg)] px-2 py-2 font-mono text-xs" /></div>}
          <form action={partnerApiKeyAction.bind(null, token)}><button className="h-11 rounded-xl border border-[var(--a-pri)] px-4 text-sm font-extrabold text-[var(--a-pri)]">{o.has_api_key ? "Créer une nouvelle clé (l'ancienne cesse de marcher)" : "Créer ma clé d'API"}</button></form>
          <details open={!!fresh}><summary className="cursor-pointer font-bold text-[var(--a-pri)]">Mode d&apos;emploi pour votre technicien</summary>
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
      )}
      <a href="/connexion?choisir=1" className="mt-6 block text-center text-[14px] font-bold text-[var(--a-mute)]">Changer d&apos;espace ou me déconnecter</a>
      <p className="px-2 pt-6 text-center text-xs text-[var(--a-mute)]">Ce lien est privé : il donne accès à vos logements et à vos consignes d&apos;accès. Ne le partagez pas.</p>
    </>
  );
}
