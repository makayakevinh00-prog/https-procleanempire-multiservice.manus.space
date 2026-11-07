"use client";

import { useState } from "react";
import { ACTIVITIES } from "@/lib/domain/activity";
import { Field, Input, Select } from "@/components/ui/form";

type Mode = "mensuel" | "passage" | "autre";
/** Mode de facturation naturel de chaque famille : bureaux = forfait mensuel, Airbnb = prix au passage, gestion locative = pourcentage. */
const DEFAULT_MODE: Record<string, Mode> = { nettoyage_pro: "mensuel", nettoyage_airbnb: "passage", gestion_locative: "autre" };

/** Famille + tarif : les champs de prix s'adaptent à la famille choisie (ce n'est pas le même tarif partout). */
export function PricingFields({ contract }: { contract?: { activity?: string | null; billing_mode?: Mode; monthly_amount_ht?: number | null; per_visit_amount_ht?: number | null; commission_pct?: number | null; commission_base_ht?: number | null } }) {
  const [family, setFamily] = useState<string>(contract?.activity ?? "");
  const [mode, setMode] = useState<Mode>(contract?.billing_mode ?? "mensuel");
  const pct = mode === "autre" && (family === "gestion_locative" || contract?.commission_pct != null);
  return (
    <>
      <Field label="Famille d'activité" hint="Le tarif s'adapte à la famille">
        <Select name="activity" value={family} onChange={(e) => { const f = e.target.value; setFamily(f); if (DEFAULT_MODE[f]) setMode(DEFAULT_MODE[f]); }}>
          <option value="">Automatique (selon l&apos;intitulé)</option>
          {ACTIVITIES.filter((a) => a.key !== "ponctuel").map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </Select>
      </Field>
      <Field label="Facturation">
        <Select name="billing_mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="mensuel">Forfait mensuel</option><option value="passage">Prix par passage</option><option value="autre">{family === "gestion_locative" ? "Pourcentage des revenus de location" : "Autre (pourcentage ou conditions)"}</option>
        </Select>
      </Field>
      {mode === "mensuel" && <Field label="Montant HT / mois" hint="Forfait fixe, facturé chaque mois"><Input name="monthly_amount_ht" inputMode="decimal" defaultValue={contract?.monthly_amount_ht ?? ""} /></Field>}
      {mode === "passage" && <Field label="Prix HT par passage" hint="Facturé à chaque intervention réalisée"><Input name="per_visit_amount_ht" inputMode="decimal" defaultValue={contract?.per_visit_amount_ht ?? ""} /></Field>}
      {mode === "autre" && (
        <>
          <Field label="Commission (% des revenus de location)" hint="Ex. 20 pour 20 %"><Input name="commission_pct" inputMode="decimal" defaultValue={contract?.commission_pct ?? ""} required={pct} /></Field>
          <Field label="Revenus de location estimés / mois (HT)" hint="Facultatif : sert à projeter la commission dans « Activités »"><Input name="commission_base_ht" inputMode="decimal" defaultValue={contract?.commission_base_ht ?? ""} /></Field>
        </>
      )}
    </>
  );
}
