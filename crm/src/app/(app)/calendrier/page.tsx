import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, TriangleAlert, CircleCheck, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth";
import { addDays, isoWeekday, parisToday } from "@/lib/domain/dates";
import { loadAgenda } from "@/lib/agenda-data";
import { weekBalance, COMMERCIAL_TARGET_HOURS, type AgendaKind } from "@/lib/domain/agenda";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { AgendaView } from "@/components/crm/agenda-view";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { addExternalCalendarAction, removeExternalCalendarAction } from "@/app/actions/calendar";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<AgendaKind, string> = { operationnel: "Opérationnel", commercial: "Commercial", personnel: "Personnel" };
const longDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const hours = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;

export default async function CalendrierPage({ searchParams }: { searchParams: { semaine?: string } }) {
  const today = parisToday();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semaine ?? "") ? searchParams.semaine! : today;
  const monday = addDays(anchor, 1 - isoWeekday(anchor));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const supabase = createClient();
  const owner = await isOwner();
  const { events, sources, tableMissing } = await loadAgenda(supabase, monday, addDays(monday, 7), owner);
  const balance = weekBalance(events);
  const total = balance.operationnelH + balance.commercialH;
  const legend = [{ label: "Missions du CRM", kind: "operationnel" as AgendaKind }, ...sources.filter((s) => s.ok).map((s) => ({ label: s.label, kind: s.kind }))];
  const hasCommercialCalendar = sources.some((s) => s.kind === "commercial");
  const tone = balance.level === "ok" ? "border-emerald-200 bg-[#f0f9f4]" : balance.level === "vide" ? "bg-white" : balance.level === "alerte" ? "border-red-200 bg-[#fdf3f2]" : "border-amber-200 bg-[#fdf8ee]";

  return (
    <>
      <PageHeader title="Calendrier" subtitle="Vos missions et vos agendas Outlook au même endroit, avec le terrain et le commercial bien séparés."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/calendrier?semaine=${addDays(monday, -7)}`} aria-label="Semaine précédente" className="flex h-11 w-11 items-center justify-center rounded-full border bg-white transition-colors hover:bg-secondary"><ChevronLeft className="h-5 w-5" /></Link>
            <Link href="/calendrier" className="inline-flex h-11 items-center rounded-full border bg-white px-5 text-[14px] font-semibold transition-colors hover:bg-secondary">Aujourd&apos;hui</Link>
            <Link href={`/calendrier?semaine=${addDays(monday, 7)}`} aria-label="Semaine suivante" className="flex h-11 w-11 items-center justify-center rounded-full border bg-white transition-colors hover:bg-secondary"><ChevronRight className="h-5 w-5" /></Link>
          </div>
        } />

      <p className="pce-title -mt-2 mb-5 text-[22px] text-foreground">Semaine du {longDay(monday)} au {longDay(days[6]!)}</p>

      <div className={`mb-6 rounded-2xl border p-5 ${tone}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {balance.level === "ok" ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : balance.level === "vide" ? <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /> : <TriangleAlert className={`mt-0.5 h-5 w-5 shrink-0 ${balance.level === "alerte" ? "text-red-700" : "text-amber-700"}`} />}
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Équilibre de la semaine</p>
              <p className="mt-1 max-w-2xl text-[16px] font-semibold text-foreground">{balance.message}</p>
              {!hasCommercialCalendar && owner && <p className="mt-1 text-[13px] text-muted-foreground">Aucun calendrier commercial n&apos;est relié : reliez votre agenda Outlook de prospection plus bas pour que ce compteur soit juste.</p>}
            </div>
          </div>
          <div className="flex gap-6">
            <div><p className="num text-[26px] font-extrabold leading-none text-[#1d6fe0]">{hours(balance.operationnelH)}</p><p className="mt-1 text-[12px] text-muted-foreground">Opérationnel</p></div>
            <div><p className="num text-[26px] font-extrabold leading-none text-[#1f9d6b]">{hours(balance.commercialH)}</p><p className="mt-1 text-[12px] text-muted-foreground">Commercial · objectif {COMMERCIAL_TARGET_HOURS} h</p></div>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white" role="img" aria-label={`Opérationnel ${hours(balance.operationnelH)}, commercial ${hours(balance.commercialH)}`}>
            <span className="bg-[#1d6fe0]" style={{ width: `${(balance.operationnelH / total) * 100}%` }} />
            <span className="bg-[#1f9d6b]" style={{ width: `${(balance.commercialH / total) * 100}%` }} />
          </div>
        )}
      </div>

      <AgendaView days={days} today={today} events={events} sources={legend} />

      {owner && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Calendriers reliés</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 py-3">
                <span className="flex items-center gap-2.5 font-medium"><span className="h-2.5 w-2.5 rounded-full bg-[#1d6fe0]" />Missions du CRM</span>
                <span className="text-[13px] text-muted-foreground">Opérationnel · toujours affiché</span>
              </div>
              {sources.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-3">
                  <div className="min-w-0">
                    <span className="flex items-center gap-2.5 font-medium"><span className={`h-2.5 w-2.5 rounded-full ${s.kind === "operationnel" ? "bg-[#1d6fe0]" : s.kind === "commercial" ? "bg-[#1f9d6b]" : "bg-[#8a94a6]"}`} />{s.label}</span>
                    <span className={`mt-0.5 block text-[13px] ${s.ok ? "text-muted-foreground" : "text-red-700"}`}>{KIND_LABEL[s.kind]} · {s.ok ? `${s.count} évènement(s) cette semaine` : s.error}</span>
                  </div>
                  <ConfirmAction action={removeExternalCalendarAction.bind(null, s.id)} label="Retirer" variant="outline" size="sm" title={`Retirer « ${s.label} » du CRM ?`} description="Le calendrier ne sera plus affiché ici. Rien n'est supprimé dans Outlook." confirmLabel="Retirer" />
                </div>
              ))}
              {tableMissing && <p className="rounded-xl bg-amber-50 p-3 text-amber-900">La liaison avec Outlook sera disponible dès la mise à jour de la base (migration 0068).</p>}
              {!tableMissing && !sources.length && <p className="text-muted-foreground">Aucun agenda Outlook relié pour l&apos;instant.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Relier un agenda Outlook</CardTitle></CardHeader>
            <CardContent>
              <form action={addExternalCalendarAction} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom"><Input name="label" required maxLength={60} placeholder="Prospection" /></Field>
                  <Field label="Famille">
                    <Select name="kind" defaultValue="commercial" required>
                      <option value="commercial">Commercial (prospection, rendez-vous, relances)</option>
                      <option value="operationnel">Opérationnel (interventions, terrain)</option>
                      <option value="personnel">Personnel (non compté)</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Lien ICS publié" hint="Lecture seule : le CRM n'écrit jamais dans votre agenda."><Input name="url" type="url" required placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" /></Field>
                <Button type="submit" disabled={tableMissing}>Relier ce calendrier</Button>
              </form>
              <ol className="mt-5 list-decimal space-y-1 pl-5 text-[13px] text-muted-foreground">
                <li>Dans Outlook sur le web : Paramètres, puis Calendrier, puis « Calendriers partagés ».</li>
                <li>Sous « Publier un calendrier », choisissez l&apos;agenda et « Peut afficher tous les détails », puis Publier.</li>
                <li>Copiez le lien ICS et collez-le ici.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
