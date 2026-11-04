"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";

export async function saveServiceAction(id: string | null, fd: FormData) {
  const name = str(fd, "name");
  const price = numField(fd, "unit_price_ht");
  if (!name) flash("/catalogue", "error", "Le nom est obligatoire.");
  if (price === null || price < 0) flash("/catalogue", "error", "Prix HT invalide.");
  const row = {
    code: str(fd, "code")?.toUpperCase() ?? null, name: name!, description: str(fd, "description"), unit: str(fd, "unit"),
    unit_price_ht: price!, vat_rate: numField(fd, "vat_rate") ?? 20, active: checked(fd, "active") || !id
  };
  const q = createClient().from("services");
  const { error } = id ? await q.update(row).eq("id", id) : await q.insert(row);
  if (error) flash("/catalogue", "error", error.code === "23505" ? "Ce code existe déjà." : dbMessage(error));
  revalidatePath("/catalogue");
  flash("/catalogue", "ok", id ? "Prestation mise à jour." : "Prestation ajoutée.");
}

export async function toggleServiceAction(id: string, active: boolean) {
  const { error } = await createClient().from("services").update({ active }).eq("id", id);
  if (error) flash("/catalogue", "error", dbMessage(error));
  revalidatePath("/catalogue");
  flash("/catalogue", "ok", active ? "Prestation réactivée." : "Prestation masquée des devis.");
}
