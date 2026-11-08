"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";

export async function saveSettingsAction(fd: FormData) {
  await requireOwner();
  const n = (k: string, fallback: number) => numField(fd, k) ?? fallback;
  const green = n("recruit_green_max_hours", 30);
  const orange = n("recruit_orange_max_hours", 35);
  const month = str(fd, "auto_invoicing_start_month") ?? "2026-11";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) flash("/parametres", "error", "Premier mois facturé : format AAAA-MM (ex. 2026-11).");
  if (green >= orange) flash("/parametres", "error", "Le seuil vert doit être inférieur au seuil orange.");
  const { error } = await createClient().from("app_settings").update({
    company_name: str(fd, "company_name") ?? "ProClean Empire", company_address: str(fd, "company_address"),
    company_siret: str(fd, "company_siret"), company_vat_number: str(fd, "company_vat_number"), company_iban: str(fd, "company_iban"), company_bic: str(fd, "company_bic"),
    company_phone: str(fd, "company_phone"), company_email: str(fd, "company_email"),
    default_vat_rate: n("default_vat_rate", 20), payment_terms_days: Math.round(n("payment_terms_days", 30)),
    large_amount_threshold_ht: n("large_amount_threshold_ht", 1500), unpaid_alert_days: Math.round(n("unpaid_alert_days", 15)), reminder_manual_days: Math.max(Math.round(n("reminder_manual_days", 30)), Math.round(n("unpaid_alert_days", 15)) + 1),
    billing_requires_validation: checked(fd, "billing_requires_validation"),
    auto_reminders_enabled: checked(fd, "auto_reminders_enabled"), reminder_first_after_days: Math.round(n("reminder_first_after_days", 7)),
    reminder_interval_days: Math.round(n("reminder_interval_days", 14)), reminder_max_count: Math.round(n("reminder_max_count", 3)),
    indep_hourly_cost: n("indep_hourly_cost", 22), salarie_gross_hourly: n("salarie_gross_hourly", 12.02),
    salarie_employer_charges_pct: n("salarie_employer_charges_pct", 42), salarie_paid_leave_pct: n("salarie_paid_leave_pct", 10),
    recruit_green_max_hours: green, recruit_orange_max_hours: orange,
    company_legal_form: str(fd, "company_legal_form"), company_capital: str(fd, "company_capital"), company_rcs: str(fd, "company_rcs"), company_footer: str(fd, "company_footer"),
    quote_default_validity_days: Math.round(n("quote_default_validity_days", 30)), quote_terms: str(fd, "quote_terms"), notify_email: str(fd, "notify_email"),
    quote_followup_enabled: checked(fd, "quote_followup_enabled"), quote_followup_days: Math.round(n("quote_followup_days", 5)),
    quote_followup2_days: Math.round(n("quote_followup2_days", 12)), quote_expire_enabled: checked(fd, "quote_expire_enabled"), auto_planning_enabled: checked(fd, "auto_planning_enabled"),
    auto_invoicing_enabled: checked(fd, "auto_invoicing_enabled"), auto_invoicing_start_month: month,
    count_planned_as_done: checked(fd, "count_planned_as_done"), month_end_send_next_day: checked(fd, "month_end_send_next_day"),
    updated_at: new Date().toISOString()
  }).eq("id", true);
  if (error) flash("/parametres", "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash("/parametres", "ok", "Paramètres enregistrés.");
}

/** Crée (ou remplace) le lien d'abonnement calendrier. Seule l'empreinte est stockée ; le lien s'affiche une fois (cookie de 2 minutes). */
export async function generateCalendarLinkAction() {
  await requireOwner();
  const token = randomBytes(32).toString("hex");
  const { error } = await createClient().from("calendar_feed").upsert({ id: 1, token_hash: createHash("sha256").update(token).digest("hex"), set_at: new Date().toISOString() });
  if (error) flash("/parametres", "error", dbMessage(error));
  const h = headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  cookies().set("calendar_link", JSON.stringify({ url: `${origin}/api/calendrier/${token}` }), { httpOnly: true, secure: true, sameSite: "strict", path: "/parametres", maxAge: 120 });
  revalidatePath("/parametres");
  flash("/parametres", "ok", "Lien calendrier créé : copiez-le ci-dessous (affiché une seule fois).");
}

export async function revokeCalendarLinkAction() {
  await requireOwner();
  const { error } = await createClient().from("calendar_feed").delete().eq("id", 1);
  if (error) flash("/parametres", "error", dbMessage(error));
  revalidatePath("/parametres");
  flash("/parametres", "ok", "Lien calendrier révoqué : Outlook ne recevra plus les missions.");
}

const AGENT_KEYS = ["core", "finance", "commercial", "operations", "relation", "marketing", "studio", "rh", "juridique"];

/** Crée un lien de connexion pour un agent Cowork. Seule l'empreinte est stockée ; le lien s'affiche une fois (cookie de 2 minutes). */
export async function createAgentConnectorAction(fd: FormData) {
  await requireOwner();
  const agent = str(fd, "agent_key") ?? "";
  if (!AGENT_KEYS.includes(agent)) flash("/parametres", "error", "Agent inconnu.");
  const token = randomBytes(32).toString("hex");
  const { error } = await createClient().from("agent_connectors").insert({ agent_key: agent, label: str(fd, "label"), token_hash: createHash("sha256").update(token).digest("hex") });
  if (error) flash("/parametres", "error", dbMessage(error));
  const h = headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  cookies().set("agent_mcp", JSON.stringify({ agent, url: `${origin}/api/mcp/${token}` }), { httpOnly: true, secure: true, sameSite: "strict", path: "/parametres", maxAge: 120 });
  revalidatePath("/parametres");
  flash("/parametres", "ok", "Lien créé : copiez-le ci-dessous (affiché une seule fois).");
}

export async function revokeAgentConnectorAction(id: string) {
  await requireOwner();
  const { error } = await createClient().from("agent_connectors").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  if (error) flash("/parametres", "error", dbMessage(error));
  revalidatePath("/parametres");
  flash("/parametres", "ok", "Lien révoqué : l'agent n'a plus accès au CRM.");
}

/** Invite le comptable : un code à lui transmettre (affiché une seule fois). Seule l'empreinte du code est enregistrée. */
export async function inviteAccountantAction(fd: FormData) {
  await requireOwner();
  const email = (str(fd, "email") ?? "").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) flash("/parametres", "error", "Adresse e-mail du comptable invalide.");
  const code = randomBytes(5).toString("hex").toUpperCase();
  const { error } = await createClient().rpc("accountant_invite", { p_email: email, p_label: str(fd, "label"), p_code_hash: createHash("sha256").update(code).digest("hex") });
  if (error) flash("/parametres", "error", /does not exist|PGRST202/.test(error.message) ? "L'accès comptable n'est pas encore installé sur cette base (migration 0029)." : dbMessage(error));
  const h = headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  cookies().set("accountant_invite", JSON.stringify({ email, code, url: `${origin}/compta/activer` }), { httpOnly: true, secure: true, sameSite: "strict", path: "/parametres", maxAge: 120 });
  revalidatePath("/parametres");
  flash("/parametres", "ok", "Invitation créée : transmettez-lui l'adresse et le code ci-dessous (affichés une seule fois).");
}

export async function revokeAccountantAction(id: string) {
  await requireOwner();
  const { error } = await createClient().from("accountants").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("revoked_at", null);
  if (error) flash("/parametres", "error", dbMessage(error));
  revalidatePath("/parametres");
  flash("/parametres", "ok", "Accès comptable révoqué : le comptable n'a plus accès à rien.");
}
