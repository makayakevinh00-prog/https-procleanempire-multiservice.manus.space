import { automationClient, automationSecret } from "@/lib/automation/deps";
import { verifyInbound } from "@/lib/inbound-auth";
import { requestType } from "@/lib/request-type";
import { sendMail } from "@/lib/mail";
import { REQUEST_TYPE_LABEL } from "@/lib/request-type";

export const dynamic = "force-dynamic";

const s = (v: unknown, max = 500) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max) : "");

/**
 * Réception d'une demande de devis envoyée par le site (POST JSON).
 * Authentification : signature HMAC (x-timestamp + x-signature) ou, à défaut, x-inbound-secret.
 * Réponse : numéro de demande, jeton de suivi et lien de suivi à communiquer au client.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const auth = verifyInbound(req.headers, raw, process.env.INBOUND_SECRET);
  if (!auth.ok) return Response.json({ error: auth.reason }, { status: 401 });
  if (raw.length > 30_000) return Response.json({ error: "Demande trop volumineuse" }, { status: 413 });
  let b: Record<string, any>;
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }
  if (!s(b.name) || (!s(b.email) && !s(b.phone))) return Response.json({ error: "Nom et e-mail ou téléphone requis" }, { status: 400 });

  const details: Record<string, string> = {};
  if (Array.isArray(b.details)) for (const d of b.details.slice(0, 20)) if (Array.isArray(d) && d.length === 2) details[s(d[0], 80)] = s(d[1], 300);

  const { data, error } = await automationClient().rpc("submit_quote_request_v2", {
    p_secret: automationSecret(),
    p: {
      reference: s(b.reference ?? b.id, 60) || null, received_at: s(b.receivedAt, 40) || null, name: s(b.name, 120), company: s(b.company, 120),
      email: s(b.email, 200), phone: s(b.phone, 40), address: s(b.address, 250), postcode: s(b.postcode, 10), city: s(b.city, 120),
      service: s(b.service, 120), start_date: s(b.startDate, 40), message: s(b.comments ?? b.message, 2000), details, source: s(b.source, 120),
      type: requestType(b.type, b.service)
    }
  });
  if (error) return Response.json({ error: "Enregistrement impossible" }, { status: 500 });
  const r = data as { id: string; request_number: string; tracking_token: string; status: string; duplicate: boolean; client_id: string | null; new_prospect: boolean;
    reserved: boolean; request_type: keyof typeof REQUEST_TYPE_LABEL; notify_to: string | null; company_name: string };
  const origin = new URL(req.url).origin;

  // Notification à l'administrateur : une seule fois par demande, jamais bloquante pour le site.
  let notified = false;
  if (!r.duplicate && r.notify_to) {
    try {
      const who = s(b.company, 120) ? `${s(b.company, 120)} — ${s(b.name, 120)}` : s(b.name, 120);
      const lines = [`Une demande vient d'arriver depuis le site (${r.request_number}).`, "", `Type : ${REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}`, `De : ${who}`];
      if (s(b.email)) lines.push(`E-mail : ${s(b.email)}`);
      if (s(b.phone)) lines.push(`Téléphone : ${s(b.phone)}`);
      if (s(b.service)) lines.push(`Prestation : ${s(b.service)}`);
      if (s(b.comments ?? b.message, 800)) lines.push(`Message : ${s(b.comments ?? b.message, 800)}`);
      lines.push("", r.reserved ? "⚠ Contact réservé : aucune action automatique n'a été faite." : r.new_prospect ? "Une fiche prospect a été créée automatiquement." : "Ce contact existait déjà : l'échange a été ajouté à son historique.", `À traiter : ${origin}/demandes`);
      const res = await sendMail({
        to: r.notify_to, subject: `Nouvelle demande ${REQUEST_TYPE_LABEL[r.request_type] ?? "de devis"} — ${who}${r.reserved ? " (contact réservé)" : ""}`,
        text: lines.join("\n")
      });
      notified = res.sent;
      await automationClient().rpc("automation_log_email", { p_secret: automationSecret(), p_kind: "recapitulatif", p_to: r.notify_to, p_subject: "Nouvelle demande du site " + r.request_number, p_ok: res.sent, p_error: res.sent ? null : res.reason, p_entity: "quote_request", p_entity_id: r.id });
    } catch { /* la notification ne doit jamais faire échouer la réception */ }
  }
  // Accusé de réception automatique au client, dans les secondes qui suivent (jamais pour un contact réservé,
  // jamais deux fois pour la même demande). Le devis, lui, reste validé par un humain avant envoi.
  const tracking = `${origin}/suivi/${r.request_number}?t=${r.tracking_token}`;
  let acknowledged = false;
  if (!r.duplicate && !r.reserved && s(b.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s(b.email))) {
    try {
      const first = s(b.name, 120).split(/\s+/)[0];
      const text = [
        `Bonjour ${first},`, "",
        `Merci pour votre demande${s(b.service) ? ` (${s(b.service)})` : ""} : nous l'avons bien reçue sous la référence ${r.request_number}.`,
        "Nous étudions votre besoin et vous envoyons un devis détaillé sous 24 h (7j/7, 8h–18h). Pour une urgence, appelez-nous.", "",
        `Suivre l'avancement de votre demande : ${tracking}`, "",
        "À très vite,", "L'équipe ProClean Empire", "06 17 21 22 30 · contact@procleanempire.com"
      ].join("\n");
      const res = await sendMail({ to: s(b.email), subject: `Votre demande ${r.request_number} est bien reçue — ProClean Empire`, text });
      acknowledged = res.sent;
      await automationClient().rpc("automation_log_email", { p_secret: automationSecret(), p_kind: "accuse_reception", p_to: s(b.email), p_subject: "Accusé de réception " + r.request_number, p_ok: res.sent, p_error: res.sent ? null : res.reason, p_entity: "quote_request", p_entity_id: r.id });
    } catch { /* l'accusé ne doit jamais faire échouer la réception */ }
  }
  return Response.json({
    ok: true, id: r.id, acknowledged, duplicate: r.duplicate, request_number: r.request_number, status: r.status, request_type: r.request_type,
    prospect_created: r.new_prospect, notified,
    tracking_token: r.tracking_token, tracking_url: tracking
  }, { status: r.duplicate ? 200 : 201 });
}
