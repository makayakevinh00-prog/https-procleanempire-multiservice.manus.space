import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSettings, num, numOrNull } from "@/lib/data";
import { isLargeAmount } from "@/lib/domain/billing";
import { monthlyRevenueHt, summarize, weeklyHours, weeklyRevenueHt, type SiteRow } from "@/lib/domain/recruitment";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Tr } from "@/components/ui/table";
import { ClientName } from "@/components/crm/client-name";
import { daysBetween, formatDate, formatEUR, formatHours, round2 } from "@/lib/utils";
import type { Contract } from "@/lib/domain/types";

function Stat({ label, value, sub, href, tone }: { label: string; value: string; sub?: string; href?: string; tone?: string }) {
  const body = (
    <Card className={`h-full transition-shadow hover:shadow-md ${tone ?? ""}`}>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function Dashboard() {
  const supabase = createClient();
  await supabase.rpc("refresh_overdue");
  const settings = await getSettings(supabase);

  const [contracts, invoices, quotes, payments, reserved] = await Promise.all([
    supabase.from("contracts").select("*, clients(id, name, is_reserved)").eq("status", "actif"),
    supabase.from("invoices").select("id, number, status, due_date, issue_date, total_ht, total_ttc, paid_amount, reminder_count, last_reminder_at, clients(id, name, is_reserved)").neq("status", "annule"),
    supabase.from("quotes").select("id, number, status, subject, total_ht, invoice_id, clients(id, name, is_reserved), invoices:invoice_id(status)").eq("status", "accepte"),
    supabase.from("payments").select("id", { count: "exact", head: true }).in("match_status", ["non_rapproche", "propose"]),
    supabase.from("clients").select("id, name").eq("is_reserved", true)
  ]);
  for (const r of [contracts, invoices, quotes, payments, reserved]) if (r.error) throw new Error(r.error.message);

  const inv = (invoices.data ?? []) as any[];
  const drafts = inv.filter((i) => i.status === "brouillon");
  const open = inv.filter((i) => ["envoye", "en_retard"].includes(i.status));
  const late = open.filter((i) => i.status === "en_retard");
  const lateAlert = late.filter((i) => i.due_date && daysBetween(i.due_date) >= settings.unpaid_alert_days);
  const outstanding = round2(open.reduce((a, i) => a + num(i.total_ttc) - num(i.paid_amount), 0));
  const month = new Date().toISOString().slice(0, 7);
  const billedMonth = round2(inv.filter((i) => i.status !== "brouillon" && i.issue_date?.startsWith(month)).reduce((a, i) => a + num(i.total_ht), 0));
  const toInvoice = ((quotes.data ?? []) as any[]).filter((q) => !q.invoice_id || q.invoices?.status === "annule");

  const rows: SiteRow[] = ((contracts.data ?? []) as any[]).map((k) => {
    const c = { ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht),
      hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) } as Contract;
    return { contract: c, clientName: k.clients.name, weeklyHours: weeklyHours(c), weeklyRevenue: weeklyRevenueHt(c) };
  });
  const rec = summarize(rows, settings);
  const mrr = round2(rows.reduce((a, r) => a + (monthlyRevenueHt(r.contract) ?? 0), 0));
  const recTone = { vert: "border-emerald-400", orange: "border-amber-400", rouge: "border-red-500" }[rec.level];

  // Alertes patron
  const alerts: { tone: "red" | "orange"; text: React.ReactNode; href: string }[] = [];
  for (const q of toInvoice) {
    if (q.clients.is_reserved) alerts.push({ tone: "red", href: `/devis/${q.id}`, text: <>🔒 <b>{q.number}</b> ({q.clients.name}) accepté, en attente de facturation — traitement patron uniquement.</> });
  }
  for (const i of drafts) {
    const big = isLargeAmount(num(i.total_ht), settings);
    if (i.clients.is_reserved || big) alerts.push({ tone: i.clients.is_reserved ? "red" : "orange", href: `/factures/${i.id}`,
      text: <>Brouillon de {formatEUR(i.total_ht)} HT ({i.clients.name}){big ? ` — au-dessus du seuil de ${formatEUR(settings.large_amount_threshold_ht)}` : ""}{i.clients.is_reserved ? " — contact réservé" : ""} : validation manuelle requise.</> });
  }
  for (const q of toInvoice) {
    if (!q.clients.is_reserved && isLargeAmount(num(q.total_ht), settings)) alerts.push({ tone: "orange", href: `/devis/${q.id}`, text: <><b>{q.number}</b> : {formatEUR(q.total_ht)} HT à facturer — montant au-dessus du seuil.</> });
  }
  for (const i of lateAlert) {
    alerts.push({ tone: i.clients.is_reserved ? "red" : "orange", href: `/factures/${i.id}`,
      text: <>{i.clients.is_reserved ? "🔒 " : ""}<b>{i.number}</b> ({i.clients.name}) impayée depuis {daysBetween(i.due_date)} jours{i.clients.is_reserved ? " — aucune relance automatique" : ""}.</> });
  }

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={`ProClean Empire — ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`} />

      {(reserved.data?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border-2 border-destructive bg-red-50 p-3 text-sm text-red-900">
          <Lock className="h-4 w-4" /> <b>Contacts réservés :</b>
          {reserved.data!.map((c) => <Link key={c.id} href={`/clients/${c.id}`} className="underline">{c.name}</Link>)}
          <span>— aucune action automatique.</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="CA récurrent / mois (HT)" value={formatEUR(mrr)} sub={`${rows.length} contrat(s) actif(s)`} href="/contrats" />
        <Stat label="Facturé ce mois (HT)" value={formatEUR(billedMonth)} href="/factures" />
        <Stat label="Encours à encaisser (TTC)" value={formatEUR(outstanding)} sub={`${late.length} en retard`} href="/factures?statut=en_retard" tone={late.length ? "border-red-300" : ""} />
        <Stat label="Heures hebdo" value={formatHours(rec.totalHours)} sub={`Recrutement : ${rec.level.toUpperCase()}${rec.sitesMissingHours ? ` · ${rec.sitesMissingHours} site(s) sans heures` : ""}`} href="/recrutement" tone={`border-2 ${recTone}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Alertes patron ({alerts.length})</CardTitle></CardHeader>
          {!alerts.length ? <Empty>Aucune alerte.</Empty> : (
            <ul className="divide-y">{alerts.map((a, n) => (
              <li key={n}><Link href={a.href} className={`block px-5 py-3 text-sm hover:bg-muted/50 ${a.tone === "red" ? "border-l-4 border-destructive" : "border-l-4 border-amber-500"}`}>{a.text}</Link></li>
            ))}</ul>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Factures à valider ({drafts.length})</CardTitle></CardHeader>
          {!drafts.length ? <Empty>Aucun brouillon en attente.</Empty> : (
            <Table><tbody>{drafts.map((i) => (
              <Tr key={i.id}><Td><ClientName id={i.clients.id} name={i.clients.name} reserved={i.clients.is_reserved} link={false} /></Td>
                <Td>{formatEUR(i.total_ht)} HT</Td><Td><Link href={`/factures/${i.id}`} className="text-primary hover:underline">Relire & valider</Link></Td></Tr>
            ))}</tbody></Table>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Devis acceptés à facturer ({toInvoice.length})</CardTitle></CardHeader>
          {!toInvoice.length ? <Empty>Rien en attente.</Empty> : (
            <Table><tbody>{toInvoice.map((q) => (
              <Tr key={q.id}><Td><Link href={`/devis/${q.id}`} className="font-semibold hover:underline">{q.number}</Link></Td>
                <Td><ClientName name={q.clients.name} reserved={q.clients.is_reserved} link={false} /></Td>
                <Td className="text-right">{formatEUR(q.total_ht)} HT</Td></Tr>
            ))}</tbody></Table>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Factures en retard ({late.length})</CardTitle></CardHeader>
          {!late.length ? <Empty>Aucun impayé en retard.</Empty> : (
            <Table><tbody>{late.map((i) => (
              <Tr key={i.id}><Td><Link href={`/factures/${i.id}`} className="font-semibold hover:underline">{i.number}</Link></Td>
                <Td><ClientName name={i.clients.name} reserved={i.clients.is_reserved} link={false} /></Td>
                <Td className="text-red-700">{daysBetween(i.due_date)} j</Td>
                <Td className="text-xs text-muted-foreground">{i.reminder_count ? `${i.reminder_count} relance(s), dernière ${formatDate(i.last_reminder_at)}` : "jamais relancée"}</Td></Tr>
            ))}</tbody></Table>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Paiements</CardTitle><Link href="/paiements" className="text-xs font-medium text-primary hover:underline">Ouvrir</Link></CardHeader>
          <CardContent className="text-sm">
            {payments.count ? <><Badge tone="orange">{payments.count}</Badge> virement(s) à rapprocher.</> : "Tous les paiements sont rapprochés."}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
