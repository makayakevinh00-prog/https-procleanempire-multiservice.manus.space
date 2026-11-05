import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { PIPELINE, PIPELINE_LABEL, PIPELINE_TONE, type Pipeline } from "@/lib/request-type";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; filtre?: string; etape?: string } }) {
  const supabase = createClient();
  let query = supabase.from("clients").select("*").order("name");
  const etape = PIPELINE.some(([v]) => v === searchParams.etape) ? searchParams.etape : undefined;
  if (etape) query = query.eq("pipeline", etape);
  if (searchParams.filtre === "sans_email") query = query.eq("status", "actif").is("email", null);
  const q = searchParams.q?.trim();
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,]/g, "")}%,city.ilike.%${q.replace(/[%,]/g, "")}%`);
  const { data: clients, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Clients" subtitle={`${clients?.length ?? 0} fiche(s)`}
        actions={<Link href="/clients/new"><Button><Plus className="h-4 w-4" /> Nouveau client</Button></Link>} />
      {searchParams.filtre === "sans_email" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm">
          <b>Filtre actif :</b> clients actifs sans e-mail <Link href="/clients" className="ml-auto text-primary hover:underline">Retirer le filtre</Link>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <Link href="/clients" className={`rounded-full border px-3 py-1 text-sm ${!etape ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>Tous</Link>
        {PIPELINE.map(([v, l]) => <Link key={v} href={`/clients?etape=${v}`} className={`rounded-full border px-3 py-1 text-sm ${etape === v ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{l}</Link>)}
      </div>
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Rechercher un nom ou une ville…"
        className="h-10 w-full max-w-sm rounded-md border bg-card px-3 text-sm" /></form>
      <Card>
        {!clients?.length ? <Empty>Aucun client.</Empty> : (
          <Table>
            <thead><tr><Th>Nom</Th><Th>Ville</Th><Th>Contact</Th><Th>Étape</Th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <Tr key={c.id} className={c.is_reserved ? "bg-red-50/60" : ""}>
                  <Td><ClientName id={c.id} name={c.name} reserved={c.is_reserved} /></Td>
                  <Td>{c.city ?? "—"}</Td>
                  <Td className="text-muted-foreground">{c.email ?? c.phone ?? "—"}</Td>
                  <Td>{c.pipeline ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PIPELINE_TONE[c.pipeline as Pipeline]}`}>{PIPELINE_LABEL[c.pipeline as Pipeline]}</span> : <StatusBadge status={c.status} />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
