import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { saveServiceAction, toggleServiceAction } from "@/app/actions/services";
import { formatEUR } from "@/lib/utils";

export default async function CataloguePage({ searchParams }: { searchParams: { edit?: string } }) {
  const { data, error } = await createClient().from("services").select("*").order("code");
  if (error) throw new Error(error.message);
  const edited = searchParams.edit ? data?.find((s: any) => s.id === searchParams.edit) : null;

  return (
    <>
      <PageHeader title="Catalogue de prestations" subtitle="Ces prestations apparaissent dans la liste déroulante des devis et des factures : plus besoin de tout retaper." />
      <Card className="mb-4">
        <CardHeader><CardTitle>{edited ? `Modifier « ${edited.name} »` : "Nouvelle prestation"}</CardTitle>{edited && <Link href="/catalogue" className="text-xs text-primary hover:underline">Annuler</Link>}</CardHeader>
        <CardContent>
          <form key={edited?.id ?? "new"} action={saveServiceAction.bind(null, edited?.id ?? null)} className="grid gap-4 sm:grid-cols-6">
            <Field label="Code" className="sm:col-span-1"><Input name="code" defaultValue={edited?.code ?? ""} placeholder="AIR-STU" /></Field>
            <Field label="Nom (court) *" className="sm:col-span-3"><Input name="name" required defaultValue={edited?.name ?? ""} /></Field>
            <Field label="Unité" className="sm:col-span-1"><Input name="unit" defaultValue={edited?.unit ?? ""} placeholder="passage" /></Field>
            <Field label="Prix HT (€) *" className="sm:col-span-1"><Input name="unit_price_ht" inputMode="decimal" required defaultValue={edited?.unit_price_ht ?? ""} /></Field>
            <Field label="Description (facultative, insérable dans un devis)" className="sm:col-span-4"><Textarea name="description" defaultValue={edited?.description ?? ""} className="min-h-[70px]" /></Field>
            <Field label="TVA %" className="sm:col-span-1"><Input name="vat_rate" inputMode="decimal" defaultValue={edited?.vat_rate ?? 20} /></Field>
            <div className="flex items-end gap-3 sm:col-span-1">
              {edited && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={edited.active} /> Active</label>}
              <Button>{edited ? "Enregistrer" : "Ajouter"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        {!data?.length ? <Empty>Aucune prestation.</Empty> : (
          <Table>
            <thead><tr><Th>Code</Th><Th>Prestation</Th><Th>Unité</Th><Th className="text-right">Prix HT</Th><Th>TVA</Th><Th /></tr></thead>
            <tbody>
              {data.map((s: any) => (
                <Tr key={s.id} className={s.active ? "" : "opacity-50"}>
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">{s.code}</Td>
                  <Td className="font-medium">{s.name}{!s.active && <Badge className="ml-2">masquée</Badge>}</Td>
                  <Td>{s.unit ?? "—"}</Td>
                  <Td className="text-right">{formatEUR(s.unit_price_ht)}</Td>
                  <Td>{Number(s.vat_rate)} %</Td>
                  <Td className="whitespace-nowrap text-right">
                    <Link href={`/catalogue?edit=${s.id}`} className="mr-3 text-xs text-primary hover:underline">Modifier</Link>
                    <form action={toggleServiceAction.bind(null, s.id, !s.active)} className="inline"><button className="text-xs text-muted-foreground hover:underline">{s.active ? "Masquer" : "Réactiver"}</button></form>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
