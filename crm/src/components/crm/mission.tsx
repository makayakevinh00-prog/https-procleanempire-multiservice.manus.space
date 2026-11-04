import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { STAGE_LABEL, STAGE_TONE, nextStage, type Stage } from "@/lib/domain/missions";
import { setStageAction } from "@/app/actions/missions";
import { formatDate } from "@/lib/utils";
import { ReservedBadge } from "@/components/ui/badge";

export function StageBadge({ stage }: { stage: string }) {
  const s = stage as Stage;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_TONE[s] ?? "bg-slate-100 text-slate-700"}`}>{STAGE_LABEL[s] ?? stage}</span>;
}

/** Ligne de mission : date, client, site, intervenant, étape + bouton « étape suivante ». */
export function MissionRow({ m, back, showDate = true }: { m: any; back: string; showDate?: boolean }) {
  const next = m.invoice_id ? null : nextStage(m.stage as Stage);
  const done = (m.checklist ?? []).filter((c: any) => c.done).length, total = (m.checklist ?? []).length;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm hover:bg-slate-50">
      <Link href={`/missions/${m.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        {showDate && <span className="w-24 shrink-0 text-slate-500">{formatDate(m.scheduled_date)}</span>}
        <span className="w-12 shrink-0 font-medium text-slate-700">{m.start_time ? m.start_time.slice(0, 5) : "—"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">{m.clients?.name ?? "—"} {m.clients?.is_reserved && <ReservedBadge className="ml-1 align-middle" />}</span>
          <span className="block truncate text-xs text-slate-500">{m.title}{m.sites?.name ? ` · ${m.sites.name}` : m.site_address ? ` · ${m.site_address}` : ""}</span>
        </span>
        <span className={`hidden w-36 shrink-0 truncate sm:block ${m.assignee ? "text-slate-700" : "font-medium text-orange-600"}`}>{m.assignee ?? "Sans intervenant"}</span>
        {total > 0 && <span className="hidden w-12 shrink-0 text-xs text-slate-500 md:block" title="Check-list">{done}/{total} ✓</span>}
        <StageBadge stage={m.stage} />
      </Link>
      {next && (
        <form action={setStageAction.bind(null, m.id)}>
          <input type="hidden" name="stage" value={next} /><input type="hidden" name="back" value={back} />
          <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100" title={`Passer à « ${STAGE_LABEL[next]} »`}>
            {STAGE_LABEL[next]} <ChevronRight className="h-3 w-3" />
          </button>
        </form>
      )}
    </li>
  );
}
