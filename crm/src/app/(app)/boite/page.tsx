import Link from "next/link";
import { Inbox, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Seg } from "@/components/crm/home-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { replyInboxAction, setInboxStatusAction } from "@/app/actions/inbox";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mails clients" };

/** Boîte de réception : les e-mails reçus des clients, les plus récents d'abord, avec réponse directe. */
export default async function InboxPage({ searchParams }: { searchParams: { v?: string } }) {
  const { data, error } = await createClient().from("inbound_emails").select("id, from_email, from_name, subject, body, received_at, status, replied_at, client_id, clients(id, name)").order("received_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const all = (data ?? []) as any[];
  const todo = all.filter((m) => m.status === "a_repondre");
  const done = all.filter((m) => m.status !== "a_repondre");
  const view = searchParams.v === "traites" ? "traites" : "todo";
  const shown = view === "todo" ? todo : done;
  // Les clients connus passent avant les expéditeurs inconnus.
  const rows = [...shown].sort((a, b) => Number(!!b.client_id) - Number(!!a.client_id));

  return (
    <>
      <PageHeader title="Mails clients" subtitle="Les e-mails que vos clients vous envoient, à traiter en priorité. Répondez ici : la réponse part au client." />
      <div className="mb-4">
        <Seg items={[
          { href: "/boite", label: "À répondre", count: todo.length, active: view === "todo", alert: todo.length > 0 },
          { href: "/boite?v=traites", label: "Répondus et classés", count: done.length, active: view === "traites" }
        ]} />
      </div>
      {!rows.length ? (
        <Empty>{view === "todo" ? "Rien à répondre pour le moment." : "Aucun message traité."}</Empty>
      ) : (
        <ul className="page-enter space-y-2">
          {rows.map((m) => (
            <li key={m.id} className="pce-card rounded-xl border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {m.clients ? <Link href={`/clients/${m.clients.id}`} className="font-semibold hover:underline">{m.clients.name}</Link> : <span className="font-semibold">{m.from_name || m.from_email}</span>}
                <span className="text-xs text-muted-foreground">{m.from_email}</span>
                {!m.clients && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">expéditeur inconnu</span>}
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(m.received_at)}{m.status === "repondu" && m.replied_at ? ` · répondu le ${formatDate(m.replied_at)}` : m.status === "traite" ? " · classé" : ""}</span>
              </div>
              <details className="mt-1 text-sm" open={m.status === "a_repondre" && rows.length <= 3}>
                <summary className="cursor-pointer truncate font-medium">{m.subject || "(sans objet)"}</summary>
                <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 font-sans text-slate-700">{m.body || "(message vide)"}</pre>
              </details>
              <div className="mt-2 flex flex-wrap items-start gap-2">
                <details className="min-w-0 flex-1">
                  <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"><Send className="h-3.5 w-3.5" />Répondre</summary>
                  <form action={replyInboxAction.bind(null, m.id)} className="mt-2 space-y-2">
                    <Textarea name="body" rows={5} required placeholder="Votre réponse…" />
                    <Button size="sm" type="submit">Envoyer la réponse à {m.from_email}</Button>
                  </form>
                </details>
                {m.status === "a_repondre"
                  ? <form action={setInboxStatusAction.bind(null, m.id, "traite")}><Button size="sm" variant="outline" type="submit">Classer sans répondre</Button></form>
                  : <form action={setInboxStatusAction.bind(null, m.id, "a_repondre")}><Button size="sm" variant="outline" type="submit">Remettre à répondre</Button></form>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
