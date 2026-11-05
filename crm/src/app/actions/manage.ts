"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { requireReservedAck } from "@/lib/action-helpers";
import { parisToday } from "@/lib/domain/dates";
import { clientImpact } from "@/lib/impact";

/**
 * « Pleine main » : modifier et supprimer partout. Seules garde-fous :
 *  - une facture ÉMISE ne se supprime jamais (obligation comptable) : elle s'annule, et son client s'archive ;
 *  - une mission déjà FACTURÉE reste figée.
 * Chaque suppression est conservée, ligne complète, dans le journal des modifications.
 */
const refresh = () => { for (const p of ["/", "/clients", "/contrats", "/sites", "/missions", "/equipe", "/catalogue", "/paiements", "/demandes", "/planning", "/actions"]) revalidatePath(p); };

// ───────────── Clients ─────────────
export async function deleteClientAction(id: string, fd: FormData) {
  const back = `/clients/${id}`;
  const sb = createClient();
  const { data: c } = await sb.from("clients").select("name").eq("id", id).maybeSingle();
  if (!c) flash("/clients", "error", "Client introuvable.");
  await requireReservedAck(id, fd, back);
  const impact = await clientImpact(id);
  if (impact.issued > 0) {
    flash(back, "error", `${c!.name} a ${impact.issued} facture(s) émise(s) : la loi impose de les conserver. Archivez ce client à la place (il disparaît des listes, ses factures restent consultables).`);
  }
  // Brouillons et devis d'abord (la base refuse de supprimer un client qui a encore des devis ou des factures).
  const e1 = await sb.from("invoices").delete().eq("client_id", id).eq("status", "brouillon");
  if (e1.error) flash(back, "error", dbMessage(e1.error));
  const e2 = await sb.from("quotes").delete().eq("client_id", id);
  if (e2.error) flash(back, "error", dbMessage(e2.error));
  const e3 = await sb.from("clients").delete().eq("id", id);
  if (e3.error) flash(back, "error", dbMessage(e3.error));
  refresh();
  flash("/clients", "ok", `${c!.name} supprimé, avec ses ${impact.contracts} contrat(s), ${impact.missions} mission(s) et ${impact.quotes} devis.`);
}

export async function archiveClientAction(id: string, archive: boolean) {
  const { error } = await createClient().from("clients").update({ status: archive ? "inactif" : "actif", ...(archive ? { auto_send_invoices: false } : {}) }).eq("id", id);
  if (error) flash(`/clients/${id}`, "error", dbMessage(error));
  refresh();
  flash(`/clients/${id}`, "ok", archive ? "Client archivé : il n'apparaît plus dans les nouvelles factures automatiques." : "Client réactivé.");
}

export async function deleteInteractionAction(id: string, clientId: string) {
  const { error } = await createClient().from("interactions").delete().eq("id", id);
  if (error) flash(`/clients/${clientId}`, "error", dbMessage(error));
  revalidatePath(`/clients/${clientId}`);
  flash(`/clients/${clientId}`, "ok", "Ligne d'historique supprimée.");
}

// ───────────── Contrats, sites, équipe, catalogue ─────────────
export async function deleteContractAction(id: string, fd: FormData) {
  const back = `/contrats/${id}`;
  const sb = createClient();
  const { data: k } = await sb.from("contracts").select("label, client_id").eq("id", id).maybeSingle();
  if (!k) flash("/contrats", "error", "Contrat introuvable.");
  await requireReservedAck(k!.client_id, fd, back);
  // Les passages à venir, non facturés, sont retirés avec le contrat ; l'historique (réalisé, facturé) est conservé.
  const { data: gone, error: e0 } = await sb.from("interventions").delete().eq("contract_id", id).is("invoice_id", null).in("stage", ["brouillon", "planifiee", "affectee"]).gte("scheduled_date", parisToday()).select("id");
  if (e0) flash(back, "error", dbMessage(e0));
  const { error } = await sb.from("contracts").delete().eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash("/contrats", "ok", `Contrat « ${k!.label} » supprimé (${gone?.length ?? 0} passage(s) à venir retiré(s) ; l'historique est conservé).`);
}

export async function deleteSiteAction(id: string) {
  const sb = createClient();
  const { data: s } = await sb.from("sites").select("name").eq("id", id).maybeSingle();
  const { error } = await sb.from("sites").delete().eq("id", id);
  if (error) flash(`/sites/${id}`, "error", dbMessage(error));
  refresh();
  flash("/sites", "ok", `Site « ${s?.name ?? ""} » supprimé (ses missions et contrats sont conservés, sans site).`);
}

export async function deleteStaffAction(id: string) {
  const sb = createClient();
  const { data: s } = await sb.from("staff").select("full_name").eq("id", id).maybeSingle();
  const { error } = await sb.from("staff").delete().eq("id", id);
  if (error) flash("/equipe", "error", dbMessage(error));
  refresh();
  flash("/equipe", "ok", `${s?.full_name ?? "Agent"} supprimé(e) : ses missions à venir repassent « sans intervenant », son lien mobile ne fonctionne plus.`);
}

export async function deleteServiceAction(id: string) {
  const { error } = await createClient().from("services").delete().eq("id", id);
  if (error) flash("/catalogue", "error", dbMessage(error));
  refresh();
  flash("/catalogue", "ok", "Prestation supprimée du catalogue (les devis et factures déjà faits ne changent pas).");
}

// ───────────── Paiements, demandes ─────────────
export async function deletePaymentAction(id: string) {
  const sb = createClient();
  const { data: p } = await sb.from("payments").select("match_status").eq("id", id).maybeSingle();
  if (p?.match_status === "rapproche") flash("/paiements", "error", "Ce paiement est rapproché d'une facture : annulez d'abord le rapprochement.");
  const { error } = await sb.from("payments").delete().eq("id", id);
  if (error) flash("/paiements", "error", dbMessage(error));
  refresh();
  flash("/paiements", "ok", "Paiement supprimé.");
}

export async function deleteRequestAction(id: string) {
  const { error } = await createClient().from("quote_requests").delete().eq("id", id);
  if (error) flash("/demandes", "error", dbMessage(error));
  refresh();
  flash("/demandes", "ok", "Demande supprimée (la fiche du contact est conservée).");
}

// ───────────── Missions : modifier et supprimer ─────────────
export async function updateMissionAction(id: string, fd: FormData) {
  const back = `/missions/${id}`;
  const sb = createClient();
  const { data: m } = await sb.from("interventions").select("invoice_id").eq("id", id).maybeSingle();
  if (!m) flash("/missions", "error", "Mission introuvable.");
  if (m!.invoice_id) flash(back, "error", "Mission déjà facturée : date, prix et quantité ne changent plus (annulez la facture d'abord).");
  const title = str(fd, "title"), date = str(fd, "scheduled_date");
  if (!title || !date) flash(back, "error", "Désignation et date obligatoires.");
  const billable = checked(fd, "billable");
  const price = numField(fd, "unit_price_ht");
  if (billable && price === null) flash(back, "error", "Une mission facturable doit avoir un prix (ou décochez « facturable »).");
  const { error } = await sb.from("interventions").update({
    title, scheduled_date: date, start_time: str(fd, "start_time"), duration_hours: numField(fd, "duration_hours"),
    quantity: numField(fd, "quantity") ?? 1, unit_price_ht: billable ? price : null, billable, site_id: str(fd, "site_id")
  }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash(back, "ok", "Mission modifiée.");
}

export async function deleteMissionAction(id: string) {
  const back = `/missions/${id}`;
  const { error } = await createClient().from("interventions").delete().eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash("/missions", "ok", "Mission supprimée.");
}

// ───────────── Journal : e-mails en échec ─────────────
/** Marque les e-mails en échec comme « traités » : l'alerte Urgent disparaît, l'historique reste dans le Journal. */
export async function dismissMailFailuresAction() {
  const { error } = await createClient().from("email_log").update({ acknowledged: true }).eq("ok", false).eq("acknowledged", false);
  if (error) flash("/journal", "error", dbMessage(error));
  refresh();
  revalidatePath("/journal");
  flash("/journal", "ok", "E-mails en échec marqués comme traités.");
}
