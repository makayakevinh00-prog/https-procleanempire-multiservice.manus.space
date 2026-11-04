import { saveSiteAction } from "@/app/actions/missions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function SiteForm({ site, clients, defaultClient }: { site?: any; clients: { id: string; name: string }[]; defaultClient?: string }) {
  return (
    <form action={saveSiteAction} className="grid gap-4 sm:grid-cols-2">
      {site && <input type="hidden" name="id" value={site.id} />}
      <Field label="Nom du site *"><Input name="name" required defaultValue={site?.name ?? ""} placeholder="Ex. : Bureaux Roissy, Studio Saint-Ouen…" /></Field>
      <Field label="Client *">
        <Select name="client_id" required defaultValue={site?.client_id ?? defaultClient ?? ""}>
          <option value="" disabled>Choisir…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Adresse" className="sm:col-span-2"><Input name="address" defaultValue={site?.address ?? ""} /></Field>
      <Field label="Code postal"><Input name="postal_code" defaultValue={site?.postal_code ?? ""} /></Field>
      <Field label="Ville"><Input name="city" defaultValue={site?.city ?? ""} /></Field>
      <Field label="Contact sur place"><Input name="contact_name" defaultValue={site?.contact_name ?? ""} /></Field>
      <Field label="Téléphone sur place"><Input name="contact_phone" defaultValue={site?.contact_phone ?? ""} /></Field>
      <Field label="Accès (codes, clés, horaires)" hint="Visible par l'équipe, jamais par le client." className="sm:col-span-2"><Textarea name="access_notes" rows={2} defaultValue={site?.access_notes ?? ""} /></Field>
      <Field label="Check-list type (un point par ligne)" hint="Copiée automatiquement sur chaque nouvelle mission de ce site." className="sm:col-span-2">
        <Textarea name="checklist" rows={5} defaultValue={(site?.checklist ?? []).join("\n")} placeholder={"Vider les poubelles\nAspirer et laver les sols\nDésinfecter les sanitaires"} />
      </Field>
      <Field label="Notes internes" className="sm:col-span-2"><Textarea name="notes" rows={2} defaultValue={site?.notes ?? ""} /></Field>
      {site && <Field label="État"><Select name="status" defaultValue={site.status}><option value="actif">Actif</option><option value="inactif">Inactif</option></Select></Field>}
      <div className="sm:col-span-2"><Button>{site ? "Enregistrer" : "Créer le site"}</Button></div>
    </form>
  );
}
