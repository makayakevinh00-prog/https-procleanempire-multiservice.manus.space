"use server";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LiveJob } from "@/lib/live";

/** Suivi en direct de tous les ménages du jour, pour la direction (CRM). */
export async function adminLiveAction(): Promise<LiveJob[]> {
  await requireOwner();
  const { data, error } = await createClient().rpc("admin_live");
  return error ? [] : ((data ?? []) as LiveJob[]);
}
