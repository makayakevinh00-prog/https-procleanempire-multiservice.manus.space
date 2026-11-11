import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { eur } from "@/lib/cleaner-ui";
import { Gate } from "@/components/agent/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gains — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const fr = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Gains : ce qui est à venir, validé, en cours de paiement et déjà payé. */
export default async function CleanerEarnings({ params }: { params: { token: string } }) {
  if (!isToken(params.token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: params.token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  const tile = "rounded-3xl border border-[var(--a-line)] p-4";
  return (
    <>
      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight">Mes gains</h1>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={tile}><div className="text-[13px] font-bold text-[var(--a-mute)]">À venir</div><div className="num mt-1 text-[26px] font-extrabold">{eur(o.pending_amount)}</div><div className="text-[12px] text-[var(--a-mute)]">ménages acceptés, pas encore validés</div></div>
        <div className={tile}><div className="text-[13px] font-bold text-[var(--a-mute)]">Validé, à payer</div><div className="num mt-1 text-[26px] font-extrabold text-[var(--a-pri)]">{eur(Number(o.to_pay_amount) + Number(o.in_payout_amount))}</div><div className="text-[12px] text-[var(--a-mute)]">prochain virement</div></div>
        <div className={tile}><div className="text-[13px] font-bold text-[var(--a-mute)]">Déjà payé</div><div className="num mt-1 text-[26px] font-extrabold text-[var(--a-ok)]">{eur(o.paid_amount)}</div></div>
        <div className={tile}><div className="text-[13px] font-bold text-[var(--a-mute)]">Ménages validés</div><div className="num mt-1 text-[26px] font-extrabold">{o.done}</div></div>
      </div>
      {!o.has_iban && <p className="mb-4 rounded-2xl bg-[var(--a-warnbg)] p-4 text-[14px] font-bold text-[var(--a-warn)]">Ajoutez votre IBAN dans Profil pour être payé.</p>}
      <p className="mb-4 rounded-2xl bg-[var(--a-card)] p-4 text-[14px] text-[var(--a-mute)]">Vous êtes payé par virement après validation de chaque ménage par la direction, au début de chaque semaine ou en fin de mois. Votre part est affichée sur chaque demande avant d&apos;accepter.</p>
      <h2 className="mb-2 text-[20px] font-extrabold">Historique des virements</h2>
      {!o.payouts.length ? <p className="py-6 text-center text-[var(--a-mute)]">Aucun virement pour le moment.</p> : (
        <ul className="space-y-2">{o.payouts.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--a-card)] p-4">
            <span><b className="block text-[16px]">{fr(p.period_start)} – {fr(p.period_end)}</b><span className="text-[13px] text-[var(--a-mute)]">{p.jobs} ménage{p.jobs > 1 ? "s" : ""}{p.status === "paye" && p.paid_on ? ` · payé le ${fr(p.paid_on)}` : " · en cours de paiement"}</span></span>
            <b className="num text-[18px]">{eur(p.amount)}</b>
          </li>
        ))}</ul>
      )}
    </>
  );
}
