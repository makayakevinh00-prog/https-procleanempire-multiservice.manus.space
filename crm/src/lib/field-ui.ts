/** Application des agents : calculs d'affichage purs (frise horaire, dates, textes FR/EN). Aucun accès base. */
export type Lang = "fr" | "en";
export type ThemePref = "light" | "dark" | "system";
export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";
export const isTheme = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system";

export const ROW = 72;           // hauteur d'une heure dans la frise (px)
const DEFAULT_HOURS = 2;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const isoDate = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z")) ? v : null);
export const shiftDay = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export type Block = { id: string; top: number; height: number; col: number; cols: number; start: string; end: string };
type M = { id: string; time: string | null; hours: number | null };

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Frise d'une journée : heures affichées (7 h–20 h au minimum), missions datées positionnées, missions sans horaire à part. Les missions qui se chevauchent se placent côte à côte. */
export function layoutDay(missions: M[]) {
  const timed = missions.filter((m) => m.time).map((m) => { const s = toMin(m.time!); return { id: m.id, s, e: s + Math.round((m.hours && m.hours > 0 ? m.hours : DEFAULT_HOURS) * 60) }; }).sort((a, b) => a.s - b.s || a.e - b.e);
  const loose = missions.filter((m) => !m.time).map((m) => m.id);
  const first = Math.min(7, ...timed.map((t) => Math.floor(t.s / 60)));
  const last = Math.max(20, ...timed.map((t) => Math.min(23, Math.ceil(Math.min(t.e, 24 * 60) / 60))));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  // regroupement des missions qui se chevauchent
  const groups: typeof timed[] = [];
  for (const t of timed) { const g = groups[groups.length - 1]; if (g && t.s < Math.max(...g.map((x) => x.e))) g.push(t); else groups.push([t]); }
  const blocks: Block[] = [];
  for (const g of groups) {
    const ends: number[] = [];
    const placed = g.map((t) => { let c = ends.findIndex((e) => e <= t.s); if (c < 0) { c = ends.length; ends.push(t.e); } else ends[c] = t.e; return { t, c }; });
    for (const { t, c } of placed) blocks.push({ id: t.id, top: Math.round(((t.s - first * 60) / 60) * ROW), height: Math.max(Math.round(((t.e - t.s) / 60) * ROW), 56), col: c, cols: ends.length, start: hhmm(t.s), end: hhmm(t.e) });
  }
  return { hours, first, blocks, loose, height: hours.length * ROW };
}

export const initials = (name: string) => (name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?");

/** Étapes regroupées en trois familles d'affichage. */
export type Tone = "todo" | "doing" | "done" | "checked" | "cancelled";
export const toneOf = (stage: string): Tone =>
  ["validee", "facturable", "facturee"].includes(stage) ? "checked" : ["terminee", "a_verifier"].includes(stage) ? "done" : ["en_route", "arrivee", "en_cours"].includes(stage) ? "doing" : stage === "annulee" ? "cancelled" : "todo";

const D = {
  fr: {
    today: "Aujourd'hui", report: "Rapport", profile: "Profil", hello: "Bonjour", noMission: "Aucune mission ce jour.", noTime: "Sans horaire", prevDay: "Jour précédent", nextDay: "Jour suivant", backToday: "Revenir à aujourd'hui",
    reports: "Rapports", sitesChecked: "Sites contrôlés", validationRate: "Taux de validation", cancelled: "Missions annulées", progress: "Progression", validatedOn: (a: number, b: number) => `${a} validée(s) sur ${b}`,
    history: "Historique récent", seeAll: "Tout voir", noHistory: "Aucune mission trouvée.", historyAll: "Historique des missions",
    missionsDone: "Missions terminées", preferences: "Préférences", appearance: "Apparence", appearanceSub: "Thème de l'application", light: "Clair", dark: "Sombre", system: "Système", language: "Langue", languageSub: "Langue de l'application",
    permissions: "Autorisations", camera: "Caméra", location: "Localisation", granted: "Autorisé", denied: "Refusé", ask: "À autoriser", unknown: "Inconnu",
    cameraOk: "Autorisée — photos avant/après possibles", cameraNo: "Refusée — vous ne pourrez pas ajouter de photos", cameraAsk: "À autoriser pour prendre des photos",
    locOk: "Autorisée — arrivée vérifiée sur place", locNo: "Refusée — arrivée non vérifiée", locAsk: "À autoriser pour valider votre arrivée",
    securityHelp: "Sécurité & aide", personalLink: "Mon lien personnel", personalLinkSub: "Votre accès, sans mot de passe", help: "Aide", helpSub: "Problème de lien ou de mission", privacy: "Politique de confidentialité", privacySub: "Quelles données sont traitées, et pourquoi", deleteData: "Supprimer mes données", deleteSub: "Demander l'effacement de mes données personnelles",
    back: "Retour", mission: "Mission", access: "Accès", instructions: "Consignes", checklist: "Check-list", photoBefore: "Photo avant", photoAfter: "Photo après", photosSent: (n: number) => `${n} photo(s) envoyée(s)`, reportIssue: "Signaler un problème", whatHappened: "Que s'est-il passé ?", minor: "Peu grave", normal: "À traiter", urgent: "Urgent", sendManager: "Envoyer à mon responsable", issuePhoto: "Photo du problème", issuesOpen: (n: number) => `${n} problème(s) signalé(s)`,
    freeTime: "heure libre", contact: "Contact sur place", finishedWait: "Terminée — en attente de validation", checked: "Mission contrôlée ✓", arrival: "Arrivée à", verified: "position vérifiée", notVerified: "position non vérifiée", departure: "départ à",
    stage: { planifiee: "Planifiée", affectee: "Planifiée", en_route: "En route", arrivee: "Sur place", en_cours: "En cours", terminee: "Terminée", a_verifier: "À vérifier", validee: "Validée", facturable: "Validée", facturee: "Validée", annulee: "Annulée", brouillon: "Brouillon" } as Record<string, string>,
    next: { en_route: "Je pars", arrivee: "Je suis arrivé(e)", en_cours: "Je commence", terminee: "J'ai terminé" } as Record<string, string>,
    invalid: "Accès impossible", invalidText: "Ce lien n'est pas valide. Demandez un nouveau lien à votre responsable.", linkNote: "Ce lien est personnel : ne le partagez pas. En cas de perte, votre responsable en génère un nouveau.",
    contactManager: "Contacter mon responsable", call: "Appeler", write: "Écrire", openSettings: "Pour changer cette autorisation : réglages du téléphone, puis le navigateur (Safari ou Chrome).", tapToAsk: "Touchez pour autoriser",
    deleteExplain: "Votre demande est transmise à votre responsable, qui efface vos données personnelles (nom, coordonnées, photos, positions) dans le respect des obligations légales de conservation. Vos missions passées restent enregistrées sans données personnelles.", deleteConfirm: "Je demande l'effacement de mes données", deleteDone: "Demande envoyée le", deleteSent: "Demande envoyée à votre responsable.",
    privacyTitle: "Données traitées", noPasswordTitle: "Pas de mot de passe", noPasswordText: "Votre accès repose sur un lien personnel et privé. Ne le partagez pas ; en cas de perte ou de vol, prévenez votre responsable : il désactive l'ancien lien et vous en envoie un nouveau.",
  },
  en: {
    today: "Today", report: "Report", profile: "Profile", hello: "Hello", noMission: "No mission today.", noTime: "No set time", prevDay: "Previous day", nextDay: "Next day", backToday: "Back to today",
    reports: "Reports", sitesChecked: "Sites checked", validationRate: "Validation rate", cancelled: "Cancelled missions", progress: "Progress", validatedOn: (a: number, b: number) => `${a} validated out of ${b}`,
    history: "Recent history", seeAll: "See all", noHistory: "No mission found.", historyAll: "Mission history",
    missionsDone: "Missions completed", preferences: "Preferences", appearance: "Appearance", appearanceSub: "App theme", light: "Light", dark: "Dark", system: "System", language: "Language", languageSub: "App language",
    permissions: "Permissions", camera: "Camera", location: "Location", granted: "Allowed", denied: "Denied", ask: "To allow", unknown: "Unknown",
    cameraOk: "Allowed — before/after photos available", cameraNo: "Denied — you won't be able to add photos", cameraAsk: "Allow to take photos",
    locOk: "Allowed — arrival checked on site", locNo: "Denied — arrival not checked", locAsk: "Allow to confirm your arrival",
    securityHelp: "Security & help", personalLink: "My personal link", personalLinkSub: "Your access, no password", help: "Help", helpSub: "Link or mission problem", privacy: "Privacy policy", privacySub: "What data is processed, and why", deleteData: "Delete my data", deleteSub: "Ask for my personal data to be erased",
    back: "Back", mission: "Mission", access: "Access", instructions: "Instructions", checklist: "Checklist", photoBefore: "Before photo", photoAfter: "After photo", photosSent: (n: number) => `${n} photo(s) sent`, reportIssue: "Report a problem", whatHappened: "What happened?", minor: "Minor", normal: "To handle", urgent: "Urgent", sendManager: "Send to my manager", issuePhoto: "Photo of the problem", issuesOpen: (n: number) => `${n} problem(s) reported`,
    freeTime: "flexible time", contact: "On-site contact", finishedWait: "Completed — awaiting review", checked: "Mission checked ✓", arrival: "Arrived at", verified: "location verified", notVerified: "location not verified", departure: "left at",
    stage: { planifiee: "Planned", affectee: "Planned", en_route: "On my way", arrivee: "On site", en_cours: "In progress", terminee: "Completed", a_verifier: "To review", validee: "Validated", facturable: "Validated", facturee: "Validated", annulee: "Cancelled", brouillon: "Draft" } as Record<string, string>,
    next: { en_route: "I'm leaving", arrivee: "I've arrived", en_cours: "I'm starting", terminee: "I'm done" } as Record<string, string>,
    invalid: "Access denied", invalidText: "This link is not valid. Ask your manager for a new link.", linkNote: "This link is personal: do not share it. If lost, your manager will generate a new one.",
    contactManager: "Contact my manager", call: "Call", write: "Write", openSettings: "To change this permission: phone settings, then the browser (Safari or Chrome).", tapToAsk: "Tap to allow",
    deleteExplain: "Your request is sent to your manager, who erases your personal data (name, contact details, photos, positions) in line with legal retention duties. Past missions remain recorded without personal data.", deleteConfirm: "I ask for my data to be erased", deleteDone: "Request sent on", deleteSent: "Request sent to your manager.",
    privacyTitle: "Data processed", noPasswordTitle: "No password", noPasswordText: "Your access relies on a personal, private link. Do not share it; if it is lost or stolen, tell your manager: they disable the old link and send you a new one.",
  }
} as const;
export type Dict = (typeof D)["fr"];
export const dict = (lang: Lang): Dict => D[lang] as unknown as Dict;

export const dayLabel = (d: string, lang: Lang) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(/^./, (c) => c.toUpperCase());
export const shortDate = (d: string, lang: Lang) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
