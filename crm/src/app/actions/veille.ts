"use server";

import { requireAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, numField, str } from "@/lib/data";
import {
  CERT_KIND,
  CERT_STATUS,
  IMPACT,
  PRIORITY,
  WATCH_KIND,
} from "@/lib/veille";

const BACK = "/veille";
const pick = (
  v: string | null,
  allowed: Record<string, string>,
  fallback: string,
) => (v && v in allowed ? v : fallback);
const date = (v: string | null) =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
const done = (path: string, msg: string) => {
  revalidatePath("/veille");
  revalidatePath(path);
  flash(path, "ok", msg);
};

function competitorRow(fd: FormData) {
  const siren = str(fd, "siren")?.replace(/\s/g, "") ?? null;
  const web = str(fd, "website");
  return {
    siren: siren && /^\d{9}$/.test(siren) ? siren : null,
    website:
      web && /^https?:\/\//i.test(web) ? web : web ? `https://${web}` : null,
    city: str(fd, "city"),
    postal_code: str(fd, "postal_code"),
    naf_code: str(fd, "naf_code"),
    headcount: str(fd, "headcount"),
    revenue_eur: numField(fd, "revenue_eur"),
    revenue_year: numField(fd, "revenue_year"),
    creation_date: date(str(fd, "creation_date")),
    services: str(fd, "services"),
    positioning: str(fd, "positioning"),
    strengths: str(fd, "strengths"),
    weaknesses: str(fd, "weaknesses"),
    prices: str(fd, "prices"),
    status: str(fd, "status") === "archive" ? "archive" : "surveille",
    last_reviewed_on: date(str(fd, "last_reviewed_on")),
  };
}

export async function saveCompetitorAction(id: string | null, fd: FormData) {
  await requireAccess("veille");
  const name = str(fd, "name");
  const back = id ? `${BACK}/${id}` : `${BACK}?tab=concurrents`;
  if (!name) flash(back, "error", "Le nom est obligatoire.");
  const row = {
    name: name!,
    ...competitorRow(fd),
    updated_at: new Date().toISOString(),
  };
  const sb = createClient();
  let cid = id;
  if (id) {
    const { error } = await sb.from("competitors").update(row).eq("id", id);
    if (error)
      flash(
        back,
        "error",
        error.code === "23505"
          ? "Ce concurrent (nom ou SIREN) est déjà suivi."
          : dbMessage(error),
      );
  } else {
    const { data, error } = await sb
      .from("competitors")
      .insert(row)
      .select("id")
      .single();
    if (error)
      flash(
        back,
        "error",
        error.code === "23505"
          ? "Ce concurrent (nom ou SIREN) est déjà suivi."
          : dbMessage(error),
      );
    cid = data!.id;
  }
  if (id) {
    const ids = fd.getAll("cert").map(String);
    await sb.from("competitor_certifications").delete().eq("competitor_id", id);
    if (ids.length) {
      const { error } = await sb
        .from("competitor_certifications")
        .insert(
          ids.map((certification_id) => ({
            competitor_id: id,
            certification_id,
          })),
        );
      if (error) flash(back, "error", dbMessage(error));
    }
  }
  done(`${BACK}/${cid}`, id ? "Concurrent mis à jour." : "Concurrent ajouté.");
}

/** « Suivre » un résultat de l'annuaire officiel : les champs viennent du formulaire caché, validés comme le reste. */
export async function followCompetitorAction(fd: FormData) {
  await requireAccess("veille");
  const name = str(fd, "name");
  if (!name) flash(`${BACK}?tab=decouvrir`, "error", "Entreprise introuvable.");
  const { data, error } = await createClient()
    .from("competitors")
    .insert({
      name: name!,
      ...competitorRow(fd),
      source: "annuaire",
      last_reviewed_on: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error)
    flash(
      `${BACK}?tab=decouvrir`,
      "error",
      error.code === "23505"
        ? "Ce concurrent est déjà suivi."
        : dbMessage(error),
    );
  done(
    `${BACK}/${data!.id}`,
    "Concurrent ajouté à la veille : complétez sa fiche (offres, prix, points forts).",
  );
}

export async function deleteCompetitorAction(id: string) {
  await requireAccess("veille");
  const { error } = await createClient()
    .from("competitors")
    .delete()
    .eq("id", id);
  if (error) flash(`${BACK}/${id}`, "error", dbMessage(error));
  done(`${BACK}?tab=concurrents`, "Concurrent supprimé.");
}

export async function saveWatchAction(
  competitorId: string | null,
  fd: FormData,
) {
  await requireAccess("veille");
  const back = competitorId ? `${BACK}/${competitorId}` : `${BACK}?tab=veille`;
  const title = str(fd, "title");
  if (!title) flash(back, "error", "Le titre est obligatoire.");
  const cid = competitorId ?? str(fd, "competitor_id");
  const url = str(fd, "source_url");
  const { error } = await createClient()
    .from("watch_items")
    .insert({
      competitor_id: cid,
      title: title!,
      kind: pick(str(fd, "kind"), WATCH_KIND, "autre"),
      detail: str(fd, "detail"),
      impact: pick(str(fd, "impact"), IMPACT, "moyen"),
      action: str(fd, "action"),
      observed_on:
        date(str(fd, "observed_on")) ?? new Date().toISOString().slice(0, 10),
      source_url: url && /^https?:\/\//i.test(url) ? url : null,
    });
  if (error) flash(back, "error", dbMessage(error));
  done(back, "Information de veille ajoutée.");
}

export async function toggleWatchDoneAction(id: string, back: string, fd: FormData) {
  await requireAccess("veille");
  const { error } = await createClient().from("watch_items").update({ done: fd.get("value") === "1" }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  done(back, "Mis à jour.");
}

export async function deleteWatchAction(id: string, back: string) {
  await requireAccess("veille");
  const { error } = await createClient()
    .from("watch_items")
    .delete()
    .eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  done(back, "Information supprimée.");
}

export async function saveCertificationAction(id: string | null, fd: FormData) {
  await requireAccess("veille");
  const back = `${BACK}?tab=formations`;
  const name = str(fd, "name");
  if (!name) flash(back, "error", "Le nom est obligatoire.");
  const src = str(fd, "source_url");
  const status = pick(str(fd, "status"), CERT_STATUS, "a_envisager");
  const row = {
    name: name!,
    kind: pick(str(fd, "kind"), CERT_KIND, "certification"),
    description: str(fd, "description"),
    benefit: str(fd, "benefit"),
    cost_note: str(fd, "cost_note"),
    duration_note: str(fd, "duration_note"),
    provider: str(fd, "provider"),
    notes: str(fd, "notes"),
    source_url: src && /^https?:\/\//i.test(src) ? src : null,
    status,
    priority: pick(str(fd, "priority"), PRIORITY, "normale"),
    target_date: date(str(fd, "target_date")),
    obtained_on:
      status === "obtenu"
        ? (date(str(fd, "obtained_on")) ??
          new Date().toISOString().slice(0, 10))
        : null,
    updated_at: new Date().toISOString(),
  };
  const sb = createClient();
  const { error } = id
    ? await sb.from("certifications").update(row).eq("id", id)
    : await sb.from("certifications").insert(row);
  if (error)
    flash(
      back,
      "error",
      error.code === "23505"
        ? "Cette certification existe déjà."
        : dbMessage(error),
    );
  done(back, id ? "Mis à jour." : "Ajouté au référentiel.");
}

export async function setCertificationStatusAction(id: string, fd: FormData) {
  await requireAccess("veille");
  const status = pick(str(fd, "status"), CERT_STATUS, "a_envisager");
  const { error } = await createClient()
    .from("certifications")
    .update({
      status,
      obtained_on:
        status === "obtenu" ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) flash(`${BACK}?tab=formations`, "error", dbMessage(error));
  done(`${BACK}?tab=formations`, "Statut mis à jour.");
}

export async function deleteCertificationAction(id: string) {
  await requireAccess("veille");
  const { error } = await createClient()
    .from("certifications")
    .delete()
    .eq("id", id);
  if (error) flash(`${BACK}?tab=formations`, "error", dbMessage(error));
  done(`${BACK}?tab=formations`, "Supprimé du référentiel.");
}
