import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { pricesToText } from "@/lib/supplier-prices";

export const CATEGORY: Record<string, string> = { linge: "Linge", sous_traitance: "Sous-traitance (agents)", produits: "Produits d'entretien", materiel: "Matériel", autre: "Autre" };
export const STATUS: Record<string, string> = { actif: "Actif", a_etudier: "À étudier", inactif: "Inactif" };

export function SupplierFields({ s }: { s?: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Nom *"><Input name="name" required defaultValue={s?.name ?? ""} /></Field>
      <Field label="Catégorie"><Select name="category" defaultValue={s?.category ?? "autre"}>{Object.entries(CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
      <Field label="Statut"><Select name="status" defaultValue={s?.status ?? "actif"}>{Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
      <Field label="Type"><Select name="kind" defaultValue={s?.kind ?? "entreprise"}><option value="entreprise">Entreprise</option><option value="auto_entrepreneur">Auto-entrepreneur</option></Select></Field>
      <Field label="Contact"><Input name="contact_name" defaultValue={s?.contact_name ?? ""} /></Field>
      <Field label="Téléphone"><Input name="phone" defaultValue={s?.phone ?? ""} /></Field>
      <Field label="E-mail"><Input name="email" type="email" defaultValue={s?.email ?? ""} /></Field>
      <Field label="Site web"><Input name="website" defaultValue={s?.website ?? ""} /></Field>
      <Field label="SIRET"><Input name="siret" defaultValue={s?.siret ?? ""} /></Field>
      <Field label="Adresse" className="sm:col-span-2"><Input name="address" defaultValue={s?.address ?? ""} /></Field>
      <Field label="Règlement"><Input name="payment_terms" defaultValue={s?.payment_terms ?? ""} placeholder="Virement, carte…" /></Field>
      <Field label="Prix (une ligne par prix : libellé ; prix HT ; unité ; note)" className="sm:col-span-3" hint="Exemple : Kit de linge complet ; 20 ; par livraison ; 1 drap, 1 housse…">
        <Textarea name="prices" rows={4} defaultValue={pricesToText(s?.prices)} />
      </Field>
      <Field label="Notes" className="sm:col-span-3"><Textarea name="notes" rows={3} defaultValue={s?.notes ?? ""} /></Field>
    </div>
  );
}
