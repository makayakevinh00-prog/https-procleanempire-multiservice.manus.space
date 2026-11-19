import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { MissionsTabs } from "@/components/crm/missions-tabs";
import { Card } from "@/components/ui/card";
import { VerifyList } from "@/components/crm/verify-list";
import { analyseMission, interventionReport, type MissionFacts } from "@/lib/domain/mission-analysis";
import { formatDate } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

/** File de contrôle : les missions terminées, avec l'analyse et les photos, à valider ou à renvoyer. */
export default async function ToCheckPage() {
  const sb = createClient();
  const settings = await getSettings(sb);
  const [{ data, error }, { count: openIssues }] = await Promise.all([
    sb.from("interventions").select("*, clients(name, is_reserved), sites(name)").in("stage", ["terminee", "a_verifier"]).is("invoice_id", null).order("scheduled_date", { ascending: false }).limit(40),
    sb.from("mission_issues").select("id", { count: "exact", head: true }).eq("status", "ouverte")
  ]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const ids = rows.map((r) => r.id);
  const [{ data: photos }, { data: issues }] = await Promise.all([
    ids.length ? sb.from("mission_photos").select("id, intervention_id, kind, taken_at").in("intervention_id", ids).order("taken_at") : Promise.resolve({ data: [] as any[] }),
    ids.length ? sb.from("mission_issues").select("intervention_id, status").in("intervention_id", ids) : Promise.resolve({ data: [] as any[] })
  ]);
  const hourly = Number(settings.indep_hourly_cost ?? 0);
  const now = new Date();
  const items = rows.map((m) => {
    const ph = ((photos ?? []) as any[]).filter((p) => p.intervention_id === m.id);
    const facts: MissionFacts = {
      date: m.scheduled_date, startTime: m.start_time, plannedHours: m.duration_hours != null ? Number(m.duration_hours) : null, stage: m.stage, hasAssignee: !!(m.staff_id || m.assignee),
      arrivedAt: m.arrived_at ?? null, departedAt: m.departed_at ?? null, arrivedVerified: m.arrived_verified ?? null, arrivedDistanceM: m.arrived_distance_m ?? null,
      checklist: (m.checklist ?? []) as MissionFacts["checklist"], photos: ph.map((p) => ({ kind: p.kind, at: p.taken_at })),
      openIssues: ((issues ?? []) as any[]).filter((i) => i.intervention_id === m.id && i.status === "ouverte").length,
      priceHt: m.unit_price_ht != null ? Number(m.unit_price_ht) * Number(m.quantity ?? 1) : null, billable: !!m.billable
    };
    const a = analyseMission(facts, now, hourly);
    return { m, ph, a, r: interventionReport(facts, a, { title: m.title, site: m.sites?.name ?? null, agent: m.assignee ?? null }) };
  });
  const order = { non_conforme: 0, a_verifier: 1, conforme: 2, en_attente: 3 } as const;
  items.sort((x, y) => order[x.r.verdict] - order[y.r.verdict] || y.m.scheduled_date.localeCompare(x.m.scheduled_date));

  return (
    <>
      <PageHeader title="Missions" subtitle="Validez d'un geste : les missions conformes sont cochées d'avance, l'analyse signale celles qui sortent de l'ordinaire." />
      <MissionsTabs active="verifier" counts={{ verifier: rows.length, anomalies: openIssues ?? 0 }} />
      {!items.length ? <Card><Empty icon={CheckCircle2}>Rien à contrôler : toutes les interventions terminées sont validées.</Empty></Card> : (
        <VerifyList items={items.map(({ m, ph, a, r }) => {
          const problems = a.insights.filter((i) => i.level === "alert" || i.level === "warn");
          return {
            id: m.id as string,
            client: String(m.clients?.name ?? "—"),
            line: `${m.title}${m.sites?.name ? ` · ${m.sites.name}` : ""} · ${formatDate(m.scheduled_date)} · ${m.assignee ?? "sans intervenant"}`,
            summary: problems.length ? problems.slice(0, 3).map((p) => p.title).join(" · ") : "Pointage, durée, check-list et photos conformes.",
            metrics: `Check-list ${a.metrics.checklistDone}/${a.metrics.checklistTotal} · photos ${a.metrics.photosBefore}/${a.metrics.photosAfter}${a.metrics.realHours != null ? ` · ${a.metrics.realHours.toFixed(1)} h réelles` : ""}`,
            verdict: r.verdict,
            verdictLabel: r.verdictLabel,
            thumbs: [...ph.filter((p) => p.kind === "avant").slice(0, 1), ...ph.filter((p) => p.kind === "apres").slice(0, 1)].map((p) => ({ id: p.id as string, kind: String(p.kind) }))
          };
        })} />
      )}
    </>
  );
}
