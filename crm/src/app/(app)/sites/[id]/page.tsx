import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, ReservedBadge } from "@/components/ui/badge";
import { MissionRow } from "@/components/crm/mission";
import { SiteForm } from "@/components/crm/site-form";
import { formatDate } from "@/lib/utils";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { deleteSiteAction } from "@/app/actions/manage";
import { SiteMapLazy } from "@/components/crm/site-map-lazy";
import { leftLabel, type StockItem } from "@/lib/domain/stock";

export default async function SitePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const today = parisToday();
  const { data: s } = await supabase.from("sites").select("*, clients(id, name, is_reserved)").eq("id", params.id).maybeSingle();
  if (!s) notFound();
  const [{ data: contracts }, { data: upcoming }, { data: past }, { data: issues }, { data: clients }] = await Promise.all([
    supabase.from("contracts").select("id, label, status, assignee").eq("site_id", s.id),
    supabase.from("interventions").select("id, title, scheduled_date, start_time, stage, assignee, invoice_id, checklist, site_address, clients(name, is_reserved)").eq("site_id", s.id).gte("scheduled_date", today).order("scheduled_date").limit(10),
    supabase.from("interventions").select("id, title, scheduled_date, start_time, stage, assignee, invoice_id, checklist, site_address, clients(name, is_reserved)").eq("site_id", s.id).lt("scheduled_date", today).order("scheduled_date", { ascending: false }).limit(10),
    supabase.from("mission_issues").select("*").eq("site_id", s.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("clients").select("id, name").order("name")
  ]);
  const { data: media } = await supabase.from("site_media").select("id, kind, path, created_at, staff:staff_id(full_name)").eq("site_id", s.id).eq("uploaded", true).order("created_at", { ascending: false }).limit(24);
  const signed = ((media ?? []) as any[]).length ? (await supabase.storage.from("site-media").createSignedUrls(((media ?? []) as any[]).map((m) => m.path), 3600)).data ?? [] : [];
  const urlOf = new Map(signed.map((x) => [x.path, x.signedUrl]));
  // Images du lieu : les captures du dernier film d'arrivée fait sur ce site (elles servent de repère aux prochains agents).
  const siteMissions = [...((upcoming ?? []) as any[]), ...((past ?? []) as any[])].map((m) => m.id);
  const { data: filmed } = siteMissions.length ? await supabase.from("mission_photos").select("id, intervention_id, taken_at").in("intervention_id", siteMissions).eq("kind", "avant").order("taken_at", { ascending: false }).limit(40) : { data: [] };
  const lastFilm = ((filmed ?? []) as any[]).filter((p, _i, all) => p.intervention_id === all[0]?.intervention_id).slice(0, 14).reverse();
  const rot = s.rotation as { items?: string[]; next?: number } | null;
  const mem = s.visit_memory as { visits?: number; zones?: string[]; recurring?: string[]; last?: { date: string; summary: string }[] } | null;
  // Stock de produits du site : dernier comptage fait par l'IA à partir du film d'un agent (absent tant que la base n'est pas à jour).
  const sc = await supabase.from("stock_counts").select("counted_at, counted_by, items, summary, next_due").eq("scope_kind", "site").eq("scope_id", s.id).order("counted_at", { ascending: false }).limit(1).maybeSingle();
  const stock = (sc.error ? null : sc.data) as { counted_at: string; counted_by: string | null; items: StockItem[]; summary: string | null; next_due: string | null } | null;
  const back = `/sites/${s.id}`;
  return (
    <>
      <PageHeader title={s.name} subtitle={[s.address, s.postal_code, s.city].filter(Boolean).join(" ") || "Adresse à compléter"}
        actions={<><StatusBadge status={s.status} /><Link href="/sites" className="text-sm font-semibold text-primary hover:underline">← Sites</Link>
          <ConfirmAction action={deleteSiteAction.bind(null, s.id)} label="Supprimer le site" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50"
            title={`Supprimer « ${s.name} » ?`} description="Le site est supprimé ; ses missions et contrats sont conservés, simplement sans site. Définitif." confirmLabel="Oui, supprimer" reservedName={s.clients.is_reserved ? s.clients.name : null} /></>} />
      <div className="mb-4 flex items-center gap-2 text-sm">Client : <Link href={`/clients/${s.clients.id}`} className="font-semibold text-primary hover:underline">{s.clients.name}</Link>{s.clients.is_reserved && <ReservedBadge />}</div>
      {(s.frequency || s.access_notes || (s.specifics ?? []).length > 0) && (
        <Card className="mb-4"><CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          {s.frequency && <div><div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Fréquence de nettoyage</div><div className="mt-1 text-[15px]">{s.frequency}</div></div>}
          {s.access_notes && <div><div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Accès</div><div className="mt-1 whitespace-pre-line text-[15px]">{s.access_notes}</div></div>}
          {(s.specifics ?? []).length > 0 && <div className="sm:col-span-2"><div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Éléments spécifiques</div>
            <div className="mt-1.5 flex flex-wrap gap-2">{(s.specifics as string[]).map((t) => <span key={t} className="rounded-full bg-[#e8edf5] px-3 py-1 text-[13px] font-medium text-[#2b4c7e]">{t}</span>)}</div></div>}
        </CardContent></Card>
      )}
      {stock && (
        <Card className="mb-4"><CardContent className="space-y-3 py-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Stock de produits · compté le {formatDate(stock.counted_at)}{stock.counted_by ? ` par ${stock.counted_by}` : ""}</div>
          {stock.summary && <p className="text-[14px]">{stock.summary}</p>}
          {stock.items.filter((i) => i.buy).length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-[14px] text-amber-900">
              <b>À racheter</b>
              <ul className="mt-1 space-y-1">{stock.items.filter((i) => i.buy).map((i) => <li key={i.name}>• <b>{i.name}</b> — reste {String(i.left).replace(".", ",")} {i.unit} · {leftLabel(i)}</li>)}</ul>
            </div>
          )}
          <ul className="grid gap-1 text-[14px] sm:grid-cols-2">{stock.items.filter((i) => !i.buy).map((i) => <li key={i.name}>• <b>{i.name}</b> — {String(i.left).replace(".", ",")} {i.unit} · {leftLabel(i)}</li>)}</ul>
          <p className="text-xs text-muted-foreground">« environ » = estimation de l&apos;IA au premier comptage ; dès le deuxième, la durée est mesurée sur la consommation réelle.{stock.next_due ? ` Prochain comptage demandé à l'agent vers le ${formatDate(stock.next_due)}.` : ""}</p>
        </CardContent></Card>
      )}
      {(rot?.items?.length ?? 0) > 0 && (
        <Card className="mb-4"><CardContent className="space-y-2 py-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Rotation : un élément par passage</div>
          <div className="text-[15px]">Au prochain passage : <b>{rot!.items![(rot!.next ?? 0) % rot!.items!.length]}</b></div>
          <div className="flex flex-wrap gap-2">{rot!.items!.map((t, i) => <span key={t} className={`rounded-full px-3 py-1 text-[13px] font-medium ${i === (rot!.next ?? 0) % rot!.items!.length ? "bg-primary text-white" : "bg-[#e8edf5] text-[#2b4c7e]"}`}>{t}</span>)}</div>
          <p className="text-xs text-muted-foreground">L&apos;élément du jour est annoncé à l&apos;agent quand il pointe son arrivée ; la liste se modifie ci-dessous, dans la fiche du site.</p>
        </CardContent></Card>
      )}
      {(mem?.visits ?? 0) > 0 && (
        <Card className="mb-4"><CardContent className="space-y-2 py-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Ce que l&apos;IA connaît de ce site ({mem!.visits} passage{mem!.visits! > 1 ? "s" : ""} filmé{mem!.visits! > 1 ? "s" : ""})</div>
          {(mem!.zones ?? []).length > 0 && <div className="flex flex-wrap gap-2">{mem!.zones!.map((z) => <span key={z} className="rounded-full bg-[#e8edf5] px-3 py-1 text-[13px] font-medium text-[#2b4c7e]">{z}</span>)}</div>}
          {mem!.last?.[0]?.summary && <p className="text-[14px]">Dernier relevé ({formatDate(mem!.last[0].date)}) : {mem!.last[0].summary}</p>}
        </CardContent></Card>
      )}
      {lastFilm.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-[15px] font-semibold">Images du lieu (dernier film d&apos;arrivée, {formatDate(lastFilm[0].taken_at)})</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
            {lastFilm.map((p) => (
              <a key={p.id} href={`/api/missions/photo/${p.id}`} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/missions/photo/${p.id}`} alt="Capture du site" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Le détail (relevé et contrôle de l&apos;IA) est sur la fiche de la mission.</p>
        </div>
      )}
      {Array.isArray(s.zones) && s.zones.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-[15px] font-semibold">Zones ({s.zones.length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(s.zones as { name: string; tasks: string[]; attention: string[] }[]).map((z) => (
              <Card key={z.name}><CardContent className="space-y-3 py-4">
                <div className="text-[16px] font-semibold">{z.name}</div>
                {z.tasks.length > 0 && <div><div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tâches</div><ul className="mt-1 space-y-1 text-[14px]">{z.tasks.map((t) => <li key={t}>• {t}</li>)}</ul></div>}
                {z.attention.length > 0 && <div><div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Points d&apos;attention</div><ul className="mt-1 space-y-1 text-[14px] text-[#b3552c]">{z.attention.map((t) => <li key={t}>• {t}</li>)}</ul></div>}
              </CardContent></Card>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Chaque nouvelle mission de ce site reçoit cette check-list, pièce par pièce.</p>
        </div>
      )}
      {((media ?? []) as any[]).length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-[15px] font-semibold">Vidéos et photos du site ({(media ?? []).length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {((media ?? []) as any[]).map((m) => urlOf.get(m.path) ? (
              <Card key={m.id}><CardContent className="space-y-2 py-3">
                {m.kind === "video" ? <video src={urlOf.get(m.path) ?? undefined} controls preload="metadata" className="w-full rounded-lg bg-black" /> : <img src={urlOf.get(m.path) ?? undefined} alt="" className="w-full rounded-lg" />}
                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("fr-FR")}{m.staff?.full_name ? ` · ${m.staff.full_name}` : ""}</div>
              </CardContent></Card>
            ) : null)}
          </div>
        </div>
      )}
      {s.lat != null && s.lng != null ? (
        <Card className="mb-4 p-3"><SiteMapLazy pins={[{ lat: s.lat, lng: s.lng, title: s.name, sub: [s.address, s.postal_code, s.city].filter(Boolean).join(" "), color: "blue" }]} height={240} /><p className="mt-2 px-1 text-xs text-slate-500">Position GPS trouvée automatiquement à partir de l&apos;adresse. Pointage des agents accepté dans un rayon de {s.geofence_m} m.</p></Card>
      ) : (
        <p className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">Position GPS non trouvée : complétez l&apos;adresse puis enregistrez le site. Sans position, les arrivées des agents sont enregistrées sans vérification.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Prochaines missions</CardTitle><Link href={`/missions?vue=mois&site=${s.id}`} className="text-xs font-semibold text-primary hover:underline">Toutes</Link></CardHeader>
          {!upcoming?.length ? <Empty>Aucune mission à venir.</Empty> : <ul className="divide-y divide-slate-100">{upcoming.map((m) => <MissionRow key={m.id} m={m} back={back} />)}</ul>}
        </Card>
        <Card>
          <CardHeader><CardTitle>Contrats</CardTitle></CardHeader>
          {!contracts?.length ? <Empty>Aucun contrat rattaché. Ouvrez un contrat pour le relier à ce site.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">{contracts.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2 px-5 py-2.5"><Link href={`/contrats/${k.id}`} className="font-medium hover:underline">{k.label}</Link>
                <span className="flex items-center gap-2 text-slate-500">{k.assignee ?? "sans intervenant"} <StatusBadge status={k.status} /></span></li>
            ))}</ul>
          )}
          <CardHeader className="border-t"><CardTitle>Anomalies & réclamations</CardTitle></CardHeader>
          {!issues?.length ? <Empty>Aucun problème signalé.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">{issues.map((i: any) => (
              <li key={i.id} className={`border-l-4 px-5 py-2.5 ${i.status === "ouverte" ? "border-l-orange-500" : "border-l-emerald-500"}`}>
                <b>{i.kind === "reclamation" ? "Réclamation" : "Anomalie"}</b> · {formatDate(i.created_at)} · {i.status === "ouverte" ? "ouverte" : "réglée"}
                <div className="text-slate-600">{i.description}</div>
                {i.intervention_id && <Link href={`/missions/${i.intervention_id}`} className="text-xs text-primary hover:underline">Voir la mission</Link>}
              </li>
            ))}</ul>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Fiche du site</CardTitle></CardHeader>
          <CardContent><SiteForm site={s} clients={clients ?? []} /></CardContent>
        </Card>
        {!!past?.length && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Dernières missions</CardTitle></CardHeader>
            <ul className="divide-y divide-slate-100">{past.map((m) => <MissionRow key={m.id} m={m} back={back} />)}</ul>
          </Card>
        )}
      </div>
    </>
  );
}
