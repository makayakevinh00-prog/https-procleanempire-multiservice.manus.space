import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/crm/contract-form";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { ClientName } from "@/components/crm/client-name";
import { updateContractAction, terminateContractAction } from "@/app/actions/contracts";
import { deleteContractAction } from "@/app/actions/manage";
import { formatHours } from "@/lib/utils";
import { sendContractForSignatureAction } from "@/app/actions/signature";
import { guessCategory, CATEGORY_LABEL, type ContractCategory } from "@/lib/contracts/clauses";
import { numOrNull } from "@/lib/data";
import type { Contract } from "@/lib/domain/types";

export default async function ContractPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: k } = await supabase.from("contracts").select("*, clients(id, name, email, is_reserved)").eq("id", params.id).maybeSingle();
  if (!k) notFound();
  const { data: sigs } = await supabase.from("signature_requests").select("id, status, signer_email, signer_name, signed_at, created_at").eq("contract_id", params.id).order("created_at", { ascending: false }).limit(5);
  const [{ data: clients }, { data: staff }, { data: sites }] = await Promise.all([
    supabase.from("clients").select("id, name, is_reserved").order("name"),
    supabase.from("staff").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("sites").select("id, name, client_id").order("name")
  ]);
  const weekly = numOrNull(k.weekly_hours);

  return (
    <>
      <PageHeader
        title={k.label}
        subtitle={undefined}
        actions={<>
          {k.status !== "resilie" && (
            <ConfirmAction action={terminateContractAction.bind(null, k.id)} label="Résilier" variant="outline" size="sm"
              title="Résilier ce contrat ?" description="Le statut passe à « résilié » et la date de fin est fixée à aujourd'hui. Les heures sortent du stock des sites."
              confirmLabel="Résilier le contrat" reservedName={k.clients.is_reserved ? k.clients.name : null} />
          )}
          <ConfirmAction action={deleteContractAction.bind(null, k.id)} label="Supprimer" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50"
            title={`Supprimer « ${k.label} » ?`} description="Le contrat est supprimé, ainsi que ses passages à venir non facturés. L'historique (passages réalisés ou facturés) est conservé. Définitif."
            confirmLabel="Oui, supprimer" reservedName={k.clients.is_reserved ? k.clients.name : null} />
        </>}
      />
      <p className="-mt-4 mb-4"><ClientName id={k.clients.id} name={k.clients.name} reserved={k.clients.is_reserved} /></p>
      <Card className="mb-4"><CardContent className="text-sm">
        Heures hebdomadaires totales (calcul automatique) :{" "}
        <b>{weekly != null ? formatHours(weekly) : "à renseigner (heures par intervention × fréquence)"}</b>
      </CardContent></Card>
      <Card className="mb-4"><CardContent className="text-sm">
        <p className="mb-2 font-semibold">Contrat de prestation (PDF)</p>
        <p className="mb-3 text-muted-foreground">Choisissez le modèle adapté : les clauses changent selon la catégorie. Les passages entre crochets restent à compléter avant signature.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as ContractCategory[]).map((c) => (
            <a key={c} href={`/api/contrats/${k.id}/pdf?type=${c}`} className={`rounded-lg border px-3 py-2 font-semibold hover:bg-slate-50 ${c === guessCategory(k as any) ? "border-primary text-primary" : "border-slate-300"}`}>
              {CATEGORY_LABEL[c]}{c === guessCategory(k as any) ? " (conseillé)" : ""}
            </a>
          ))}
        </div>
      </CardContent></Card>
      <Card className="mb-4"><CardContent className="text-sm">
        <p className="mb-2 font-semibold">Envoyer pour signature en ligne</p>
        <p className="mb-3 text-muted-foreground">Le client reçoit le contrat par e-mail avec un lien : il le lit, coche « lu et approuvé » et signe au doigt. Vous recevez le document signé, gardé ici.</p>
        <form action={sendContractForSignatureAction.bind(null, k.id)} className="flex flex-wrap items-end gap-2">
          <label className="block">E-mail du client<input name="to" type="email" required defaultValue={k.clients.email ?? ""} className="mt-1 h-10 w-64 rounded-md border px-2" /></label>
          <label className="block">Modèle<select name="type" defaultValue={guessCategory(k as any)} className="mt-1 h-10 rounded-md border px-2">{(Object.keys(CATEGORY_LABEL) as ContractCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></label>
          <button className="h-10 rounded-md bg-primary px-4 font-medium text-primary-foreground">Envoyer à signer</button>
        </form>
        {((sigs ?? []) as any[]).length > 0 && <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{((sigs ?? []) as any[]).map((x) => <li key={x.id}>{new Date(x.created_at).toLocaleDateString("fr-FR")} · {x.signer_email} · <b>{x.status === "signe" ? `signé le ${new Date(x.signed_at).toLocaleDateString("fr-FR")} par ${x.signer_name}` : x.status === "en_attente" ? "en attente de signature" : x.status}</b>{x.status === "signe" && <> · <a className="text-primary underline" href={`/api/signature/${x.id}/pdf`}>document signé</a></>}</li>)}</ul>}
      </CardContent></Card>
      <Card><CardContent>
        <ContractForm action={updateContractAction.bind(null, k.id)} clients={clients ?? []} contract={k as unknown as Contract} staff={staff ?? []} sites={sites ?? []} submitLabel="Enregistrer" />
      </CardContent></Card>
    </>
  );
}
