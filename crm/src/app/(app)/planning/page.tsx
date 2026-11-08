import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarPlus, Check, X, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadServices } from "@/lib/services";
import { num } from "@/lib/data";
import { addDays, monthBounds, monthLabel, monthOf, parisToday, isoWeekday } from "@/lib/domain/dates";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, ReservedBadge } from "@/components/ui/badge";
import { addInterventionAction, deleteInterventionAction, generateFromContractsAction, markPastDoneAction, setInterventionStatusAction } from "@/app/actions/planning";
import { formatEUR } from "@/lib/utils";
import { MissionCalendar } from "@/components/crm/mission-calendar";

const DAYS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default async function PlanningPage({ searchParams }: { searchParams: { mois?: string; client?: string; filtre?: string } }) {
  const today = parisToday();
  const month = /^\d{4}-\d{2}$/.test(searchParams.mois ?? "") ? searchParams.mois! : monthOf(today);
  const { start, end } = monthBounds(month);
  const supabase = createClient();
  // Filtres issus des compteurs de l'accueil : ils ignorent le mois affiché.
  const filtre = ["a_confirmer", "sans_intervenant", "non_facturees"].includes(searchParams.filtre ?? "") ? searchParams.filtre : undefined;
  let q = supabase.from("interventions").select("*, clients(id, name, is_reserved)")
    .order("scheduled_date").order("start_time", { nullsFirst: false });
  if (filtre === "a_confirmer") q = q.eq("status", "planifie").lte("scheduled_date", today).is("invoice_id", null);
  else if (filtre === "sans_intervenant") q = q.eq("status", "planifie").is("assignee", null).gte("scheduled_date", today).lte("scheduled_date", addDays(today, 7));
  else if (filtre === "non_facturees") q = q.eq("status", "realise").eq("billable", true).is("invoice_id", null).lt("scheduled_date", `${monthOf(today)}-01`);
  else q = q.gte("scheduled_date", start).lte("scheduled_date", end);
  if (searchParams.client) q = q.eq("client_id", searchParams.client);
  const [{ data: rows, error }, { data: clients }, services] = await Promise.all([
    q, supabase.from("clients").select("id, name, is_reserved").neq("status", "inactif").order("name"), loadServices(supabase)
  ]);
  if (error) throw new Error(error.message);

  const items = (rows ?? []) as any[];
  const byDay = new Map<string, any[]>();
  for (const i of items) byDay.set(i.scheduled_date, [...(byDay.get(i.scheduled_date) ?? []), i]);
  const active = items.filter((i) => i.status !== "annule");
  const toConfirm = items.filter((i) => i.status === "planifie" && i.scheduled_date <= today && !i.invoice_id).length;
  const hours = active.reduce((a, i) => a + num(i.duration_hours), 0);
  const billable = active.filter((i) => i.billable && i.unit_price_ht != null).reduce((a, i) => a + num(i.unit_price_ht) * num(i.quantity), 0);
  const nav = (m: string) => `/planning?mois=${m}${searchParams.client ? `&client=${searchParams.client}` : ""}`;

  return (
    <>
      <PageHeader title="Planning" subtitle="Les passages réalisés alimentent la facture mensuelle automatique de chaque client."
        actions={<>
          <form action={generateFromContractsAction.bind(null, month)}><Button variant="outline"><CalendarPlus className="h-4 w-4" /> Générer depuis les contrats</Button></form>
          {toConfirm > 0 && <form action={markPastDoneAction.bind(null, month)}><Button><Check className="h-4 w-4" /> Marquer les {toConfirm} passés comme réalisés</Button></form>}
        </>} />

      {filtre && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm">
          <b>Filtre actif :</b>
          {{ a_confirmer: "passages passés à confirmer", sans_intervenant: "passages des 7 prochains jours sans intervenant", non_facturees: "prestations réalisées d'un mois passé jamais facturées" }[filtre]}
          <Link href="/planning" className="ml-auto text-primary hover:underline">Retirer le filtre</Link>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border bg-card">
          <Link href={nav(shift(month, -1))} className="p-2 hover:bg-muted" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel(month)}</span>
          <Link href={nav(shift(month, 1))} className="p-2 hover:bg-muted" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Link>
        </div>
        <Link href={`/planning?mois=${monthOf(today)}`} className="text-sm text-primary hover:underline">Aujourd&apos;hui</Link>
        <form className="ml-auto flex gap-2"><input type="hidden" name="mois" value={month} />
          <Select name="client" defaultValue={searchParams.client ?? ""} className="h-9 w-56"><option value="">Tous les clients</option>{clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Button variant="outline" size="sm">Filtrer</Button></form>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <Card><CardContent className="p-3"><div className="text-xl font-bold">{active.length}</div><div className="text-xs text-muted-foreground">interventions</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xl font-bold">{hours ? `${hours.toLocaleString("fr-FR")} h` : "—"}</div><div className="text-xs text-muted-foreground">heures prévues</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xl font-bold">{formatEUR(billable)}</div><div className="text-xs text-muted-foreground">au passage (HT)</div></CardContent></Card>
      </div>

      {!filtre && (
        <MissionCalendar rows={items} month={month} gridStart={addDays(start, 1 - isoWeekday(start))} gridEnd={addDays(end, 7 - isoWeekday(end))} today={today}
          dayHref={(d) => `/missions?vue=jour&date=${d}`} />
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle>Ajouter une intervention</CardTitle></CardHeader>
        <CardContent>
          <form action={addInterventionAction} className="grid gap-3 sm:grid-cols-6">
            <Field label="Client *" className="sm:col-span-2">
              <Select name="client_id" required defaultValue={searchParams.client ?? ""}><option value="" disabled>Choisir…</option>
                {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.is_reserved ? " 🔒" : ""}</option>)}</Select>
            </Field>
            <Field label="Prestation (catalogue)" className="sm:col-span-2">
              <Select name="service_id" defaultValue=""><option value="">— libre —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatEUR(s.unit_price_ht)}</option>)}</Select>
            </Field>
            <Field label="Désignation" hint="Vide = nom de la prestation" className="sm:col-span-2"><Input name="title" /></Field>
            <Field label="Date *"><Input name="scheduled_date" type="date" required defaultValue={today >= start && today <= end ? today : start} /></Field>
            <Field label="Heure"><Input name="start_time" type="time" /></Field>
            <Field label="Durée (h)"><Input name="duration_hours" inputMode="decimal" /></Field>
            <Field label="Intervenant"><Input name="assignee" /></Field>
            <Field label="Qté"><Input name="quantity" inputMode="decimal" defaultValue="1" /></Field>
            <Field label="Prix HT" hint="Vide = prix du catalogue"><Input name="unit_price_ht" inputMode="decimal" /></Field>
            <Field label="Adresse du site" className="sm:col-span-3"><Input name="site_address" /></Field>
            <Field label="Notes" className="sm:col-span-3"><Textarea name="notes" className="min-h-[40px]" /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="billable" defaultChecked /> Facturable au passage (décochez si couvert par un forfait mensuel)</label>
            <div className="sm:col-span-2 sm:text-right"><Button>Ajouter au planning</Button></div>
          </form>
        </CardContent>
      </Card>

      {!items.length ? (
        <Card><Empty>Aucune intervention ce mois-ci. Ajoutez-en une ci-dessus ou « Générer depuis les contrats ».</Empty></Card>
      ) : (
        <div className="space-y-3">
          {[...byDay.entries()].map(([day, list]) => (
            <Card key={day} className={day === today ? "border-primary" : ""}>
              <CardHeader className="py-2"><CardTitle className="capitalize">{DAYS[isoWeekday(day)]} {day.slice(8, 10)}/{day.slice(5, 7)}{day === today && <Badge tone="blue" className="ml-2">aujourd&apos;hui</Badge>}</CardTitle></CardHeader>
              <ul className="divide-y">
                {list.map((i) => (
                  <li key={i.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm ${i.status === "annule" ? "opacity-50" : ""}`}>
                    <span className="w-14 shrink-0 text-muted-foreground">{i.start_time ? String(i.start_time).slice(0, 5) : "—"}</span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/clients/${i.clients.id}`} className="font-medium hover:underline">{i.clients.name}</Link>
                      {i.clients.is_reserved && <ReservedBadge className="ml-2" />}
                      <span className="block truncate text-muted-foreground">{i.title}{i.assignee ? ` · ${i.assignee}` : ""}{i.duration_hours ? ` · ${num(i.duration_hours)} h` : ""}</span>
                    </span>
                    <span className="w-28 text-right">{i.billable && i.unit_price_ht != null ? formatEUR(num(i.unit_price_ht) * num(i.quantity)) : <span className="text-xs text-muted-foreground">forfait</span>}</span>
                    <span className="w-24">
                      {i.invoice_id ? <Badge tone="green">facturée</Badge> : i.status === "realise" ? <Badge tone="green">réalisée</Badge> : i.status === "annule" ? <Badge>annulée</Badge> : <Badge tone={day <= today ? "orange" : "blue"}>{day <= today ? "à confirmer" : "planifiée"}</Badge>}
                    </span>
                    {!i.invoice_id && (
                      <span className="flex gap-1">
                        {i.status !== "realise" && <form action={setInterventionStatusAction.bind(null, i.id, "realise", month)}><Button size="icon" variant="ghost" title="Marquer réalisée" aria-label="Marquer réalisée"><Check className="h-4 w-4 text-emerald-700" /></Button></form>}
                        {i.status !== "annule" && <form action={setInterventionStatusAction.bind(null, i.id, "annule", month)}><Button size="icon" variant="ghost" title="Annuler" aria-label="Annuler"><X className="h-4 w-4" /></Button></form>}
                        {i.status !== "planifie" && <form action={setInterventionStatusAction.bind(null, i.id, "planifie", month)}><Button size="icon" variant="ghost" title="Remettre au planning" aria-label="Remettre au planning"><RotateCcw className="h-4 w-4" /></Button></form>}
                        <form action={deleteInterventionAction.bind(null, i.id, month)}><Button size="icon" variant="ghost" title="Supprimer" aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button></form>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
