"use client";

import { useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { documentTotals, lineTotals } from "@/lib/domain/billing";
import { formatEUR } from "@/lib/utils";
import type { Line } from "@/lib/domain/types";

export interface ServiceOption {
  id: string; code: string | null; name: string; description: string | null; unit: string | null; unit_price_ht: number; vat_rate: number;
}

interface Row { title: string; detail: string; showDetail: boolean; catalogDetail: string; quantity: string; unit_price_ht: string; vat_rate: string }

const num = (s: string) => { const n = Number(String(s).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const splitDescription = (d: string): [string, string] => {
  const i = d.indexOf("\n");
  return i < 0 ? [d.trim(), ""] : [d.slice(0, i).trim(), d.slice(i + 1).trim()];
};
const GROUPS: Record<string, string> = {
  AIR: "Ménage Airbnb", BUR: "Bureaux et commerces", CTR: "Contrats clients", DEC: "Décontamination", DET: "Véhicules",
  ENT: "Entretien récurrent", LIN: "Linge", PIG: "Anti-pigeons", REM: "Remise en état"
};

export function LinesEditor({ initial, defaultVat, services = [] }: { initial?: Line[]; defaultVat: number; services?: ServiceOption[] }) {
  const blank = (): Row => ({ title: "", detail: "", showDetail: false, catalogDetail: "", quantity: "1", unit_price_ht: "", vat_rate: String(defaultVat) });
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.length
      ? initial.map((l) => {
          const [title, detail] = splitDescription(l.description);
          return { title, detail, showDetail: !!detail, catalogDetail: "", quantity: String(l.quantity), unit_price_ht: String(l.unit_price_ht), vat_rate: String(l.vat_rate) };
        })
      : [blank()]
  );
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const lines: Line[] = rows.map((r) => ({
    description: r.detail.trim() ? `${r.title.trim()}\n${r.detail.trim()}` : r.title.trim(),
    quantity: num(r.quantity), unit_price_ht: num(r.unit_price_ht), vat_rate: num(r.vat_rate)
  }));
  const totals = documentTotals(lines);

  const addService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    const row: Row = { title: s.name, detail: "", showDetail: false, catalogDetail: s.description ?? "", quantity: "1", unit_price_ht: String(s.unit_price_ht), vat_rate: String(s.vat_rate) };
    setRows((r) => (r.length === 1 && !r[0].title && !r[0].unit_price_ht ? [row] : [...r, row]));
  };

  const grouped = new Map<string, ServiceOption[]>();
  for (const s of services) {
    const g = GROUPS[(s.code ?? "").split("-")[0]] ?? "Autres";
    grouped.set(g, [...(grouped.get(g) ?? []), s]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <div className="flex flex-wrap items-center gap-2">
        {services.length > 0 && (
          <select aria-label="Ajouter une prestation du catalogue" value="" onChange={(e) => addService(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-md border bg-card px-3 text-sm sm:max-w-md">
            <option value="">➕ Ajouter une prestation du catalogue…</option>
            {[...grouped.entries()].map(([g, list]) => (
              <optgroup key={g} label={g}>
                {list.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatEUR(s.unit_price_ht)}{s.unit ? ` / ${s.unit}` : ""}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, blank()])}><Plus className="h-4 w-4" /> Ligne libre</Button>
      </div>

      <div className="hidden grid-cols-[1fr_5rem_7rem_5rem_6.5rem_2.5rem] gap-2 px-1 text-xs font-semibold uppercase text-muted-foreground sm:grid">
        <span>Désignation</span><span>Qté</span><span>PU HT (€)</span><span>TVA %</span><span className="text-right">Total HT</span><span />
      </div>

      {rows.map((r, i) => (
        <div key={i} className="rounded-md border bg-card p-2 sm:p-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_5rem_7rem_5rem_6.5rem_2.5rem] sm:items-center">
            <Input className="col-span-3 sm:col-span-1" placeholder="Désignation (court)" value={r.title} onChange={(e) => set(i, { title: e.target.value })} aria-label="Désignation" />
            <Input inputMode="decimal" value={r.quantity} onChange={(e) => set(i, { quantity: e.target.value })} aria-label="Quantité" />
            <Input inputMode="decimal" placeholder="Prix" value={r.unit_price_ht} onChange={(e) => set(i, { unit_price_ht: e.target.value })} aria-label="Prix unitaire HT" />
            <Input inputMode="decimal" value={r.vat_rate} onChange={(e) => set(i, { vat_rate: e.target.value })} aria-label="TVA" />
            <div className="col-span-2 text-right text-sm font-semibold sm:col-span-1">{formatEUR(lineTotals(lines[i]).ht)}</div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label="Supprimer la ligne">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {r.showDetail ? (
            <Textarea className="mt-2 min-h-[64px] text-xs" placeholder="Détail affiché sous la désignation (facultatif)" value={r.detail} onChange={(e) => set(i, { detail: e.target.value })} aria-label="Détail" />
          ) : (
            <div className="mt-1.5 flex gap-3 text-xs">
              <button type="button" className="text-primary hover:underline" onClick={() => set(i, { showDetail: true })}>＋ Ajouter un détail</button>
              {r.catalogDetail && (
                <button type="button" className="inline-flex items-center gap-1 text-muted-foreground hover:underline" onClick={() => set(i, { showDetail: true, detail: r.catalogDetail })}>
                  <FileText className="h-3 w-3" /> Insérer la description du catalogue
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Total HT</dt><dd>{formatEUR(totals.ht)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">TVA</dt><dd>{formatEUR(totals.vat)}</dd></div>
        <div className="flex justify-between border-t pt-1 text-base font-bold"><dt>Total TTC</dt><dd>{formatEUR(totals.ttc)}</dd></div>
      </dl>
    </div>
  );
}
