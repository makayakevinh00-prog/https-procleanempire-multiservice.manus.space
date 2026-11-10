import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { PLATFORMS } from "@/lib/concierge/ical";

type Opt = { id: string; label: string };

/** Formulaire d'un logement géré : propriétaire, lien calendrier de la plateforme, ménage (prix, durée, heure de départ, agent). */
export function ListingForm({
  l,
  clients,
  contracts,
  staff,
  action,
}: {
  l?: any;
  clients: Opt[];
  contracts: Opt[];
  staff: Opt[];
  action: (fd: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <Field label="Nom du logement *">
        <Input
          name="name"
          required
          defaultValue={l?.name ?? ""}
          placeholder="Studio République"
        />
      </Field>
      <Field label="Propriétaire *">
        <Select name="client_id" required defaultValue={l?.client_id ?? ""}>
          <option value="">— choisir —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Contrat (commission, tarifs)">
        <Select name="contract_id" defaultValue={l?.contract_id ?? ""}>
          <option value="">— aucun —</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Plateforme">
        <Select name="platform" defaultValue={l?.platform ?? "airbnb"}>
          {Object.entries(PLATFORMS).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Lien calendrier (iCal)"
        className="sm:col-span-2"
        hint="Airbnb : Calendrier › Disponibilité › Synchroniser › Exporter. Booking : Tarifs et disponibilités › Synchroniser les calendriers. Abritel/Vrbo : Calendrier › Importer/Exporter."
      >
        <Input
          name="ical_url"
          defaultValue={l?.ical_url ?? ""}
          placeholder="https://www.airbnb.fr/calendar/ical/….ics?s=…"
        />
      </Field>
      <Field label="Prix du ménage (€ HT)">
        <Input
          name="cleaning_price_ht"
          inputMode="decimal"
          defaultValue={l?.cleaning_price_ht ?? ""}
        />
      </Field>
      <Field label="Durée du ménage (h)">
        <Input
          name="cleaning_hours"
          inputMode="decimal"
          defaultValue={l?.cleaning_hours ?? ""}
        />
      </Field>
      <Field label="Heure de départ des voyageurs">
        <Input
          name="checkout_time"
          type="time"
          defaultValue={String(l?.checkout_time ?? "11:00").slice(0, 5)}
        />
      </Field>
      <Field label="Agent habituel">
        <Select name="staff_id" defaultValue={l?.staff_id ?? ""}>
          <option value="">— aucun —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="auto_cleaning"
          defaultChecked={l?.auto_cleaning ?? true}
        />{" "}
        Créer automatiquement un ménage à chaque départ
      </label>
      <div className="sm:col-span-3">
        <Button>{l ? "Enregistrer" : "Ajouter le logement"}</Button>
      </div>
    </form>
  );
}
