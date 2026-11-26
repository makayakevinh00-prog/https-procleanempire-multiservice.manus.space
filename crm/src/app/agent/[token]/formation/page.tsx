import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Lock, PenLine } from "lucide-react";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { AGENT_MODULES, MODULE_LIST, type AgentTrainingState } from "@/lib/formation";
import { AgentHeader } from "@/components/agent/header";
import { Gate } from "@/components/agent/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Formation — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CleanerTraining({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("agent_training", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} back={{ href: "/connexion", label: "Me connecter" }} />;
  const t = data as AgentTrainingState;
  const left = MODULE_LIST.filter((m) => !t.modules[`agent_${m}`].passed).length;
  return (
    <>
      <AgentHeader token={token} base="agent" name={t.name} title="Formation ProClean" sub="Le cours, puis l'examen. Trois modules à réussir pour votre certificat." />
      <section className={`mb-4 rounded-3xl p-5 ${t.certified_at ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>
        <div className="flex items-center gap-3">
          {t.certified_at ? <Award className="h-9 w-9 shrink-0" /> : <Lock className="h-9 w-9 shrink-0" />}
          <div>
            <b className="block text-[18px]">{t.certified_at ? "Vous êtes certifié(e) ProClean" : "Formation à terminer"}</b>
            <span className="text-[14px] font-semibold">{t.certified_at ? `Certificat ${t.certificate_no} · note ${t.score} %` : left === MODULE_LIST.length ? `Réussissez les trois modules (${t.pass_mark} % minimum) pour obtenir votre certificat.` : `Plus que ${left} module(s) à réussir.`}</span>
          </div>
        </div>
        {t.certified_at && <Link href={`/agent/${token}/certificat`} className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-[var(--a-ok)] text-base font-extrabold text-[var(--a-bg)]">Voir mon certificat</Link>}
      </section>
      <div className="space-y-3">
        {MODULE_LIST.map((m) => {
          const s = t.modules[`agent_${m}`];
          return (
            <div key={m} className="rounded-3xl bg-[var(--a-card)] p-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${s.passed ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{s.passed ? <CheckCircle2 className="h-6 w-6" /> : <span className="num text-[18px] font-extrabold">{MODULE_LIST.indexOf(m) + 1}</span>}</span>
                <span className="min-w-0 flex-1"><b className="block text-[17px]">{AGENT_MODULES[m].title}</b><span className="text-[13px] text-[var(--a-mute)]">{AGENT_MODULES[m].lead}</span><span className="mt-1 block text-[13px] font-bold">{s.passed ? `Réussi · meilleure note ${s.best} %` : s.attempts ? `Meilleure note ${s.best} % · ${t.pass_mark} % demandés` : `${s.questions} questions · ${t.pass_mark} % demandés`}</span></span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/agent/${token}/formation/${m}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--a-soft)] text-[15px] font-extrabold text-[var(--a-pri)]"><BookOpen className="h-5 w-5" />Le cours</Link>
                <Link href={`/agent/${token}/formation/${m}/examen`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--a-pri)] text-[15px] font-extrabold text-white"><PenLine className="h-5 w-5" />L&apos;examen</Link>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 rounded-2xl bg-[var(--a-card)] p-3 text-[13px] text-[var(--a-mute)]">Vous pouvez repasser un examen autant de fois que nécessaire.</p>
    </>
  );
}
