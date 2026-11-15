import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, FileText, Download } from "lucide-react";
import { agentClient, agentMessage, agentPrefs, isToken } from "@/lib/agent";
import { dict } from "@/lib/field-ui";
import { Invalid } from "@/components/agent/invalid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fiches de paie — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };
type Slip = { id: string; period: string; file_name: string; net_amount: number | null };
const month = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/** Fiches de paie de l'agent salarié : déposées par la direction, à ouvrir ou télécharger. */
export default async function PayslipsPage({ params }: { params: { token: string } }) {
  const t = dict(agentPrefs().lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  const { data, error } = await agentClient().rpc("agent_payslips", { p_token: params.token });
  const missing = !!error && /agent_payslips|schema cache|does not exist/i.test(error.message);
  if (error && !missing) return <Invalid t={t} text={agentMessage(error.message)} />;
  const slips = (missing ? [] : (data ?? [])) as Slip[];
  return (
    <>
      <Link href={`/agent/${params.token}/profil`} className="mb-2 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />{t.back}</Link>
      <h1 className="mb-1 text-[30px] font-extrabold tracking-tight">Fiches de paie</h1>
      <p className="mb-4 text-[15px] text-[var(--a-mute)]">Vos bulletins de salaire, déposés chaque mois par la direction. Gardez-les sans limite de durée.</p>
      {!slips.length ? <p className="rounded-3xl bg-[var(--a-card)] p-6 text-center text-[16px] text-[var(--a-mute)]">Aucune fiche de paie pour l&apos;instant.</p> : (
        <ul className="space-y-2">{slips.map((s) => (
          <li key={s.id}><a href={`/agent/${params.token}/paie/${s.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-[var(--a-card)] p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-soft)] text-[var(--a-pri)]"><FileText className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><b className="block text-[17px] capitalize">{month(s.period)}</b>{s.net_amount != null && <span className="block text-[14px] text-[var(--a-mute)]">Net à payer : {Number(s.net_amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>}</span>
            <Download className="h-5 w-5 text-[var(--a-mute)]" />
          </a></li>
        ))}</ul>
      )}
    </>
  );
}
