import type { AfterReport, BeforeReport } from "@/lib/ai-inspect";

/** Messages envoyés à la direction et au propriétaire (ou à la conciergerie) pendant un ménage. Fonctions pures : aucun envoi ici. */
export type JobBrief = {
  title: string; date: string; city: string | null; status: string; arrived_at: string | null; duration_hours: number | null; est_minutes: number | null; rework_minutes: number | null;
  listing: string | null; has_listing: boolean; memory: unknown; before_report: BeforeReport | null; ai_report: AfterReport | { summary?: string } | null; started_notified: boolean;
  cleaner: string | null; client: string | null; emails: string[];
  rooms?: string[]; guide?: { summary?: string; rooms?: { room: string; steps: string[] }[]; attention?: string[] } | null;
};
export type Notice = { subject: string; text: string };

const SIGN = "L'équipe ProClean Empire";
const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");
const dur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`);
const place = (b: JobBrief) => b.listing ?? b.title;

/** Heure de fin estimée : arrivée + durée estimée par l'analyse (à défaut, durée prévue). */
export function estimatedEnd(b: Pick<JobBrief, "arrived_at" | "est_minutes" | "duration_hours">): { minutes: number; at: Date } | null {
  const minutes = b.est_minutes ?? (b.duration_hours ? Math.round(Number(b.duration_hours) * 60) : null);
  if (!b.arrived_at || !minutes) return null;
  return { minutes, at: new Date(new Date(b.arrived_at).getTime() + minutes * 60000) };
}

/** « Ménage commencé » : état du logement à l'arrivée et heure de fin estimée, pour savoir quand passer vérifier. */
export function startNotice(b: JobBrief, captures: number): Notice {
  const who = b.cleaner ?? "Le nettoyeur", r = b.before_report, end = estimatedEnd(b);
  const lines = [
    `${who} est sur place${b.arrived_at ? ` depuis ${hm(new Date(b.arrived_at))}` : ""} : ${place(b)}${b.city ? ` (${b.city})` : ""}.`,
    "",
    r ? `État du logement à l'arrivée : niveau de saleté ${r.level ?? "non évalué"} sur 5.${r.state ? ` ${r.state}` : ""}` : "",
    r?.tidy ? `Rangement : ${r.tidy}` : "",
    r?.items.length ? `\nÀ nettoyer en priorité :\n${r.items.slice(0, 8).map((i) => `- ${i.zone}${i.todo ? ` : ${i.todo}` : ""}`).join("\n")}` : "",
    "",
    end ? `Durée estimée : ${dur(end.minutes)}. Fin prévue vers ${hm(end.at)} : vous pouvez prévoir de passer vérifier à ce moment-là.` : "L'heure de fin n'a pas pu être estimée.",
    captures ? `\n${captures} capture${captures > 1 ? "s" : ""} de l'arrivée ${captures > 1 ? "sont jointes" : "est jointe"} à ce message.` : "",
    "", "Vous serez prévenu à la fin du ménage, et si un point doit être repris.", "", SIGN
  ];
  return { subject: `Ménage commencé — ${place(b)}`, text: lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n") };
}

/** Fin du ménage : reprise demandée (points, temps de reprise) ou terminé (à vérifier). `direction` ajoute le détail réservé à ProClean. */
export function outcomeNotice(b: JobBrief, o: { status: "validee" | "a_reprendre" | "a_verifier"; summary: string }, captures: number, direction?: string, now = new Date()): Notice {
  const who = b.cleaner ?? "Le nettoyeur", r = b.ai_report as AfterReport | null;
  const cap = captures ? `\n${captures} capture${captures > 1 ? "s" : ""} de fin de ménage ${captures > 1 ? "sont jointes" : "est jointe"} à ce message.` : "";
  if (o.status === "a_reprendre") {
    const pts = r?.remaining?.length ? `\nPoints à reprendre :\n${r.remaining.map((p) => `- ${p.zone}${p.why ? ` : ${p.why}` : ""}`).join("\n")}` : "";
    const rw = r?.rework_minutes ?? b.rework_minutes;
    return { subject: `Ménage à reprendre — ${place(b)}`, text: [
      `Le contrôle de fin de ménage a relevé des points à reprendre : ${place(b)}${b.city ? ` (${b.city})` : ""}.`, o.summary, pts, "",
      `${who} est prévenu et reprend ces points avant de partir.${rw ? ` Temps de reprise estimé : ${dur(rw)}, soit une fin vers ${hm(new Date(now.getTime() + rw * 60000))}.` : ""}`,
      "Vous recevrez un nouveau message dès que c'est terminé.", cap, direction ? `\n${direction}` : "", "", SIGN].filter((l) => l !== "").join("\n") };
  }
  const done = o.status === "validee" ? "Le ménage est terminé et le contrôle ne relève rien." : "Le ménage est terminé. Le contrôle final est en cours chez ProClean.";
  return { subject: `Ménage terminé — ${place(b)}`, text: [
    `${done} ${place(b)}${b.city ? ` (${b.city})` : ""}.`, o.summary, "",
    `${who} a terminé à ${hm(now)}. Vous pouvez passer vérifier le logement.`, cap, direction ? `\n${direction}` : "", "", SIGN].filter((l) => l !== "").join("\n") };
}
