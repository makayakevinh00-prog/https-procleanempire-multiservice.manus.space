import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  let query = supabase.from("clients").select("*").order("name");
  const q = searchParams.q?.trim();
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,]/g, "")}%,city.ilike.%${q.replace(/[%,]/g, "")}%`);
  const { data: clients, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader title="Clients" subtitle={`${clients?.length ?? 0} fiche(s)`}
        actions={<Link href="/clients/new"><Button><Plus className="h-4 w-4" /> Nouveau client</Button></Link>} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Rechercher un nom ou une ville…"
        className="h-10 w-full max-w-sm rounded-md border bg-card px-3 text-sm" /></form>
      <Card>
        {!clients?.length ? <Empty>Aucun client.</Empty> : (
          <Table>
            <thead><tr><Th>Nom</Th><Th>Ville</Th><Th>Contact</Th><Th>Statut</Th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <Tr key={c.id} className={c.is_reserved ? "bg-red-50/60" : ""}>
                  <Td><ClientName id={c.id} name={c.name} reserved={c.is_reserved} /></Td>
                  <Td>{c.city ?? "—"}</Td>
                  <Td className="text-muted-foreground">{c.email ?? c.phone ?? "—"}</Td>
                  <Td><StatusBadge status={c.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
