import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addSupplierPaymentAction, deleteSupplierAction, deleteSupplierPaymentAction, saveSupplierAction } from "@/app/actions/suppliers";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { SupplierFields, CATEGORY, STATUS } from "@/components/crm/supplier-fields";
import { formatEUR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupplierPage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: s } = await sb.from("suppliers").select("*").eq("id", params.id).maybeSingle();
  if (!s) notFound();
  const { data: pays } = await sb.from("supplier_payments").select("*").eq("supplier_id", s.id).order("paid_on", { ascending: false });
  const total = (pays ?? []).reduce((a: number, p: any) => a + Number(p.amount), 0);
  const prices = (s.prices ?? []) as { label: string; price_ht: number | null; unit: string; note: string }[];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title={s.name} subtitle={`${CATEGORY[s.category]} · ${s.kind === "auto_entrepreneur" ? "auto-entrepreneur" : "entreprise"}`}
        actions={<ConfirmAction action={deleteSupplierAction.bind(null, s.id)} label="Supprimer" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50"
          title={`Supprimer « ${s.name} » ?`} description="La fiche et ses paiements enregistrés sont supprimés. Définitif." confirmLabel="Oui, supprimer" />} />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={s.status === "actif" ? "green" : s.status === "a_etudier" ? "orange" : "gray"}>{STATUS[s.status]}</Badge>
        {s.email && <a className="text-primary underline" href={`mailto:${s.email}`}>{s.email}</a>}
        {s.phone && <a className="text-primary underline" href={`tel:${s.phone}`}>{s.phone}</a>}
        {s.website && <a className="text-primary underline" href={s.website} target="_blank" rel="noopener noreferrer">Site web</a>}
        <span className="ml-auto font-semibold">Total payé : {formatEUR(total)}</span>
      </div>

      {prices.length > 0 && (
        <Card className="mb-4"><CardHeader><CardTitle>Prix</CardTitle></CardHeader><CardContent className="divide-y p-0">
          {prices.map((p, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-4 px-4 py-3">
              <div className="min-w-0 flex-1"><div className="font-medium">{p.label}</div>{p.note && <div className="text-sm text-slate-500">{p.note}</div>}</div>
              <div className="text-right font-semibold">{p.price_ht != null ? `${p.price_ht} € HT` : "—"}<div className="text-xs font-normal text-slate-500">{p.unit}</div></div>
            </div>
          ))}
        </CardContent></Card>
      )}

      <Card className="mb-4"><CardHeader><CardTitle>Paiements</CardTitle></CardHeader><CardContent className="space-y-3">
        {!pays?.length ? <p className="text-sm text-slate-500">Aucun paiement enregistré.</p> : (
          <div className="divide-y rounded-lg border">
            {pays.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-24 text-slate-600">{new Date(p.paid_on + "T12:00:00").toLocaleDateString("fr-FR")}</span>
                <span className="flex-1 truncate text-slate-700">{p.label ?? ""}</span>
                <Badge tone={p.source === "qonto" ? "blue" : "gray"}>{p.source === "qonto" ? "Qonto" : "Manuel"}</Badge>
                <span className="w-24 text-right font-semibold">{formatEUR(p.amount)}</span>
                <form action={deleteSupplierPaymentAction.bind(null, s.id, p.id)}><button className="text-xs text-red-700 hover:underline" aria-label="Supprimer ce paiement">Supprimer</button></form>
              </div>
            ))}
          </div>
        )}
        <form action={addSupplierPaymentAction.bind(null, s.id)} className="grid gap-2 sm:grid-cols-4">
          <Field label="Date"><Input name="paid_on" type="date" defaultValue={today} required /></Field>
          <Field label="Montant (€)"><Input name="amount" type="number" step="0.01" min="0" required /></Field>
          <Field label="Libellé" className="sm:col-span-2"><Input name="label" placeholder="Facture, virement…" /></Field>
          <div className="sm:col-span-4"><Button type="submit" variant="outline" size="sm">Ajouter un paiement</Button></div>
        </form>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Modifier la fiche</CardTitle></CardHeader><CardContent>
        <form action={saveSupplierAction.bind(null, s.id)} className="space-y-3"><SupplierFields s={s} /><Button type="submit">Enregistrer</Button></form>
      </CardContent></Card>
    </>
  );
}
