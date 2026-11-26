import type { Metadata } from "next";
import Link from "next/link";
import { Award, CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { MODULES, type FormationModule, type TrainingState } from "@/lib/formation";
import { AgentHeader } from "@/components/agent/header";
import { Gate } from "@/components/agent/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Formation — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CleanerTraining({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_training", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} back={{ href: "/connexion", label: "Me connecter" }} />;
  const t = data as TrainingState;
  const left = (["app", "process"] as FormationModule[]).filter((m) => !t.modules[m].passed).length;
  return (
    <>
      <AgentHeader token={token} base="nettoyeur" name={t.name} title="Formation ProClean" sub="Révision, puis test. Deux modules à réussir." />
      <section className={`mb-4 rounded-3xl p-5 ${t.certified_at ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>
        <div className="flex items-center gap-3">
          {t.certified_at ? <Award className="h-9 w-9 shrink-0" /> : <Lock className="h-9 w-9 shrink-0" />}
          <div>
            <b className="block text-[18px]">{t.certified_at ? "Vous êtes certifié(e) ProClean" : "Ménages bloqués pour le moment"}</b>
            <span className="text-[14px] font-semibold">{t.certified_at ? `Certificat ${t.certificate_no} · note ${t.score} %` : left === 2 ? `Réussissez les deux modules (${t.pass_mark} % minimum) pour accepter des ménages.` : `Plus qu'un module à réussir pour accepter des ménages.`}</span>
          </div>
        </div>
        {t.certified_at && <Link href={`/nettoyeur/${token}/certificat`} className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-[var(--a-ok)] text-base font-extrabold text-[var(--a-bg)]">Voir mon certificat</Link>}
      </section>
      <div className="space-y-3">
        {(["app", "process"] as FormationModule[]).map((m) => {
          const s = t.modules[m];
          return (
            <Link key={m} href={`/nettoyeur/${token}/formation/${m}`} className="flex items-center gap-3 rounded-3xl bg-[var(--a-card)] p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${s.passed ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-soft)] text-[var(--a-pri)]"}`}>{s.passed ? <CheckCircle2 className="h-6 w-6" /> : <span className="num text-[18px] font-extrabold">{m === "app" ? 1 : 2}</span>}</span>
              <span className="min-w-0 flex-1"><b className="block text-[17px]">{MODULES[m].title}</b><span className="text-[13px] text-[var(--a-mute)]">{MODULES[m].lead}</span><span className="mt-1 block text-[13px] font-bold">{s.passed ? `Réussi · meilleure note ${s.best} %` : s.attempts ? `Meilleure note ${s.best} % · ${t.pass_mark} % demandés` : `${s.questions} questions · ${t.pass_mark} % demandés`}</span></span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--a-mute)]" />
            </Link>
          );
        })}
      </div>
      <p className="mt-4 rounded-2xl bg-[var(--a-card)] p-3 text-[13px] text-[var(--a-mute)]">Les ménages à Paris sont attribués aux meilleures notes : {t.paris_min} % de moyenne minimum. Vous pouvez repasser un test autant de fois que nécessaire.</p>
    </>
  );
}
