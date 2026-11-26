import Link from "next/link";
import { Mail } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card id="mails" className="mb-6 scroll-mt-24 border-amber-300 bg-amber-50/40">
      <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-amber-700" />E-mails préparés ({mails.length}) · à vérifier et envoyer</span></CardTitle></CardHeader>
      <ul className="divide-y">
        {mails.map((m) => (
          <li key={m.id} className="space-y-2 px-6 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[15px] font-semibold">Objet : {m.payload.subject}</span>
              <span className="text-xs text-muted-foreground">préparé le {formatDate(m.created_at)}</span>
            </div>
            <details className="rounded-lg border bg-card p-3 text-sm" open={mails.length === 1}>
              <summary className="cursor-pointer font-medium">Lire le message</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-700">{m.payload.body}</pre>
            </details>
            <div className="flex flex-wrap items-center gap-2">
              <ConfirmAction action={approveAndSendEmailAction.bind(null, m.id, back)} size="sm" label="Envoyer" title="Envoyer cet e-mail ?" confirmLabel="Envoyer maintenant"
                description="L'e-mail part tout de suite, avec exactement l'objet et le texte affichés. Choisissez les destinataires."
                extra={<RecipientPicker recipients={recipients} />} />
              <form action={rejectPreparedEmailAction.bind(null, m.id, back)}><Button size="sm" variant="outline" type="submit">Écarter</Button></form>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Rappel compact : pastille « n e-mail(s) » qui mène à la fiche client. */
export const MailBadge = ({ clientId, n }: { clientId: string; n: number }) => (
  <Link href={`/clients/${clientId}#mails`} className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"><Mail className="h-3 w-3" />{n} à envoyer</Link>
);
