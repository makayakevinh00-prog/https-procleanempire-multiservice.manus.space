import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parisToday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientName } from "@/components/crm/client-name";
import { StatusBadge } from "@/components/ui/badge";

export default async function SitesPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const today = parisToday();
  let query = supabase.from("sites").select("id, name, address, city, status, checklist, clients(id, name, is_reserved), contracts(id, status), interventions(id, scheduled_date, stage)").order("name");
  const q = searchParams.q?.trim().replace(/[%,()]/g, " ");
  if (q) query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`);
  const [{ data, error }, { count: issues }] = await Promise.all([query, supabase.from("mission_issues").select("id", { count: "exact", head: true }).eq("status", "ouverte")]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  return (
    <>
      <PageHeader title="Sites" subtitle={`${rows.length} lieu(x) d'intervention${issues ? ` · ${issues} problème(s) ouvert(s)` : ""}`}
        actions={<><Link href="/contrats"><Button variant="outline">Contrats</Button></Link><Link href="/sites/new"><Button><Plus className="h-4 w-4" /> Nouveau site</Button></Link></>} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Rechercher un site, une adresse, une ville…" className="h-10 w-full max-w-sm rounded-md border bg-card px-3 text-sm" /></form>
      <Card>
        {!rows.length ? <Empty>Aucun site. Un site est créé pour chaque contrat ; vous pouvez aussi en ajouter.</Empty> : (
          <Table>
            <thead><tr><Th>Site</Th><Th>Client</Th><Th>Adresse</Th><Th>Contrat</Th><Th>Prochaine mission</Th><Th>Check-list</Th></tr></thead>
            <tbody>{rows.map((s) => {
              const nextM = (s.interventions ?? []).filter((i: any) => i.scheduled_date >= today && i.stage !== "annulee").sort((a: any, b: any) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
              const active = (s.contracts ?? []).filter((k: any) => k.status === "actif").length;
              return (
                <Tr key={s.id} className={s.status === "inactif" ? "opacity-60" : ""}>
                  <Td><Link href={`/sites/${s.id}`} className="flex items-center gap-2 font-semibold hover:underline"><MapPin className="h-4 w-4 text-rose-500" />{s.name}</Link></Td>
                  <Td><ClientName id={s.clients.id} name={s.clients.name} reserved={s.clients.is_reserved} /></Td>
                  <Td className="text-slate-600">{[s.address, s.city].filter(Boolean).join(", ") || <span className="text-orange-600">adresse à compléter</span>}</Td>
                  <Td>{active ? <StatusBadge status="actif" /> : <span className="text-xs text-slate-400">aucun actif</span>}</Td>
                  <Td className="text-slate-600">{nextM ? new Date(nextM.scheduled_date).toLocaleDateString("fr-FR") : "—"}</Td>
                  <Td className="text-slate-600">{(s.checklist ?? []).length ? `${s.checklist.length} point(s)` : <span className="text-xs text-slate-400">vide</span>}</Td>
                </Tr>
              );
            })}</tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
