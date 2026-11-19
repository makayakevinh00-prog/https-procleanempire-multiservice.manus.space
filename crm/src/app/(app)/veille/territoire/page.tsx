import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { IDF, pointOf } from "@/lib/territoire";
import { TerritoireSwitch } from "@/components/crm/territoire-switch";
import { TerritoryExplorerLazy } from "@/components/crm/territory-explorer-lazy";

export const revalidate = 0;
export const metadata = { title: "Territoire commercial" };

/** Carte simple : les départements d'Île-de-France se cliquent, les entreprises s'affichent, la liste dit où passer. Réglages et objectifs : page « avancée ». */
export default async function TerritoryPage({ searchParams }: { searchParams: { zone?: string; ok?: string; error?: string } }) {
  const zone = searchParams.zone && searchParams.zone in IDF ? searchParams.zone : "95";
  const { data, error } = await createClient().rpc("territory_data", { p_dept: zone });
  const { data: cl } = await createClient().from("clients").select("id, name, address, postal_code, city, sites(lat, lng)").eq("status", "actif").order("name");
  const clients = ((cl ?? []) as any[]).map((c) => { const st = (c.sites ?? []).find((x: any) => x.lat != null && x.lng != null); return { id: c.id as string, name: c.name as string, address: c.address ?? null, postal: c.postal_code ?? null, city: c.city ?? null, lat: st?.lat ?? null, lng: st?.lng ?? null }; });
  const points = ((data as { targets?: any[][] } | null)?.targets ?? []).map(pointOf);
  return (
    <>
      <PageHeader title="Territoire commercial" subtitle="Choisissez un département, voyez les entreprises autour de vous et décidez où passer chaque jour." />
      <TerritoireSwitch active="prospection" />
      {searchParams.error && <div role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mb-3 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{searchParams.ok}</div>}
      {error && <div role="alert" className="mb-3 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">La liste des entreprises n&apos;a pas pu être lue ({error.message}). La carte reste utilisable.</div>}
      <TerritoryExplorerLazy zone={zone} points={points} clients={clients} />
      <p className="mt-4 text-sm text-muted-foreground"><Link href={`/veille/territoire/avance?zone=${zone}`} className="text-primary hover:underline">Objectifs de couverture, ouverture des zones et réglages →</Link></p>
    </>
  );
}
