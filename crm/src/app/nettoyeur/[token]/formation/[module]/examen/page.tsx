import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { MODULES, isModule, type TrainingQuestion } from "@/lib/formation";
import { Gate } from "@/components/agent/gate";
import { Quiz } from "@/components/nettoyeur/quiz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Examen — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** L'examen seul : aucune révision sur cette page. */
export default async function CleanerExam({ params }: { params: { token: string; module: string } }) {
  const { token, module } = params;
  if (!isToken(token) || !isModule(module)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_training_questions", { p_token: token, p_module: module });
  if (error) return <Gate text={agentMessage(error.message)} back={{ href: "/connexion", label: "Me connecter" }} />;
  const m = MODULES[module];
  return (
    <>
      <Link href={`/nettoyeur/${token}/formation/${module}`} className="mb-3 inline-flex items-center gap-1 text-[14px] font-bold text-[var(--a-mute)]"><ArrowLeft className="h-4 w-4" />Revoir le cours</Link>
      <h1 className="text-[26px] font-extrabold tracking-tight">Examen : {m.title}</h1>
      <p className="mb-4 text-[15px] text-[var(--a-mute)]">Répondez de mémoire, sans le cours. Le chronomètre démarre tout de suite : à zéro, vos réponses sont envoyées telles quelles et les questions vides comptent fausses. Vous pouvez repasser l&apos;examen autant de fois que nécessaire.</p>
      <Quiz token={token} module={module} questions={(data ?? []) as TrainingQuestion[]} />
    </>
  );
}
