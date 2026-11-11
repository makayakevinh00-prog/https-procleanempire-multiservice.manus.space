import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentReport } from "@/lib/agent";
import { dict, shortDate } from "@/lib/field-ui";
import { StagePill } from "@/components/agent/stage-pill";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Historique — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function HistoryPage({ params }: { params: { token: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_report", { p_token: params.token });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const r = data as AgentReport;
  return (
    <>
      <Link href={`/agent/${params.token}/rapport`} className="mb-2 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />{t.back}</Link>
      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight">{t.historyAll}</h1>
      {!r.recent.length ? <p className="py-10 text-center text-[17px] text-[var(--a-mute)]">{t.noHistory}</p> : (
        <ul className="space-y-2">{r.recent.map((m) => (
          <li key={m.id}><Link href={`/agent/${params.token}/mission/${m.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--a-card)] p-4">
            <span className="min-w-0"><span className="block truncate text-[16px] font-extrabold">{m.client}</span><span className="block truncate text-[13px] text-[var(--a-mute)]">{shortDate(m.date, lang)}{m.time ? ` · ${m.time.slice(0, 5)}` : ""} · {m.site ?? m.title}</span></span>
            <StagePill stage={m.stage} t={t} />
          </Link></li>
        ))}</ul>
      )}
    </>
  );
}
