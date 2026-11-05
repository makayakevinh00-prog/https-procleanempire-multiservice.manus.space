import Link from "next/link";
import { Archive, Plus, Sparkles, UserCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { ReservedBadge, StatusBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { PIPELINE, PIPELINE_LABEL, PIPELINE_TONE, type Pipeline } from "@/lib/request-type";
import { cn } from "@/lib/utils";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; filtre?: string; etape?: string } }) {
  const supabase = createClient();
  const { data: all, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw new Error(error.message);
  const rows = (all ?? []) as any[];
  const q = searchParams.q?.trim().toLowerCase();

  const archived = rows.filter((c) => c.status === "inactif");
  const live = rows.filter((c) => c.status !== "inactif");
  const etape = searchParams.etape === "archives" ? "archives" : PIPELINE.some(([v]) => v === searchParams.etape) ? searchParams.etape : undefined;
  let shown = etape === "archives" ? archived : etape ? live.filter((c) => c.pipeline === etape) : live;
  if (searchParams.filtre === "sans_email") shown = live.filter((c) => c.status === "actif" && !c.email);
  if (q) shown = shown.filter((c) => [c.name, c.city, c.email, c.phone].some((v) => (v ?? "").toLowerCase().includes(q)));

  const prospects = live.filter((c) => c.status === "prospect").length;
  const tabs = [
    { href: "/clients", label: "Tous", count: live.length, active: !etape },
    ...PIPELINE.map(([v, l]) => ({ href: `/clients?etape=${v}`, label: l, count: live.filter((c) => c.pipeline === v).length, active: etape === v })),
    { href: "/clients?etape=archives", label: "Archivés", count: archived.length, active: etape === "archives" }
  ];

  return (
    <>
      <PageHeader title="Clients" subtitle="Vos clients et vos prospects, avec leur étape commerciale. Cliquez sur une fiche pour tout voir : contrats, devis, factures, historique."
        actions={<Link href="/clients/new" className={cn(buttonVariants({}))}><Plus className="h-5 w-5" /> Nouveau client</Link>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Clients actifs" value={live.filter((c) => c.status === "actif").length} tone="green" icon={UserCheck} />
        <Stat label="Prospects" value={prospects} sub="à transformer en clients" tone="violet" icon={Sparkles} href="/clients?etape=nouveau_prospect" />
        <Stat label="Archivés" value={archived.length} tone="slate" icon={Archive} href="/clients?etape=archives" />
      </div>

      <Tabs items={tabs} />

      {searchParams.filtre === "sans_email" && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm"><b>Filtre actif :</b> clients actifs sans e-mail <Link href="/clients" className="ml-auto font-semibold text-primary hover:underline">Retirer le filtre</Link></div>
      )}
      <form className="mb-4"><input name="q" defaultValue={searchParams.q} placeholder="Filtrer par nom, ville, e-mail ou téléphone…" className="h-11 w-full max-w-md rounded-lg border border-slate-300 bg-card px-4 text-[15px] shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15" /></form>

      <Card>
        {!shown.length ? <Empty icon={Users} action={<Link href="/clients/new" className={cn(buttonVariants({ size: "sm" }))}>Ajouter un client</Link>}>Aucun client dans cette vue.</Empty> : (
          <Table>
            <thead><tr><Th>Client</Th><Th className="hidden md:table-cell">Ville</Th><Th className="hidden lg:table-cell">Contact</Th><Th>Étape</Th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <Tr key={c.id} className={c.is_reserved ? "bg-red-50/60" : ""}>
                  <Td>
                    <Link href={`/clients/${c.id}`} className="flex items-center gap-4">
                      <Avatar name={c.name} size="md" />
                      <span><span className="block font-semibold text-slate-900">{c.name}</span><span className="block text-xs capitalize text-slate-500">{c.kind}</span></span>
                      {c.is_reserved && <ReservedBadge />}
                    </Link>
                  </Td>
                  <Td className="hidden text-slate-600 md:table-cell">{c.city ?? "—"}</Td>
                  <Td className="hidden text-slate-600 lg:table-cell"><div>{c.email ?? "—"}</div><div className="text-xs text-slate-400">{c.phone ?? ""}</div></Td>
                  <Td>{c.pipeline ? <span className={cn("rounded-full px-3 py-1 text-xs font-bold", PIPELINE_TONE[c.pipeline as Pipeline])}>{PIPELINE_LABEL[c.pipeline as Pipeline]}</span> : <StatusBadge status={c.status} />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
