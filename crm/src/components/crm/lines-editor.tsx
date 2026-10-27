"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { documentTotals } from "@/lib/domain/billing";
import { formatEUR } from "@/lib/utils";
import type { Line } from "@/lib/domain/types";

interface Row { description: string; quantity: string; unit_price_ht: string; vat_rate: string }

const toRow = (l: Line): Row => ({
  description: l.description, quantity: String(l.quantity), unit_price_ht: String(l.unit_price_ht), vat_rate: String(l.vat_rate)
});
const num = (s: string) => { const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : 0; };

export function LinesEditor({ initial, defaultVat }: { initial?: Line[]; defaultVat: number }) {
  const [rows, setRows] = useState<Row[]>(
    initial?.length ? initial.map(toRow) : [{ description: "", quantity: "1", unit_price_ht: "", vat_rate: String(defaultVat) }]
  );
  const set = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const lines: Line[] = rows.map((r) => ({ description: r.description, quantity: num(r.quantity), unit_price_ht: num(r.unit_price_ht), vat_rate: num(r.vat_rate) }));
  const t = documentTotals(lines);

  return (
    <div className="space-y-3">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="hidden grid-cols-[1fr_5rem_7rem_5rem_2.5rem] gap-2 px-1 text-xs font-semibold uppercase text-muted-foreground sm:grid">
        <span>Prestation</span><span>Qté</span><span>PU HT (€)</span><span>TVA %</span><span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-[1fr_5rem_7rem_5rem_2.5rem] sm:border-0 sm:p-0">
          <Input className="col-span-2 sm:col-span-1" placeholder="Description" value={r.description} onChange={(e) => set(i, "description", e.target.value)} aria-label="Description" />
          <Input inputMode="decimal" value={r.quantity} onChange={(e) => set(i, "quantity", e.target.value)} aria-label="Quantité" />
          <Input inputMode="decimal" value={r.unit_price_ht} onChange={(e) => set(i, "unit_price_ht", e.target.value)} aria-label="Prix unitaire HT" />
          <Input inputMode="decimal" value={r.vat_rate} onChange={(e) => set(i, "vat_rate", e.target.value)} aria-label="TVA" />
          <Button type="button" variant="ghost" size="icon" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label="Supprimer la ligne">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows((x) => [...x, { description: "", quantity: "1", unit_price_ht: "", vat_rate: String(defaultVat) }])}>
        <Plus className="h-4 w-4" /> Ajouter une ligne
      </Button>
      <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Total HT</dt><dd>{formatEUR(t.ht)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">TVA</dt><dd>{formatEUR(t.vat)}</dd></div>
        <div className="flex justify-between border-t pt-1 text-base font-bold"><dt>Total TTC</dt><dd>{formatEUR(t.ttc)}</dd></div>
      </dl>
    </div>
  );
}
