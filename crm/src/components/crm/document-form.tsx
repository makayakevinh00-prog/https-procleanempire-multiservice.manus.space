"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { LinesEditor } from "./lines-editor";
import type { Line } from "@/lib/domain/types";

interface Props {
  action: (fd: FormData) => void | Promise<void>;
  kind: "devis" | "facture";
  clients: { id: string; name: string; is_reserved: boolean }[];
  /** Client figé (édition) */
  lockedClientId?: string;
  defaultClientId?: string;
  defaults?: { subject?: string | null; notes?: string | null; valid_until?: string | null; lines?: Line[] };
  defaultVat: number;
  submitLabel: string;
}

export function DocumentForm({ action, kind, clients, lockedClientId, defaultClientId, defaults, defaultVat, submitLabel }: Props) {
  const [clientId, setClientId] = useState(lockedClientId ?? defaultClientId ?? "");
  const selected = clients.find((c) => c.id === clientId);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client *">
          {lockedClientId ? (
            <Input value={selected?.name ?? ""} disabled readOnly />
          ) : (
            <Select name="client_id" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="" disabled>Choisir…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_reserved ? " 🔒 RÉSERVÉ" : ""}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Objet"><Input name="subject" defaultValue={defaults?.subject ?? ""} placeholder="Nettoyage de…" /></Field>
        {kind === "devis" && <Field label="Valable jusqu'au"><Input name="valid_until" type="date" defaultValue={defaults?.valid_until ?? ""} /></Field>}
      </div>

      {selected?.is_reserved && (
        <label className="flex cursor-pointer gap-2 rounded-md border-2 border-destructive bg-red-50 p-3 text-sm text-red-900">
          <input type="checkbox" name="ack_reserved" required className="mt-1" />
          <span><b>🔒 Contact réservé : {selected.name}.</b> Traitement patron uniquement. Je confirme agir moi-même.</span>
        </label>
      )}

      <LinesEditor initial={defaults?.lines} defaultVat={defaultVat} />
      <Field label="Notes (visibles sur le PDF)"><Textarea name="notes" defaultValue={defaults?.notes ?? ""} /></Field>
      <Button>{submitLabel}</Button>
    </form>
  );
}
