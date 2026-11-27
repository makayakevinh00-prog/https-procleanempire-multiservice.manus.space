import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { RecipientPicker } from "@/components/crm/recipient-picker";
import { approveAndSendEmailAction, rejectPreparedEmailAction } from "@/app/actions/agent-mail";
import type { Recipient } from "@/lib/recipients";
import { formatDate } from "@/lib/utils";

export interface PreparedMail { id: string; agent_key: string; created_at: string; payload: { subject?: string; body?: string } }

/** E-mails rédigés par les agents pour ce client : un objet par sujet, vous lisez, vous cliquez, ça part. Rien ne part sans votre clic. */
export function PreparedMails({ mails, recipients, back }: { mails: PreparedMail[]; recipients: Recipient[]; back: string }) {
  if (!mails.length) return null;
  return (
    <section id="mails" className="mb-4 scroll-mt-24 rounded-xl border border-border bg-secondary/40">
      <h2 className="flex items-center gap-2 px-4 pt-2.5 text-sm font-semibold"><Mail className="h-4 w-4 text-amber-700" />E-mails préparés ({mails.length}) · à vérifier et envoyer</h2>
      <ul className="divide-y divide-amber-200/60">
        {mails.map((m) => (
          <li key={m.id} className="flex items-start gap-2 px-4 py-1.5">
            <details className="min-w-0 flex-1 text-sm">
              <summary className="cursor-pointer truncate py-1 font-medium">{m.payload.subject} <span className="text-xs font-normal text-muted-foreground">· {formatDate(m.created_at)}</span></summary>
              <pre className="mb-2 mt-1 whitespace-pre-wrap rounded-lg border bg-card p-3 font-sans text-slate-700">{m.payload.body}</pre>
            </details>
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              <ConfirmAction action={approveAndSendEmailAction.bind(null, m.id, back)} size="sm" label="Envoyer" title="Envoyer cet e-mail ?" confirmLabel="Envoyer maintenant"
                description="L'e-mail part tout de suite, avec exactement l'objet et le texte affichés. Choisissez les destinataires."
                extra={<RecipientPicker recipients={recipients} />} />
              <form action={rejectPreparedEmailAction.bind(null, m.id, back)}><Button size="sm" variant="outline" type="submit">Écarter</Button></form>
            </div>
          </li>
        ))}
      </ul>
      <div className="h-1.5" />
    </section>
  );
}

/** Rappel compact : pastille « n e-mail(s) » qui mène à la fiche client. */
export const MailBadge = ({ clientId, n }: { clientId: string; n: number }) => (
  <Link href={`/clients/${clientId}#mails`} title={`${n} e-mail${n > 1 ? "s" : ""} à envoyer`} className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#dbe6fc] px-2 py-0.5 text-xs font-semibold text-primary hover:bg-[#c9d9fa]"><Mail className="h-3 w-3" />{n}</Link>
);
