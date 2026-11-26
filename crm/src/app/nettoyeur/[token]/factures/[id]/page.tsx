import type { Metadata } from "next";
import Link from "next/link";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { eur } from "@/lib/cleaner-ui";
import { Gate } from "@/components/agent/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Facture — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Invoice = {
  invoice_no: string; date: string; amount: number; status: "a_payer" | "paye"; paid_on: string | null;
  cleaner: { name: string; siret: string | null; statut: string; email: string; city: string | null; iban_hint: string | null };
  lines: { date: string; city: string | null; cleaning: number; linen: number }[];
};
const fr = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Facture du nettoyeur à ProClean Empire pour les ménages demandés au paiement. */
export default async function CleanerInvoice({ params }: { params: { token: string; id: string } }) {
  if (!isToken(params.token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_invoice", { p_token: params.token, p_payout: params.id });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const inv = data as Invoice, c = inv.cleaner;
  const tva = c.statut === "entreprise" ? "TVA selon votre régime." : "TVA non applicable, art. 293 B du CGI.";
  return (
    <>
      <Link href={`/nettoyeur/${params.token}/gains`} className="mb-3 inline-block text-[14px] font-bold text-[var(--a-pri)] print:hidden">← Mes gains</Link>
      <article className="rounded-3xl border border-[var(--a-line)] p-5 text-[14px]">
        <h1 className="text-[24px] font-extrabold tracking-tight">Facture {inv.invoice_no}</h1>
        <p className="text-[var(--a-mute)]">Émise le {fr(inv.date)} · {inv.status === "paye" ? `Payée le ${inv.paid_on ? fr(inv.paid_on) : ""}` : "À payer par virement"}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><b className="block">Émetteur</b>{c.name}<br />{c.siret ? <>SIRET {c.siret}<br /></> : null}{c.city}<br />{c.email}</div>
          <div><b className="block">Client</b>ProClean Empire<br />Pontoise (95)<br />contact@procleanempire.com</div>
        </div>
        <table className="mt-5 w-full text-left">
          <thead><tr className="border-b border-[var(--a-line)] text-[var(--a-mute)]"><th className="py-2">Date</th><th>Prestation</th><th className="text-right">Ménage</th><th className="text-right">Draps</th></tr></thead>
          <tbody>{inv.lines.map((l, i) => (
            <tr key={i} className="border-b border-[var(--a-line)]"><td className="py-2">{fr(l.date)}</td><td>Ménage{l.city ? ` — ${l.city}` : ""}</td><td className="num text-right">{eur(l.cleaning)}</td><td className="num text-right">{Number(l.linen) ? eur(l.linen) : "—"}</td></tr>
          ))}</tbody>
        </table>
        <p className="num mt-4 text-right text-[20px] font-extrabold">Total : {eur(inv.amount)}</p>
        <p className="mt-3 text-[var(--a-mute)]">{tva}{c.iban_hint ? ` Paiement par virement sur l'IBAN ${c.iban_hint}.` : ""}</p>
      </article>
      <p className="mt-3 text-center text-[13px] text-[var(--a-mute)] print:hidden">Pour l&apos;enregistrer en PDF : menu de votre navigateur › Imprimer › Enregistrer en PDF.</p>
    </>
  );
}
