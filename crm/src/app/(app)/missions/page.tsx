import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, isoWeekday, monthBounds, monthLabel, parisToday } from "@/lib/domain/dates";
import { STAGES, STAGE_LABEL } from "@/lib/domain/missions";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { MissionRow } from "@/components/crm/mission";
import { formatDate } from "@/lib/utils";

const VIEWS = [["jour", "Aujourd'hui"], ["semaine", "Semaine"], ["mois", "Mois"], ["agent", "Par agent"], ["site", "Par site"], ["statut", "Par statut"]] as const;
type View = (typeof VIEWS)[number][0];
const DAY = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export default async function MissionsPage({ searchParams }: { searchParams: { vue?: string; date?: string; agent?: string; site?: string; etape?: string } }) {
  const today = parisToday();
  const view: View = (VIEWS.map((v) => v[0]) as string[]).includes(searchParams.vue ?? "") ? (searchParams.vue as View) : "semaine";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : today;
  // Période affichée : jour, semaine (lundi → dimanche) ou mois ; les vues « par … » couvrent la semaine.
  const monday = addDays(anchor, 1 - isoWeekday(anchor));
  const range = view === "jour" ? { start: anchor, end: anchor }
    : view === "mois" ? monthBounds(anchor.slice(0, 7)) : { start: monday, end: addDays(monday, 6) };
  const step = view === "jour" ? 1 : view === "mois" ? 31 : 7;
  const prev = view === "mois" ? `${monthBounds(addDays(range.start, -1).slice(0, 7)).start}` : addDays(anchor, -step);
  const next = view === "mois" ? addDays(range.end, 1) : addDays(anchor, step);

  const supabase = createClient();
  let q = supabase.from("interventions").select("id, title, scheduled_date, start_time, duration_hours, stage, assignee, staff_id, site_id, site_address, invoice_id, checklist, clients(id, name, is_reserved), sites(id, name, city)")
    .gte("scheduled_date", range.start).lte("scheduled_date", range.end).order("scheduled_date").order("start_time", { nullsFirst: false });
  if (searchParams.agent === "aucun") q = q.is("staff_id", null).is("assignee", null);
  else if (searchParams.agent) q = q.eq("staff_id", searchParams.agent);
  if (searchParams.site) q = q.eq("site_id", searchParams.site);
  if (searchParams.etape && searchParams.etape in STAGE_LABEL) q = q.eq("stage", searchParams.etape);
  const [{ data, error }, { data: staff }, { data: sites }, { count: openIssues }] = await Promise.all([
    q, supabase.from("staff").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("sites").select("id, name").eq("status", "actif").order("name"),
    supabase.from("mission_issues").select("id", { count: "exact", head: true }).eq("status", "ouverte")
  ]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];

  const params = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const all = { vue: view, date: anchor, agent: searchParams.agent, site: searchParams.site, etape: searchParams.etape, ...over };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, v);
    return `/missions?${p.toString()}`;
  };
  const back = params({});

  // Regroupement selon la vue
  let groups: { key: string; title: string; items: any[] }[];
  if (view === "agent") {
    const m = new Map<string, any[]>();
    for (const r of rows) m.set(r.assignee ?? "— Sans intervenant", [...(m.get(r.assignee ?? "— Sans intervenant") ?? []), r]);
    groups = [...m.entries()].sort(([a], [b]) => (a.startsWith("—") ? -1 : b.startsWith("—") ? 1 : a.localeCompare(b))).map(([k, v]) => ({ key: k, title: `${k} (${v.length})`, items: v }));
  } else if (view === "site") {
    const m = new Map<string, any[]>();
    for (const r of rows) { const k = r.sites?.name ?? r.site_address ?? "— Site non renseigné"; m.set(k, [...(m.get(k) ?? []), r]); }
    groups = [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, title: `${k} (${v.length})`, items: v }));
  } else if (view === "statut") {
    groups = STAGES.map(([s, l]) => ({ key: s, title: l, items: rows.filter((r) => r.stage === s) })).filter((g) => g.items.length).map((g) => ({ ...g, title: `${g.title} (${g.items.length})` }));
  } else {
    const m = new Map<string, any[]>();
    for (const r of rows) m.set(r.scheduled_date, [...(m.get(r.scheduled_date) ?? []), r]);
    groups = [...m.entries()].map(([d, v]) => ({ key: d, title: `${DAY[isoWeekday(d)]} ${formatDate(d)}${d === today ? " — aujourd'hui" : ""}`, items: v }));
  }

  const unassigned = rows.filter((r) => !r.assignee && !["annulee", "facturee", "terminee", "validee", "facturable"].includes(r.stage)).length;
  const toCheck = rows.filter((r) => r.stage === "a_verifier").length;
  const label = view === "jour" ? formatDate(anchor) : view === "mois" ? monthLabel(anchor.slice(0, 7)) : `semaine du ${formatDate(range.start)}`;

  return (
    <>
      <PageHeader title="Missions" subtitle="Chaque passage chez un client, de la planification à la facture."
        actions={<Link href="/planning"><Button variant="outline"><CalendarPlus className="h-4 w-4" /> Générer / ajouter (planning)</Button></Link>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map(([v, l]) => (
          <Link key={v} href={params({ vue: v, date: v === "jour" ? today : anchor })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${view === v ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{l}</Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card shadow-sm">
          <Link href={params({ date: prev })} className="p-2 hover:bg-muted" aria-label="Période précédente"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-44 text-center text-sm font-semibold capitalize">{label}</span>
          <Link href={params({ date: next })} className="p-2 hover:bg-muted" aria-label="Période suivante"><ChevronRight className="h-4 w-4" /></Link>
        </div>
        {anchor !== today && <Link href={params({ date: today })} className="text-sm text-primary hover:underline">Aujourd&apos;hui</Link>}
        <form className="ml-auto flex flex-wrap gap-2" action="/missions">
          <input type="hidden" name="vue" value={view} /><input type="hidden" name="date" value={anchor} />
          <Select name="agent" defaultValue={searchParams.agent ?? ""} className="h-9 w-44"><option value="">Tous les agents</option><option value="aucun">Sans intervenant</option>{staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select>
          <Select name="site" defaultValue={searchParams.site ?? ""} className="h-9 w-44"><option value="">Tous les sites</option>{sites?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Select name="etape" defaultValue={searchParams.etape ?? ""} className="h-9 w-40"><option value="">Toutes les étapes</option>{STAGES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}</Select>
          <Button variant="outline" size="sm" className="h-9">Filtrer</Button>
        </form>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[[rows.filter((r) => r.stage !== "annulee").length, "missions", ""], [unassigned, "sans intervenant", unassigned ? "text-orange-600" : ""],
          [toCheck, "à vérifier", toCheck ? "text-amber-600" : ""], [openIssues ?? 0, "problème(s) ouvert(s)", openIssues ? "text-red-600" : ""]].map(([n, l, c], k) => {
          const body = <Card className="p-4"><div className={`text-3xl font-bold ${c}`}>{n}</div><div className="text-xs text-slate-500">{l}</div></Card>;
          return k === 3 ? <Link key={l as string} href="/missions/problemes">{body}</Link> : <div key={l as string}>{body}</div>;
        })}
      </div>

      {!rows.length ? (
        <Card><Empty>Aucune mission sur cette période. Les missions se créent depuis les contrats (« Générer le planning ») ou à l&apos;unité depuis le planning.</Empty></Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader><CardTitle className="capitalize">{g.title}</CardTitle></CardHeader>
              <ul className="divide-y divide-slate-100">{g.items.map((m) => <MissionRow key={m.id} m={m} back={back} showDate={!["jour", "semaine", "mois"].includes(view)} />)}</ul>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">Étapes : {STAGES.map(([, l]) => l).join(" → ")}. « Facturée » est posée automatiquement quand la mission entre dans une facture.</p>
    </>
  );
}

