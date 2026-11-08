import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveIssueAction } from "@/app/actions/missions";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { MissionsTabs } from "@/components/crm/missions-tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ReservedBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function IssuesPage({ searchParams }: { searchParams: { tout?: string } }) {
  let q = createClient().from("mission_issues")
    .select("*, clients(id, name, is_reserved), sites(id, name), interventions(id, title, scheduled_date)")
    .order("status", { ascending: true }).order("created_at", { ascending: false }).limit(100);
  if (!searchParams.tout) q = q.eq("status", "ouverte");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const back = `/missions/problemes${searchParams.tout ? "?tout=1" : ""}`;
  return (
    <>
      <PageHeader title="Anomalies & réclamations" subtitle="Les problèmes signalés sur les missions. Une mission ne peut pas être validée tant qu'un problème y est ouvert."
        actions={<Link href={searchParams.tout ? "/missions/problemes" : "/missions/problemes?tout=1"} className="text-sm text-primary hover:underline">{searchParams.tout ? "Seulement les ouverts" : "Voir aussi les réglés"}</Link>} />
      <MissionsTabs active="anomalies" />
      <Card>
        {!data?.length ? <Empty>Aucun problème ouvert.</Empty> : (
          <ul className="divide-y divide-slate-100">{data.map((i: any) => (
            <li key={i.id} className={`border-l-[5px] px-5 py-3 text-sm ${i.status !== "ouverte" ? "border-l-emerald-500" : i.kind === "reclamation" || i.severity === "haute" ? "border-l-red-600" : "border-l-orange-500"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <b>{i.kind === "reclamation" ? "Réclamation client" : "Anomalie"}</b>
                <Link href={`/clients/${i.clients.id}`} className="text-primary hover:underline">{i.clients.name}</Link>{i.clients.is_reserved && <ReservedBadge />}
                {i.sites && <Link href={`/sites/${i.sites.id}`} className="text-slate-500 hover:underline">· {i.sites.name}</Link>}
                {i.interventions && <Link href={`/missions/${i.interventions.id}`} className="text-slate-500 hover:underline">· mission du {formatDate(i.interventions.scheduled_date)}</Link>}
                <span className="ml-auto text-xs text-slate-500">{formatDate(i.created_at)}{i.status !== "ouverte" ? ` · réglé le ${formatDate(i.resolved_at)}` : ""}</span>
              </div>
              <p className="mt-1 text-slate-700">{i.description}</p>
              {i.resolution && <p className="mt-1 text-xs text-emerald-800">Solution : {i.resolution}</p>}
              {i.status === "ouverte" && (
                <form action={resolveIssueAction.bind(null, i.id)} className="mt-2 flex max-w-xl gap-2"><input type="hidden" name="back" value={back} />
                  <Input name="resolution" placeholder="Comment c'est réglé ?" className="h-9 flex-1" /><Button size="sm" variant="outline" className="h-9">Marquer réglé</Button>
                </form>
              )}
            </li>
          ))}</ul>
        )}
      </Card>
    </>
  );
}
