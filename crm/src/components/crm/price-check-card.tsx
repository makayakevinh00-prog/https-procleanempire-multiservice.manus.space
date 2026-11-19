import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/lib/utils";
import type { PriceCheck } from "@/lib/domain/price-check";

/** Contrôle des prix affiché sur un brouillon de facture : conforme, à vérifier, ou envoi bloqué. */
export function PriceCheckCard({ price, totalHt }: { price: PriceCheck; totalHt: number }) {
  return (
    <Card className={price.verdict === "conforme" ? "border-emerald-200" : price.verdict === "bloquant" ? "border-red-300" : "border-amber-300"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {price.verdict === "conforme" ? <ShieldCheck className="h-4 w-4 text-emerald-700" /> : <ShieldAlert className={`h-4 w-4 ${price.verdict === "bloquant" ? "text-red-700" : "text-amber-700"}`} />}
                  Contrôle des prix
                </CardTitle>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${price.verdict === "conforme" ? "bg-[#e6f1ea] text-[#2f7a55]" : price.verdict === "bloquant" ? "bg-[#f6e4e1] text-[#b3382c]" : "bg-[#f7ecdb] text-[#8f5a12]"}`}>
                  {price.verdict === "conforme" ? "Prix conforme" : price.verdict === "bloquant" ? "Envoi bloqué" : "À vérifier"}
                </span>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{price.basis}{price.expectedHt != null ? <> Attendu : <b className="num font-medium text-foreground">{formatEUR(price.expectedHt)} HT</b>, facturé : <b className="num font-medium text-foreground">{formatEUR(totalHt)} HT</b>.</> : null}</p>
                {price.findings.length ? (
                  <ul className="space-y-2">
                    {price.findings.map((f) => (
                      <li key={f.code} className={`rounded-lg p-3 ${f.level === "bloquant" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`}>
                        <b className="block">{f.title}</b>
                        <span className="text-[13px]">{f.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-emerald-800">Rien à signaler : le montant correspond à ce qui est convenu.</p>}
              </CardContent>
            </Card>
  );
}
