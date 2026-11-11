import type { Metadata } from "next";
import Link from "next/link";
import { Home, CheckCircle2, XCircle } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentReport } from "@/lib/agent";
import { dict, shortDate } from "@/lib/field-ui";
import { AgentHeader } from "@/components/agent/header";
import { StagePill } from "@/components/agent/stage-pill";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rapport — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Rapport personnel de l'agent : sites contrôlés, taux de validation, missions annulées, progression et historique récent. */
export default async function ReportPage({ params }: { params: { token: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_report", { p_token: params.token });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const r = data as AgentReport;
  const pct = r.done ? Math.round((100 * r.validated) / r.done) : 0;
  const stat = "flex flex-col gap-2 rounded-3xl border border-[var(--a-line)] p-4";
  return (
    <>
      <AgentHeader token={params.token} name={r.agent} title={t.reports} />
      <div className="mb-3 grid grid-cols-3 gap-2.5">
        <div className={stat}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--a-soft)] text-[var(--a-pri)]"><Home className="h-5 w-5" /></span><b className="num text-[32px] leading-none">{r.sites_checked}</b><span className="text-[13px] font-bold leading-tight text-[var(--a-mute)]">{t.sitesChecked}</span></div>
        <div className={stat}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--a-okbg)] text-[var(--a-ok)]"><CheckCircle2 className="h-5 w-5" /></span><b className="num text-[32px] leading-none">{r.rate}%</b><span className="text-[13px] font-bold leading-tight text-[var(--a-mute)]">{t.validationRate}</span></div>
        <div className={stat}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--a-badbg)] text-[var(--a-bad)]"><XCircle className="h-5 w-5" /></span><b className="num text-[32px] leading-none">{r.cancelled}</b><span className="text-[13px] font-bold leading-tight text-[var(--a-mute)]">{t.cancelled}</span></div>
      </div>

      <section className="mb-5 rounded-3xl border border-[var(--a-line)] p-4">
        <div className="flex items-center justify-between"><b className="text-[17px]">{t.progress}</b><span className="text-[15px] text-[var(--a-mute)]">{t.validatedOn(r.validated, r.done)}</span></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--a-card)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--a-pri)]" style={{ width: `${pct}%` }} /></div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-[24px] font-extrabold">{t.history}</h2><Link href={`/agent/${params.token}/historique`} className="text-[16px] font-extrabold text-[var(--a-pri)]">{t.seeAll}</Link></div>
        {!r.recent.length ? <p className="py-10 text-center text-[17px] text-[var(--a-mute)]">{t.noHistory}</p> : (
          <ul className="space-y-2">{r.recent.slice(0, 5).map((m) => (
            <li key={m.id}><Link href={`/agent/${params.token}/mission/${m.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--a-card)] p-4">
              <span className="min-w-0"><span className="block truncate text-[16px] font-extrabold">{m.client}</span><span className="block truncate text-[13px] text-[var(--a-mute)]">{shortDate(m.date, lang)}{m.time ? ` · ${m.time.slice(0, 5)}` : ""} · {m.site ?? m.title}</span></span>
              <StagePill stage={m.stage} t={t} />
            </Link></li>
          ))}</ul>
        )}
      </section>
    </>
  );
}
