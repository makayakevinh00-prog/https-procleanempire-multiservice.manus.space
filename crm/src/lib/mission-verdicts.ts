import "server-only";
import {
  analyseMission,
  interventionReport,
  type Analysis,
  type InterventionReport,
  type MissionFacts,
} from "@/lib/domain/mission-analysis";

type Row = Record<string, any>;
export type Verdict = {
  a: Analysis;
  r: InterventionReport;
  photos: { id: string; kind: string }[];
};

/** Analyse + verdict de plusieurs missions en 2 requêtes (photos, anomalies). Lecture seule. */
export async function loadVerdicts(
  sb: any,
  rows: Row[],
  hourly: number,
): Promise<Map<string, Verdict>> {
  const out = new Map<string, Verdict>();
  const ids = rows.map((r) => r.id as string);
  if (!ids.length) return out;
  const [{ data: photos }, { data: issues }] = await Promise.all([
    sb
      .from("mission_photos")
      .select("id, intervention_id, kind, taken_at")
      .in("intervention_id", ids)
      .order("taken_at"),
    sb
      .from("mission_issues")
      .select("intervention_id, status")
      .in("intervention_id", ids),
  ]);
  const now = new Date();
  for (const m of rows) {
    const ph = ((photos ?? []) as any[]).filter(
      (p) => p.intervention_id === m.id,
    );
    const facts: MissionFacts = {
      date: m.scheduled_date,
      startTime: m.start_time,
      plannedHours: m.duration_hours != null ? Number(m.duration_hours) : null,
      stage: m.stage,
      hasAssignee: !!(m.staff_id || m.assignee),
      arrivedAt: m.arrived_at ?? null,
      departedAt: m.departed_at ?? null,
      arrivedVerified: m.arrived_verified ?? null,
      arrivedDistanceM: m.arrived_distance_m ?? null,
      checklist: (m.checklist ?? []) as MissionFacts["checklist"],
      photos: ph.map((p) => ({ kind: p.kind, at: p.taken_at })),
      openIssues: ((issues ?? []) as any[]).filter(
        (i) => i.intervention_id === m.id && i.status === "ouverte",
      ).length,
      priceHt:
        m.unit_price_ht != null
          ? Number(m.unit_price_ht) * Number(m.quantity ?? 1)
          : null,
      billable: !!m.billable,
    };
    const a = analyseMission(facts, now, hourly);
    out.set(m.id, {
      a,
      r: interventionReport(facts, a, {
        title: m.title,
        site: m.sites?.name ?? null,
        agent: m.assignee ?? null,
      }),
      photos: ph.map((p) => ({ id: p.id, kind: p.kind })),
    });
  }
  return out;
}
