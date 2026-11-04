import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { formatEUR } from "@/lib/utils";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().replace(/[%,()]/g, " ").slice(0, 60);
  if (q.length < 2) return <><PageHeader title="Recherche" /><Card><Empty>Saisissez au moins 2 caractères.</Empty></Card></>;
  const like = `%${q}%`;
  const supabase = createClient();
  const [clients, quotes, invoices, contracts] = await Promise.all([
    supabase.from("clients").select("id, name, city, email, phone, is_reserved, status").or(`name.ilike.${like},email.ilike.${like},city.ilike.${like},phone.ilike.${like},siret.ilike.${like}`).limit(15),
    supabase.from("quotes").select("id, number, subject, status, total_ttc, clients(name)").or(`number.ilike.${like},subject.ilike.${like}`).limit(15),
    supabase.from("invoices").select("id, number, subject, status, total_ttc, clients(name)").or(`number.ilike.${like},subject.ilike.${like}`).limit(15),
    supabase.from("contracts").select("id, label, status, clients(name)").ilike("label", like).limit(15)
  ]);
  const none = ![clients, quotes, invoices, contracts].some((r) => r.data?.length);
  return (
    <>
      <PageHeader title={`Recherche : « ${q} »`} />
      {none && <Card><Empty>Aucun résultat.</Empty></Card>}
      <div className="space-y-4">
        {!!clients.data?.length && (
          <Card><CardHeader><CardTitle>Clients</CardTitle></CardHeader><ul className="divide-y text-sm">
            {clients.data.map((c: any) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><ClientName id={c.id} name={c.name} reserved={c.is_reserved} /><span className="text-muted-foreground">{[c.city, c.email, c.phone].filter(Boolean).join(" · ")}</span></li>)}
          </ul></Card>
        )}
        {!!quotes.data?.length && (
          <Card><CardHeader><CardTitle>Devis</CardTitle></CardHeader><ul className="divide-y text-sm">
            {quotes.data.map((d: any) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><Link href={`/devis/${d.id}`} className="font-medium hover:underline">{d.number} — {d.clients?.name}</Link><span className="flex items-center gap-2 text-muted-foreground">{d.subject} · {formatEUR(d.total_ttc)} <StatusBadge status={d.status} /></span></li>)}
          </ul></Card>
        )}
        {!!invoices.data?.length && (
          <Card><CardHeader><CardTitle>Factures</CardTitle></CardHeader><ul className="divide-y text-sm">
            {invoices.data.map((i: any) => <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><Link href={`/factures/${i.id}`} className="font-medium hover:underline">{i.number ?? "Brouillon"} — {i.clients?.name}</Link><span className="flex items-center gap-2 text-muted-foreground">{formatEUR(i.total_ttc)} <StatusBadge status={i.status} /></span></li>)}
          </ul></Card>
        )}
        {!!contracts.data?.length && (
          <Card><CardHeader><CardTitle>Contrats</CardTitle></CardHeader><ul className="divide-y text-sm">
            {contracts.data.map((k: any) => <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><Link href={`/contrats/${k.id}`} className="font-medium hover:underline">{k.label} — {k.clients?.name}</Link><StatusBadge status={k.status} /></li>)}
          </ul></Card>
        )}
      </div>
    </>
  );
}
