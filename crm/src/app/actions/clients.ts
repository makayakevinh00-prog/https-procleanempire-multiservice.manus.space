"use server";

import { requireAccess } from "@/lib/auth";
import { lookupCompany } from "@/lib/enrich";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, str } from "@/lib/data";

function payload(fd: FormData) {
  const name = str(fd, "name");
  if (!name) flash("/clients/new", "error", "Le nom est obligatoire.");
  const siret = str(fd, "siret")?.replace(/\s/g, "") ?? null;
  if (siret && !/^\d{14}$/.test(siret)) flash("/clients/new", "error", "Le SIRET doit contenir 14 chiffres.");
  const reserved = checked(fd, "is_reserved");
  const sirenRaw = str(fd, "siren")?.replace(/\s/g, "") ?? null;
  const siren = sirenRaw && /^\d{9}$/.test(sirenRaw) ? sirenRaw : (siret ? siret.slice(0, 9) : null);
  const vat = str(fd, "vat_number")?.replace(/\s/g, "").toUpperCase() ?? null;
  const naf = str(fd, "naf_code");
  const created = str(fd, "creation_date");
  const status = str(fd, "registry_status");
  return {
    siren, vat_number: vat && /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(vat) ? vat : null, naf_code: naf && /^\d{2}\.\d{2}[A-Z]$/.test(naf) ? naf : null,
    legal_form: str(fd, "legal_form"), creation_date: created && /^\d{4}-\d{2}-\d{2}$/.test(created) ? created : null, manager: str(fd, "manager"),
    registry_status: status === "actif" || status === "cesse" ? status : null,
    ...(str(fd, "registry_checked") === "1" ? { registry_checked_at: new Date().toISOString() } : {}),
    name: name!, kind: str(fd, "kind") ?? "entreprise", status: str(fd, "status") ?? "actif",
    address: str(fd, "address"), postal_code: str(fd, "postal_code"), city: str(fd, "city"),
    email: str(fd, "email"), phone: str(fd, "phone"), siret, notes: str(fd, "notes"),
    is_reserved: reserved, reserved_reason: reserved ? str(fd, "reserved_reason") : null,
    auto_send_invoices: checked(fd, "auto_send_invoices") && !reserved
  };
}

export async function createClientAction(fd: FormData) {
  await requireAccess("clients");
  const { data, error } = await createClient().from("clients").insert(payload(fd)).select("id").single();
  if (error) flash("/clients/new", "error", error.code === "23505" ? "Un client porte déjà ce nom." : dbMessage(error));
  revalidatePath("/clients");
  flash(`/clients/${data!.id}`, "ok", "Client créé.");
}

export async function updateClientAction(id: string, fd: FormData) {
  await requireAccess("clients");
  const { error } = await createClient().from("clients").update(payload(fd)).eq("id", id);
  if (error) flash(`/clients/${id}/edit`, "error", error.code === "23505" ? "Un client porte déjà ce nom." : dbMessage(error));
  revalidatePath("/clients");
  flash(`/clients/${id}`, "ok", "Client mis à jour.");
}

export async function addInteractionAction(clientId: string, fd: FormData) {
  await requireAccess("clients");
  const summary = str(fd, "summary");
  if (!summary) flash(`/clients/${clientId}`, "error", "Le résumé est obligatoire.");
  const { error } = await createClient().from("interactions").insert({ client_id: clientId, kind: str(fd, "kind") ?? "note", summary });
  if (error) flash(`/clients/${clientId}`, "error", dbMessage(error));
  revalidatePath(`/clients/${clientId}`);
  flash(`/clients/${clientId}`, "ok", "Interaction ajoutée.");
}

export async function setPipelineAction(clientId: string, fd: FormData) {
  await requireAccess("clients");
  const v = str(fd, "pipeline");
  const allowed = ["nouveau_prospect", "a_contacter", "rdv_programme", "devis_envoye", "devis_accepte", "devis_refuse", "client_actif"];
  if (v !== null && !allowed.includes(v)) flash(`/clients/${clientId}`, "error", "Étape inconnue.");
  const { error } = await createClient().from("clients").update({ pipeline: v }).eq("id", clientId);
  if (error) flash(`/clients/${clientId}`, "error", dbMessage(error));
  revalidatePath("/clients"); revalidatePath("/", "layout");
  flash(`/clients/${clientId}`, "ok", "Étape commerciale mise à jour (inscrite dans l'historique).");
}


// ───────────── Adresses e-mail supplémentaires ─────────────
export async function addClientEmailAction(clientId: string, fd: FormData) {
  await requireAccess("clients");
  const back = `/clients/${clientId}`;
  const email = String(fd.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) flash(back, "error", "Adresse e-mail invalide.");
  const label = String(fd.get("label") ?? "").trim() || null;
  const { error } = await createClient().from("client_emails").insert({ client_id: clientId, email, label, for_invoices: fd.get("for_invoices") !== null });
  if (error) flash(back, "error", error.code === "23505" ? "Cette adresse existe déjà pour ce client." : dbMessage(error));
  revalidatePath(back);
  flash(back, "ok", "Adresse ajoutée.");
}

export async function deleteClientEmailAction(clientId: string, id: string) {
  await requireAccess("clients");
  const back = `/clients/${clientId}`;
  const { error } = await createClient().from("client_emails").delete().eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back);
  flash(back, "ok", "Adresse supprimée.");
}

export async function toggleClientEmailInvoicesAction(clientId: string, id: string, value: boolean) {
  await requireAccess("clients");
  const back = `/clients/${clientId}`;
  const { error } = await createClient().from("client_emails").update({ for_invoices: value }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back);
  flash(back, "ok", value ? "Cette adresse recevra les factures par défaut." : "Cette adresse ne recevra plus les factures par défaut.");
}

/** Bouton « Enrichir » : complète la fiche depuis l'annuaire officiel (SIREN, SIRET, TVA, activité, forme juridique, dirigeant, adresse). Ne remplace jamais ce que vous avez déjà saisi. */
export async function enrichClientAction(id: string) {
  await requireAccess("clients");
  const back = `/clients/${id}`;
  const sb = createClient();
  const { data: c } = await sb.from("clients").select("name, siren, siret, address, postal_code, city, vat_number, naf_code, legal_form, creation_date, manager").eq("id", id).maybeSingle();
  if (!c) flash("/clients", "error", "Client introuvable.");
  const k = c as any;
  const hit = await lookupCompany({ siren: k.siren ?? (k.siret ? String(k.siret).slice(0, 9) : null), name: k.name, city: k.city });
  if (!hit.rival) flash(back, "error", hit.error ?? "Rien trouvé.");
  const r = hit.rival!;
  const patch: Record<string, unknown> = {};
  const fill = (col: string, v: unknown) => { if ((k[col] === null || k[col] === "") && v) patch[col] = v; };
  fill("siren", r.siren); fill("siret", r.siret); fill("vat_number", r.vat_number); fill("naf_code", r.naf_code); fill("legal_form", r.legal_form);
  fill("creation_date", r.creation_date); fill("manager", r.manager); fill("address", r.address); fill("postal_code", r.postal_code); fill("city", r.city);
  patch.registry_status = r.active ? "actif" : "cesse";
  patch.registry_checked_at = new Date().toISOString();
  const { error } = await sb.from("clients").update(patch).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back);
  const n = Object.keys(patch).length - 2;
  flash(back, "ok", n > 0 ? `Fiche enrichie depuis l'annuaire officiel : ${n} information${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}.` : "Rien à ajouter : la fiche est déjà complète. Statut officiel vérifié.");
}
