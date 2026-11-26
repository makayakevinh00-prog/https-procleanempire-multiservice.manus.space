import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { MODULES, isModule } from "@/lib/formation";
import { Gate } from "@/components/agent/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Formation — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Le cours seul : l'examen est sur une autre page, pour ne pas pouvoir remonter lire les réponses. */
export default async function CleanerModule({ params }: { params: { token: string; module: string } }) {
  const { token, module } = params;
  if (!isToken(token) || !isModule(module)) return <Gate text="Ce lien n'est pas valide." />;
  const { error } = await agentClient().rpc("cleaner_training", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} back={{ href: "/connexion", label: "Me connecter" }} />;
  const m = MODULES[module];
  return (
    <>
      <Link href={`/nettoyeur/${token}/formation`} className="mb-3 inline-flex items-center gap-1 text-[14px] font-bold text-[var(--a-mute)]"><ArrowLeft className="h-4 w-4" />Formation</Link>
      <h1 className="text-[26px] font-extrabold tracking-tight">{m.title}</h1>
      <p className="mb-4 text-[15px] text-[var(--a-mute)]">{m.lead}</p>
      <h2 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">Le cours</h2>
      <div className="mb-6 space-y-3">
        {m.revision.map((r) => (
          <section key={r.title} className="rounded-3xl bg-[var(--a-card)] p-4">
            <b className="mb-2 block text-[17px]">{r.title}</b>
            <ul className="space-y-2 text-[15px]">{r.points.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--a-pri)]" /><span>{p}</span></li>)}</ul>
          </section>
        ))}
      </div>
      <p className="mb-3 rounded-2xl bg-[var(--a-card)] p-3 text-[13px] text-[var(--a-mute)]">L&apos;examen est sur une page à part : une fois commencé, vous ne pourrez plus relire le cours. L&apos;examen est chronométré (20 minutes) : prenez le temps de bien le lire avant.</p>
      <Link href={`/nettoyeur/${token}/formation/${module}/examen`} className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Passer l&apos;examen</Link>
    </>
  );
}
