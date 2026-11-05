import Link from "next/link";
import { UserPlus, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, isoWeekday, parisToday } from "@/lib/domain/dates";
import { cookies } from "next/headers";
import { generateAgentLinkAction, revokeAgentLinkAction, saveStaffAction } from "@/app/actions/missions";
import { ConfirmAction } from "@/components/crm/confirm-action";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

function StaffFields({ s }: { s?: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Nom complet *"><Input name="full_name" required defaultValue={s?.full_name ?? ""} /></Field>
      <Field label="Téléphone"><Input name="phone" defaultValue={s?.phone ?? ""} /></Field>
      <Field label="E-mail"><Input name="email" type="email" defaultValue={s?.email ?? ""} /></Field>
      <Field label="Secteur habituel" hint="Ville ou département, pour les suggestions."><Input name="zone" defaultValue={s?.zone ?? ""} placeholder="Paris, 95…" /></Field>
      <Field label="Heures max / semaine"><Input name="weekly_capacity_hours" type="number" step="0.5" min="0" defaultValue={s?.weekly_capacity_hours ?? ""} /></Field>
      <Field label="Rôle"><Select name="role" defaultValue={s?.role ?? "agent"}><option value="agent">Agent</option><option value="responsable">Responsable</option></Select></Field>
      <Field label="Compétences (séparées par des virgules)" className="sm:col-span-2"><Input name="skills" defaultValue={(s?.skills ?? []).join(", ")} placeholder="vitres, Airbnb, bureaux…" /></Field>
      {s && <Field label="Actif"><Select name="active" defaultValue={s.active ? "oui" : "non"}><option value="oui">Oui</option><option value="non">Non (n&apos;est plus proposé)</option></Select></Field>}
      <Field label="Notes" className="sm:col-span-3"><Textarea name="notes" rows={2} defaultValue={s?.notes ?? ""} /></Field>
    </div>
  );
}

export default async function TeamPage() {
  const supabase = createClient();
  const today = parisToday();
  const monday = addDays(today, 1 - isoWeekday(today));
  const [{ data: staff, error }, { data: week }] = await Promise.all([
    supabase.from("staff").select("*").order("active", { ascending: false }).order("full_name"),
    supabase.from("interventions").select("staff_id, duration_hours, scheduled_date, stage").gte("scheduled_date", monday).lte("scheduled_date", addDays(monday, 6)).neq("stage", "annulee")
  ]);
  if (error) throw new Error(error.message);
  let fresh: { id: string; name: string; url: string } | null = null;
  try { fresh = JSON.parse(decodeURIComponent(cookies().get("agent_link")?.value ?? "null")); } catch { fresh = null; }
  const load = (id: string) => {
    const mine = (week ?? []).filter((w: any) => w.staff_id === id);
    return { count: mine.length, hours: mine.reduce((a: number, w: any) => a + Number(w.duration_hours ?? 0), 0), today: mine.filter((w: any) => w.scheduled_date === today).length };
  };
  return (
    <>
      <PageHeader title="Équipe" subtitle="Vos agents : coordonnées, secteur, charge de la semaine. Ils sont proposés automatiquement sur les missions."
        actions={<Link href="/recrutement"><Button variant="outline">Besoin de recrutement</Button></Link>} />
      {fresh && (
        <Card className="mb-4 border-emerald-300 bg-emerald-50">
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="font-bold text-emerald-900">Lien mobile de {fresh.name} — affiché une seule fois</div>
            <input readOnly value={fresh.url} className="w-full select-all rounded-md border bg-white px-3 py-2 font-mono text-xs" aria-label="Lien mobile" />
            <div className="flex flex-wrap gap-3 text-xs">
              <a className="font-semibold text-emerald-800 underline" href={`https://wa.me/?text=${encodeURIComponent(`Bonjour ${fresh.name.split(" ")[0]}, voici ton lien personnel pour tes missions ProClean : ${fresh.url}`)}`} target="_blank" rel="noopener noreferrer">Envoyer par WhatsApp</a>
              <span className="text-emerald-900">Personnel et confidentiel. Si vous régénérez le lien, l&apos;ancien cesse de fonctionner.</span>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!(staff ?? []).length && <Card className="sm:col-span-2 xl:col-span-3"><Empty>Aucun membre pour l&apos;instant. Ajoutez votre premier agent ci-dessous.</Empty></Card>}
        {(staff ?? []).map((s: any) => {
          const l = load(s.id);
          const pct = s.weekly_capacity_hours ? Math.min(100, Math.round((l.hours / Number(s.weekly_capacity_hours)) * 100)) : null;
          return (
            <Card key={s.id} className={s.active ? "" : "opacity-60"}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-bold text-slate-900">{s.full_name}</div>
                    <div className="text-xs text-slate-500">{s.role === "responsable" ? "Responsable" : "Agent"}{s.zone ? ` · ${s.zone}` : ""}{!s.active ? " · inactif" : ""}</div>
                  </div>
                  <Link href={`/missions?vue=semaine&agent=${s.id}`} className="text-xs font-semibold text-primary hover:underline">Ses missions</Link>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="h-3 w-3" />{s.phone}</a>}
                  {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{s.email}</a>}
                </div>
                <div className="text-sm">Cette semaine : <b>{l.count}</b> mission(s) · <b>{l.hours.toLocaleString("fr-FR")} h</b>{s.weekly_capacity_hours ? ` / ${Number(s.weekly_capacity_hours)} h` : ""} · aujourd&apos;hui : {l.today}</div>
                {pct !== null && <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>}
                {(s.skills ?? []).length > 0 && <div className="flex flex-wrap gap-1">{s.skills.map((k: string) => <span key={k} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{k}</span>)}</div>}
                {s.active && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                    <span className="font-semibold text-slate-700">Mobile :</span>
                    <span className={s.agent_token_hash ? "text-emerald-700" : "text-slate-500"}>{s.agent_token_hash ? `lien actif depuis le ${new Date(s.agent_token_set_at).toLocaleDateString("fr-FR")}` : "pas de lien"}</span>
                    <ConfirmAction action={generateAgentLinkAction.bind(null, s.id)} label={s.agent_token_hash ? "Nouveau lien" : "Créer le lien"} variant="outline" size="sm"
                      title={`Créer un lien mobile pour ${s.full_name} ?`} description={s.agent_token_hash ? "L'ancien lien cessera immédiatement de fonctionner." : "Le lien donne accès uniquement à ses missions (jamais aux montants ni aux factures)."} confirmLabel="Générer le lien" />
                    {s.agent_token_hash && <ConfirmAction action={revokeAgentLinkAction.bind(null, s.id)} label="Révoquer" variant="outline" size="sm"
                      title="Révoquer ce lien ?" description="L'agent ne pourra plus ouvrir ses missions sur son téléphone." confirmLabel="Révoquer" />}
                  </div>
                )}
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-primary">Modifier</summary>
                  <form action={saveStaffAction} className="mt-3 space-y-3"><StaffFields s={s} /><Button size="sm">Enregistrer</Button></form>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-emerald-600" /> Ajouter un membre</CardTitle></CardHeader>
        <CardContent><form action={saveStaffAction} className="space-y-3"><StaffFields /><Button>Ajouter</Button></form></CardContent>
      </Card>
    </>
  );
}
