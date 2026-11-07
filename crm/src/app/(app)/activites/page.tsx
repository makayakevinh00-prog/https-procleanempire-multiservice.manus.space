import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChip } from "@/components/crm/activity-ui";
import { ACTIVITIES, invoiceActivity, isActivity, missionActivity, profitability, type Activity } from "@/lib/domain/activity";
import { loadActivityModel, monthlyOf, selectResilient } from "@/lib/activity-data";
import { parisToday, addDays } from "@/lib/domain/dates";
import { formatEUR, formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";
const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

export default async function ActivitiesPage() {
  const sb = createClient();
  const today = parisToday();
  const since = `${(Number(today.slice(0, 4)) - 1).toString()}-${today.slice(5, 7)}-01`;
  const settings = await getSettings(sb);
  const model = await loadActivityModel(sb);
  const [inv, mis] = await Promise.all([
    selectResilient<any>((c) => sb.from("invoices").select(c).gte("issue_date", since).neq("status", "brouillon").neq("status", "annule"), "id, client_id, status, issue_date, total_ht, total_ttc, paid_amount"),
    selectResilient<any>((c) => sb.from("interventions").select(c).gte("scheduled_date", today).lte("scheduled_date", addDays(today, 30)).neq("stage", "annulee"), "id, title, contract_id, clients(name)")
  ]);
  if (inv.error) throw new Error(inv.error.message);
  if (mis.error) throw new Error(mis.error.message);
  const hourly = num(settings.indep_hourly_cost);

  const stats = ACTIVITIES.map((a) => {
    const ks = model.contracts.filter((c) => c.family === a.key && c.k.status === "actif");
    const monthly = ks.reduce((t, c) => t + monthlyOf(c.k), 0);
    const weekly = ks.reduce((t, c) => t + num(c.k.weekly_hours), 0);
    const invs = (inv.data ?? []).filter((i: any) => invoiceActivity({ activity: isActivity(i.activity) ? (i.activity as Activity) : null, clientId: i.client_id }, model.byClient) === a.key);
    const billed = invs.reduce((t: number, i: any) => t + num(i.total_ht), 0);
    const open = invs.filter((i: any) => ["envoye", "en_retard"].includes(i.status)).reduce((t: number, i: any) => t + num(i.total_ttc) - num(i.paid_amount), 0);
    const missions = (mis.data ?? []).filter((m: any) => missionActivity({ activity: isActivity(m.activity) ? (m.activity as Activity) : null, contractId: m.contract_id, title: m.title, clientName: m.clients?.name ?? null }, model.byContract) === a.key).length;
    return { a, contracts: ks.length, monthly, weekly, billed, open, missions, p: profitability(monthly, weekly, hourly) };
  });
  const totalBilled = stats.reduce((t, s) => t + s.billed, 0) || 1;
  const guessed = model.contracts.filter((c) => !c.saved).length;

  return (
    <>
      <PageHeader title="Activités" subtitle="Ce qui rapporte, famille par famille : contrats, heures, facturé sur 12 mois, à encaisser." />
      {(guessed > 0 || !model.ready) && (
        <div className="mb-5 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {!model.ready ? "Les familles sont déduites des intitulés (l'enregistrement n'est pas encore activé)." : `${guessed} contrat(s) ont une famille devinée, non enregistrée.`}{" "}
          <Link href="/contrats" className="font-medium text-primary hover:underline">Vérifier dans Contrats</Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {stats.map(({ a, contracts, monthly, weekly, billed, open, missions, p }) => (
          <Card key={a.key}>
            <CardHeader><div><ActivityChip a={a.key} /><p className="mt-1.5 text-[13px] text-muted-foreground">{a.hint}</p></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Fig label="Contrats actifs" value={String(contracts)} href={`/contrats?famille=${a.key}`} />
                <Fig label="Récurrent / mois (HT)" value={eur0(monthly)} />
                <Fig label="Heures / semaine" value={weekly ? formatHours(weekly) : "—"} />
                <Fig label="CA par heure" value={p.revenuePerHour != null ? `${p.revenuePerHour.toFixed(0)} €` : "—"} hint="récurrent ÷ heures prévues" />
                <Fig label="Marge estimée / mois" value={p.marginMonthly != null ? eur0(p.marginMonthly) : "—"} hint={p.marginPct != null ? `${Math.round(p.marginPct)} % · estimation` : undefined} tone={p.marginMonthly != null && p.marginMonthly < 0 ? "err" : undefined} />
                <Fig label="Missions 30 prochains jours" value={String(missions)} href={`/missions?famille=${a.key}`} />
              </div>
              <div className="border-t border-border/70 pt-3">
                <div className="flex items-baseline justify-between text-[13px]"><span className="text-muted-foreground">Facturé sur 12 mois (HT)</span><b className="num font-semibold text-foreground">{eur0(billed)}</b></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.round((billed / totalBilled) * 100)}%` }} /></div>
                <div className="mt-1.5 flex justify-between text-[12px] text-muted-foreground"><span>{Math.round((billed / totalBilled) * 100)} % du facturé</span><span>à encaisser : <b className="num font-medium text-foreground">{eur0(open)}</b> TTC</span></div>
              </div>
              <div className="flex flex-wrap gap-3 text-[13px]">
                <Link href={`/contrats?famille=${a.key}`} className="font-medium text-primary hover:underline">Contrats</Link>
                <Link href={`/missions?famille=${a.key}`} className="font-medium text-primary hover:underline">Missions</Link>
                <Link href={`/factures?famille=${a.key}`} className="font-medium text-primary hover:underline">Factures</Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-xs text-muted-foreground">
        La marge est une <b className="font-medium">estimation</b> : le récurrent mensuel moins les heures prévues × le coût horaire de vos Paramètres ({formatEUR(hourly)} / h). Elle ne tient pas compte des déplacements, du matériel ni du linge.
        Les prestations ponctuelles n&apos;ont pas d&apos;heures prévues : seul leur facturé est mesuré.
      </p>
    </>
  );
}

function Fig({ label, value, hint, href, tone }: { label: string; value: string; hint?: string; href?: string; tone?: "err" }) {
  const body = (<div><div className="text-[12px] text-muted-foreground">{label}</div><div className={`num mt-0.5 text-[22px] font-semibold tracking-tight ${tone === "err" ? "text-destructive" : "text-foreground"}`}>{value}</div>{hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}</div>);
  return href ? <Link href={href} className="block rounded-lg transition-colors hover:bg-secondary/50">{body}</Link> : body;
}
