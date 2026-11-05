import Link from "next/link";
import { Truck, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { saveSupplierAction } from "@/app/actions/suppliers";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupplierFields, CATEGORY, STATUS } from "@/components/crm/supplier-fields";
import { formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";
const TONE: Record<string, "green" | "orange" | "gray"> = { actif: "green", a_etudier: "orange", inactif: "gray" };

export default async function SuppliersPage({ searchParams }: { searchParams: { categorie?: string } }) {
  const sb = createClient();
  const [{ data: sup, error }, { data: pays }] = await Promise.all([
    sb.from("suppliers").select("*").order("name"),
    sb.from("supplier_payments").select("supplier_id, amount, paid_on")
  ]);
  if (error) throw new Error(error.message);
  const total = (id: string) => (pays ?? []).filter((p: any) => p.supplier_id === id).reduce((a: number, p: any) => a + Number(p.amount), 0);
  const last = (id: string) => (pays ?? []).filter((p: any) => p.supplier_id === id).map((p: any) => p.paid_on).sort().pop();
  const cat = searchParams.categorie;
  const shown = (sup ?? []).filter((s: any) => !cat || s.category === cat);
  return (
    <>
      <PageHeader title="Fournisseurs" subtitle="Vos fournisseurs, sous-traitants et auto-entrepreneurs : coordonnées, prix et paiements. Cliquez sur une fiche pour tout voir." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "Tous"], ...Object.entries(CATEGORY)].map(([v, l]) => (
          <Link key={v} href={v ? `/fournisseurs?categorie=${v}` : "/fournisseurs"} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${(cat ?? "") === v ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{l}</Link>
        ))}
      </div>
      <Card className="mb-4">
        {!shown.length ? <Empty icon={Truck}>Aucun fournisseur dans cette catégorie.</Empty> : (
          <div className="divide-y">
            {shown.map((s: any) => (
              <Link key={s.id} href={`/fournisseurs/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-sm text-slate-500">{CATEGORY[s.category]} · {s.kind === "auto_entrepreneur" ? "auto-entrepreneur" : "entreprise"}{s.contact_name ? ` · ${s.contact_name}` : ""}</div>
                </div>
                <div className="hidden text-sm text-slate-600 md:block">{(s.prices ?? []).filter((p: any) => p.price_ht != null).slice(0, 2).map((p: any) => `${p.price_ht} € ${p.unit ?? ""}`).join(" · ")}</div>
                <div className="text-right text-sm"><div className="font-semibold">{total(s.id) ? formatEUR(total(s.id)) : "—"}</div><div className="text-xs text-slate-500">{last(s.id) ? `payé · dernier ${new Date(last(s.id) + "T12:00:00").toLocaleDateString("fr-FR")}` : "aucun paiement"}</div></div>
                <Badge tone={TONE[s.status]}>{STATUS[s.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
      <details className="rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-primary"><Plus className="h-5 w-5" /> Ajouter un fournisseur</summary>
        <CardContent className="border-t pt-4"><form action={saveSupplierAction.bind(null, null)} className="space-y-3"><SupplierFields /><Button type="submit">Enregistrer</Button></form></CardContent>
      </details>
    </>
  );
}
