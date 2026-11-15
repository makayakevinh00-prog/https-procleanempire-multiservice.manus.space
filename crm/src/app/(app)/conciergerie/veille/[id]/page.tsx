import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { addImprovementAction, addMarketPriceAction, addPricePeriodAction, addReviewAction, deleteWatchRowAction, saveListingWatchAction, setImprovementStatusAction } from "@/app/actions/conciergerie";
import { TOPICS, TOPIC_KEYS, expectedRevenue, isTopic, marketAverage, occupancy, priceAdvice, priceOn, reviewSummary, type PricePeriod } from "@/lib/concierge/veille";
import { parisToday } from "@/lib/domain/dates";
import { formatDate, formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Veille du logement" };

const TONE = { hausse: "border-emerald-300 bg-emerald-50 text-emerald-900", baisse: "border-amber-300 bg-amber-50 text-amber-900", ok: "border-slate-200 bg-slate-50 text-slate-800", info: "border-slate-200 bg-slate-50 text-slate-600" } as const;
const PRIO = { haute: "red", normale: "orange", basse: "gray" } as const;

/** Veille d'un logement : à combien il est aujourd'hui, les prix par période, le marché, l'occupation, les avis et ce qu'il faut améliorer. */
export default async function ListingWatchPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const sb = createClient(), id = params.id;
  const { data: l } = await sb.from("concierge_listings").select("*, clients(name)").eq("id", id).maybeSingle();
  if (!l) notFound();
  const [prices, market, reviews, improvements, stays] = await Promise.all([
    sb.from("listing_prices").select("*").eq("listing_id", id).order("start_date"),
    sb.from("listing_market").select("*").eq("listing_id", id).order("seen_on", { ascending: false }).limit(40),
    sb.from("listing_reviews").select("*").eq("listing_id", id).order("review_date", { ascending: false }).limit(60),
    sb.from("listing_improvements").select("*").eq("listing_id", id).order("created_at", { ascending: false }),
    sb.from("concierge_stays").select("check_in, check_out, cancelled, summary").eq("listing_id", id).order("check_in")
  ]);
  // Tant que la base n'a pas reçu la mise à jour, la page l'explique au lieu de planter.
  const pending = !!prices.error;
  const today = parisToday();
  const ps = (prices.data ?? []) as PricePeriod[], base = (l as any).base_price != null ? Number((l as any).base_price) : null;
  const st = (stays.data ?? []) as any[];
  const now = priceOn(today, ps, base), occ30 = occupancy(st, today, 30), occ90 = occupancy(st, today, 90);
  const mk = marketAverage((market.data ?? []) as any[], today), rv = reviewSummary(((reviews.data ?? []) as any[]).map((r) => ({ rating: r.rating != null ? Number(r.rating) : null, topics: r.topics ?? [] })));
  const advice = priceAdvice({ price: now.price, occupancyPct: occ30.pct, marketAvg: mk.avg });
  const todo = ((improvements.data ?? []) as any[]).filter((i) => i.status !== "fait"), doneList = ((improvements.data ?? []) as any[]).filter((i) => i.status === "fait");
  const upcoming = st.filter((s) => !s.cancelled && s.check_out >= today).slice(0, 8);
  const del = (table: "listing_prices" | "listing_market" | "listing_reviews" | "listing_improvements", rowId: string) => deleteWatchRowAction.bind(null, id, table, rowId);
  const tile = "rounded-xl border bg-white p-4";
  return (
    <>
      <PageHeader title={`Veille — ${l.name}`} subtitle={`${(l as any).clients?.name ?? "Propriétaire"} · prix, occupation, marché, avis et améliorations de ce logement.`}
        actions={<Link href="/conciergerie?tab=logements"><Button variant="outline">← Logements</Button></Link>} />
      {searchParams.error && <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{searchParams.ok}</div>}
      {pending && <div role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">La veille n&apos;est pas encore activée : il reste à coller le texte de mise à jour dans la base de données (fichier « base-à-coller »). L&apos;occupation ci-dessous fonctionne déjà.</div>}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className={tile}><div className="text-xs font-medium text-muted-foreground">Prix de cette nuit</div><div className="mt-1 text-2xl font-bold">{now.price != null ? formatEUR(now.price) : "—"}</div><div className="text-xs text-muted-foreground">{now.label}</div></div>
        <div className={tile}><div className="text-xs font-medium text-muted-foreground">Occupation, 30 prochains jours</div><div className="mt-1 text-2xl font-bold">{occ30.pct} %</div><div className="text-xs text-muted-foreground">{occ30.nights} nuit(s) sur 30 · {occ90.pct} % sur 90 jours</div></div>
        <div className={tile}><div className="text-xs font-medium text-muted-foreground">Marché (logements comparables)</div><div className="mt-1 text-2xl font-bold">{mk.avg != null ? formatEUR(mk.avg) : "—"}</div><div className="text-xs text-muted-foreground">{mk.count ? `moyenne de ${mk.count} relevé(s) récents` : "aucun relevé récent"}</div></div>
        <div className={tile}><div className="text-xs font-medium text-muted-foreground">Avis des voyageurs</div><div className="mt-1 text-2xl font-bold">{rv.avg != null ? `${String(rv.avg).replace(".", ",")} / 5` : "—"}</div><div className="text-xs text-muted-foreground">{rv.count} avis saisi(s)</div></div>
      </div>
      <div className={`mb-4 rounded-md border p-3 text-sm ${TONE[advice.tone]}`}><b>Conseil de prix : </b>{advice.text}{now.price != null && ` Recette prévue des nuits déjà réservées sur 30 jours : ${formatEUR(expectedRevenue(st, ps, base, today, 30))}.`}</div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Prix par période</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <form action={saveListingWatchAction.bind(null, id)} className="grid gap-3 sm:grid-cols-3">
              <Field label="Prix de base (€ / nuit)"><Input name="base_price" inputMode="decimal" defaultValue={base ?? ""} /></Field>
              <Field label="Lien de l'annonce" className="sm:col-span-2"><Input name="public_url" placeholder="https://www.airbnb.fr/rooms/…" defaultValue={(l as any).public_url ?? ""} /></Field>
              <div className="sm:col-span-3 flex items-center gap-3"><Button size="sm" variant="outline">Enregistrer</Button>{(l as any).public_url && <a href={(l as any).public_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ouvrir l&apos;annonce →</a>}</div>
            </form>
            {!ps.length ? <p className="text-muted-foreground">Aucune période : le prix de base s&apos;applique toute l&apos;année.</p> : (
              <ul className="divide-y">{ps.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1"><b>{p.label}</b><span className="block text-xs text-muted-foreground">du {formatDate(p.start_date)} au {formatDate(p.end_date)}{p.min_nights ? ` · ${p.min_nights} nuit(s) minimum` : ""}{p.note ? ` · ${p.note}` : ""}</span></span>
                  <b>{formatEUR(p.price)}</b>{p.start_date <= today && today <= p.end_date && <Badge tone="green">en cours</Badge>}
                  <ConfirmAction action={del("listing_prices", p.id)} label="Supprimer" variant="ghost" size="sm" title="Supprimer cette période ?" confirmLabel="Supprimer" />
                </li>))}</ul>
            )}
            <form action={addPricePeriodAction.bind(null, id)} className="grid gap-3 border-t pt-3 sm:grid-cols-4">
              <Field label="Nom de la période" className="sm:col-span-2"><Input name="label" placeholder="Vacances de Noël" required /></Field>
              <Field label="Du"><Input name="start_date" type="date" required /></Field>
              <Field label="Au"><Input name="end_date" type="date" required /></Field>
              <Field label="Prix (€ / nuit)"><Input name="price" inputMode="decimal" required /></Field>
              <Field label="Nuits minimum"><Input name="min_nights" inputMode="numeric" /></Field>
              <Field label="Note" className="sm:col-span-2"><Input name="note" placeholder="Salon, événement, week-end…" /></Field>
              <div className="sm:col-span-4"><Button size="sm">Ajouter la période</Button></div>
            </form>
            <p className="text-xs text-muted-foreground">Le CRM garde votre grille de prix et vous conseille, mais il ne peut pas changer le prix sur Airbnb : reportez-le dans le calendrier Airbnb.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Marché : logements comparables</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!(market.data ?? []).length ? <p className="text-muted-foreground">Relevez de temps en temps le prix de 3 à 5 logements comparables du quartier : la moyenne s&apos;affiche en haut et sert au conseil de prix.</p> : (
              <ul className="divide-y">{((market.data ?? []) as any[]).slice(0, 12).map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">{m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{m.label}</a> : <b>{m.label}</b>}<span className="block text-xs text-muted-foreground">relevé le {formatDate(m.seen_on)}{m.note ? ` · ${m.note}` : ""}</span></span>
                  <b>{formatEUR(m.price)}</b>
                  <ConfirmAction action={del("listing_market", m.id)} label="Supprimer" variant="ghost" size="sm" title="Supprimer ce relevé ?" confirmLabel="Supprimer" />
                </li>))}</ul>
            )}
            <form action={addMarketPriceAction.bind(null, id)} className="grid gap-3 border-t pt-3 sm:grid-cols-4">
              <Field label="Logement comparé" className="sm:col-span-2"><Input name="label" placeholder="T2 même rue, 4 voyageurs" required /></Field>
              <Field label="Prix (€ / nuit)"><Input name="price" inputMode="decimal" required /></Field>
              <Field label="Relevé le"><Input name="seen_on" type="date" defaultValue={today} /></Field>
              <Field label="Lien (facultatif)" className="sm:col-span-4"><Input name="url" placeholder="https://…" /></Field>
              <div className="sm:col-span-4"><Button size="sm" variant="outline">Ajouter le relevé</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Avis des voyageurs</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {rv.weak.length > 0 && <div className="rounded-md bg-amber-50 p-3 text-amber-900"><b>À améliorer d&apos;après les avis faibles : </b>{rv.weak.map((w) => `${TOPICS[w.topic]} (${w.count})`).join(", ")}.</div>}
            {!(reviews.data ?? []).length ? <p className="text-muted-foreground">Recopiez ici les avis reçus sur Airbnb ou Booking, avec leur note et le sujet : le CRM en tire ce qu&apos;il faut améliorer.</p> : (
              <ul className="divide-y">{((reviews.data ?? []) as any[]).slice(0, 15).map((r) => (
                <li key={r.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2"><b>{r.rating != null ? `${String(Number(r.rating)).replace(".", ",")} / 5` : "sans note"}</b><span className="text-xs text-muted-foreground">{r.guest ? `${r.guest} · ` : ""}{formatDate(r.review_date)} · {r.source}</span>
                    {(r.topics ?? []).filter(isTopic).map((t: any) => <Badge key={t} tone="gray">{TOPICS[t as keyof typeof TOPICS]}</Badge>)}
                    <span className="ml-auto"><ConfirmAction action={del("listing_reviews", r.id)} label="Supprimer" variant="ghost" size="sm" title="Supprimer cet avis ?" confirmLabel="Supprimer" /></span></div>
                  {r.comment && <p className="mt-1 text-slate-700">{r.comment}</p>}
                </li>))}</ul>
            )}
            <form action={addReviewAction.bind(null, id)} className="grid gap-3 border-t pt-3 sm:grid-cols-4">
              <Field label="Note (1 à 5)"><Input name="rating" inputMode="decimal" placeholder="4,5" /></Field>
              <Field label="Voyageur"><Input name="guest" /></Field>
              <Field label="Date"><Input name="review_date" type="date" defaultValue={today} /></Field>
              <Field label="Site"><Select name="source" defaultValue="airbnb"><option value="airbnb">Airbnb</option><option value="booking">Booking</option><option value="autre">Autre</option></Select></Field>
              <Field label="Commentaire" className="sm:col-span-4"><Textarea name="comment" className="min-h-[60px]" /></Field>
              <fieldset className="sm:col-span-4"><legend className="mb-1 text-sm font-medium">De quoi parle l&apos;avis ?</legend><div className="flex flex-wrap gap-3">{TOPIC_KEYS.map((t) => <label key={t} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="topics" value={t} />{TOPICS[t]}</label>)}</div></fieldset>
              <div className="sm:col-span-4"><Button size="sm" variant="outline">Ajouter l&apos;avis</Button></div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Améliorations du logement ({todo.length} à faire)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!todo.length ? <p className="text-muted-foreground">Rien à faire pour l&apos;instant. Notez ici ce qui manque ou ce que les voyageurs signalent (équipement, literie, photos de l&apos;annonce…).</p> : (
              <ul className="divide-y">{todo.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1"><b>{i.title}</b><span className="block text-xs text-muted-foreground">{i.detail ?? ""}{i.cost != null ? `${i.detail ? " · " : ""}coût estimé ${formatEUR(i.cost)}` : ""}</span></span>
                  <Badge tone={PRIO[i.priority as keyof typeof PRIO] ?? "gray"}>{i.priority}</Badge>
                  {i.status === "a_faire" && <form action={setImprovementStatusAction.bind(null, id, i.id, "en_cours")}><Button size="sm" variant="ghost">En cours</Button></form>}
                  <form action={setImprovementStatusAction.bind(null, id, i.id, "fait")}><Button size="sm" variant="outline">Fait</Button></form>
                  <ConfirmAction action={del("listing_improvements", i.id)} label="Supprimer" variant="ghost" size="sm" title="Supprimer cette amélioration ?" confirmLabel="Supprimer" />
                </li>))}</ul>
            )}
            {doneList.length > 0 && <p className="text-xs text-muted-foreground">Déjà fait : {doneList.slice(0, 8).map((i) => i.title).join(" · ")}</p>}
            <form action={addImprovementAction.bind(null, id)} className="grid gap-3 border-t pt-3 sm:grid-cols-4">
              <Field label="Amélioration" className="sm:col-span-2"><Input name="title" placeholder="Changer le matelas" required /></Field>
              <Field label="Priorité"><Select name="priority" defaultValue="normale"><option value="haute">Haute</option><option value="normale">Normale</option><option value="basse">Basse</option></Select></Field>
              <Field label="Coût estimé (€)"><Input name="cost" inputMode="decimal" /></Field>
              <Field label="Détail" className="sm:col-span-4"><Input name="detail" /></Field>
              <div className="sm:col-span-4"><Button size="sm" variant="outline">Ajouter</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Prochaines réservations</CardTitle></CardHeader>
        {!upcoming.length ? <Empty>Aucune réservation à venir enregistrée pour ce logement.</Empty> : (
          <ul className="divide-y text-sm">{upcoming.map((s, k) => (
            <li key={k} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><span>{s.summary ?? "Réservation"}</span><span className="text-muted-foreground">du {formatDate(s.check_in)} au {formatDate(s.check_out)} · {priceOn(s.check_in, ps, base).price != null ? `${formatEUR(priceOn(s.check_in, ps, base).price)} la nuit` : "prix non renseigné"}</span></li>
          ))}</ul>
        )}
      </Card>
    </>
  );
}
