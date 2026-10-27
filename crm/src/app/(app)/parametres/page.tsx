import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { saveSettingsAction } from "@/app/actions/settings";

export default async function SettingsPage() {
  const s = await getSettings(createClient());
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <>
      <PageHeader title="Paramètres" />
      <form action={saveSettingsAction} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Société (affichée sur les PDF)</CardTitle></CardHeader>
          <CardContent className={grid}>
            <Field label="Raison sociale"><Input name="company_name" defaultValue={s.company_name} /></Field>
            <Field label="Adresse"><Input name="company_address" defaultValue={s.company_address ?? ""} /></Field>
            <Field label="Téléphone"><Input name="company_phone" defaultValue={s.company_phone ?? ""} /></Field>
            <Field label="E-mail"><Input name="company_email" defaultValue={s.company_email ?? ""} /></Field>
            <Field label="SIRET"><Input name="company_siret" defaultValue={s.company_siret ?? ""} /></Field>
            <Field label="N° TVA intracommunautaire"><Input name="company_vat_number" defaultValue={s.company_vat_number ?? ""} /></Field>
            <Field label="IBAN (pied de facture)"><Input name="company_iban" defaultValue={s.company_iban ?? ""} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Facturation et alertes</CardTitle></CardHeader>
          <CardContent className={grid}>
            <Field label="TVA par défaut (%)"><Input name="default_vat_rate" inputMode="decimal" defaultValue={s.default_vat_rate} /></Field>
            <Field label="Délai de paiement (jours)"><Input name="payment_terms_days" inputMode="numeric" defaultValue={s.payment_terms_days} /></Field>
            <Field label="Alerte montant (€ HT)" hint="Confirmation explicite au-dessus de ce montant"><Input name="large_amount_threshold_ht" inputMode="decimal" defaultValue={s.large_amount_threshold_ht} /></Field>
            <Field label="Alerte impayés (jours de retard)"><Input name="unpaid_alert_days" inputMode="numeric" defaultValue={s.unpaid_alert_days} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Relances automatiques</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="auto_reminders_enabled" defaultChecked={s.auto_reminders_enabled} /> Activer les relances automatiques par e-mail</label>
            <p className="text-xs text-muted-foreground">Jamais pour un contact réservé, jamais au-dessus du seuil d&apos;alerte, jamais si une relance récente existe.</p>
            <div className={grid}>
              <Field label="1re relance après échéance (jours)"><Input name="reminder_first_after_days" inputMode="numeric" defaultValue={s.reminder_first_after_days} /></Field>
              <Field label="Délai minimum entre relances (jours)"><Input name="reminder_interval_days" inputMode="numeric" defaultValue={s.reminder_interval_days} /></Field>
              <Field label="Nombre maximum de relances"><Input name="reminder_max_count" inputMode="numeric" defaultValue={s.reminder_max_count} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recrutement</CardTitle></CardHeader>
          <CardContent className={grid}>
            <Field label="Coût horaire indépendant (€)"><Input name="indep_hourly_cost" inputMode="decimal" defaultValue={s.indep_hourly_cost} /></Field>
            <Field label="Salarié : brut horaire (€)"><Input name="salarie_gross_hourly" inputMode="decimal" defaultValue={s.salarie_gross_hourly} /></Field>
            <Field label="Salarié : charges patronales (%)"><Input name="salarie_employer_charges_pct" inputMode="decimal" defaultValue={s.salarie_employer_charges_pct} /></Field>
            <Field label="Salarié : congés payés (%)"><Input name="salarie_paid_leave_pct" inputMode="decimal" defaultValue={s.salarie_paid_leave_pct} /></Field>
            <Field label="Seuil vert → orange (h/sem)"><Input name="recruit_green_max_hours" inputMode="decimal" defaultValue={s.recruit_green_max_hours} /></Field>
            <Field label="Seuil orange → rouge (h/sem)"><Input name="recruit_orange_max_hours" inputMode="decimal" defaultValue={s.recruit_orange_max_hours} /></Field>
          </CardContent>
        </Card>
        <Button>Enregistrer</Button>
      </form>
    </>
  );
}
