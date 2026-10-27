import { z } from "zod";
import { flash, checked } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Line } from "@/lib/domain/types";

const lineSchema = z.object({
  description: z.string().trim().min(1, "Chaque ligne doit avoir une description."),
  quantity: z.number().positive("La quantité doit être positive."),
  unit_price_ht: z.number().min(0, "Le prix ne peut pas être négatif."),
  vat_rate: z.number().min(0).max(100)
});

export function parseLines(fd: FormData, back: string): Line[] {
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    flash(back, "error", "Lignes illisibles, recommencez.");
  }
  const parsed = z.array(lineSchema).min(1, "Ajoutez au moins une ligne.").safeParse(raw);
  if (!parsed.success) flash(back, "error", parsed.error.issues[0].message);
  return parsed.data!;
}

/** Règle 1 côté serveur : toute action sur un contact réservé exige la case de confirmation. */
export async function requireReservedAck(clientId: string, fd: FormData, back: string) {
  const { data } = await createClient().from("clients").select("name, is_reserved").eq("id", clientId).maybeSingle();
  if (data?.is_reserved && !checked(fd, "ack_reserved")) {
    flash(back, "error", `Contact réservé (${data.name}) : confirmation explicite du patron requise.`);
  }
}
