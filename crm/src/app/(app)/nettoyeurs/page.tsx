import Link from "next/link";
import { cookies } from "next/headers";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, isoWeekday, parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { approveCleanerAction, renewCleanerLinkAction, setCleanerStatusAction, toggleFavoriteAction, publishJobAction, publishAllJobsAction, cancelJobAction, validateJobAction, requestRedoAction, saveMarketplaceSettingsAction, createPayoutsAction, markPayoutPaidAction, setDepartureAction, sendControlAction, setLinenStatusAction, acceptBookingAction, refuseBookingAction } from "@/app/actions/nettoyeurs";
import { JOB_STATUS, LINEN_STEP, dayFr, eur, slot } from "@/lib/cleaner-ui";
import { aiConfigured } from "@/lib/ai-inspect";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nettoyeurs" };
const href = (t: string) => `/nettoyeurs?tab=${t}`;
const TABS = ["reservations", "demandes", "inscriptions", "nettoyeurs", "draps", "paiements", "reglages"];

/** Nettoyeurs indépendants : demandes à publier et à vérifier, inscriptions à valider, favoris, paiements et réglages des parts. */
export default async function CleanersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = TABS.includes(searchParams.tab ?? "") ? searchParams.tab! : "demandes";
  const sb = createClient();
  const today = parisToday();
  const [cl, jobs, fav, pay, set, clients, pub, photos, linen, staffRes, bookRes] = await Promise.all([
    sb.from("cleaners").select("*").order("created_at", { ascending: false }),
    sb.from("cleaning_jobs").select("*, cleaners(full_name), clients(name)").neq("status", "annulee").gte("job_date", addDays(today, -30)).order("job_date"),
    sb.from("cleaner_favorites").select("cleaner_id, client_id, cleaners(full_name), clients(name)"),
    sb.from("cleaning_payouts").select("*, cleaners(full_name, iban)").order("created_at", { ascending: false }).limit(60),
    sb.from("marketplace_settings").select("*").maybeSingle(),
    sb.from("clients").select("id, name").neq("status", "inactif").order("name"),
    sb.from("interventions").select("id, title, scheduled_date, clients(name)").like("source_key", "conc:%").is("staff_id", null).is("assignee", null).gte("scheduled_date", today).lte("scheduled_date", addDays(today, 30)).not("stage", "in", "(annulee,terminee,validee,facturable,facturee)").order("scheduled_date"),
    sb.from("cleaning_job_photos").select("id, job_id, kind").order("created_at"),
    sb.from("cleaning_linen").select("*, cleaning_jobs(title, job_date, cleaners(full_name))").order("updated_at", { ascending: false }).limit(60),
    sb.from("staff").select("id, full_name").eq("active", true).order("full_name"),
    sb.from("cleaning_bookings").select("*").order("created_at", { ascending: false }).limit(60)
  ]);
  if (cl.error) return (<><PageHeader title="Nettoyeurs" /><Card><Empty>Les nettoyeurs s&apos;installent : réessayez dans une minute.</Empty></Card></>);
  for (const r of [jobs, fav, pay, set, clients, pub]) if (r.error) throw new Error(r.error.message);
  const photoRows = (photos.error ? [] : (photos.data ?? [])) as any[], linenRows = (linen.error ? [] : (linen.data ?? [])) as any[], staffList = (staffRes.data ?? []) as any[];
  const bookings = (bookRes.error ? [] : (bookRes.data ?? [])) as any[], newBookings = bookings.filter((b) => b.status === "nouvelle");
  const linenOpen = linenRows.filter((l) => l.status !== "remis");
  const cleaners = (cl.data ?? []) as any[], J = (jobs.data ?? []) as any[], S = set.data as any;
  const taken = new Set(J.map((j) => j.intervention_id));
  const toPublish = ((pub.data ?? []) as any[]).filter((i) => !taken.has(i.id));
  const pending = cleaners.filter((c) => c.status === "en_attente"), active = cleaners.filter((c) => ["actif", "suspendu"].includes(c.status));
  const toCheck = J.filter((j) => j.status === "a_verifier");
  let fresh: { name: string; url: string; mailed: boolean } | null = null;
  try { fresh = JSON.parse(decodeURIComponent(cookies().get("cleaner_link")?.value ?? "null")); } catch { fresh = null; }
  const mon = addDays(today, 1 - isoWeekday(today));
  const lastMon = addDays(mon, -7), lastSun = addDays(mon, -1);
  const unpaid = new Map<string, { name: string; iban: boolean; n: number; sum: number }>();
  for (const j of J.filter((x) => x.status === "validee" && !x.payout_id && x.cleaner_id)) { const e = unpaid.get(j.cleaner_id) ?? { name: j.cleaners?.full_name ?? "", iban: !!cleaners.find((c) => c.id === j.cleaner_id)?.iban, n: 0, sum: 0 }; e.n++; e.sum += Number(j.cleaner_amount ?? 0); unpaid.set(j.cleaner_id, e); }
  const toPay = ((pay.data ?? []) as any[]).filter((p) => p.status === "a_payer");
  const tabs = [
    { href: href("reservations"), label: "Réservations", count: newBookings.length || null, active: tab === "reservations" },
    { href: href("demandes"), label: "Demandes", count: toCheck.length + toPublish.length || null, active: tab === "demandes" },
    { href: href("inscriptions"), label: "Inscriptions", count: pending.length || null, active: tab === "inscriptions" },
    { href: href("nettoyeurs"), label: "Nettoyeurs", count: active.length || null, active: tab === "nettoyeurs" },
    { href: href("draps"), label: "Draps", count: linenOpen.length || null, active: tab === "draps" },
    { href: href("paiements"), label: "Paiements", count: toPay.length || null, active: tab === "paiements" },
    { href: href("reglages"), label: "Réglages", count: null, active: tab === "reglages" }
  ];
  const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  return (
    <>
      <PageHeader title="Nettoyeurs" subtitle="Des indépendants font les ménages de vos Airbnb : ils acceptent, vous vérifiez, ils sont payés par virement." />
      <Tabs items={tabs} />
      {fresh && (
        <div className="mb-4 space-y-2 rounded-xl bg-secondary p-4 text-sm">
          <div className="font-medium text-foreground">Lien de {fresh.name} : affiché une seule fois{fresh.mailed ? " (envoyé aussi par e-mail)" : " (e-mail non envoyé : transmettez-le vous-même)"}</div>
          <input readOnly value={fresh.url} aria-label="Lien du nettoyeur" className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" />
        </div>
      )}

      {tab === "reservations" && (
        <Card>
          <CardHeader><CardTitle>Réservations de ménage ({newBookings.length} à traiter)</CardTitle><a href={`${origin}/reserver`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Page de réservation à partager</a></CardHeader>
          {!bookings.length ? <Empty>Aucune réservation. Partagez la page de réservation : un particulier ou un propriétaire demande un ménage en quelques clics.</Empty> : (
            <ul className="divide-y text-sm">{bookings.map((b) => (
              <li key={b.id} className="space-y-2 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2"><b className="font-medium">{b.name}</b><span className="text-muted-foreground">{b.email}{b.phone ? ` · ${b.phone}` : ""}</span><Badge tone={b.status === "nouvelle" ? "blue" : b.status === "acceptee" ? "green" : "gray"}>{b.status === "nouvelle" ? "Nouvelle" : b.status === "acceptee" ? "Acceptée" : "Refusée"}</Badge></div>
                <div className="text-xs text-muted-foreground">{({ studio: "Studio", t2: "2 pièces", t3: "3 pièces", maison: "Maison" } as Record<string, string>)[b.kind]} · {dayFr(b.job_date)} · {b.address}, {b.postal_code} {b.city} · {eur(b.price_ht)} HT{b.access_notes ? ` · accès : ${b.access_notes}` : ""}{b.note ? ` · ${b.note}` : ""}</div>
                {b.status === "nouvelle" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <form action={acceptBookingAction.bind(null, b.id)} className="flex flex-wrap items-center gap-2"><Input name="price_ht" inputMode="decimal" defaultValue={b.price_ht} aria-label="Prix HT" className="h-9 w-24" /><span className="text-xs text-muted-foreground">€ HT</span><Button size="sm">Accepter et publier aux nettoyeurs</Button></form>
                    <ConfirmAction action={refuseBookingAction.bind(null, b.id)} label="Refuser" size="sm" variant="ghost" title="Refuser cette réservation ?" description="Le client n'est pas prévenu automatiquement : écrivez-lui." confirmLabel="Refuser" />
                  </div>
                )}
              </li>
            ))}</ul>
          )}
        </Card>
      )}

      {tab === "demandes" && (
        <>
          <Card className="mb-4">
            <CardHeader><CardTitle>Ménages à publier ({toPublish.length})</CardTitle>
              {toPublish.length > 0 && <form action={publishAllJobsAction}><Button size="sm">Tout publier</Button></form>}</CardHeader>
            {!toPublish.length ? <Empty>Aucun ménage en attente : tous ceux des 30 prochains jours sont publiés ou ont un agent.</Empty> : (
              <ul className="divide-y text-sm">{toPublish.map((i: any) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5"><span className="min-w-0 flex-1"><b className="font-medium">{i.title}</b><span className="block text-xs text-muted-foreground">{dayFr(i.scheduled_date)} · {i.clients?.name}</span></span>
                  <form action={publishJobAction.bind(null, i.id)}><Button size="sm" variant="outline">Publier aux nettoyeurs</Button></form></li>
              ))}</ul>
            )}
          </Card>
          {toCheck.length > 0 && (
            <Card className="mb-4 border-amber-300">
              <CardHeader><CardTitle>À vérifier ({toCheck.length})</CardTitle></CardHeader>
              <ul className="divide-y text-sm">{toCheck.map((j) => {
                const ph = photoRows.filter((p) => p.job_id === j.id), rep = j.ai_report as any, bef = j.before_report as any;
                return (
                <li key={j.id} className="space-y-3 px-5 py-3">
                  <div><b className="font-medium">{j.title}</b> · {j.cleaners?.full_name} · {dayFr(j.job_date)} · {eur(j.cleaner_amount)} pour le nettoyeur</div>
                  {j.cleaner_note && <p className="rounded-md bg-muted p-2 text-xs">Mot du nettoyeur : {j.cleaner_note}</p>}
                  <div className={`rounded-md p-3 text-xs ${j.ai_status === "reprise" ? "bg-red-50 text-red-900" : j.ai_status === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-secondary"}`}>
                    <b className="block text-[13px]">Contrôle automatique : {j.ai_status === "ok" ? "rien à signaler" : j.ai_status === "reprise" ? "reprise demandée" : j.ai_status === "indisponible" ? "indisponible" : "en cours"}</b>
                    {rep?.summary && <p className="mt-0.5">{rep.summary}{rep.confidence ? ` (confiance ${rep.confidence})` : ""}</p>}
                    {Array.isArray(rep?.remaining) && rep.remaining.length > 0 && <ul className="mt-1 list-disc pl-4">{rep.remaining.map((r: any, i: number) => <li key={i}><b>{r.zone}</b> {r.why}</li>)}</ul>}
                    {Array.isArray(bef?.items) && bef.items.length > 0 && <p className="mt-1 text-muted-foreground">Relevé avant : {bef.items.map((x: any) => x.zone).join(", ")}</p>}
                    {j.ai_status === "indisponible" && !aiConfigured() && <p className="mt-0.5">L&apos;analyse par IA n&apos;est pas activée (clé manquante) : regardez les photos ci-dessous.</p>}
                  </div>
                  {ph.length > 0 && <div className="flex flex-wrap gap-2">{ph.map((p) => <a key={p.id} href={`/api/nettoyeurs/photo/${p.id}`} target="_blank" rel="noreferrer" className="block"><img src={`/api/nettoyeurs/photo/${p.id}`} alt={`Photo ${p.kind === "avant" ? "avant" : "après"}`} className="h-20 w-20 rounded-lg border object-cover" /><span className="block text-center text-[10px] text-muted-foreground">{p.kind === "avant" ? "avant" : "après"}</span></a>)}</div>}
                  <div className="flex flex-wrap items-start gap-3">
                    <form action={validateJobAction.bind(null, j.id)}><Button size="sm">Valider (le nettoyeur peut partir)</Button></form>
                    <form action={requestRedoAction.bind(null, j.id)} className="flex flex-wrap gap-2"><Input name="note" placeholder="Ce qu'il faut reprendre…" className="h-9 w-64" /><Button size="sm" variant="outline">Demander de repasser</Button></form>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 border-t pt-2">
                    {j.control_intervention_id ? <span className="text-xs text-muted-foreground">Contrôle sur place demandé à un agent.</span> : (
                      <form action={sendControlAction.bind(null, j.id)} className="flex flex-wrap items-center gap-2"><Select name="staff_id" required defaultValue="" className="h-9 w-48"><option value="" disabled>Agent à envoyer…</option>{staffList.map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</Select><Button size="sm" variant="outline">Envoyer vérifier sur place</Button></form>
                    )}
                    <form action={setDepartureAction.bind(null, j.id, "rester")}><Button size="sm" variant="ghost">Demander de rester</Button></form>
                    <form action={setDepartureAction.bind(null, j.id, "partir")}><Button size="sm" variant="ghost">Autoriser à partir</Button></form>
                  </div>
                </li>
              );})}</ul>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Demandes publiées</CardTitle></CardHeader>
            {!J.filter((j) => j.status !== "a_verifier").length ? <Empty>Aucune demande publiée.</Empty> : (
              <ul className="divide-y text-sm">{J.filter((j) => j.status !== "a_verifier").map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1"><b className="font-medium">{j.title}</b><span className="block text-xs text-muted-foreground">{dayFr(j.job_date)} · {slot(j.window_start, j.window_end)} · {j.clients?.name} · {j.city} · {eur(j.price_ht)} HT{j.cleaners?.full_name ? ` · ${j.cleaners.full_name}` : ""}{j.review_note ? ` · à reprendre : ${j.review_note}` : ""}</span></span>
                  <Badge tone={j.status === "ouverte" ? "blue" : j.status === "validee" ? "green" : j.status === "a_reprendre" ? "red" : "orange"}>{JOB_STATUS[j.status]}</Badge>
                  {["ouverte", "acceptee", "a_reprendre"].includes(j.status) && <ConfirmAction action={cancelJobAction.bind(null, j.id)} label="Retirer" size="sm" variant="ghost" title="Retirer ce ménage ?" description="Le ménage n'est plus proposé et le nettoyeur éventuel est prévenu en ne le voyant plus." confirmLabel="Retirer" />}
                </li>
              ))}</ul>
            )}
          </Card>
        </>
      )}

      {tab === "inscriptions" && (
        <Card>
          <CardHeader><CardTitle>Inscriptions à valider ({pending.length})</CardTitle><a href={`${origin}/nettoyeur/inscription`} className="text-xs font-semibold text-primary hover:underline" target="_blank" rel="noreferrer">Page d&apos;inscription à partager</a></CardHeader>
          {!pending.length ? <Empty>Aucune inscription en attente. Partagez la page d&apos;inscription pour recruter.</Empty> : (
            <ul className="divide-y text-sm">{pending.map((c) => (
              <li key={c.id} className="space-y-2 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2"><b className="font-medium">{c.full_name}</b><span className="text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span><Badge tone="gray">{({ etudiant: "Étudiant", auto_entrepreneur: "Auto-entrepreneur", entreprise: "Entreprise" } as Record<string, string>)[c.statut_pro]}</Badge></div>
                <div className="text-xs text-muted-foreground">Départements : {c.departments.join(", ")}{c.city ? ` · ${c.city}` : ""} · SIRET : {c.siret ? <a className="inline-flex items-center gap-0.5 text-primary underline" href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${c.siret}`} target="_blank" rel="noreferrer">{c.siret} <ExternalLink className="h-3 w-3" /></a> : <b className="text-amber-700">non renseigné (obligatoire pour être payé)</b>}</div>
                <div className="flex gap-2">
                  <ConfirmAction action={approveCleanerAction.bind(null, c.id)} label="Valider et envoyer le lien" size="sm" title={`Valider ${c.full_name} ?`} description="Vérifiez le SIRET (lien ci-dessus). Un lien personnel est créé et envoyé par e-mail." confirmLabel="Valider" />
                  <ConfirmAction action={setCleanerStatusAction.bind(null, c.id, "refuse")} label="Refuser" size="sm" variant="ghost" title="Refuser cette inscription ?" confirmLabel="Refuser" />
                </div>
              </li>
            ))}</ul>
          )}
        </Card>
      )}

      {tab === "nettoyeurs" && (
        <>
          <Card className="mb-4">
            <CardHeader><CardTitle>Nettoyeurs ({active.length})</CardTitle></CardHeader>
            {!active.length ? <Empty>Aucun nettoyeur actif.</Empty> : (
              <ul className="divide-y text-sm">{active.map((c) => {
                const mine = J.filter((j) => j.cleaner_id === c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1"><b className="font-medium">{c.full_name}</b> {c.status === "suspendu" && <Badge tone="red">Suspendu</Badge>}<span className="block text-xs text-muted-foreground">{c.email} · {c.departments.join(", ")} · {mine.filter((j) => j.status === "validee").length} validé(s) · IBAN {c.iban ? "renseigné" : <b className="text-amber-700">manquant</b>}</span></span>
                    {c.status === "actif" ? (<>
                      <ConfirmAction action={renewCleanerLinkAction.bind(null, c.id)} label="Nouveau lien" size="sm" variant="outline" title="Créer un nouveau lien ?" description="L'ancien lien cesse de fonctionner. Le nouveau est envoyé par e-mail et affiché ici une fois." confirmLabel="Créer" />
                      <ConfirmAction action={setCleanerStatusAction.bind(null, c.id, "suspendu")} label="Suspendre" size="sm" variant="ghost" title={`Suspendre ${c.full_name} ?`} description="Son lien est coupé et ses ménages à venir non commencés sont remis en ligne." confirmLabel="Suspendre" />
                    </>) : <ConfirmAction action={setCleanerStatusAction.bind(null, c.id, "actif")} label="Réactiver" size="sm" variant="outline" title="Réactiver ce compte ?" description="Un nouveau lien devra lui être envoyé." confirmLabel="Réactiver" />}
                  </li>
                );
              })}</ul>
            )}
          </Card>
          <Card>
            <CardHeader><CardTitle>Favoris des propriétaires</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Un favori voit d&apos;abord les ménages de ce propriétaire, pendant {S?.priority_minutes ?? 120} minutes, avant tout le monde.</p>
              <form action={toggleFavoriteAction} className="flex flex-wrap items-end gap-2">
                <Field label="Propriétaire"><Select name="client_id" required defaultValue="" className="h-9 w-56"><option value="" disabled>Choisir…</option>{((clients.data ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                <Field label="Nettoyeur favori"><Select name="cleaner_id" required defaultValue="" className="h-9 w-56"><option value="" disabled>Choisir…</option>{active.filter((c) => c.status === "actif").map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
                <Button size="sm">Ajouter</Button>
              </form>
              {!((fav.data ?? []) as any[]).length ? <p className="text-muted-foreground">Aucun favori pour le moment.</p> : (
                <ul className="divide-y rounded-lg border">{((fav.data ?? []) as any[]).map((f) => (
                  <li key={`${f.cleaner_id}${f.client_id}`} className="flex items-center justify-between gap-3 px-3 py-2"><span><b className="font-medium">{f.clients?.name}</b> → {f.cleaners?.full_name}</span>
                    <form action={toggleFavoriteAction}><input type="hidden" name="cleaner_id" value={f.cleaner_id} /><input type="hidden" name="client_id" value={f.client_id} /><input type="hidden" name="remove" value="1" /><Button size="sm" variant="ghost">Retirer</Button></form></li>
                ))}</ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "draps" && (
        <Card>
          <CardHeader><CardTitle>Suivi des draps ({linenOpen.length} en cours)</CardTitle></CardHeader>
          {!linenRows.length ? <Empty>Aucun linge suivi pour l&apos;instant : il apparaît quand un nettoyeur termine un ménage.</Empty> : (
            <ul className="divide-y text-sm">{linenRows.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1"><b className="font-medium">{l.cleaning_jobs?.title}</b><span className="block text-xs text-muted-foreground">{l.cleaning_jobs?.cleaners?.full_name} · {dayFr(l.cleaning_jobs?.job_date)}{l.method ? ` · ${l.method === "poste" ? "poste" : "livreur"}` : ""}{l.tracking ? ` · suivi ${l.tracking}` : ""}</span></span>
                <Badge tone={l.status === "remis" ? "green" : l.status === "renvoye" || l.status === "recupere" ? "blue" : "orange"}>{LINEN_STEP[l.status]}</Badge>
                {l.status === "depose" && <form action={setLinenStatusAction.bind(null, l.job_id, "lave")}><Button size="sm" variant="outline">Marquer lavé</Button></form>}
                {l.status === "lave" && <form action={setLinenStatusAction.bind(null, l.job_id, "renvoye")}><Button size="sm" variant="outline">Marquer renvoyé</Button></form>}
              </li>
            ))}</ul>
          )}
        </Card>
      )}

      {tab === "paiements" && (
        <>
          <Card className="mb-4">
            <CardHeader><CardTitle>À payer (ménages validés)</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!unpaid.size ? <p className="text-muted-foreground">Aucun ménage validé en attente de paiement.</p> : (
                <ul className="divide-y rounded-lg border">{[...unpaid.values()].map((u) => (
                  <li key={u.name} className="flex items-center justify-between gap-3 px-3 py-2"><span><b className="font-medium">{u.name}</b> · {u.n} ménage{u.n > 1 ? "s" : ""}{!u.iban && <b className="ml-2 text-amber-700">IBAN manquant</b>}</span><b className="num">{eur(u.sum)}</b></li>
                ))}</ul>
              )}
              <form action={createPayoutsAction} className="flex flex-wrap items-end gap-2">
                <Field label="Du"><Input name="start" type="date" defaultValue={lastMon} className="h-9" /></Field>
                <Field label="Au"><Input name="end" type="date" defaultValue={lastSun} className="h-9" /></Field>
                <Button size="sm" disabled={!unpaid.size}>Créer les paiements</Button>
                <span className="text-xs text-muted-foreground">Chaque début de semaine, ou en fin de mois : tous les ménages validés jusqu&apos;à la fin de la période sont regroupés.</span>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Paiements ({toPay.length} à régler)</CardTitle>{toPay.length > 0 && <a href="/api/nettoyeurs/virements" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Download className="h-3.5 w-3.5" /> Fichier de virements (CSV)</a>}</CardHeader>
            {!((pay.data ?? []) as any[]).length ? <Empty>Aucun paiement créé.</Empty> : (
              <ul className="divide-y text-sm">{((pay.data ?? []) as any[]).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5"><span className="min-w-0 flex-1"><b className="font-medium">{p.cleaners?.full_name}</b><span className="block text-xs text-muted-foreground">{formatDate(p.period_start)} → {formatDate(p.period_end)} · {p.jobs} ménage{p.jobs > 1 ? "s" : ""}{!p.cleaners?.iban && p.status === "a_payer" ? " · IBAN manquant" : ""}</span></span>
                  <b className="num">{eur(p.amount)}</b>
                  {p.status === "a_payer" ? <ConfirmAction action={markPayoutPaidAction.bind(null, p.id)} label="Marquer payé" size="sm" variant="outline" title="Marquer comme payé ?" description={`Confirmez que le virement de ${eur(p.amount)} à ${p.cleaners?.full_name} est parti.`} confirmLabel="Payé" /> : <Badge tone="green">Payé le {formatDate(p.paid_on)}</Badge>}</li>
              ))}</ul>
            )}
          </Card>
        </>
      )}

      {tab === "reglages" && S && (
        <Card>
          <CardHeader><CardTitle>Parts et créneau</CardTitle></CardHeader>
          <CardContent>
            <form action={saveMarketplaceSettingsAction} className="grid gap-3 sm:grid-cols-3">
              <Field label="Part du nettoyeur (%)" hint="Entre 50 et 90"><Input name="cleaner_pct" inputMode="decimal" defaultValue={S.cleaner_pct} /></Field>
              <Field label="Part de l'application (%)"><Input name="platform_pct" inputMode="decimal" defaultValue={S.platform_pct} /></Field>
              <Field label="Draps et logistique (%)" hint="Lavage, envoi, retour : les trois parts font 100 %"><Input name="logistics_pct" inputMode="decimal" defaultValue={S.logistics_pct} /></Field>
              <Field label="Début du créneau"><Input name="window_start" type="time" defaultValue={String(S.window_start).slice(0, 5)} /></Field>
              <Field label="Fin prévue"><Input name="window_end" type="time" defaultValue={String(S.window_end).slice(0, 5)} /></Field>
              <Field label="Fin au plus tard"><Input name="max_end" type="time" defaultValue={String(S.max_end).slice(0, 5)} /></Field>
              <Field label="Priorité aux favoris (minutes)" hint="0 = pas de priorité"><Input name="priority_minutes" inputMode="numeric" defaultValue={S.priority_minutes} /></Field>
              <Field label="Prix client : studio (€ HT)"><Input name="price_studio" inputMode="decimal" defaultValue={S.price_studio} /></Field>
              <Field label="2 pièces (€ HT)"><Input name="price_t2" inputMode="decimal" defaultValue={S.price_t2} /></Field>
              <Field label="3 pièces (€ HT)"><Input name="price_t3" inputMode="decimal" defaultValue={S.price_t3} /></Field>
              <Field label="Maison (€ HT)" className="sm:col-span-3"><Input name="price_maison" inputMode="decimal" defaultValue={S.price_maison} /></Field>
              <label className="flex items-start gap-2 text-sm sm:col-span-3"><input type="checkbox" name="auto_publish" defaultChecked={S.auto_publish} className="mt-1" /><span><b className="font-medium">Publier automatiquement</b> les ménages à venir (30 jours) qui ont un prix et une adresse, chaque jour à 18 h.</span></label>
              <label className="flex items-start gap-2 text-sm sm:col-span-3"><input type="checkbox" name="auto_payout" defaultChecked={S.auto_payout} className="mt-1" /><span><b className="font-medium">Créer automatiquement les paiements</b> chaque lundi pour la semaine passée. Le virement reste à faire (ou à valider) par vous : je ne vire jamais d&apos;argent seul.</span></label>
              <label className="flex items-start gap-2 text-sm sm:col-span-3"><input type="checkbox" name="require_photos" defaultChecked={S.require_photos} className="mt-1" /><span><b className="font-medium">Exiger une photo avant et une photo après</b> pour terminer un ménage.</span></label>
              <p className="text-xs text-muted-foreground sm:col-span-3">Contrôle des photos par l&apos;IA : {aiConfigured() ? "activé." : "pas encore activé (clé ANTHROPIC_API_KEY manquante dans Vercel). Sans clé, les photos arrivent chez vous sans analyse."}</p>
              <div className="sm:col-span-3"><Button>Enregistrer</Button> <span className="ml-2 text-xs text-muted-foreground">S&apos;applique aux prochains ménages publiés ; ceux déjà publiés gardent leurs montants.</span></div>
            </form>
          </CardContent>
        </Card>
      )}
      <p className="mt-6 max-w-3xl text-xs text-muted-foreground">Les nettoyeurs travaillent en indépendants : ils choisissent leurs ménages et n&apos;ont ni horaires ni méthode imposés. Faites relire les conditions par votre expert-comptable avant les premiers paiements réels.</p>
    </>
  );
}
