"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Le patron écrit à un agent. Le message arrive dans l'application de l'agent dès qu'elle se rafraîchit (quelques secondes). */
export async function sendToAgentAction(staffId: string, body: string): Promise<{ error?: string }> {
  await requireOwner();
  const text = String(body ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(staffId)) return { error: "Agent inconnu." };
  if (!text || text.length > 2000) return { error: "Message vide ou trop long (2000 caractères)." };
  const { error } = await createClient().from("team_messages").insert({ staff_id: staffId, from_owner: true, body: text });
  if (error) return { error: "Envoi impossible." };
  revalidatePath("/messages");
  return {};
}

/** Marque comme lus les messages d'un agent (la conversation est ouverte). */
export async function markAgentMessagesReadAction(staffId: string): Promise<void> {
  await requireOwner();
  if (!/^[0-9a-f-]{36}$/i.test(staffId)) return;
  await createClient().from("team_messages").update({ read_at: new Date().toISOString() }).eq("staff_id", staffId).eq("from_owner", false).is("read_at", null);
}
