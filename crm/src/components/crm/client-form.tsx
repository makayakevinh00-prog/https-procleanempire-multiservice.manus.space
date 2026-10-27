import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Client } from "@/lib/domain/types";

export function ClientForm({ action, client, submitLabel }: { action: (fd: FormData) => void | Promise<void>; client?: Partial<Client>; submitLabel: string }) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom *" className="sm:col-span-2"><Input name="name" required defaultValue={client?.name} /></Field>
      <Field label="Type">
        <Select name="kind" defaultValue={client?.kind ?? "entreprise"}>
          <option value="entreprise">Entreprise</option><option value="particulier">Particulier</option>
        </Select>
      </Field>
      <Field label="Statut">
        <Select name="status" defaultValue={client?.status ?? "actif"}>
          <option value="prospect">Prospect</option><option value="actif">Actif</option><option value="inactif">Inactif</option>
        </Select>
      </Field>
      <Field label="Adresse" className="sm:col-span-2"><Input name="address" defaultValue={client?.address ?? ""} /></Field>
      <Field label="Code postal"><Input name="postal_code" defaultValue={client?.postal_code ?? ""} /></Field>
      <Field label="Ville"><Input name="city" defaultValue={client?.city ?? ""} /></Field>
      <Field label="E-mail"><Input name="email" type="email" defaultValue={client?.email ?? ""} /></Field>
      <Field label="Téléphone"><Input name="phone" type="tel" defaultValue={client?.phone ?? ""} /></Field>
      <Field label="SIRET" hint="14 chiffres"><Input name="siret" inputMode="numeric" defaultValue={client?.siret ?? ""} /></Field>
      <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" defaultValue={client?.notes ?? ""} /></Field>

      <fieldset className="rounded-md border-2 border-destructive/40 bg-red-50/50 p-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-red-900">
          <input type="checkbox" name="is_reserved" defaultChecked={client?.is_reserved} /> 🔒 Contact réservé
        </label>
        <p className="mt-1 text-xs text-red-900/80">Aucune action automatique (relances, rapprochement, envoi) ; alerte patron et confirmation explicite partout.</p>
        <div className="mt-3"><Field label="Motif / consigne"><Input name="reserved_reason" defaultValue={client?.reserved_reason ?? ""} /></Field></div>
      </fieldset>

      <div className="sm:col-span-2"><Button>{submitLabel}</Button></div>
    </form>
  );
}
