"use server";

import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, numField } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import { GOALS, GOAL_ORDER, isMonth } from "@/lib/objectifs";
import { THRESHOLD_KEYS } from "@/lib/croissance";

/** Un champ vide ou à zéro supprime l'objectif de ce mois : l'indicateur n'est plus suivi. */
export async function saveGoalsAction(month: string, fd: FormData) {
  await requireOwner();
  if (!isMonth(month)) flash("/", "error", "Mois invalide.");
  const sb = createClient();
  const keep: {
    month: string;
    kind: string;
    target: number;
    updated_at: string;
  }[] = [];
  const drop: string[] = [];
  for (const kind of GOAL_ORDER) {
    const v = numField(fd, `goal_${kind}`);
    if (v != null && v > 0)
      keep.push({
        month,
        kind,
        target: v,
        updated_at: new Date().toISOString(),
      });
    else drop.push(kind);
  }
  if (keep.length) {
    const { error } = await sb
      .from("monthly_goals")
      .upsert(keep, { onConflict: "month,kind" });
    if (error) flash("/", "error", dbMessage(error));
  }
  if (drop.length) {
    const { error } = await sb
      .from("monthly_goals")
      .delete()
      .eq("month", month)
      .in("kind", drop);
    if (error) flash("/", "error", dbMessage(error));
  }
  revalidatePath("/");
  flash(
    "/",
    "ok",
    keep.length ? "Objectifs enregistrés." : "Aucun objectif suivi ce mois-ci.",
  );
}

/**
 * Demande un plan d'action à l'assistant : crée une tâche pour l'agent « core ».
 * L'assistant la lit, étudie les chiffres et écrit le plan dans goal_plans ; rien n'est envoyé à un client.
 */
export async function askPlanAction(month: string) {
  await requireOwner();
  if (!isMonth(month)) flash("/", "error", "Mois invalide.");
  const labels = GOAL_ORDER.map((k) => `${k} (${GOALS[k].label})`).join(", ");
  const { error } = await createClient()
    .from("jarvis_tasks")
    .insert({
      agent_key: "core",
      priority: "haute",
      dedupe_key: `plan-objectifs:${month}:${parisToday()}`,
      title: `Plan d'action pour atteindre les objectifs de ${month}`,
      detail: [
        `1. Lis les objectifs : crm_lire table=monthly_goals filters={"month":"${month}"} (types : ${labels}).`,
        "2. Compare avec la réalité du mois : factures émises et brouillons, devis envoyés / acceptés, contrats actifs pas encore facturés, factures en retard, virements reçus, clients créés, demandes du site, prospects, et les échanges récents (interactions, email_log).",
        "3. Écris un plan de 5 actions maximum, chiffrées, avec les noms des clients concernés et l'ordre de priorité. Termine par une phrase disant si l'objectif est atteignable.",
        `4. Enregistre-le : crm_ecrire table=goal_plans, insert {month:"${month}", body:"…", author:"assistant"} (ou update avec filters {month:"${month}"} s'il existe déjà).`,
        "5. Ne contacte aucun client : propose seulement (proposer_email_client si un e-mail est utile).",
      ].join("\n"),
    });
  if (error)
    flash(
      "/",
      "error",
      error.code === "23505"
        ? "Le plan a déjà été demandé aujourd'hui."
        : dbMessage(error),
    );
  revalidatePath("/");
  flash(
    "/",
    "ok",
    "Demande envoyée à votre assistant. Demandez-lui de traiter ses tâches : le plan apparaîtra ici.",
  );
}

export async function saveThresholdsAction(fd: FormData) {
  await requireOwner();
  const sb = createClient();
  for (const key of THRESHOLD_KEYS) {
    const v = numField(fd, key);
    const { error } =
      v != null && v > 0
        ? await sb
            .from("growth_thresholds")
            .upsert(
              { key, value: v, updated_at: new Date().toISOString() },
              { onConflict: "key" },
            )
        : await sb.from("growth_thresholds").delete().eq("key", key);
    if (error) flash("/croissance", "error", dbMessage(error));
  }
  revalidatePath("/croissance");
  flash("/croissance", "ok", "Paliers enregistrés.");
}
