import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import type { TrainingState } from "@/lib/formation";
import { Gate } from "@/components/agent/gate";
import { PrintButton } from "@/components/nettoyeur/print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificat — ProClean", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CleanerCertificate({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_training", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} back={{ href: "/connexion", label: "Me connecter" }} />;
  const t = data as TrainingState;
  if (!t.certified_at) return <Gate text="Le certificat est délivré quand les deux modules de la formation sont réussis." back={{ href: `/nettoyeur/${token}/formation`, label: "Aller à la formation" }} />;
  const day = new Date(t.certified_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  return (
    <>
      <div className="rounded-3xl border-2 border-[var(--a-pri)] bg-[var(--a-card)] p-6 text-center print:border-black">
        <Award className="mx-auto h-12 w-12 text-[var(--a-pri)]" />
        <div className="mt-2 text-[12px] font-extrabold uppercase tracking-[0.2em] text-[var(--a-mute)]">ProClean Empire</div>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">Certificat de nettoyeur ProClean</h1>
        <p className="mt-5 text-[14px] text-[var(--a-mute)]">décerné à</p>
        <p className="mt-1 text-[30px] font-extrabold leading-tight">{t.name}</p>
        <p className="mx-auto mt-4 max-w-xs text-[15px]">pour avoir réussi la formation à l&apos;utilisation de l&apos;application et aux process de ménage ProClean, avec une note de <b>{t.score} %</b>.</p>
        <div className="mt-6 flex justify-between text-left text-[13px] text-[var(--a-mute)]"><span>Délivré le<br /><b className="text-[var(--a-ink)]">{day}</b></span><span className="text-right">Certificat n°<br /><b className="text-[var(--a-ink)]">{t.certificate_no}</b></span></div>
      </div>
      <div className="mt-4 flex flex-col gap-2 print:hidden">
        <PrintButton />
        <Link href={`/nettoyeur/${token}/formation`} className="flex h-12 items-center justify-center rounded-2xl bg-[var(--a-card)] text-base font-bold">Retour à la formation</Link>
      </div>
    </>
  );
}
