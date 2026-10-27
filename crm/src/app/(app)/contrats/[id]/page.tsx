import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/crm/contract-form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { ClientName } from "@/components/crm/client-name";
import { updateContractAction, terminateContractAction } from "@/app/actions/contracts";
import { formatHours } from "@/lib/utils";
import { numOrNull } from "@/lib/data";
import type { Contract } from "@/lib/domain/types";

export default async function ContractPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: k } = await supabase.from("contracts").select("*, clients(id, name, is_reserved)").eq("id", params.id).maybeSingle();
  if (!k) notFound();
  const { data: clients } = await supabase.from("clients").select("id, name, is_reserved").order("name");
  const weekly = numOrNull(k.weekly_hours);

  return (
    <>
      <PageHeader
        title={k.label}
        subtitle={undefined}
        actions={k.status !== "resilie" ? (
          <ConfirmAction action={terminateContractAction.bind(null, k.id)} label="Résilier" variant="destructive" size="sm"
            title="Résilier ce contrat ?" description="Le statut passe à « résilié » et la date de fin est fixée à aujourd'hui. Les heures sortent du stock des sites."
            confirmLabel="Résilier le contrat" />
        ) : undefined}
      />
      <p className="-mt-4 mb-4"><ClientName id={k.clients.id} name={k.clients.name} reserved={k.clients.is_reserved} /></p>
      <Card className="mb-4"><CardContent className="text-sm">
        Heures hebdomadaires totales (calcul automatique) :{" "}
        <b>{weekly != null ? formatHours(weekly) : "à renseigner (heures par intervention × fréquence)"}</b>
      </CardContent></Card>
      <Card><CardContent>
        <ContractForm action={updateContractAction.bind(null, k.id)} clients={clients ?? []} contract={k as unknown as Contract} submitLabel="Enregistrer" />
      </CardContent></Card>
    </>
  );
}
