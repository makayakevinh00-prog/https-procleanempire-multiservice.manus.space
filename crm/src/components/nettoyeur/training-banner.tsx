import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { agentClient } from "@/lib/agent";
import type { TrainingState } from "@/lib/formation";

/** Rappel affiché tant que la formation n'est pas réussie : sans certificat, aucun ménage ne peut être accepté. */
export async function TrainingBanner({ token }: { token: string }) {
  const { data, error } = await agentClient().rpc("cleaner_training", { p_token: token });
  const t = error ? null : (data as TrainingState | null);
  if (!t || t.certified_at) return null;
  const done = Object.values(t.modules).filter((m) => m.passed).length;
  return (
    <Link href={`/nettoyeur/${token}/formation`} className="mb-4 flex items-center gap-3 rounded-3xl bg-[var(--a-warnbg)] p-4 text-[var(--a-warn)]">
      <GraduationCap className="h-8 w-8 shrink-0" />
      <span className="min-w-0 flex-1"><b className="block text-[16px]">Passez votre formation ProClean</b><span className="text-[13px] font-semibold">{done}/3 modules réussis. Il faut la terminer pour accepter des ménages.</span></span>
    </Link>
  );
}
