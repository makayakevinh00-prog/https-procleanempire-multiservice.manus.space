"use server";

import { lookupCompany } from "@/lib/enrich";
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
  // Les informations de l'annuaire (ville, effectif, CA, NAF, création) ne se saisissent plus : elles sont recherchées (bouton Enrichir) et ne sont jamais effacées par ce formulaire.
  const has = (k: string) => fd.has(k);
  return {
    siren: siren && /^\d{9}$/.test(siren) ? siren : null,
    website: web && /^https?:\/\//i.test(web) ? web : web ? `https://${web}` : null,
    ...(has("city") ? { city: str(fd, "city") } : {}),
    ...(has("postal_code") ? { postal_code: str(fd, "postal_code") } : {}),
    ...(has("naf_code") ? { naf_code: str(fd, "naf_code") } : {}),
    ...(has("headcount") ? { headcount: str(fd, "headcount") } : {}),
    ...(has("revenue_eur") ? { revenue_eur: numField(fd, "revenue_eur") } : {}),
    ...(has("revenue_year") ? { revenue_year: numField(fd, "revenue_year") } : {}),
    ...(has("creation_date") ? { creation_date: date(str(fd, "creation_date")) } : {}),
    services: str(fd, "services"),
    positioning: str(fd, "positioning"),
    strengths: str(fd, "strengths"),
    weaknesses: str(fd, "weaknesses"),
    prices: str(fd, "prices"),
    status: str(fd, "status") === "archive" ? "archive" : "surveille",
    ...(has("last_reviewed_on") ? { last_reviewed_on: date(str(fd, "last_reviewed_on")) } : {}),
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
    // Un concurrent ajouté par son nom ou son SIREN est tout de suite complété depuis l'annuaire officiel.
    const hit = await lookupCompany({ siren: (row as any).siren, name: name! });
    if (hit.rival) await sb.from("competitors").update(registryFields(hit.rival)).eq("id", cid);
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
    ...(fd.has("cost_eur") ? { cost_eur: (numField(fd, "cost_eur") ?? -1) >= 0 ? numField(fd, "cost_eur") : null } : {}),
    ...(fd.has("enroll_url") ? { enroll_url: (() => { const u = str(fd, "enroll_url"); return u && /^https?:\/\//i.test(u) ? u : null; })() } : {}),
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

function registryFields(r: import("@/lib/veille").Rival) {
  return {
    siren: r.siren, naf_code: r.naf_code, city: r.city, postal_code: r.postal_code, headcount: r.headcount,
    revenue_eur: r.revenue_eur, revenue_year: r.revenue_year, creation_date: r.creation_date, last_reviewed_on: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString()
  };
}

/** Bouton « Enrichir » : retrouve le concurrent dans l'annuaire officiel et remplit à votre place SIREN, activité, ville, taille, chiffre d'affaires publié, date de création. */
export async function enrichCompetitorAction(id: string) {
  await requireAccess("veille");
  const sb = createClient();
  const { data: c } = await sb.from("competitors").select("name, siren, city").eq("id", id).maybeSingle();
  if (!c) flash(BACK, "error", "Concurrent introuvable.");
  const hit = await lookupCompany({ siren: (c as any).siren, name: (c as any).name, city: (c as any).city });
  if (!hit.rival) flash(`${BACK}/${id}`, "error", hit.error ?? "Rien trouvé.");
  const { error } = await sb.from("competitors").update(registryFields(hit.rival!)).eq("id", id);
  if (error) flash(`${BACK}/${id}`, "error", error.code === "23505" ? "Ce SIREN est déjà suivi sur une autre fiche." : dbMessage(error));
  done(`${BACK}/${id}`, `Fiche complétée depuis l'annuaire officiel${hit.rival!.revenue_eur ? ` (CA ${hit.rival!.revenue_year})` : " (cette entreprise ne publie pas son chiffre d'affaires)"}.`);
}

/** Demande à l'assistant la recherche web que l'annuaire ne donne pas : prix, labels, points forts. Il écrit le résultat dans la fiche ; vous le relisez. */
export async function askCompetitorResearchAction(id: string) {
  await requireAccess("veille");
  const sb = createClient();
  const { data: c } = await sb.from("competitors").select("name, website, city").eq("id", id).maybeSingle();
  if (!c) flash(BACK, "error", "Concurrent introuvable.");
  const k = c as any;
  const { error } = await sb.from("jarvis_tasks").insert({
    agent_key: "core", priority: "normale", dedupe_key: `veille-recherche:${id}:${new Date().toISOString().slice(0, 10)}`,
    title: `Veille : rechercher ${k.name}`,
    detail: [`Concurrent : ${k.name}${k.city ? ` (${k.city})` : ""}${k.website ? ` — ${k.website}` : ""}.`,
      "Cherche sur le web (site, avis, annuaires, appels d'offres) : services proposés, prix publics, certifications et labels (Qualipropre, ISO…), points forts et faibles.",
      `Écris le résultat dans la fiche : crm_ecrire table=competitors, update, filters {"id":"${id}"}, champs services, prices, strengths, weaknesses, positioning ; pour chaque certification trouvée, ajoute une ligne dans competitor_certifications avec l'URL source.`,
      "N'invente rien : si une information est introuvable, laisse le champ vide. Ne contacte personne."].join("\n")
  });
  if (error) flash(`${BACK}/${id}`, "error", dbMessage(error));
  done(`${BACK}/${id}`, "Recherche demandée à l'assistant : il remplira prix, labels et points forts dès qu'il traite sa liste.");
}
