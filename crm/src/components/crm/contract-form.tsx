import { Button } from "@/components/ui/button";
import { PricingFields } from "@/components/crm/contract-pricing";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Contract } from "@/lib/domain/types";
import { WEEKDAYS } from "@/lib/domain/schedule";

const FREQ = [
  [0.5, "1 semaine sur 2"], [1, "1×/sem"], [2, "2×/sem"], [3, "3×/sem"], [4, "4×/sem"], [5, "5×/sem"], [6, "6×/sem"], [7, "7×/sem"]
] as const;

export function ContractForm({ action, clients, contract, defaultClient, defaultActivity, submitLabel, staff, sites }: {
  action: (fd: FormData) => void | Promise<void>;
  clients: { id: string; name: string; is_reserved: boolean }[];
  contract?: Partial<Contract> & { staff_id?: string | null; site_id?: string | null };
  staff?: { id: string; full_name: string }[];
  sites?: { id: string; name: string; client_id: string }[];
  defaultClient?: string;
  defaultActivity?: string;
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

      <PricingFields contract={contract ?? (defaultActivity ? { activity: defaultActivity } : undefined)} />
      <Field label="Statut">
        <Select name="status" defaultValue={contract?.status ?? "en_cours"}>
          <option value="en_cours">En cours</option><option value="actif">Actif</option><option value="resilie">Résilié</option>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">« Actif » exige : le tarif (mensuel, par passage ou pourcentage) et, sauf gestion à pourcentage, la fréquence ou les jours de passage.</p>
      </Field>

      <Field label="Heures par intervention" hint="Ex. 2,5"><Input name="hours_per_visit" inputMode="decimal" defaultValue={contract?.hours_per_visit ?? ""} /></Field>
      <Field label="Fréquence hebdomadaire">
        <Select name="visits_per_week" defaultValue={freqValue ?? ""}>
          <option value="">À préciser</option>
          {!freqKnown && freqValue !== undefined && <option value={freqValue}>{freqValue}×/sem</option>}
          {FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1 block text-sm font-medium">Jours de passage <span className="font-normal text-muted-foreground">(sert à remplir le planning automatiquement)</span></legend>
        <div className="flex flex-wrap items-center gap-2">
          {WEEKDAYS.map(([n, label]) => (
            <label key={n} className="flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="checkbox" name="weekdays" value={n} defaultChecked={contract?.weekdays?.includes(n)} /> {label}
            </label>
          ))}
          <Input name="start_time" type="time" defaultValue={contract?.start_time?.slice(0, 5) ?? ""} className="ml-2 w-32" aria-label="Heure de début" />
        </div>
      </fieldset>

      <Field label="Date de début"><Input name="start_date" type="date" defaultValue={contract?.start_date ?? ""} /></Field>
      <Field label="Date de fin"><Input name="end_date" type="date" defaultValue={contract?.end_date ?? ""} /></Field>
      {staff ? (
        <Field label="Intervenant habituel" hint="Proposé sur chaque mission générée. Ajoutez vos agents dans Équipe.">
          <Select name="staff_id" defaultValue={contract?.staff_id ?? ""}><option value="">— Aucun (à affecter) —</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select>
        </Field>
      ) : (
        <Field label="Intervenant / équipe" hint="Copié sur chaque passage du planning"><Input name="assignee" defaultValue={contract?.assignee ?? ""} /></Field>
      )}
      {sites && (
        <Field label="Site" hint="Lieu des missions (adresse, accès, check-list).">
          <Select name="site_id" defaultValue={contract?.site_id ?? ""}><option value="">— Aucun —</option>{sites.filter((s) => !contract?.client_id || s.client_id === contract.client_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </Field>
      )}
      <Field label="Adresse du site" hint={sites ? "Laisser vide pour utiliser l'adresse de la fiche site." : undefined} className="sm:col-span-2"><Input name="site_address" defaultValue={contract?.site_address ?? ""} /></Field>
      <Field label="Conditions particulières" className="sm:col-span-2"><Input name="terms" defaultValue={contract?.terms ?? ""} placeholder="Ex. 9 % des revenus + 155 € TTC / séjour" /></Field>
      <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" defaultValue={contract?.notes ?? ""} /></Field>
      <div className="sm:col-span-2"><Button>{submitLabel}</Button></div>
    </form>
  );
}
