"use server";

import { lookupCompany } from "@/lib/enrich";
import { SECTORS, SIZES, fetchPage, isSector, targetsOf, type TargetRow } from "@/lib/territoire";
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

// ───────────── Territoire commercial ─────────────
const TER = "/veille/territoire";
const terBack = (zone: string, kind: "ok" | "error", msg: string): never => { revalidatePath(TER); return flash(`${TER}?zone=${zone}`, kind, msg); };
const zoneCode = (v: unknown) => (typeof v === "string" && /^(\d{2,3}|2[AB])$/.test(v) ? v : null);

/**
 * Charge depuis l'annuaire officiel les établissements d'une zone pour un secteur et une taille d'entreprise.
 * L'annuaire se lit par pages de 25 : chaque clic en lit jusqu'à 30 (750 entreprises) puis s'arrête ; « Charger la suite » reprend où il en était.
 */
export async function loadTerritoryAction(fd: FormData) {
  await requireAccess("veille");
  const zone = zoneCode(fd.get("zone")), sector = fd.get("sector"), size = String(fd.get("size") ?? "10");
  if (!zone) flash(TER, "error", "Zone inconnue.");
  if (!isSector(sector) || !(size in SIZES)) terBack(zone!, "error", "Choisissez un secteur et une taille d'entreprise.");
  const sb = createClient(), sec = sector as keyof typeof SECTORS, codes = SIZES[size]!.codes;
  let pages = 0, added = 0, done_ = true, err: string | null = null;
  for (const section of SECTORS[sec].sections) {
    const key = `${sec}:${section}:${size}`;
    const { data: st } = await sb.from("territory_loads").select("next_page, total_pages").eq("dept", zone!).eq("sector", key).maybeSingle();
    let page = Number((st as any)?.next_page ?? 1), total = (st as any)?.total_pages as number | null ?? null, results = 0;
    while (pages < 30 && (total == null || page <= total)) {
      const r = await fetchPage(zone!, section, codes, page);
      if ("error" in r) { err = r.error; break; }
      total = r.totalPages; results = r.total; pages++;
      const rows = r.rows.flatMap((x) => targetsOf(x, zone!, sec));
      // Une entreprise peut revenir sur deux pages : un seul enregistrement par établissement.
      const uniq = [...new Map(rows.map((t: TargetRow) => [t.siret, t])).values()];
      if (uniq.length) {
        const up = await sb.from("territory_targets").upsert(uniq.map((t) => ({ ...t, updated_at: new Date().toISOString() })), { onConflict: "siret", ignoreDuplicates: false });
        if (up.error) { err = dbMessage(up.error); break; }
        added += uniq.length;
      }
      page++;
      if (!r.rows.length) { total = page - 1; break; }
    }
    await sb.from("territory_loads").upsert({ dept: zone!, sector: key, next_page: page, total_pages: total, total_results: results || null, updated_at: new Date().toISOString() }, { onConflict: "dept,sector" });
    if (err) { done_ = false; break; }
    if (total == null || page <= total) { done_ = false; if (pages >= 30) break; }
  }
  if (err && !added) terBack(zone!, "error", err);
  terBack(zone!, "ok", `${added} établissement${added > 1 ? "s" : ""} chargé${added > 1 ? "s" : ""} (${SECTORS[sec].label}).${done_ ? " Ce secteur est complet." : " Il en reste : cliquez de nouveau sur « Charger » pour la suite."}${err ? ` Arrêt : ${err}` : ""}`);
}

/** Écarter un établissement de la prospection (ou le remettre) : il ne compte plus dans le pourcentage. */
export async function excludeTargetAction(zone: string, siret: string, excluded: boolean) {
  await requireAccess("veille");
  const z = zoneCode(zone) ?? "95";
  const { error } = await createClient().from("territory_targets").update({ excluded, updated_at: new Date().toISOString() }).eq("siret", siret);
  if (error) terBack(z, "error", dbMessage(error));
  terBack(z, "ok", excluded ? "Établissement écarté : il ne compte plus dans la zone." : "Établissement remis dans la zone.");
}

/** Passer un établissement en prospect : sa fiche client est créée (étape « à contacter ») ; il devient orange sur la carte, puis vert quand il est client. */
export async function targetToProspectAction(zone: string, siret: string) {
  await requireAccess("veille");
  const z = zoneCode(zone) ?? "95", sb = createClient();
  const { data: t } = await sb.from("territory_targets").select("*").eq("siret", siret).maybeSingle();
  if (!t) terBack(z, "error", "Établissement introuvable.");
  const k = t as any;
  const { data: ex } = await sb.from("clients").select("id").eq("siren", k.siren).limit(1).maybeSingle();
  if (ex) terBack(z, "ok", "Cette entreprise a déjà une fiche dans vos clients et prospects.");
  const row = { name: k.name, kind: "entreprise", status: "prospect", pipeline: "a_contacter", siren: k.siren, siret: k.siret, naf_code: k.naf_code, address: k.address, postal_code: k.postal_code, city: k.city, source: "territoire" };
  let ins = await sb.from("clients").insert(row).select("id").single();
  if (ins.error?.code === "23505") ins = await sb.from("clients").insert({ ...row, name: `${k.name} (${k.city ?? k.postal_code ?? k.siret})` }).select("id").single();   // un autre client porte déjà ce nom
  if (ins.error) terBack(z, "error", dbMessage(ins.error));
  revalidatePath("/clients");
  terBack(z, "ok", `${k.name} est maintenant un prospect « à contacter ». Retrouvez-le dans Clients.`);
}

/** Objectifs d'une zone : part d'établissements à signer, chiffre mensuel récurrent et nombre de clients fidèles avant d'ouvrir la suivante. */
export async function saveZoneAction(code: string, fd: FormData) {
  await requireAccess("veille");
  const z = zoneCode(code);
  if (!z) flash(TER, "error", "Zone inconnue.");
  const pct = numField(fd, "target_pct"), mrr = numField(fd, "min_mrr"), loyal = numField(fd, "min_loyal");
  if (pct == null || pct < 1 || pct > 100 || mrr == null || mrr < 0 || loyal == null || loyal < 0) terBack(z!, "error", "Objectifs invalides : part entre 1 et 100 %, montants positifs.");
  const { error } = await createClient().from("territory_zones").update({ target_pct: pct, min_mrr: mrr, min_loyal: Math.round(loyal!) }).eq("code", z!);
  if (error) terBack(z!, "error", dbMessage(error));
  terBack(z!, "ok", "Objectifs de la zone enregistrés.");
}

/** Ouvrir une zone à la prospection (ou la refermer). */
export async function setZoneStatusAction(code: string, status: "active" | "verrouillee" | "terminee") {
  await requireAccess("veille");
  const z = zoneCode(code);
  if (!z || !["active", "verrouillee", "terminee"].includes(status)) flash(TER, "error", "Zone inconnue.");
  const { error } = await createClient().from("territory_zones").update({ status, ...(status === "active" ? { opened_at: new Date().toISOString() } : {}) }).eq("code", z!);
  if (error) terBack(z!, "error", dbMessage(error));
  terBack(z!, "ok", status === "active" ? "Zone ouverte : chargez ses établissements pour commencer." : status === "terminee" ? "Zone marquée comme acquise." : "Zone refermée.");
}

/** Ajouter un département à la liste des zones. */
export async function addZoneAction(fd: FormData) {
  await requireAccess("veille");
  const z = zoneCode(str(fd, "code")), label = str(fd, "label");
  if (!z || !label) flash(TER, "error", "Indiquez le numéro du département et son nom.");
  const sb = createClient();
  const { data: last } = await sb.from("territory_zones").select("rank").order("rank", { ascending: false }).limit(1).maybeSingle();
  const { error } = await sb.from("territory_zones").insert({ code: z!, label: label!.slice(0, 80), rank: Number((last as any)?.rank ?? 0) + 1 });
  if (error) flash(TER, "error", error.code === "23505" ? "Cette zone existe déjà." : dbMessage(error));
  terBack(z!, "ok", "Zone ajoutée à la suite des autres.");
}
