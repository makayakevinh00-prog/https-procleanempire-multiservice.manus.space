import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { Gate } from "@/components/agent/gate";
import { BackToProfile } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comment ça marche — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const h = (t: string) => t.slice(0, 5).replace(":", "h");

/** Règles du jeu en quelques lignes, et comment joindre la direction. */
export default async function CleanerHelp({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">Comment ça marche</h1>
      <section className="mt-4 rounded-3xl bg-[var(--a-card)] p-4 text-[15px]">
        <ul className="list-disc space-y-2 pl-5">
          <li>Les ménages ont lieu entre {h(o.window_start)} et {h(o.window_end)}, jamais après {h(o.max_end)}.</li>
          <li>Le premier qui accepte obtient le ménage ; les favoris du propriétaire passent d&apos;abord.</li>
          <li>Les ménages s&apos;affichent autour de votre adresse, du plus proche au plus loin.</li>
          <li>Vous travaillez en indépendant : vous choisissez vos ménages.</li>
        </ul>
      </section>
      <a href="mailto:contact@procleanempire.com" className="fx-press mt-4 flex items-center gap-3 rounded-3xl bg-[var(--a-card)] p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--a-bg)] text-[var(--a-pri)]"><Mail className="h-6 w-6" /></span>
        <span><b className="block text-[17px]">Un problème ?</b><span className="text-[14px] text-[var(--a-mute)]">contact@procleanempire.com</span></span>
      </a>
    </>
  );
}
