import "server-only";
import webpush from "web-push";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { mailConfigured, sendMail } from "@/lib/mail";
import { getVapid } from "@/lib/marketplace/vapid";

type Target = { id: string; name: string; email: string; notify_email: boolean; km: number | null; push: { endpoint: string; p256dh: string; auth: string }[] };
type Sub = { endpoint: string; p256dh: string; auth: string };
type Reminder = { kind: "veille" | "heure"; title: string; date: string; city: string | null; window_start: string; window_end: string; name: string; email: string; push: Sub[] };
type Batch = { job: { id: string; title: string; date: string; city: string | null; amount: number }; targets: Target[] };

const site = () => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}`;
const eur = (n: number) => `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

/**
 * Distribution : annonce les nouveaux ménages aux nettoyeurs EN LIGNE, par vagues (les mieux placés d'abord).
 * Notification sur le téléphone (push) ; à défaut, e-mail. Au plus un passage toutes les 20 s (sauf `force`).
 */
export async function dispatchTick(o: { force?: boolean } = {}) {
  const a = automationClient(), secret = automationSecret();
  if (!o.force) {
    const { data } = await a.rpc("automation_claim_tick", { p_secret: secret, p_seconds: 20 });
    if (data !== true) return { skipped: true as const };
  }
  const out = { jobs: 0, pushed: 0, mailed: 0, reminders: 0, released: 0 };
  // 1. Nettoyeurs absents : le ménage repart en ligne (avant la distribution, pour qu'il soit reproposé dans ce même passage).
  const gone = ((await a.rpc("automation_release_noshows", { p_secret: secret })).data ?? []) as { title: string; date: string; city: string | null; name: string; email: string }[];
  out.released = gone.length;
  for (const g of gone) {
    if (!mailConfigured()) break;
    await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: `Nettoyeur absent — ${g.title}`, text: `${g.name} n'a pas pointé à l'heure pour : ${g.title}${g.city ? ` (${g.city})` : ""}.\n\nLe ménage est remis en ligne et proposé aux autres nettoyeurs de la zone.\nÀ suivre : CRM › Nettoyeurs › Carte en direct.` }).catch(() => undefined);
    await sendMail({ to: g.email, subject: "Ménage retiré — vous n'avez pas pointé", text: `Bonjour ${g.name.split(" ")[0]},\n\nVous n'avez pas pointé à l'heure pour « ${g.title} ». Le ménage a été proposé à un autre nettoyeur.\n\nUn empêchement ? Désistez-vous au moins 24 h avant dans l'application.\n\nProClean Empire` }).catch(() => undefined);
  }
  const r = await a.rpc("automation_pending_notifications", { p_secret: secret });
  const batches = (r.data ?? []) as Batch[];
  const rem = ((await a.rpc("automation_cleaning_reminders", { p_secret: secret })).data ?? []) as Reminder[];
  out.jobs = batches.length;
  const vapid = batches.length || rem.length ? await getVapid() : null;
  if (vapid) webpush.setVapidDetails(site(), vapid.public, vapid.private);
  /** Notification sur le téléphone ; à défaut, e-mail. */
  const reach = async (t: { name: string; email: string; push: Sub[] }, title: string, body: string, tag: string, mail: { subject: string; text: string } | null) => {
    let delivered = 0;
    if (vapid) for (const s of t.push) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url: "/nettoyeur", tag }), { TTL: 600, urgency: "high" }); delivered++; }
      catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await a.rpc("automation_drop_push", { p_secret: secret, p_endpoint: s.endpoint }); }
    }
    out.pushed += delivered;
    if (!delivered && mail && mailConfigured()) { const m = await sendMail({ to: t.email, ...mail }).catch(() => ({ sent: false as const })); if (m.sent) out.mailed++; }
  };
  const dayFr = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  // 2. Nouveaux ménages, par vagues.
  for (const b of batches) for (const t of b.targets) {
    const body = `${b.job.city ?? "Ménage"}${t.km != null ? ` · à ${String(t.km).replace(".", ",")} km` : ""} · ${eur(b.job.amount)} pour vous`;
    await reach(t, "Nouveau ménage près de vous", body, b.job.id, t.notify_email ? { subject: `Nouveau ménage près de vous — ${eur(b.job.amount)}`, text: `Bonjour ${t.name.split(" ")[0]},\n\nUn ménage vient d'apparaître près de chez vous :\n${body}\n${dayFr(b.job.date)}\n\nOuvrez l'application pour l'accepter : ${site()}/nettoyeur\nLe premier qui accepte l'obtient.\n\nProClean Empire` } : null);
  }
  // 3. Rappels : la veille, et une heure avant.
  for (const m of rem) {
    const hours = `${m.window_start.slice(0, 5).replace(":", "h")} – ${m.window_end.slice(0, 5).replace(":", "h")}`;
    const title = m.kind === "veille" ? "Rappel : ménage demain" : "Votre ménage commence bientôt";
    const body = `${m.title}${m.city ? ` · ${m.city}` : ""} · ${hours}`;
    await reach(m, title, body, `rappel-${m.kind}`, { subject: `${title} — ${m.title}`, text: `Bonjour ${m.name.split(" ")[0]},\n\n${m.kind === "veille" ? "Vous avez un ménage demain" : "Votre ménage commence dans moins d'une heure"} :\n${body}\n${dayFr(m.date)}\n\nEn arrivant, appuyez sur « Je suis sur place » dans l'application : ${site()}/nettoyeur\nSans pointage à l'heure, le ménage est proposé à un autre nettoyeur.\n\nProClean Empire` });
    out.reminders++;
  }
  return out;
}
