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
import { ActivityTabs } from "@/components/crm/activity-ui";
import { MissionsTabs } from "@/components/crm/missions-tabs";
import { isActivity, missionActivity, type Activity } from "@/lib/domain/activity";
import { loadActivityModel, selectResilient } from "@/lib/activity-data";
import { MissionCalendar } from "@/components/crm/mission-calendar";
import { StageBadge } from "@/components/crm/mission";
import { loadVerdicts } from "@/lib/mission-verdicts";
import { getSettings } from "@/lib/data";
import { Search } from "lucide-react";

const VERDICT = { conforme: "bg-[#e6f1ea] text-[#2f7a55]", a_verifier: "bg-[#f7ecdb] text-[#8f5a12]", non_conforme: "bg-[#f6e4e1] text-[#b3382c]", en_attente: "bg-secondary text-muted-foreground" } as const;
const VIEWS = [["liste", "Liste"], ["calendrier", "Calendrier"], ["jour", "Aujourd'hui"], ["semaine", "Semaine"], ["mois", "Mois"], ["agent", "Par agent"], ["site", "Par site"], ["statut", "Par statut"]] as const;
type View = (typeof VIEWS)[number][0];
const DAY = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export default async function MissionsPage({ searchParams }: { searchParams: { q?: string; vue?: string; date?: string; agent?: string; site?: string; etape?: string; famille?: string } }) {
  const today = parisToday();
  const view: View = (VIEWS.map((v) => v[0]) as string[]).includes(searchParams.vue ?? "") ? (searchParams.vue as View) : "liste";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : today;
  // Période affichée : jour, semaine (lundi → dimanche) ou mois ; les vues « par … » couvrent la semaine.
  const monday = addDays(anchor, 1 - isoWeekday(anchor));
  const isMonth = view === "mois" || view === "calendrier" || view === "liste";
  const mb = monthBounds(anchor.slice(0, 7));
  // Calendrier : la grille va du lundi qui précède le 1er au dimanche qui suit le dernier jour du mois.
  const gridStart = addDays(mb.start, 1 - isoWeekday(mb.start)), gridEnd = addDays(mb.end, 7 - isoWeekday(mb.end));
  const range = view === "jour" ? { start: anchor, end: anchor }
    : view === "calendrier" ? { start: gridStart, end: gridEnd }
    : view === "mois" || view === "liste" ? mb : { start: monday, end: addDays(monday, 6) };
  const step = view === "jour" ? 1 : isMonth ? 31 : 7;
  const prev = isMonth ? `${monthBounds(addDays(mb.start, -1).slice(0, 7)).start}` : addDays(anchor, -step);
  const next = isMonth ? addDays(mb.end, 1) : addDays(anchor, step);

  const supabase = createClient();
  const cols = "id, title, scheduled_date, start_time, duration_hours, stage, assignee, staff_id, site_id, site_address, invoice_id, checklist, contract_id, clients(id, name, is_reserved), sites(id, name, city)";
  const build = (c: string) => {
    let q = supabase.from("interventions").select(c).gte("scheduled_date", range.start).lte("scheduled_date", range.end).order("scheduled_date").order("start_time", { nullsFirst: false });
    if (searchParams.agent === "aucun") q = q.is("staff_id", null).is("assignee", null);
    else if (searchParams.agent) q = q.eq("staff_id", searchParams.agent);
    if (searchParams.site) q = q.eq("site_id", searchParams.site);
    if (searchParams.etape && searchParams.etape in STAGE_LABEL) q = q.eq("stage", searchParams.etape);
    return q as any;
  };
  const model = await loadActivityModel(supabase);
  const [{ data, error }, { data: staff }, { data: sites }, { count: openIssues }] = await Promise.all([
    selectResilient<any>(build, cols), supabase.from("staff").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("sites").select("id, name").eq("status", "actif").order("name"),
    supabase.from("mission_issues").select("id", { count: "exact", head: true }).eq("status", "ouverte")
  ]);
  if (error) throw new Error(error.message);
  const withFam = ((data ?? []) as any[]).map((m) => ({ m, fam: missionActivity({ activity: isActivity(m.activity) ? (m.activity as Activity) : null, contractId: m.contract_id, title: m.title, clientName: m.clients?.name ?? null }, model.byContract) }));
  const famCounts: Record<string, number> = {};
  for (const x of withFam) if (x.m.stage !== "annulee") famCounts[x.fam] = (famCounts[x.fam] ?? 0) + 1;
  const famSel = isActivity(searchParams.famille) ? (searchParams.famille as Activity) : "";
  const famOf = new Map<string, Activity>(withFam.map((x) => [x.m.id as string, x.fam]));
  const needle = (searchParams.q ?? "").trim().toLowerCase();
  const rows = withFam.filter((x) => !famSel || x.fam === famSel).map((x) => x.m)
    .filter((m: any) => !needle || [m.clients?.name, m.sites?.name, m.site_address, m.assignee, m.title].some((v) => String(v ?? "").toLowerCase().includes(needle))) as any[];
  const verdicts = view === "liste" ? await loadVerdicts(supabase, rows.filter((r) => r.stage !== "planifiee"), Number((await getSettings(supabase)).indep_hourly_cost ?? 0)) : new Map();

  const params = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const all = { q: searchParams.q || undefined, vue: view, date: anchor, agent: searchParams.agent, site: searchParams.site, etape: searchParams.etape, famille: famSel || undefined, ...over };
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
  const label = view === "jour" ? formatDate(anchor) : isMonth ? monthLabel(anchor.slice(0, 7)) : `semaine du ${formatDate(range.start)}`;

  return (
    <>
      <PageHeader title="Missions" subtitle="Chaque passage chez un client, de la planification à la facture."
        actions={<Link href="/planning"><Button variant="outline"><CalendarPlus className="h-4 w-4" /> Générer / ajouter (planning)</Button></Link>} />

      <MissionsTabs active="missions" counts={{ verifier: rows.filter((r) => ["terminee", "a_verifier"].includes(r.stage) && !r.invoice_id).length, anomalies: openIssues ?? 0 }} />
      <ActivityTabs current={famSel} counts={famCounts} href={(k) => params({ famille: k || undefined })} />

      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map(([v, l]) => (
          <Link key={v} href={params({ vue: v, date: v === "jour" ? today : anchor })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${view === v ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted"}`}>{l}</Link>
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
          <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input name="q" defaultValue={searchParams.q ?? ""} placeholder="Site, agent, client…" className="h-9 w-48 rounded-lg border bg-card pl-8 pr-2 text-sm" /></div>
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

      {view === "calendrier" && <MissionCalendar rows={rows.filter((r) => r.stage !== "annulee")} month={anchor.slice(0, 7)} gridStart={gridStart} gridEnd={gridEnd} today={today} dayHref={(d) => params({ vue: "jour", date: d })} />}

      {view === "liste" && (!rows.length ? (
        <Card><Empty>Aucune mission sur cette période. Les missions se créent depuis les contrats (« Générer le planning ») ou à l&apos;unité depuis le planning.</Empty></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <thead><tr className="border-b border-border/70 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              {["Site", "Agent", "Début", "Fin", "Statut", "Contrôle", ""].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((m) => {
                const v = verdicts.get(m.id) as any;
                const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }) : null;
                const endPlanned = m.start_time && m.duration_hours ? (() => { const [h, mi] = String(m.start_time).split(":").map(Number); const t = h * 60 + mi + Math.round(Number(m.duration_hours) * 60); return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })() : null;
                return (
                  <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                    <td className="px-5 py-3.5"><Link href={`/missions/${m.id}`} className="font-semibold text-foreground hover:underline">{m.sites?.name ?? m.clients?.name ?? "—"}</Link>
                      <div className="text-[12.5px] text-muted-foreground">{m.sites?.name ? `${m.clients?.name ?? ""} · ` : ""}{m.title}{m.sites?.city ? ` · ${m.sites.city}` : ""}</div></td>
                    <td className={`px-5 py-3.5 ${m.assignee ? "" : "font-medium text-[#8f5a12]"}`}>{m.assignee ?? "Sans agent"}</td>
                    <td className="num px-5 py-3.5 whitespace-nowrap">{formatDate(m.scheduled_date)}<div className="text-[12.5px] text-muted-foreground">{m.start_time ? m.start_time.slice(0, 5) : "—"}{m.arrived_at ? ` · arrivée ${fmt(m.arrived_at)}` : ""}</div></td>
                    <td className="num px-5 py-3.5 whitespace-nowrap">{endPlanned ?? "—"}<div className="text-[12.5px] text-muted-foreground">{m.departed_at ? `départ ${fmt(m.departed_at)}` : ""}</div></td>
                    <td className="px-5 py-3.5"><StageBadge stage={m.stage} /></td>
                    <td className="px-5 py-3.5">{v ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT[v.r.verdict as keyof typeof VERDICT]}`}>{v.r.verdictLabel}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-5 py-3.5 text-right"><Link href={`/missions/${m.id}`} className="text-[13px] font-medium text-primary hover:underline">Ouvrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}

      {!["calendrier", "liste"].includes(view) && (!rows.length ? (
        <Card><Empty>Aucune mission sur cette période. Les missions se créent depuis les contrats (« Générer le planning ») ou à l&apos;unité depuis le planning.</Empty></Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader><CardTitle className="capitalize">{g.title}</CardTitle></CardHeader>
              <ul className="divide-y divide-slate-100">{g.items.map((m) => <MissionRow key={m.id} m={m} back={back} activity={famOf.get(m.id)} showDate={!["jour", "semaine", "mois", "calendrier"].includes(view)} />)}</ul>
            </Card>
          ))}
        </div>
      ))}
      <p className="mt-4 text-xs text-slate-400">Étapes : {STAGES.map(([, l]) => l).join(" → ")}. « Facturée » est posée automatiquement quand la mission entre dans une facture.</p>
    </>
  );
}

