import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings, numOrNull } from "@/lib/data";
import { summarize, weeklyHours, weeklyRevenueHt, type Level, type SiteRow } from "@/lib/domain/recruitment";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientName } from "@/components/crm/client-name";
import { formatEUR, formatHours } from "@/lib/utils";
import type { Contract } from "@/lib/domain/types";

const LEVEL: Record<Level, { label: string; box: string; msg: (h: number, g: number, o: number) => string }> = {
  vert: { label: "VERT", box: "border-emerald-500 bg-emerald-50 text-emerald-900", msg: (h, g) => `Pas de recrutement nécessaire : il reste ${(g - h).toLocaleString("fr-FR")} h avant le seuil orange.` },
  orange: { label: "ORANGE", box: "border-amber-500 bg-amber-50 text-amber-900", msg: (h, _g, o) => `Anticipez le recrutement : ${(o - h).toLocaleString("fr-FR")} h avant le seuil rouge.` },
  rouge: { label: "ROUGE", box: "border-red-600 bg-red-50 text-red-900", msg: (h, _g, o) => `Recrutement à lancer : ${(h - o).toLocaleString("fr-FR")} h au-dessus du seuil.` }
};

export default async function RecruitmentPage() {
  const supabase = createClient();
  const [settings, { data, error }] = await Promise.all([
    getSettings(supabase),
    supabase.from("contracts").select("*, clients(id, name, is_reserved)").eq("status", "actif").order("label")
  ]);
  if (error) throw new Error(error.message);

  const rows: SiteRow[] = (data ?? []).map((k: any) => {
    const c = { ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht),
      hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) } as Contract;
    return { contract: c, clientName: k.clients.name, weeklyHours: weeklyHours(c), weeklyRevenue: weeklyRevenueHt(c) };
  });
  const sum = summarize(rows, settings);
  const lvl = LEVEL[sum.level];
  const green = Number(settings.recruit_green_max_hours), orange = Number(settings.recruit_orange_max_hours);
  const gauge = Math.min(100, (sum.totalHours / (orange * 1.3)) * 100);

  return (
    <>
      <PageHeader title="Recrutement" subtitle="Stock des sites actifs, heures hebdomadaires et coût indépendant vs salarié." />

      <div className={`mb-4 rounded-lg border-2 p-5 ${lvl.box}`}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-4xl font-bold">{formatHours(sum.totalHours)}</span>
          <span className="text-sm font-semibold">/ semaine — indicateur {lvl.label}</span>
        </div>
        <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-white/70">
          <div className="absolute inset-y-0 left-0 bg-current opacity-70" style={{ width: `${gauge}%` }} />
          <div className="absolute inset-y-0 w-px bg-black/40" style={{ left: `${(green / (orange * 1.3)) * 100}%` }} />
          <div className="absolute inset-y-0 w-px bg-black/40" style={{ left: `${(orange / (orange * 1.3)) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm">{lvl.msg(sum.totalHours, green, orange)} (vert &lt; {green} h · orange {green}–{orange} h · rouge &gt; {orange} h)</p>
        {sum.sitesMissingHours > 0 && (
          <p className="mt-2 text-sm font-semibold">⚠ {sum.sitesMissingHours} site(s) sans heures renseignées : le total est sous-estimé. Complétez « heures par intervention » et « fréquence » dans les contrats.</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Stock des sites ({rows.length})</CardTitle></CardHeader>
          {!rows.length ? <Empty>Aucun contrat actif.</Empty> : (
            <Table>
              <thead><tr><Th>Client</Th><Th>Contrat</Th><Th className="text-right">Heures / sem</Th><Th className="text-right">CA HT / sem</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.contract.id}>
                    <Td><ClientName id={r.contract.client_id} name={r.clientName} reserved={(data as any[]).find((d) => d.id === r.contract.id)?.clients.is_reserved} /></Td>
                    <Td><Link className="hover:underline" href={`/contrats/${r.contract.id}`}>{r.contract.label}</Link></Td>
                    <Td className="text-right font-semibold">{r.weeklyHours != null ? formatHours(r.weeklyHours) : <span className="font-normal text-amber-700">à renseigner</span>}</Td>
                    <Td className="text-right">{r.weeklyRevenue != null ? formatEUR(r.weeklyRevenue) : "—"}</Td>
                  </Tr>
                ))}
                <Tr className="bg-muted/60 font-bold"><Td colSpan={2}>Total</Td><Td className="text-right">{formatHours(sum.totalHours)}</Td><Td className="text-right">{formatEUR(sum.weeklyRevenue)}</Td></Tr>
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Indépendant vs Salarié</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {([["Indépendant", sum.indep, "independant"], ["Salarié (chargé)", sum.salarie, "salarie"]] as const).map(([name, v, key]) => (
              <div key={key} className={`rounded-md border p-3 ${sum.cheaper === key ? "border-emerald-500 bg-emerald-50" : ""}`}>
                <div className="flex justify-between font-semibold"><span>{name}</span>{sum.cheaper === key && <span className="text-emerald-700">moins cher</span>}</div>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Coût horaire</dt><dd>{formatEUR(v.hourly)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Coût / semaine</dt><dd>{formatEUR(v.weekly)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Coût / mois</dt><dd>{formatEUR(v.monthly)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Marge hebdo</dt><dd className={v.weeklyMargin < 0 ? "text-red-700" : ""}>{formatEUR(v.weeklyMargin)}</dd></div>
                </dl>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Taux configurables dans <Link href="/parametres" className="text-primary hover:underline">Paramètres</Link>. Salarié = brut × (1 + congés payés) × (1 + charges patronales).
              Marge calculée sur les sites dont les heures sont connues.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
