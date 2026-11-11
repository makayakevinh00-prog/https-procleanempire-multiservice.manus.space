import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken, type AgentProfile } from "@/lib/agent";
import { agentRequestDeletionAction } from "@/app/actions/agent";
import { dict } from "@/lib/field-ui";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes données — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function DataPage({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_profile", { p_token: params.token });
  if (error) return <Invalid t={t} text={agentMessage(error.message)} />;
  const p = data as AgentProfile;
  return (
    <>
      <Link href={`/agent/${params.token}/profil`} className="mb-2 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />{t.back}</Link>
      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight">{t.deleteData}</h1>
      {searchParams.error && <div role="alert" className="mb-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{t.deleteSent}</div>}
      <p className="mb-4 rounded-2xl bg-[var(--a-card)] p-4 text-[15px] text-[var(--a-mute)]">{t.deleteExplain}</p>
      {p.deletion_requested_at ? (
        <p className="rounded-2xl bg-[var(--a-soft)] p-4 text-[16px] font-bold text-[var(--a-pri)]">{t.deleteDone} {new Date(p.deletion_requested_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")}.</p>
      ) : (
        <form action={agentRequestDeletionAction.bind(null, params.token)}>
          <button className="h-14 w-full rounded-2xl bg-[var(--a-bad)] text-[17px] font-extrabold text-white active:opacity-90">{t.deleteConfirm}</button>
        </form>
      )}
    </>
  );
}
