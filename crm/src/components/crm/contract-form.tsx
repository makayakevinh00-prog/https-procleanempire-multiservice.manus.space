import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Contract } from "@/lib/domain/types";

const FREQ = [
  [0.5, "1 semaine sur 2"], [1, "1×/sem"], [2, "2×/sem"], [3, "3×/sem"], [4, "4×/sem"], [5, "5×/sem"], [6, "6×/sem"], [7, "7×/sem"]
] as const;

export function ContractForm({ action, clients, contract, defaultClient, submitLabel }: {
  action: (fd: FormData) => void | Promise<void>;
  clients: { id: string; name: string; is_reserved: boolean }[];
  contract?: Partial<Contract>;
  defaultClient?: string;
  submitLabel: string;
}) {
  const freqValue = contract?.visits_per_week != null ? Number(contract.visits_per_week) : undefined;
  const freqKnown = FREQ.some(([v]) => v === freqValue);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Client *">
        <Select name="client_id" required defaultValue={contract?.client_id ?? defaultClient ?? ""}>
          <option value="" disabled>Choisir…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_reserved ? " 🔒" : ""}</option>)}
        </Select>
      </Field>
      <Field label="Intitulé *"><Input name="label" required defaultValue={contract?.label} placeholder="Entretien bureaux…" /></Field>

      <Field label="Facturation">
        <Select name="billing_mode" defaultValue={contract?.billing_mode ?? "mensuel"}>
          <option value="mensuel">Montant mensuel</option><option value="passage">Prix par passage</option><option value="autre">Autre (voir conditions)</option>
        </Select>
      </Field>
      <Field label="Statut">
        <Select name="status" defaultValue={contract?.status ?? "en_cours"}>
          <option value="en_cours">En cours</option><option value="actif">Actif</option><option value="resilie">Résilié</option>
        </Select>
      </Field>
      <Field label="Montant HT / mois" hint="Si facturation mensuelle"><Input name="monthly_amount_ht" inputMode="decimal" defaultValue={contract?.monthly_amount_ht ?? ""} /></Field>
      <Field label="Montant HT / passage" hint="Si facturation au passage"><Input name="per_visit_amount_ht" inputMode="decimal" defaultValue={contract?.per_visit_amount_ht ?? ""} /></Field>

      <Field label="Heures par intervention" hint="Ex. 2,5"><Input name="hours_per_visit" inputMode="decimal" defaultValue={contract?.hours_per_visit ?? ""} /></Field>
      <Field label="Fréquence hebdomadaire">
        <Select name="visits_per_week" defaultValue={freqValue ?? ""}>
          <option value="">À préciser</option>
          {!freqKnown && freqValue !== undefined && <option value={freqValue}>{freqValue}×/sem</option>}
          {FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>

      <Field label="Date de début"><Input name="start_date" type="date" defaultValue={contract?.start_date ?? ""} /></Field>
      <Field label="Date de fin"><Input name="end_date" type="date" defaultValue={contract?.end_date ?? ""} /></Field>
      <Field label="Adresse du site" className="sm:col-span-2"><Input name="site_address" defaultValue={contract?.site_address ?? ""} /></Field>
      <Field label="Conditions particulières" className="sm:col-span-2"><Input name="terms" defaultValue={contract?.terms ?? ""} placeholder="Ex. 9 % des revenus + 155 € TTC / séjour" /></Field>
      <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" defaultValue={contract?.notes ?? ""} /></Field>
      <div className="sm:col-span-2"><Button>{submitLabel}</Button></div>
    </form>
  );
}
