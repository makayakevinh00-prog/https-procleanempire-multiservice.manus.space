"use server";

import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { ACTIVITY, CATEGORY } from "@/lib/prix";

export async function saveServiceAction(id: string | null, fd: FormData) {
  await requireOwner();
  const name = str(fd, "name");
  const price = numField(fd, "unit_price_ht");
  if (!name) flash("/catalogue", "error", "Le nom est obligatoire.");
  if (price === null || price < 0) flash("/catalogue", "error", "Prix HT invalide.");
  const row = {
    code: str(fd, "code")?.toUpperCase() ?? null, name: name!, description: str(fd, "description"), unit: str(fd, "unit"),
    unit_price_ht: price!, vat_rate: numField(fd, "vat_rate") ?? 20, active: checked(fd, "active") || !id,
    category: str(fd, "category") && str(fd, "category")! in CATEGORY ? str(fd, "category") : null,
    duration_hours: numField(fd, "duration_hours") != null && numField(fd, "duration_hours")! >= 0 ? numField(fd, "duration_hours") : null,
    duration_estimated: checked(fd, "duration_estimated"),
    materials_cost_ht: Math.max(numField(fd, "materials_cost_ht") ?? 0, 0),
    target_margin_pct: numField(fd, "target_margin_pct") != null && numField(fd, "target_margin_pct")! >= 0 && numField(fd, "target_margin_pct")! < 100 ? numField(fd, "target_margin_pct") : null,
    season_months: (str(fd, "season_months") ?? "").split(/[\s,;]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12),
    complements: fd.getAll("complements").map(String).filter((a) => a in ACTIVITY)
  };
  if (!row.season_months.length) (row as any).season_months = null;
  if (!row.complements.length) (row as any).complements = null;
  const q = createClient().from("services");
  const { error } = id ? await q.update(row).eq("id", id) : await q.insert(row);
  if (error) flash("/catalogue", "error", error.code === "23505" ? "Ce code existe déjà." : dbMessage(error));
  revalidatePath("/catalogue");
  flash("/catalogue", "ok", id ? "Prestation mise à jour." : "Prestation ajoutée.");
}

export async function toggleServiceAction(id: string, active: boolean) {
  await requireOwner();
  const { error } = await createClient().from("services").update({ active }).eq("id", id);
  if (error) flash("/catalogue", "error", dbMessage(error));
  revalidatePath("/catalogue");
  flash("/catalogue", "ok", active ? "Prestation réactivée." : "Prestation masquée des devis.");
}

/** Applique le prix conseillé calculé à partir du coût et de la marge cible. */
export async function applySuggestedPriceAction(id: string, price: number) {
  await requireOwner();
  if (!Number.isFinite(price) || price <= 0) flash("/catalogue", "error", "Prix conseillé invalide.");
  const { error } = await createClient().from("services").update({ unit_price_ht: price, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) flash("/catalogue", "error", dbMessage(error));
  revalidatePath("/catalogue");
  flash("/catalogue", "ok", "Prix mis à jour. Les devis et factures déjà faits ne changent pas.");
}

export async function setDefaultMarginAction(fd: FormData) {
  await requireOwner();
  const v = numField(fd, "default_target_margin_pct");
  if (v == null || v < 0 || v >= 100) flash("/catalogue", "error", "La marge cible doit être comprise entre 0 et 99 %.");
  const { error } = await createClient().from("app_settings").update({ default_target_margin_pct: v! }).eq("id", true);
  if (error) flash("/catalogue", "error", dbMessage(error));
  revalidatePath("/catalogue");
  flash("/catalogue", "ok", "Marge cible par défaut enregistrée.");
}
