import "server-only";
import webpush from "web-push";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { mailConfigured, sendMail } from "@/lib/mail";
import { getVapid } from "@/lib/marketplace/vapid";

type Target = { id: string; name: string; email: string; notify_email: boolean; km: number | null; push: { endpoint: string; p256dh: string; auth: string }[] };
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
  const r = await a.rpc("automation_pending_notifications", { p_secret: secret });
  const batches = (r.data ?? []) as Batch[];
  const vapid = batches.length ? await getVapid() : null;
  const canPush = Boolean(vapid);
  if (vapid) webpush.setVapidDetails(site(), vapid.public, vapid.private);
  const out = { jobs: batches.length, pushed: 0, mailed: 0 };
  for (const b of batches) {
    for (const t of b.targets) {
      const body = `${b.job.city ?? "Ménage"}${t.km != null ? ` · à ${String(t.km).replace(".", ",")} km` : ""} · ${eur(b.job.amount)} pour vous`;
      let delivered = 0;
      if (canPush) {
        for (const s of t.push) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Nouveau ménage près de vous", body, url: "/nettoyeur", tag: b.job.id }), { TTL: 600, urgency: "high" });
            delivered++;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await a.rpc("automation_drop_push", { p_secret: secret, p_endpoint: s.endpoint });
          }
        }
      }
      out.pushed += delivered;
      if (!delivered && t.notify_email && mailConfigured()) {
        const day = new Date(b.job.date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
        const m = await sendMail({ to: t.email, subject: `Nouveau ménage près de vous — ${eur(b.job.amount)}`, text: `Bonjour ${t.name.split(" ")[0]},\n\nUn ménage vient d'apparaître près de chez vous :\n${body}\n${day}\n\nOuvrez l'application pour l'accepter : ${site()}/nettoyeur\nLe premier qui accepte l'obtient.\n\nProClean Empire` }).catch(() => ({ sent: false as const }));
        if (m.sent) out.mailed++;
      }
    }
  }
  return out;
}
