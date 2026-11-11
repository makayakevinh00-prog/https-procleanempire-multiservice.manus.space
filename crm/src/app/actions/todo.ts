"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash } from "@/lib/data";

const KEY = /^[a-z0-9_:-]{1,80}$/i;

/** Masque une action à faire : un élément précis disparaît pour de bon ; un compteur réapparaît seulement si le nombre augmente. */
export async function dismissActionAction(key: string, count: number | null) {
  await requireOwner();
  if (!KEY.test(key)) flash("/actions", "error", "Action inconnue.");
  const { error } = await createClient().from("action_dismissals").upsert({ key, count_at: count, dismissed_at: new Date().toISOString() });
  if (error) flash("/actions", "error", dbMessage(error));
  revalidatePath("/actions"); revalidatePath("/", "layout");
  flash("/actions", "ok", "Action masquée.");
}

export async function restoreActionAction(key: string) {
  await requireOwner();
  if (!KEY.test(key)) flash("/actions", "error", "Action inconnue.");
  const { error } = await createClient().from("action_dismissals").delete().eq("key", key);
  if (error) flash("/actions", "error", dbMessage(error));
  revalidatePath("/actions"); revalidatePath("/", "layout");
  flash("/actions", "ok", "Action réaffichée.");
}
