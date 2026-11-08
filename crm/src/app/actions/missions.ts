"use server";
import { parseSpecifics, parseZones } from "@/lib/domain/site-zones";

import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geo";
import { dbMessage, flash, numField, str } from "@/lib/data";
import { isStage, MANUAL_STAGES, STAGE_LABEL } from "@/lib/domain/missions";

/** Retour sûr : uniquement un chemin interne. */
const backOf = (fd: FormData, fallback: string) => {
  const b = str(fd, "back");
  return b && b.startsWith("/") && !b.startsWith("//") ? b : fallback;
};
const refresh = () => { for (const p of ["/missions", "/sites", "/equipe", "/planning", "/", "/actions"]) revalidatePath(p); };
const lines = (v: string | null) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

// ───────────── Sites ─────────────
export async function saveSiteAction(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id");
  const back = backOf(fd, id ? `/sites/${id}` : "/sites");
  const name = str(fd, "name"), clientId = str(fd, "client_id");
  if (!name || !clientId) flash(back, "error", "Nom du site et client obligatoires.");
  const row = {
    client_id: clientId, name, address: str(fd, "address"), postal_code: str(fd, "postal_code"), city: str(fd, "city"),
    access_notes: str(fd, "access_notes"), contact_name: str(fd, "contact_name"), contact_phone: str(fd, "contact_phone"),
    checklist: lines(str(fd, "checklist")), frequency: str(fd, "frequency"), specifics: parseSpecifics(str(fd, "specifics")), zones: parseZones(str(fd, "zones")), notes: str(fd, "notes"), status: str(fd, "status") === "inactif" ? "inactif" : "actif"
  };
  const supabase = createClient();
  const write = (r: Record<string, unknown>) => id ? supabase.from("sites").update(r).eq("id", id).select("id").single() : supabase.from("sites").insert(r).select("id").single();
  let res = await write(row);
  // Base pas encore migrée (0028) : on enregistre le reste de la fiche plutôt que d'échouer.
  if (res.error && /frequency|specifics|zones/.test(res.error.message)) { const { frequency: _f, specifics: _s, zones: _z, ...base } = row; res = await write(base); }
  if (res.error) flash(back, "error", dbMessage(res.error));
  // Position GPS automatique à partir de l'adresse (sert au pointage des agents et à la carte).
  const geo = await geocodeAddress(row.address ?? null, row.postal_code ?? null, row.city ?? null);
  if (geo) await supabase.from("sites").update({ lat: geo.lat, lng: geo.lng, geocoded_at: new Date().toISOString() }).eq("id", res.data!.id);
  refresh();
  flash(`/sites/${res.data!.id}`, "ok", (id ? "Site enregistré." : "Site créé.") + (geo ? " Position GPS trouvée." : " Position GPS non trouvée : vérifiez l'adresse."));
}

export async function linkContractSiteAction(contractId: string, fd: FormData) {
  await requireOwner();
  const siteId = str(fd, "site_id");
  const { error } = await createClient().from("contracts").update({ site_id: siteId }).eq("id", contractId);
  if (error) flash(`/contrats/${contractId}`, "error", dbMessage(error));
  refresh();
  flash(`/contrats/${contractId}`, "ok", "Site du contrat mis à jour. Les prochaines missions générées en hériteront.");
}

// ───────────── Équipe ─────────────
export async function saveStaffAction(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id");
  const back = backOf(fd, "/equipe");
  const fullName = str(fd, "full_name");
  if (!fullName) flash(back, "error", "Le nom est obligatoire.");
  const row = {
    full_name: fullName, phone: str(fd, "phone"), email: str(fd, "email"), zone: str(fd, "zone"),
    role: str(fd, "role") === "responsable" ? "responsable" : "agent",
    weekly_capacity_hours: numField(fd, "weekly_capacity_hours"), notes: str(fd, "notes"),
    skills: (str(fd, "skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    active: str(fd, "active") !== "non"
  };
  const supabase = createClient();
  const { error } = id ? await supabase.from("staff").update(row).eq("id", id) : await supabase.from("staff").insert(row);
  if (error) flash(back, "error", /staff_name_uq/.test(error.message) ? "Un membre de l'équipe porte déjà ce nom." : dbMessage(error));
  refresh();
  flash(back, "ok", id ? "Fiche mise à jour." : `${fullName} ajouté(e) à l'équipe.`);
}

// ───────────── Missions ─────────────
export async function setStageAction(id: string, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, `/missions/${id}`);
  const stage = str(fd, "stage");
  if (!isStage(stage) || !MANUAL_STAGES.includes(stage)) flash(back, "error", "Étape invalide (« Facturée » est posée uniquement par la facturation).");
  const supabase = createClient();
  const { data: before } = await supabase.from("interventions").select("invoice_id, stage").eq("id", id).maybeSingle();
  if (!before) flash(back, "error", "Mission introuvable.");
  if (before!.invoice_id) flash(back, "error", "Mission déjà facturée : son étape ne change plus (annulez la facture d'abord).");
  if (stage === "validee" || stage === "facturable") {
    const { count } = await supabase.from("mission_issues").select("id", { count: "exact", head: true }).eq("intervention_id", id).eq("status", "ouverte");
    if (count) flash(back, "error", `Impossible de passer « ${STAGE_LABEL[stage]} » : ${count} anomalie(s) ou réclamation(s) encore ouverte(s) sur cette mission.`);
  }
  const { error } = await supabase.from("interventions").update({ stage }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash(back, "ok", `Mission passée à « ${STAGE_LABEL[stage!]} ».`);
}

export async function assignStaffAction(id: string, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, `/missions/${id}`);
  const staffId = str(fd, "staff_id");
  const supabase = createClient();
  const { data: m } = await supabase.from("interventions").select("invoice_id").eq("id", id).maybeSingle();
  if (m?.invoice_id) flash(back, "error", "Mission déjà facturée : l'intervenant ne change plus.");
  const { error } = await supabase.from("interventions").update({ staff_id: staffId }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash(back, "ok", staffId ? "Intervenant affecté." : "Intervenant retiré.");
}

export async function toggleChecklistAction(id: string, index: number, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, `/missions/${id}`);
  const supabase = createClient();
  const { data: m, error: e1 } = await supabase.from("interventions").select("checklist").eq("id", id).maybeSingle();
  if (e1 || !m) flash(back, "error", "Mission introuvable.");
  const list = (Array.isArray(m!.checklist) ? m!.checklist : []) as { label: string; done: boolean }[];
  if (!list[index]) flash(back, "error", "Point de contrôle introuvable.");
  list[index] = { ...list[index], done: !list[index].done };
  const { error } = await supabase.from("interventions").update({ checklist: list }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(`/missions/${id}`);
  flash(back, "ok", list[index].done ? `« ${list[index].label} » coché.` : `« ${list[index].label} » décoché.`);
}

export async function addChecklistItemAction(id: string, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, `/missions/${id}`);
  const label = str(fd, "label");
  if (!label) flash(back, "error", "Indiquez le point à contrôler.");
  const supabase = createClient();
  const { data: m } = await supabase.from("interventions").select("checklist").eq("id", id).maybeSingle();
  const list = (Array.isArray(m?.checklist) ? m!.checklist : []) as { label: string; done: boolean; room?: string }[];
  const room = str(fd, "room");
  const { error } = await supabase.from("interventions").update({ checklist: [...list, { label, done: false, ...(room ? { room: room.slice(0, 40) } : {}) }] }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(`/missions/${id}`);
  flash(back, "ok", "Point ajouté à la check-list.");
}

export async function saveMissionNotesAction(id: string, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, `/missions/${id}`);
  const { error } = await createClient().from("interventions").update({ notes: str(fd, "notes") }).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(`/missions/${id}`);
  flash(back, "ok", "Notes enregistrées.");
}

// ───────────── Anomalies & réclamations ─────────────
export async function addIssueAction(fd: FormData) {
  await requireOwner();
  const back = backOf(fd, "/missions");
  const kind = str(fd, "kind") === "reclamation" ? "reclamation" : "anomalie";
  const description = str(fd, "description");
  const clientId = str(fd, "client_id");
  if (!description || !clientId) flash(back, "error", "Décrivez le problème.");
  const sev = str(fd, "severity");
  const { error } = await createClient().from("mission_issues").insert({
    kind, description, client_id: clientId, intervention_id: str(fd, "intervention_id"), site_id: str(fd, "site_id"),
    severity: sev === "haute" || sev === "faible" ? sev : "normale", reported_by: str(fd, "reported_by")
  });
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash(back, "ok", kind === "reclamation" ? "Réclamation enregistrée." : "Anomalie enregistrée : la mission est repassée « à vérifier » si elle était terminée.");
}

export async function resolveIssueAction(issueId: string, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, "/missions");
  const resolution = str(fd, "resolution");
  if (!resolution) flash(back, "error", "Indiquez comment le problème a été réglé.");
  const { error } = await createClient().from("mission_issues").update({ status: "resolue", resolution, resolved_at: new Date().toISOString() }).eq("id", issueId);
  if (error) flash(back, "error", dbMessage(error));
  refresh();
  flash(back, "ok", "Marqué comme réglé.");
}

// ───────────── Lien mobile des agents ─────────────
/**
 * Génère (ou remplace) le lien privé d'un agent. Seule l'empreinte SHA-256 est stockée : le lien n'est affiché
 * qu'une fois (cookie de 2 minutes lu par la page Équipe). Régénérer invalide immédiatement l'ancien lien.
 */
export async function generateAgentLinkAction(staffId: string) {
  await requireOwner();
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const supabase = createClient();
  const { data, error } = await supabase.from("staff").update({ agent_token_hash: hash, agent_token_set_at: new Date().toISOString() })
    .eq("id", staffId).eq("active", true).select("full_name").maybeSingle();
  if (error) flash("/equipe", "error", dbMessage(error));
  if (!data) flash("/equipe", "error", "Agent introuvable ou inactif.");
  const h = headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  // Next encode déjà la valeur du cookie à l'écriture (il ne la décode pas à la lecture : voir la page Équipe).
  cookies().set("agent_link", JSON.stringify({ id: staffId, name: data!.full_name, url: `${origin}/agent/${token}` }),
    { httpOnly: true, secure: true, sameSite: "strict", path: "/equipe", maxAge: 120 });
  revalidatePath("/equipe");
  flash("/equipe", "ok", `Lien généré pour ${data!.full_name} : copiez-le ci-dessous (affiché une seule fois).`);
}

export async function revokeAgentLinkAction(staffId: string) {
  await requireOwner();
  const { error } = await createClient().from("staff").update({ agent_token_hash: null, agent_token_set_at: null }).eq("id", staffId);
  if (error) flash("/equipe", "error", dbMessage(error));
  revalidatePath("/equipe");
  flash("/equipe", "ok", "Lien révoqué : l'ancien lien ne fonctionne plus.");
}

export async function deletePhotoAction(photoId: string, fd: FormData) {
  await requireOwner();
  const back = backOf(fd, "/missions");
  const { error } = await createClient().from("mission_photos").delete().eq("id", photoId);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath(back);
  flash(back, "ok", "Photo supprimée.");
}
