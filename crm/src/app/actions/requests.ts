"use server";

import { automationClient, automationSecret } from "@/lib/automation/deps";
import { requireAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, getSettings } from "@/lib/data";
import { addDays, parisToday } from "@/lib/domain/dates";

/** Crée (ou retrouve) la fiche client et un devis brouillon pré-rempli à partir d'une demande du site. */
export async function createQuoteFromRequestAction(id: string) {
  await requireAccess("clients");
  const supabase = createClient();
  const { data: r } = await supabase.from("quote_requests").select("*").eq("id", id).maybeSingle();
  if (!r) flash("/demandes", "error", "Demande introuvable.");

  let clientId: string | null = r.client_id;
  if (!clientId && r.email) {
    const { data } = await supabase.from("clients").select("id").ilike("email", r.email).limit(1).maybeSingle();
    clientId = data?.id ?? null;
  }
  const name = (r.company || r.name).trim();
  if (!clientId) {
    const { data } = await supabase.from("clients").select("id").ilike("name", name.replace(/[%_]/g, "")).limit(1).maybeSingle();
    clientId = data?.id ?? null;
  }
  if (!clientId) {
    const details = Object.entries(r.details ?? {}).map(([k, v]) => `${k} : ${v}`);
    const { data: c, error } = await supabase.from("clients").insert({
      name, kind: r.company ? "entreprise" : "particulier", status: "prospect", email: r.email, phone: r.phone,
      address: r.address, postal_code: r.postcode, city: r.city,
      notes: [`Demande de devis du site (${r.service ?? "prestation à préciser"})${r.company ? ` — contact : ${r.name}` : ""}`, r.message, ...details].filter(Boolean).join("\n")
    }).select("id").single();
    if (error) flash("/demandes", "error", dbMessage(error));
    clientId = c!.id;
  }

  const settings = await getSettings(supabase);
  const { data: q, error } = await supabase.from("quotes").insert({
    client_id: clientId, subject: r.service, notes: r.message,
    valid_until: addDays(parisToday(), Number(settings.quote_default_validity_days ?? 30))
  }).select("id").single();
  if (error) flash("/demandes", "error", dbMessage(error));
  const { error: le } = await supabase.from("quote_lines").insert({ quote_id: q!.id, position: 0, description: `À chiffrer — ${r.service ?? "prestation"}`, quantity: 1, unit_price_ht: 0, vat_rate: Number(settings.default_vat_rate) });
  if (le) flash("/demandes", "error", dbMessage(le));
  await supabase.from("quote_requests").update({ status: "traitee", client_id: clientId, quote_id: q!.id }).eq("id", id);
  await supabase.from("interactions").insert({ client_id: clientId, kind: "devis", summary: `Demande de devis du site : ${r.service ?? ""}` });
  revalidatePath("/demandes");
  flash(`/devis/${q!.id}/edit`, "ok", "Devis brouillon créé : complétez les prestations et le prix.");
}

export async function setRequestStatusAction(id: string, status: "nouvelle" | "traitee" | "ignoree") {
  await requireAccess("clients");
  const { error } = await createClient().from("quote_requests").update({ status }).eq("id", id);
  if (error) flash("/demandes", "error", dbMessage(error));
  revalidatePath("/demandes");
  flash("/demandes", "ok", "Demande mise à jour.");
}

/** Écarte une demande comme démarchage : elle quitte les actions ; la fiche prospect créée automatiquement est supprimée seulement si elle ne contient rien d'autre. */
export async function dismissSpamRequestAction(id: string) {
  await requireAccess("clients");
  const sb = createClient();
  const { data: r } = await sb.from("quote_requests").select("client_id").eq("id", id).maybeSingle();
  const { error } = await sb.from("quote_requests").update({ status: "ignoree" }).eq("id", id);
  if (error) flash("/demandes", "error", dbMessage(error));
  const cid = (r as any)?.client_id as string | null | undefined;
  let removed = false;
  if (cid) {
    const [c, q, i, k, others] = await Promise.all([
      sb.from("clients").select("status").eq("id", cid).maybeSingle(),
      sb.from("quotes").select("id", { count: "exact", head: true }).eq("client_id", cid),
      sb.from("invoices").select("id", { count: "exact", head: true }).eq("client_id", cid),
      sb.from("contracts").select("id", { count: "exact", head: true }).eq("client_id", cid),
      sb.from("quote_requests").select("id", { count: "exact", head: true }).eq("client_id", cid).neq("id", id)
    ]);
    if ((c.data as any)?.status === "prospect" && !q.count && !i.count && !k.count && !others.count) {
      const del = await sb.from("clients").delete().eq("id", cid);
      removed = !del.error;
    }
  }
  revalidatePath("/demandes"); revalidatePath("/clients"); revalidatePath("/");
  flash("/demandes", "ok", removed ? "Demande écartée et prospect automatique supprimé." : "Demande écartée.");
}

/** Remet dans les demandes un message mis de côté à tort : il suit alors le circuit normal (prospect, notification). */
export async function restoreQuarantinedAction(id: string) {
  await requireAccess("clients");
  const sb = createClient();
  const { data: q } = await sb.from("quote_request_spam").select("payload").eq("id", id).maybeSingle();
  if (!q) flash("/demandes?statut=indesirables", "error", "Message introuvable.");
  const p = (q as any).payload as Record<string, unknown>;
  const { error } = await automationClient().rpc("submit_quote_request_v2", { p_secret: automationSecret(), p: { ...p, details: {} } });
  if (error) flash("/demandes?statut=indesirables", "error", "Rétablissement impossible : " + error.message);
  await sb.from("quote_request_spam").delete().eq("id", id);
  revalidatePath("/demandes");
  flash("/demandes", "ok", "Message rétabli dans les demandes.");
}

export async function deleteQuarantinedAction(id: string) {
  await requireAccess("clients");
  await createClient().from("quote_request_spam").delete().eq("id", id);
  revalidatePath("/demandes");
  flash("/demandes?statut=indesirables", "ok", "Message supprimé.");
}
