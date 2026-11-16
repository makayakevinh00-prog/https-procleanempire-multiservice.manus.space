import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { loadServices } from "@/lib/services";
import { addDays, parisToday } from "@/lib/domain/dates";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentForm } from "@/components/crm/document-form";
import { createQuoteAction } from "@/app/actions/quotes";

export default async function NewQuotePage({ searchParams }: { searchParams: { client?: string; objet?: string; heures?: string; prix?: string; note?: string } }) {
  const supabase = createClient();
  const [{ data: clients }, settings, services] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"), getSettings(supabase), loadServices(supabase)
  ]);
  // Pré-remplissage venant du « Devis avec l'IA » : une ligne par passage, au plus bas au plancher de 27 € HT de l'heure.
  const price = Number(searchParams.prix), hours = Number(searchParams.heures);
  const prefill = Number.isFinite(price) && price > 0 ? {
    subject: (searchParams.objet ?? "").slice(0, 120) || "Nettoyage",
    notes: (searchParams.note ?? "").slice(0, 1500),
    lines: [{ description: `Prestation de nettoyage — par passage${Number.isFinite(hours) && hours > 0 ? ` (environ ${hours} h)` : ""}`, quantity: 1, unit_price_ht: Math.round(Math.max(price, (Number.isFinite(hours) ? hours : 0) * 27) * 100) / 100, vat_rate: Number(settings.default_vat_rate) }]
  } : null;
  return (
    <>
      <PageHeader title="Nouveau devis" subtitle="Choisissez une prestation du catalogue : désignation et prix se remplissent tout seuls." />
      <Card><CardContent>
        <DocumentForm action={createQuoteAction} kind="devis" clients={clients ?? []} defaultClientId={searchParams.client}
          defaults={{ valid_until: addDays(parisToday(), Number(settings.quote_default_validity_days ?? 30)), ...(prefill ?? {}) }}
          defaultVat={Number(settings.default_vat_rate)} services={services} submitLabel="Créer le devis" />
      </CardContent></Card>
    </>
  );
}
