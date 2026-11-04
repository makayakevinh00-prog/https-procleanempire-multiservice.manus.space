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
  const back = `/sites/${s.id}`;
  return (
    <>
      <PageHeader title={s.name} subtitle={[s.address, s.postal_code, s.city].filter(Boolean).join(" ") || "Adresse à compléter"}
        actions={<><StatusBadge status={s.status} /><Link href="/sites" className="text-sm text-primary hover:underline">← Sites</Link></>} />
      <div className="mb-4 flex items-center gap-2 text-sm">Client : <Link href={`/clients/${s.clients.id}`} className="font-semibold text-primary hover:underline">{s.clients.name}</Link>{s.clients.is_reserved && <ReservedBadge />}</div>
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
