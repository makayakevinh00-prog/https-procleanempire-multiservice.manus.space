"use client";

import { useState } from "react";
import type { Recipient } from "@/lib/recipients";

/** Cases à cocher des adresses du client + champ libre ; « Tout cocher » pour envoyer à tous. */
export function RecipientPicker({ recipients, defaultAll = false }: { recipients: Recipient[]; defaultAll?: boolean }) {
  const initial = Object.fromEntries(recipients.map((r) => [r.email, defaultAll ? true : r.primary || r.forInvoices]));
  const [checked, setChecked] = useState<Record<string, boolean>>(initial);
  const all = recipients.length > 0 && recipients.every((r) => checked[r.email]);
  return (
    <fieldset className="space-y-2 rounded-lg border p-3 text-sm">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Envoyer à</legend>
      {recipients.length === 0 && <p className="text-red-700">Aucune adresse enregistrée : ajoutez-en une ci-dessous (ou sur la fiche client).</p>}
      {recipients.map((r) => (
        <label key={r.email} className="flex items-center gap-2">
          <input type="checkbox" name="to" value={r.email} checked={!!checked[r.email]} onChange={(e) => setChecked({ ...checked, [r.email]: e.target.checked })} />
          <span className="min-w-0 flex-1 truncate">{r.email}</span>
          <span className="text-xs text-slate-500">{r.primary ? "principale" : r.label ?? ""}</span>
        </label>
      ))}
      {recipients.length > 1 && (
        <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setChecked(Object.fromEntries(recipients.map((r) => [r.email, !all])))}>
          {all ? "Tout décocher" : "Tout cocher (envoyer à tous)"}
        </button>
      )}
      <label className="block">
        <span className="text-xs text-slate-500">Autre adresse (facultatif)</span>
        <input name="to_extra" type="text" placeholder="nom@exemple.fr" className="mt-1 h-10 w-full rounded-md border px-3" />
      </label>
    </fieldset>
  );
}
