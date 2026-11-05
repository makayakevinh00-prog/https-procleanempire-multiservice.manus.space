import Link from "next/link";
import { MapPin, Clock, CheckCircle2, AlertTriangle, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { SiteMapLazy } from "@/components/crm/site-map-lazy";
import type { MapPin as Pin } from "@/components/crm/site-map";

export const dynamic = "force-dynamic";
const hhmm = (t: string) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const nowMinutes = () => { const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":"); return Number(p[0]) * 60 + Number(p[1]); };
const mins = (t: string | null) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
const dur = (a: string, b?: string | null) => { const m = Math.max(0, Math.round(((b ? new Date(b).getTime() : Date.now()) - new Date(a).getTime()) / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };

type Row = { id: string; title: string; start_time: string | null; duration_hours: number | null; stage: string; arrived_at: string | null; arrived_verified: boolean | null; departed_at: string | null;
  staff: { full_name: string } | null; clients: { name: string } | null; sites: { name: string; lat: number | null; lng: number | null } | null };

export default async function OnSitePage() {
  const sb = createClient();
  const today = parisToday();
  const { data, error } = await sb.from("interventions")
    .select("id, title, start_time, duration_hours, stage, arrived_at, arrived_verified, departed_at, staff(full_name), clients(name), sites(name, lat, lng)")
    .eq("scheduled_date", today).neq("stage", "annulee").order("start_time", { nullsFirst: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const now = nowMinutes();
  const state = (r: Row): "termine" | "sur_place" | "en_retard" | "attendu" | "non_affectee" => {
    if (r.departed_at) return "termine";
    if (r.arrived_at) return "sur_place";
    if (!r.staff) return "non_affectee";
    const st = mins(r.start_time);
    return st !== null && now > st + 15 ? "en_retard" : "attendu";
  };
  const withState = rows.map((r) => ({ r, s: state(r) }));
  const count = (k: string) => withState.filter((x) => x.s === k).length;
  const LABEL = { termine: "Terminé", sur_place: "Sur place", en_retard: "Pas encore arrivé", attendu: "Attendu", non_affectee: "Pas d'agent affecté" } as const;
  const TONE = { termine: "bg-slate-100 text-slate-700", sur_place: "bg-emerald-100 text-emerald-800", en_retard: "bg-red-100 text-red-800", attendu: "bg-blue-100 text-blue-800", non_affectee: "bg-orange-100 text-orange-800" } as const;
  const COLOR = { termine: "grey", sur_place: "green", en_retard: "red", attendu: "blue", non_affectee: "orange" } as const;
  const pins: Pin[] = withState.filter((x) => x.r.sites?.lat != null && x.r.sites?.lng != null).map((x) => ({
    lat: x.r.sites!.lat!, lng: x.r.sites!.lng!, color: COLOR[x.s],
    title: `${x.r.staff?.full_name ?? "Sans agent"} — ${x.r.clients?.name ?? ""}`,
    sub: x.s === "sur_place" && x.r.arrived_at ? `Sur place depuis ${hhmm(x.r.arrived_at)}` : LABEL[x.s], href: `/missions/${x.r.id}`
  }));
  return (
    <>
      <PageHeader title="Sur place" subtitle="Où sont vos agents aujourd'hui : heure d'arrivée relevée par GPS (au moment du pointage), heure de départ et durée réelle. Rien n'est suivi en continu." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sur place" value={count("sur_place")} tone="green" icon={MapPin} />
        <Stat label="Attendus" value={count("attendu")} tone="blue" icon={Clock} />
        <Stat label="Pas encore arrivés" value={count("en_retard")} tone="red" icon={AlertTriangle} sub="plus de 15 min après l'heure" />
        <Stat label="Terminés" value={count("termine")} tone="slate" icon={CheckCircle2} />
      </div>
      <Card className="mb-4 p-3"><SiteMapLazy pins={pins} /></Card>
      <Card>
        {!rows.length ? <Empty icon={UserX}>Aucune mission aujourd&apos;hui.</Empty> : (
          <div className="divide-y">
            {withState.map(({ r, s }) => (
              <Link key={r.id} href={`/missions/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
                <div className="w-14 text-sm font-semibold tabular-nums text-slate-700">{r.start_time ? r.start_time.slice(0, 5) : "—"}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{r.staff?.full_name ?? "Sans agent"} · {r.clients?.name}</div>
                  <div className="text-sm text-slate-500">{r.sites?.name ?? r.title}{r.duration_hours ? ` · prévu ${r.duration_hours} h` : ""}</div>
                </div>
                <div className="text-right text-sm text-slate-700">
                  {r.arrived_at ? <>Arrivée {hhmm(r.arrived_at)}{r.arrived_verified ? " ✓" : " ⚠"}{r.departed_at ? <> · départ {hhmm(r.departed_at)} · <b>{dur(r.arrived_at, r.departed_at)}</b></> : <> · <b>{dur(r.arrived_at)}</b> sur place</>}</> : <span className="text-slate-400">pas de pointage</span>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE[s]}`}>{LABEL[s]}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">✓ position vérifiée dans le rayon du site · ⚠ site sans position GPS (arrivée enregistrée sans vérification).</p>
    </>
  );
}
