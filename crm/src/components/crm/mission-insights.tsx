import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Analysis, InterventionReport, Level, TimelineEvent } from "@/lib/domain/mission-analysis";
import { cn } from "@/lib/utils";

const ICON: Record<Level, typeof Info> = { ok: CheckCircle2, info: Info, warn: AlertTriangle, alert: OctagonAlert };
const TONE: Record<Level, string> = { ok: "text-success", info: "text-muted-foreground", warn: "text-warning", alert: "text-destructive" };
const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const hm = (h: number) => { const m = Math.round(h * 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "ok" | "err" }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={cn("num mt-0.5 text-[20px] font-semibold tracking-tight", tone === "err" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground")}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Analyse de la mission : chiffres clés, points d'attention classés, et la prochaine action recommandée. */
export function InsightsCard({ a }: { a: Analysis }) {
  const m = a.metrics;
  return (
    <Card>
      <CardHeader><CardTitle>Analyse de l&apos;intervention</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {a.recommendation && <p className={cn("rounded-xl px-4 py-3 text-[14px]", a.recommendation.startsWith("Prête") ? "bg-[#e6f1ea] text-[#2f7a55]" : "bg-[#f7ecdb] text-[#8f5a12]")}>{a.recommendation}</p>}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Tile label="Heures" value={m.realHours != null ? hm(m.realHours) : "—"} hint={m.plannedHours ? `${hm(m.plannedHours)} prévues` : "durée non renseignée"} tone={m.realHours != null && m.plannedHours && m.realHours > m.plannedHours * 1.3 ? "warn" : undefined} />
          <Tile label="Check-list" value={m.checklistTotal ? `${m.checklistDone}/${m.checklistTotal}` : "—"} hint={m.checklistTotal ? `${Math.round((m.checklistDone / m.checklistTotal) * 100)} %` : "aucun point"} />
          <Tile label="Photos" value={`${m.photosBefore} / ${m.photosAfter}`} hint="avant / après" />
          <Tile label="Marge estimée" value={m.margin != null ? eur0(m.margin) : "—"} hint={m.marginPct != null ? `${Math.round(m.marginPct)} % · estimation` : "prix ou durée absents"} tone={m.margin != null && m.margin < 0 ? "err" : undefined} />
        </div>
        {a.insights.length > 0 ? (
          <ul className="space-y-2">
            {a.insights.map((i) => { const I = ICON[i.level]; return (
              <li key={i.key + i.title} className="flex items-start gap-2.5 text-[14px]">
                <I className={cn("mt-0.5 h-[17px] w-[17px] shrink-0", TONE[i.level])} strokeWidth={1.8} />
                <span><span className="font-medium text-foreground">{i.title}</span>{i.detail && <span className="text-muted-foreground"> · {i.detail}</span>}</span>
              </li>
            ); })}
          </ul>
        ) : <p className="text-[14px] text-muted-foreground">Rien à signaler pour l&apos;instant : l&apos;analyse s&apos;enrichit au fil du passage (pointage, photos, check-list).</p>}
        <p className="text-[11px] text-muted-foreground">Chaque point vient d&apos;un fait enregistré (pointage GPS, photos, check-list, prix). La marge est une estimation : heures × coût horaire de vos Paramètres.</p>
      </CardContent>
    </Card>
  );
}

const DOT: Record<TimelineEvent["tone"], string> = { neutral: "bg-border", ok: "bg-success", warn: "bg-warning", alert: "bg-destructive" };
export function TimelineCard({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Chronologie</CardTitle></CardHeader>
      {!events.length ? <p className="px-6 py-5 text-[14px] text-muted-foreground">Rien d&apos;enregistré pour l&apos;instant.</p> : (
        <ol className="space-y-0 px-6 py-4">
          {events.map((e, i) => (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < events.length - 1 && <span className="absolute left-[5px] top-3.5 h-full w-px bg-border" aria-hidden />}
              <span className={cn("relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-card", DOT[e.tone])} aria-hidden />
              <div className="min-w-0 text-[13px]">
                <div className="num text-muted-foreground">{new Date(e.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                <div className="font-medium text-foreground">{e.label}</div>
                {e.detail && <div className="text-muted-foreground">{e.detail}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const VERDICT: Record<InterventionReport["verdict"], string> = { conforme: "bg-[#e6f1ea] text-[#2f7a55]", a_verifier: "bg-[#f7ecdb] text-[#8f5a12]", non_conforme: "bg-[#f6e4e1] text-[#b3382c]", en_attente: "bg-secondary text-muted-foreground" };
/** Rapport d'intervention : verdict + texte rédigé à partir des faits enregistrés. */
export function ReportCard({ r }: { r: InterventionReport }) {
  return (
    <Card>
      <CardHeader><CardTitle>Rapport d&apos;intervention</CardTitle><span className={cn("rounded-full px-3 py-1 text-[13px] font-medium", VERDICT[r.verdict])}>{r.verdictLabel}</span></CardHeader>
      <CardContent><p className="text-[14px] leading-relaxed text-secondary-foreground">{r.text}</p></CardContent>
    </Card>
  );
}
