"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, str } from "@/lib/data";
import { isAllowedCalendarUrl } from "@/lib/ics-events";

const BACK = "/calendrier";

/** Relie un calendrier publié (Outlook, Google, iCloud) : lecture seule, le CRM n'écrit jamais dedans. */
export async function addExternalCalendarAction(fd: FormData) {
  await requireOwner();
  const label = (str(fd, "label") ?? "").trim().slice(0, 60);
  const kind = str(fd, "kind") ?? "";
  const url = (str(fd, "url") ?? "").trim().replace(/^webcal:/i, "https:");
  if (!label) flash(BACK, "error", "Donnez un nom à ce calendrier.");
  if (!["operationnel", "commercial", "personnel"].includes(kind)) flash(BACK, "error", "Choisissez la famille du calendrier.");
  if (!isAllowedCalendarUrl(url)) flash(BACK, "error", "Collez le lien ICS publié par Outlook, Google Agenda ou iCloud (il commence par https://).");
  const sb = createClient();
  const { count } = await sb.from("external_calendars").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 8) flash(BACK, "error", "8 calendriers au maximum : retirez-en un avant d'en ajouter.");
  const { error } = await sb.from("external_calendars").insert({ label, kind, url });
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", `Calendrier « ${label} » relié.`);
}

export async function removeExternalCalendarAction(id: string) {
  await requireOwner();
  const { error } = await createClient().from("external_calendars").delete().eq("id", id);
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", "Calendrier retiré du CRM (rien n'est supprimé dans Outlook).");
}
