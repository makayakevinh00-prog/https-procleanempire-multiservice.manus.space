import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { Gate } from "@/components/agent/gate";
import { BackToProfile } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ma fiabilité — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Ce que le nettoyeur voit de sa propre fiabilité : c'est ce chiffre qui le place en tête des demandes. */
export default async function CleanerReliability({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const r = (data as CleanerOverview).reliability;
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">Ma fiabilité</h1>
      {!r ? <p className="mt-4 rounded-3xl bg-[var(--a-card)] p-6 text-center text-[var(--a-mute)]">Votre fiabilité s&apos;affichera après vos premiers ménages.</p> : (
        <section className="mt-4 rounded-3xl bg-[var(--a-card)] p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Score</h2>
            <b className="num text-[34px] font-extrabold text-[var(--a-ok)]">{r.score == null ? "—" : `${r.score} %`}</b>
          </div>
          <p className="mt-1 text-[14px] text-[var(--a-mute)]">{r.score == null ? "Votre score s'affiche à partir de 3 ménages terminés." : "Part de vos ménages validés du premier coup."}</p>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px] font-bold">
            <li className="rounded-2xl border border-[var(--a-line)] p-2"><div className="num text-[20px] font-extrabold">{r.clean}</div>validés du premier coup</li>
            <li className="rounded-2xl border border-[var(--a-line)] p-2"><div className="num text-[20px] font-extrabold">{r.redo}</div>avec reprise</li>
            <li className="rounded-2xl border border-[var(--a-line)] p-2"><div className="num text-[20px] font-extrabold">{r.missed}</div>non honorés</li>
          </ul>
          {r.ratings ? <p className="mt-3 text-[15px] font-bold">Note des clients : {String(r.stars).replace(".", ",")} / 5 <span className="font-normal text-[var(--a-mute)]">({r.ratings} avis)</span></p> : null}
          <p className="mt-3 text-[14px] text-[var(--a-mute)]">Plus votre score est haut, plus vous recevez les demandes en premier. Passer une demande ne vous coûte rien : seuls comptent les ménages que vous avez acceptés.</p>
        </section>
      )}
    </>
  );
}
