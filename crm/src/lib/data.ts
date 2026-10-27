import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/domain/types";
import { parseDbError } from "@/lib/domain/billing";

type Supa = ReturnType<typeof createClient>;

export async function getSettings(supabase: Supa): Promise<Settings> {
  const { data, error } = await supabase.from("app_settings").select("*").single();
  if (error || !data) throw new Error(`Paramètres introuvables : ${error?.message ?? "table vide"}`);
  return data as unknown as Settings;
}

/** Numériques Postgres → nombres JS (PostgREST renvoie parfois des chaînes). */
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
export const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function flash(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

/** Convertit une erreur Supabase/Postgres en message lisible pour le patron. */
export function dbMessage(error: { message: string }): string {
  return parseDbError(error.message).text;
}

export const checked = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};
export const numField = (fd: FormData, key: string) => {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
