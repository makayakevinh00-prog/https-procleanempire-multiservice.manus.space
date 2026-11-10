import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClientName } from "@/components/crm/client-name";
import { contractIssues } from "@/lib/domain/contract-check";
import { WEEKDAYS } from "@/lib/domain/schedule";
import { formatDate, formatEUR, formatHours } from "@/lib/utils";
import { numOrNull } from "@/lib/data";
import { ActivityChip, ActivityTabs } from "@/components/crm/activity-ui";
import { ACTIVITIES, contractActivity, isActivity, isConcierge, type Activity } from "@/lib/domain/activity";
import { monthlyOf } from "@/lib/activity-data";
import { classifyContractsAction } from "@/app/actions/activity";

export default async function ContractsPage({ searchParams }: { searchParams: { filtre?: string; famille?: string } }) {
  const { data, error } = await createClient()
    .from("contracts").select("*, clients(id, name, is_reserved)").order("status").order("label");
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((k: any) => {
    const issues = contractIssues({ ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht), hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) });
    const family = contractActivity({ clientId: k.client_id, activity: isActivity(k.activity) ? k.activity : null, label: k.label, terms: k.terms, clientName: k.clients?.name ?? null, monthly: monthlyOf(k) });
    return { k, issues, family, incomplete: k.status === "actif" && issues.blocking.length + issues.warnings.length > 0 };
  });
  const columnReady = (data ?? []).some((k: any) => "activity" in k) || (data ?? []).length === 0;
  const unsaved = columnReady ? (data ?? []).filter((k: any) => !k.activity).length : 0;
  const fam = isActivity(searchParams.famille) ? (searchParams.famille as Activity) : "";
  const famCounts: Record<string, number> = {};
  for (const r of rows) famCounts[r.family] = (famCounts[r.family] ?? 0) + 1;
  const famMonthly = (a: string) => rows.filter((r) => r.family === a && r.k.status === "actif").reduce((t, r) => t + monthlyOf(r.k), 0);
  const href = (key: string) => { const p = new URLSearchParams(); if (key) p.set("famille", key); if (searchParams.filtre) p.set("filtre", searchParams.filtre); const q = p.toString(); return `/contrats${q ? `?${q}` : ""}`; };
  const incompleteCount = rows.filter((r) => r.incomplete).length;
  const shown = (searchParams.filtre === "incomplets" ? rows.filter((r) => r.incomplete) : rows).filter((r) => (fam ? r.family === fam : !isConcierge(r.family)));

  return (
    <>
      <PageHeader title="Contrats récurrents" subtitle={`${rows.filter((r) => !isConcierge(r.family)).length} contrat(s) de nettoyage · la conciergerie a sa propre page`}
        actions={<Link href="/contrats/new"><Button><Plus className="h-4 w-4" /> Nouveau contrat</Button></Link>} />
      <ActivityTabs pole="nettoyage" current={fam} counts={famCounts} href={href} />
      {fam && <p className="-mt-2 mb-4 text-sm text-muted-foreground">{ACTIVITIES.find((a) => a.key === fam)!.hint} · <b className="num font-medium text-foreground">{formatEUR(famMonthly(fam))}</b> HT par mois en contrats actifs. <Link href="/activites" className="font-medium text-primary hover:underline">Voir la rentabilité</Link></p>}
      {unsaved > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <span>{unsaved} contrat(s) n&apos;ont pas encore de famille enregistrée : elle est devinée d&apos;après l&apos;intitulé. Vérifiez les pastilles, puis enregistrez.</span>
          <form action={classifyContractsAction} className="ml-auto"><Button size="sm" variant="outline">Enregistrer les familles devinées</Button></form>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/contrats" className={`rounded-full border px-3 py-1 text-sm ${!searchParams.filtre ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>Tous</Link>
        <Link href="/contrats?filtre=incomplets" className={`rounded-full border px-3 py-1 text-sm ${searchParams.filtre === "incomplets" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
          Incomplets ({incompleteCount})
        </Link>
      </div>
      {incompleteCount > 0 && !searchParams.filtre && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>{incompleteCount} contrat(s) actif(s) incomplet(s)</b> : sans jours de passage ou durée, ils ne peuvent pas alimenter le planning automatique ni le suivi des heures. Cliquez sur l&apos;alerte d&apos;un contrat pour le compléter.</span>
        </div>
      )}
      <Card>
        {!shown.length ? <Empty>Aucun contrat.</Empty> : (
          <Table>
            <thead><tr><Th>Client</Th><Th>Contrat</Th><Th>Tarif HT</Th><Th>Période</Th><Th>Jours · durée</Th><Th>Heures / sem</Th><Th>Statut</Th></tr></thead>
            <tbody>
              {shown.map(({ k, issues, incomplete, family }) => (
                <Tr key={k.id}>
                  <Td><ClientName id={k.clients.id} name={k.clients.name} reserved={k.clients.is_reserved} /></Td>
                  <Td>
                    <Link href={`/contrats/${k.id}`} className="hover:underline">{k.label}</Link>
                    <span className="mt-1 block"><ActivityChip a={family} /></span>
                    {incomplete && (
                      <Link href={`/contrats/${k.id}`} className="mt-1 block">
                        <Badge tone={issues.blocking.length ? "red" : "orange"}>⚠ À compléter : {[...issues.blocking, ...issues.warnings].slice(0, 3).join(", ")}{issues.blocking.length + issues.warnings.length > 3 ? "…" : ""}</Badge>
                      </Link>
                    )}
                  </Td>
                  <Td>{k.monthly_amount_ht != null ? `${formatEUR(k.monthly_amount_ht)} / mois` : k.per_visit_amount_ht != null ? `${formatEUR(k.per_visit_amount_ht)} / passage` : k.commission_pct != null ? <>{String(k.commission_pct).replace(".", ",")} % des revenus{k.commission_base_ht != null && <span className="block text-xs text-muted-foreground">≈ {formatEUR(Number(k.commission_pct) / 100 * Number(k.commission_base_ht))} / mois</span>}</> : <Badge tone="red">à renseigner</Badge>}</Td>
                  <Td className="whitespace-nowrap">{k.start_date ? formatDate(k.start_date) : "—"} → {k.end_date ? formatDate(k.end_date) : "—"}</Td>
                  <Td className="text-xs">
                    {k.weekdays?.length ? WEEKDAYS.filter(([n]) => k.weekdays.includes(n)).map(([, l]) => l).join(" · ") : k.visits_per_week != null ? `${k.visits_per_week}×/sem` : "—"}
                    {k.hours_per_visit != null ? ` · ${k.hours_per_visit} h` : ""}
                    {k.assignee ? <span className="block text-muted-foreground">{k.assignee}</span> : null}
                  </Td>
                  <Td className="font-semibold">{numOrNull(k.weekly_hours) != null ? formatHours(numOrNull(k.weekly_hours)) : <span className="text-xs font-normal text-muted-foreground">—</span>}</Td>
                  <Td><StatusBadge status={k.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
