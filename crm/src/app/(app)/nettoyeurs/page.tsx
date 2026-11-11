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
import { approveCleanerAction, renewCleanerLinkAction, setCleanerStatusAction, toggleFavoriteAction, publishJobAction, publishAllJobsAction, cancelJobAction, validateJobAction, requestRedoAction, saveMarketplaceSettingsAction, createPayoutsAction, markPayoutPaidAction, setDepartureAction, sendControlAction, setLinenStatusAction, acceptBookingAction, refuseBookingAction, createManualJobAction } from "@/app/actions/nettoyeurs";
import { JOB_STATUS, LINEN_STEP, dayFr, eur, slot } from "@/lib/cleaner-ui";
import { aiConfigured } from "@/lib/ai-inspect";
import { formatDate } from "@/lib/utils";
import { LiveMapLazy } from "@/components/crm/live-map-lazy";
import { LiveRefreshBadge } from "@/components/crm/live-refresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nettoyeurs" };
const href = (t: string) => `/nettoyeurs?tab=${t}`;
const TABS = ["carte", "direct", "reservations", "demandes", "inscriptions", "nettoyeurs", "draps", "paiements", "reglages"];

/** Nettoyeurs indépendants : demandes à publier et à vérifier, inscriptions à valider, favoris, paiements et réglages des parts. */
export default async function CleanersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = TABS.includes(searchParams.tab ?? "") ? searchParams.tab! : "carte";
  const sb = createClient();
  const today = parisToday();
  const [cl, jobs, fav, pay, set, clients, pub, photos, linen, staffRes, bookRes] = await Promise.all([
    sb.from("cleaners").select("*").order("created_at", { ascending: false }),
    sb.from("cleaning_jobs").select("*, cleaners!cleaning_jobs_cleaner_id_fkey(full_name), clients(name)").neq("status", "annulee").gte("job_date", addDays(today, -30)).order("job_date"),
    sb.from("cleaner_favorites").select("cleaner_id, client_id, cleaners(full_name), clients(name)"),
    sb.from("cleaning_payouts").select("*, cleaners(full_name, iban)").order("created_at", { ascending: false }).limit(60),
    sb.from("marketplace_settings").select("*").maybeSingle(),
    sb.from("clients").select("id, name").neq("status", "inactif").order("name"),
    sb.from("interventions").select("id, title, scheduled_date, clients(name)").like("source_key", "conc:%").is("staff_id", null).is("assignee", null).gte("scheduled_date", today).lte("scheduled_date", addDays(today, 30)).not("stage", "in", "(annulee,terminee,validee,facturable,facturee)").order("scheduled_date"),
    sb.from("cleaning_job_photos").select("id, job_id, kind").order("created_at"),
    sb.from("cleaning_linen").select("*, cleaning_jobs(title, job_date, cleaners!cleaning_jobs_cleaner_id_fkey(full_name))").order("updated_at", { ascending: false }).limit(60),
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
    { href: href("carte"), label: "Carte en direct", count: null, active: tab === "carte" },
    { href: href("direct"), label: "En direct", count: J.filter((j) => j.status === "ouverte").length || null, active: tab === "direct" },
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

      {tab === "carte" && (() => {
        const ago = (iso: string | null) => { if (!iso) return "jamais vu"; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`; };
        const fresh = (c: any) => c.last_lat != null && c.last_seen_at && Date.now() - Date.parse(c.last_seen_at) < 10 * 60000;
        const pos = (c: any) => (fresh(c) ? { lat: c.last_lat as number, lng: c.last_lng as number } : c.lat != null ? { lat: c.lat as number, lng: c.lng as number } : null);
        const live = J.filter((j) => ["ouverte", "acceptee", "a_verifier", "a_reprendre"].includes(j.status) && j.job_date >= today && j.lat != null);
        const mapCleaners = cleaners.filter((c) => c.status === "actif" && pos(c)).map((c) => {
          const mine = live.find((j) => j.cleaner_id === c.id && ["acceptee", "a_reprendre"].includes(j.status));
          return { id: c.id, name: c.full_name, ...pos(c)!, online: !!c.online, live: fresh(c), seen: ago(c.last_seen_at), goingTo: mine ? { lat: mine.lat, lng: mine.lng, title: mine.title } : null };
        });
        const mapJobs = live.map((j) => ({ id: j.id, lat: j.lat, lng: j.lng, title: j.title, sub: `${dayFr(j.job_date)} · ${j.city ?? ""} · ${JOB_STATUS[j.status] ?? j.status}${j.cleaners?.full_name ? ` · ${j.cleaners.full_name}` : ""}`, status: (j.status === "a_reprendre" ? "acceptee" : j.status) as "ouverte" | "acceptee" | "a_verifier" }));
        const byZone = new Map<string, { label: string; lat: number; lng: number; jobs: number; accepted: number; n: number }>();
        for (const j of live) { const k = j.postal_code ?? "?"; const z = byZone.get(k) ?? { label: `${j.city ?? ""} ${k}`.trim(), lat: 0, lng: 0, jobs: 0, accepted: 0, n: 0 }; z.lat += j.lat; z.lng += j.lng; z.n++; if (j.status === "ouverte") z.jobs++; else z.accepted++; byZone.set(k, z); }
        const onlineN = cleaners.filter((c) => c.status === "actif" && c.online);
        const zones = [...byZone.values()].map((z) => ({ label: z.label, lat: z.lat / z.n, lng: z.lng / z.n, jobs: z.jobs, accepted: z.accepted, online: onlineN.filter((c) => { const p = pos(c); return p && Math.hypot(p.lat - z.lat / z.n, p.lng - z.lng / z.n) * 111 <= (c.radius_km ?? 15); }).length })).sort((a, b) => b.jobs - a.jobs);
        const openLate = J.filter((j) => j.status === "ouverte" && j.job_date >= today && Date.now() - Date.parse(j.created_at) > 5 * 60000);
        return (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <LiveRefreshBadge />
              <span><b>{onlineN.length}</b> nettoyeur(s) en ligne</span>
              <span><b>{J.filter((j) => j.status === "ouverte" && j.job_date >= today).length}</b> ménage(s) à pourvoir</span>
              <span><b>{J.filter((j) => ["acceptee", "a_reprendre"].includes(j.status) && j.job_date >= today).length}</b> accepté(s)</span>
              {openLate.length > 0 && <span className="font-semibold text-red-700">{openLate.length} ménage(s) sans preneur depuis plus de 5 min</span>}
            </div>
            <LiveMapLazy cleaners={mapCleaners} jobs={mapJobs} zones={zones} />
            <p className="mt-2 text-xs text-muted-foreground">Vert : nettoyeur en ligne · gris : hors ligne · rouge : ménage à pourvoir · bleu : accepté (trait pointillé = où il va) · orange : à vérifier. Cercles : affluence (rouge = forte demande). Position GPS en direct seulement quand l&apos;application du nettoyeur est ouverte ; sinon, son adresse.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Affluence par zone</CardTitle></CardHeader>
                {!zones.length ? <Empty>Aucun ménage à venir : la carte s&apos;anime dès qu&apos;un ménage est publié.</Empty> : <ul className="divide-y text-sm">{zones.map((z) => (
                  <li key={z.label} className="flex items-center gap-3 px-5 py-2.5"><span className="min-w-0 flex-1 font-medium">{z.label}</span><span className="text-xs text-muted-foreground">{z.jobs} à pourvoir · {z.accepted} accepté(s) · {z.online} en ligne</span>
                    <Badge tone={z.jobs >= 3 ? "red" : z.jobs >= 1 ? "orange" : "green"}>{z.jobs > z.online ? "Manque de monde" : z.jobs >= 1 ? "Demande" : "Couvert"}</Badge></li>
                ))}</ul>}
              </Card>
              <Card>
                <CardHeader><CardTitle>Nettoyeurs</CardTitle></CardHeader>
                {!cleaners.filter((c) => c.status === "actif").length ? <Empty>Aucun nettoyeur actif.</Empty> : <ul className="divide-y text-sm">{cleaners.filter((c) => c.status === "actif").sort((a, b) => Number(!!b.online) - Number(!!a.online)).map((c) => {
                  const mine = live.find((j) => j.cleaner_id === c.id && ["acceptee", "a_reprendre"].includes(j.status));
                  return (<li key={c.id} className="flex items-center gap-3 px-5 py-2.5"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.online ? "bg-emerald-500" : "bg-slate-300"}`} /><span className="min-w-0 flex-1"><b className="font-medium">{c.full_name}</b><span className="block text-xs text-muted-foreground">{c.online ? "En ligne" : "Hors ligne"} · vu {ago(c.last_seen_at)}{mine ? ` · va à : ${mine.title} (${mine.city ?? ""})` : ""}</span></span></li>);
                })}</ul>}
              </Card>
            </div>
          </>
        );
      })()}

      {tab === "direct" && (() => {
        const openJ = J.filter((j) => j.status === "ouverte" && j.job_date >= today), accepted = J.filter((j) => ["acceptee", "a_reprendre"].includes(j.status) && j.job_date >= addDays(today, -1)), sent = J.filter((j) => j.status === "a_verifier");
        const soon = (d: string) => d <= addDays(today, 1);
        const col = (title: string, tone: string, rows: any[], line: (j: any) => string, empty: string) => (
          <Card className={tone}>
            <CardHeader><CardTitle>{title} ({rows.length})</CardTitle></CardHeader>
            {!rows.length ? <Empty>{empty}</Empty> : <ul className="divide-y text-sm">{rows.map((j) => <li key={j.id} className="px-5 py-2.5"><b className="font-medium">{j.title}</b><span className="block text-xs text-muted-foreground">{line(j)}</span></li>)}</ul>}
          </Card>
        );
        return (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Chaque réservation Airbnb ou Booking devient un ménage proposé automatiquement aux nettoyeurs de la zone. Vous recevez un e-mail à chaque acceptation, et une alerte si personne n&apos;accepte à moins de 24 h.</p>
            <div className="grid gap-4 lg:grid-cols-3">
              {col("À pourvoir", openJ.some((j) => soon(j.job_date)) ? "border-red-300" : "", openJ, (j) => `${dayFr(j.job_date)} · ${j.city ?? ""} · ${eur(j.cleaner_amount)} pour le nettoyeur${soon(j.job_date) ? " · URGENT : sans nettoyeur d'ici demain" : ""}`, "Aucun ménage en attente de nettoyeur.")}
              {col("Acceptés", "", accepted, (j) => `${dayFr(j.job_date)} · ${j.cleaners?.full_name ?? "—"}${j.status === "a_reprendre" ? " · à reprendre" : ""}`, "Aucun ménage accepté à venir.")}
              {col("Envoyés pour vérification", sent.length ? "border-amber-300" : "", sent, (j) => `${j.cleaners?.full_name ?? ""} · ${dayFr(j.job_date)} · à valider dans l'onglet Demandes`, "Rien à vérifier.")}
            </div>
            <Card className="mt-4">
              <CardHeader><CardTitle>Publier un ménage maintenant</CardTitle></CardHeader>
              <form action={createManualJobAction} className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
                <Field label="Client"><Select name="client_id" required defaultValue="">{<option value="" disabled>Choisir…</option>}{((clients.data ?? []) as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                <Field label="Date"><Input name="job_date" type="date" required min={today} /></Field>
                <Field label="Prix HT facturé"><Input name="price_ht" type="number" step="0.01" min="0" required /></Field>
                <Field label="Adresse"><Input name="address" /></Field>
                <Field label="Code postal"><Input name="postal_code" required inputMode="numeric" maxLength={5} /></Field>
                <Field label="Ville"><Input name="city" /></Field>
                <Field label="Consignes d'accès (visibles après acceptation)"><Input name="access_notes" /></Field>
                <div className="flex items-end"><Button>Publier aux nettoyeurs</Button></div>
              </form>
            </Card>
          </>
        );
      })()}

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
                <div className="text-xs text-muted-foreground">Zone : {c.lat != null ? `${c.radius_km} km autour de ${c.postal_code ?? ""}` : `département ${c.departments.join(", ")}`}{c.city ? ` · ${c.city}` : ""} · SIRET : {c.siret ? <a className="inline-flex items-center gap-0.5 text-primary underline" href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${c.siret}`} target="_blank" rel="noreferrer">{c.siret} <ExternalLink className="h-3 w-3" /></a> : <b className="text-amber-700">non renseigné (obligatoire pour être payé)</b>}</div>
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
                    <span className="min-w-0 flex-1"><b className="font-medium">{c.full_name}</b> {c.status === "suspendu" && <Badge tone="red">Suspendu</Badge>}<span className="block text-xs text-muted-foreground">{c.email} · {c.lat != null ? `${c.radius_km} km autour de ${c.postal_code ?? ""}` : c.departments.join(", ")} · {mine.filter((j) => j.status === "validee").length} validé(s) · IBAN {c.iban ? "renseigné" : <b className="text-amber-700">manquant</b>}</span></span>
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
              <label className="flex items-start gap-2 text-sm sm:col-span-3"><input type="checkbox" name="auto_publish" defaultChecked={S.auto_publish} className="mt-1" /><span><b className="font-medium">Publier automatiquement</b> chaque ménage Airbnb / Booking dès la réservation (calendriers lus à l&apos;ouverture de l&apos;application nettoyeur, au plus toutes les 30 min, et chaque jour à 18 h) : il faut un prix et une adresse sur le logement.</span></label>
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
