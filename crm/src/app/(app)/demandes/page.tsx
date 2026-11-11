import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createQuoteFromRequestAction, setRequestStatusAction, dismissSpamRequestAction, restoreQuarantinedAction, deleteQuarantinedAction } from "@/app/actions/requests";
import { spamScore } from "@/lib/request-spam";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { deleteRequestAction } from "@/app/actions/manage";
import { formatDate } from "@/lib/utils";
import { REQUEST_TYPE_LABEL, type RequestType } from "@/lib/request-type";

export default async function RequestsPage({ searchParams }: { searchParams: { statut?: string } }) {
  const statut = searchParams.statut ?? "nouvelle";
  const sb = createClient();
  if (statut === "indesirables") {
    const { data: spam } = await sb.from("quote_request_spam").select("*").order("received_at", { ascending: false }).limit(100);
    return (
      <>
        <PageHeader title="Messages écartés" subtitle="Démarchage et messages sans rapport avec vos prestations, mis de côté automatiquement (conservés 90 jours). Rétablissez ceux qui sont de vraies demandes." />
        <div className="mb-4"><Link href="/demandes" className="text-sm font-medium text-primary hover:underline">← Retour aux demandes</Link></div>
        {!spam?.length ? <Card><Empty>Aucun message écarté.</Empty></Card> : (
          <div className="space-y-3">{spam.map((r: any) => (
            <Card key={r.id}><CardContent className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="font-semibold">{r.company ? `${r.company} — ${r.name}` : r.name}</div><div className="text-sm text-muted-foreground">{formatDate(r.received_at)}{r.email ? ` · ${r.email}` : ""}</div></div>
                <Badge tone="orange">Écarté</Badge>
              </div>
              {r.message && <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{r.message}</p>}
              <p className="text-xs text-muted-foreground">Pourquoi : {r.reason}</p>
              <div className="flex gap-2">
                <form action={restoreQuarantinedAction.bind(null, r.id)}><Button size="sm" variant="outline">Ce n&apos;est pas du démarchage : rétablir</Button></form>
                <form action={deleteQuarantinedAction.bind(null, r.id)}><Button size="sm" variant="ghost" className="text-red-700">Supprimer</Button></form>
              </div>
            </CardContent></Card>
          ))}</div>
        )}
      </>
    );
  }
  const { count: spamCount } = await sb.from("quote_request_spam").select("id", { count: "exact", head: true });
  let q = sb.from("quote_requests").select("*").order("received_at", { ascending: false }).limit(100);
  if (statut !== "toutes") q = q.eq("status", statut);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const tabs = [["nouvelle", "Nouvelles"], ["traitee", "Traitées"], ["ignoree", "Ignorées"], ["toutes", "Toutes"], ["indesirables", `Messages écartés${spamCount ? ` (${spamCount})` : ""}`]];
  return (
    <>
      <PageHeader title="Demandes de devis" subtitle="Chaque demande du site crée automatiquement une fiche prospect (sans doublon) et reste dans l'historique du contact. En un clic : devis brouillon pré-rempli." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([v, l]) => (
          <Link key={v} href={`/demandes?statut=${v}`} className={`rounded-full border px-3 py-1 text-sm ${statut === v ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{l}</Link>
        ))}
      </div>
      {!data?.length ? <Card><Empty>Aucune demande {statut === "nouvelle" ? "en attente" : ""}.</Empty></Card> : (
        <div className="space-y-3">
          {[...data].map((r: any) => ({ r, sp: r.status === "nouvelle" ? spamScore({ name: r.name, company: r.company, email: r.email, phone: r.phone, service: r.service, message: r.message, details: r.details }) : null })).sort((a, b) => Number(!!a.sp?.spam) - Number(!!b.sp?.spam)).map(({ r, sp }) => (
            <Card key={r.id} className={r.status === "nouvelle" && !sp?.spam ? "border-primary" : ""}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.company ? `${r.company} — ${r.name}` : r.name}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(r.received_at)} · {r.service ?? "prestation non précisée"}{r.source ? ` · source : ${r.source}` : ""}</div>
                  </div>
                  <span className="flex items-center gap-2">{sp?.spam && <Badge tone="orange">Probable démarchage</Badge>}<Badge tone="gray">{REQUEST_TYPE_LABEL[r.request_type as RequestType] ?? "Devis"}</Badge><Badge tone={r.status === "nouvelle" ? "blue" : r.status === "traitee" ? "green" : "gray"}>{r.status === "nouvelle" ? "Nouvelle" : r.status === "traitee" ? "Traitée" : "Ignorée"}</Badge></span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {r.phone && <a className="text-primary hover:underline" href={`tel:${r.phone}`}>📞 {r.phone}</a>}
                  {r.email && <a className="text-primary hover:underline" href={`mailto:${r.email}`}>✉️ {r.email}</a>}
                  {(r.address || r.city) && <span>📍 {[r.address, [r.postcode, r.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>}
                  {r.start_date && <span>🗓 début souhaité : {r.start_date}</span>}
                </div>
                {sp?.spam && <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Ressemble à du démarchage : {sp.reasons.join(", ")}. Un clic sur « Écarter » la retire de vos actions.</p>}
                {r.message && <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{r.message}</p>}
                {Object.keys(r.details ?? {}).length > 0 && (
                  <ul className="grid gap-x-6 text-xs text-muted-foreground sm:grid-cols-2">{Object.entries(r.details).map(([k, v]) => <li key={k}><b>{k} :</b> {String(v)}</li>)}</ul>
                )}
                <div className="flex flex-wrap gap-2">
                  {r.client_id && <Link href={`/clients/${r.client_id}`} className="text-sm font-medium text-primary hover:underline">→ Fiche prospect / client</Link>}
                  {r.quote_id ? <Link href={`/devis/${r.quote_id}`} className="text-sm font-medium text-primary hover:underline">→ Voir le devis créé</Link> : (
                    <form action={createQuoteFromRequestAction.bind(null, r.id)}><Button>{r.client_id ? "Créer le devis" : "Créer le client et le devis"}</Button></form>
                  )}
                  {r.request_number && <span className="self-center text-xs text-muted-foreground">{r.request_number}</span>}
                  <ConfirmAction action={deleteRequestAction.bind(null, r.id)} label="Supprimer" variant="ghost" size="sm" className="text-red-700"
                    title="Supprimer cette demande ?" description="La demande est supprimée ; la fiche du contact et son historique sont conservés." confirmLabel="Oui, supprimer" />
                  {r.status === "nouvelle" && <form action={dismissSpamRequestAction.bind(null, r.id)}><Button variant={sp?.spam ? "default" : "ghost"} size="sm">Écarter (démarchage)</Button></form>}
                  {r.status === "nouvelle" && <form action={setRequestStatusAction.bind(null, r.id, "ignoree")}><Button variant="ghost" size="sm">Ignorer</Button></form>}
                  {r.status !== "nouvelle" && <form action={setRequestStatusAction.bind(null, r.id, "nouvelle")}><Button variant="ghost" size="sm">Remettre en « nouvelle »</Button></form>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
