import "server-only";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { mailConfigured, sendMail } from "@/lib/mail";
import { dispatchTick } from "@/lib/marketplace/notify";
import { geocode } from "@/lib/zone";
import { ttc } from "@/lib/cleaner-ui";

type Pending = { id: string; address: string; postal_code: string; city: string };
type Accepted = { accepted: boolean; reason?: string; name: string; email: string; label: string; date: string; address: string; postal_code: string; city: string; price_ht: number; window_start: string; window_end: string; track_token: string };

export const siteUrl = () => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}`;
export const trackUrl = (token?: string | null) => (token && /^[0-9a-f]{64}$/.test(token) ? `${siteUrl()}/suivi/menage/${token}` : null);
const hm = (t: string) => String(t).slice(0, 5).replace(":", " h ").replace(" h 00", " h");
const eur = (n: number) => `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Acceptation automatique des réservations simples (réglage « auto_accept_bookings », coupé par défaut).
 * La base décide ce qui est simple ; ici on localise l'adresse, on accepte, on prévient les nettoyeurs et on confirme au client.
 * Tout ce qui n'est pas accepté reste « en attente » pour le patron : rien n'est perdu.
 */
export async function autoAcceptBookings(): Promise<{ accepted: number }> {
  const sb = automationClient(), secret = automationSecret();
  const { data, error } = await sb.rpc("automation_bookings_to_accept", { p_secret: secret });
  if (error) throw new Error(error.message);
  let accepted = 0;
  for (const b of (data ?? []) as Pending[]) {
    const pt = await geocode({ address: b.address, postal_code: b.postal_code, city: b.city }).catch(() => null);
    const r = await sb.rpc("automation_accept_booking", { p_secret: secret, p_id: b.id, p_lat: pt?.lat ?? null, p_lng: pt?.lng ?? null });
    if (r.error) throw new Error(r.error.message);
    const a = r.data as Accepted;
    if (!a?.accepted) continue;
    accepted++;
    if (mailConfigured()) {
      const day = new Date(a.date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
      const link = trackUrl(a.track_token);
      await sendMail({ to: a.email, subject: "Votre ménage est confirmé — ProClean Empire", text: `Bonjour ${String(a.name).split(" ")[0]},\n\nVotre ménage (${a.label}) est confirmé le ${day}, entre ${hm(a.window_start)} et ${hm(a.window_end)}, à ${a.address}, ${a.postal_code} ${a.city}.\n\nUn nettoyeur va être désigné : vous verrez son prénom et son arrivée sur votre page de suivi.${link ? `\n${link}` : ""}\n\nPrix : ${eur(ttc(a.price_ht))} TTC, à régler sur facture après le ménage.\n\nÀ bientôt,\nProClean Empire` }).catch(() => undefined);
      await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: "Réservation acceptée automatiquement", text: `${a.name} (${a.email}) — ménage ${a.label} le ${a.date} à ${a.city}, ${eur(a.price_ht)} HT.\nAcceptée automatiquement et proposée aux nettoyeurs de la zone.\nPour reprendre la main : CRM › Nettoyeurs › Réglages.` }).catch(() => undefined);
    }
  }
  if (accepted) await dispatchTick({ force: true }).catch(() => undefined);
  return { accepted };
}
