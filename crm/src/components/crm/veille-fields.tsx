import { Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  CERT_KIND,
  CERT_STATUS,
  IMPACT,
  PRIORITY,
  WATCH_KIND,
} from "@/lib/veille";

const opts = (o: Record<string, string>) =>
  Object.entries(o).map(([v, l]) => (
    <option key={v} value={v}>
      {l}
    </option>
  ));

export function CompetitorFields({
  c,
  certs,
  held,
}: {
  c?: any;
  certs?: { id: string; name: string }[];
  held?: Set<string>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Nom *">
        <Input name="name" required defaultValue={c?.name ?? ""} />
      </Field>
      <Field label="Site web">
        <Input
          name="website"
          defaultValue={c?.website ?? ""}
          placeholder="www.exemple.fr"
        />
      </Field>
      <Field label="SIREN" hint="Facultatif : sans SIREN, je retrouve l'entreprise par son nom">
        <Input name="siren" inputMode="numeric" defaultValue={c?.siren ?? ""} />
      </Field>
      <Field label="Statut">
        <Select name="status" defaultValue={c?.status ?? "surveille"}>
          <option value="surveille">Surveillé</option>
          <option value="archive">Archivé</option>
        </Select>
      </Field>
      <Field label="Services proposés" className="sm:col-span-3">
        <Textarea
          name="services"
          defaultValue={c?.services ?? ""}
          placeholder="Bureaux, copropriétés, Airbnb, fin de chantier…"
        />
      </Field>
      <Field label="Positionnement" className="sm:col-span-3">
        <Textarea
          name="positioning"
          defaultValue={c?.positioning ?? ""}
          placeholder="Haut de gamme, low-cost, local, national…"
        />
      </Field>
      <Field label="Points forts">
        <Textarea name="strengths" defaultValue={c?.strengths ?? ""} />
      </Field>
      <Field label="Points faibles">
        <Textarea name="weaknesses" defaultValue={c?.weaknesses ?? ""} />
      </Field>
      <Field label="Prix constatés">
        <Textarea
          name="prices"
          defaultValue={c?.prices ?? ""}
          placeholder="Ex. studio Airbnb 45 € (source, date)"
        />
      </Field>
      {certs && certs.length > 0 && (
        <fieldset className="sm:col-span-3">
          <legend className="mb-1.5 text-sm font-semibold text-slate-700">
            Certifications et labels qu&apos;il affiche
          </legend>
          <div className="flex flex-wrap gap-2">
            {certs.map((k) => (
              <label
                key={k.id}
                className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  name="cert"
                  value={k.id}
                  defaultChecked={held?.has(k.id)}
                />{" "}
                {k.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

export function WatchFields({
  competitors,
}: {
  competitors?: { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Titre *" className="sm:col-span-2">
        <Input
          name="title"
          required
          placeholder="Ex. Nouveau tarif Airbnb chez X"
        />
      </Field>
      <Field label="Date">
        <Input
          name="observed_on"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </Field>
      {competitors && (
        <Field label="Concurrent">
          <Select name="competitor_id" defaultValue="">
            <option value="">Marché en général</option>
            {competitors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Type">
        <Select name="kind" defaultValue="autre">
          {opts(WATCH_KIND)}
        </Select>
      </Field>
      <Field label="Impact pour nous">
        <Select name="impact" defaultValue="moyen">
          {opts(IMPACT)}
        </Select>
      </Field>
      <Field label="Ce qu'on a constaté" className="sm:col-span-3">
        <Textarea name="detail" />
      </Field>
      <Field label="Ce qu'on fait (action)" className="sm:col-span-2">
        <Input name="action" placeholder="Ex. revoir notre tarif studio" />
      </Field>
      <Field label="Lien source">
        <Input name="source_url" placeholder="https://…" />
      </Field>
    </div>
  );
}

export function CertFields({ k }: { k?: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Nom *">
        <Input name="name" required defaultValue={k?.name ?? ""} />
      </Field>
      <Field label="Type">
        <Select name="kind" defaultValue={k?.kind ?? "certification"}>
          {opts(CERT_KIND)}
        </Select>
      </Field>
      <Field label="Organisme">
        <Input name="provider" defaultValue={k?.provider ?? ""} />
      </Field>
      <Field label="Statut">
        <Select name="status" defaultValue={k?.status ?? "a_envisager"}>
          {opts(CERT_STATUS)}
        </Select>
      </Field>
      <Field label="Priorité">
        <Select name="priority" defaultValue={k?.priority ?? "normale"}>
          {opts(PRIORITY)}
        </Select>
      </Field>
      <Field label="Objectif">
        <Input
          name="target_date"
          type="date"
          defaultValue={k?.target_date ?? ""}
        />
      </Field>
      <Field label="Ce que c'est" className="sm:col-span-3">
        <Textarea name="description" defaultValue={k?.description ?? ""} />
      </Field>
      <Field label="Ce que ça nous apporte" className="sm:col-span-3">
        <Textarea name="benefit" defaultValue={k?.benefit ?? ""} />
      </Field>
      <Field label="Coût (€, pour comparer)" hint="Facultatif : sert au tri « moins cher d'abord »">
        <Input name="cost_eur" inputMode="decimal" defaultValue={k?.cost_eur ?? ""} />
      </Field>
      <Field label="Lien pour s'inscrire">
        <Input name="enroll_url" defaultValue={k?.enroll_url ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Coût (détail)">
        <Input name="cost_note" defaultValue={k?.cost_note ?? ""} />
      </Field>
      <Field label="Durée / délai">
        <Input name="duration_note" defaultValue={k?.duration_note ?? ""} />
      </Field>
      <Field label="Lien source">
        <Input name="source_url" defaultValue={k?.source_url ?? ""} />
      </Field>
      <Field label="Notes" className="sm:col-span-3">
        <Textarea name="notes" defaultValue={k?.notes ?? ""} />
      </Field>
    </div>
  );
}
