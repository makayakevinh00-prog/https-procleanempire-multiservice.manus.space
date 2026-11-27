import { automationClient, automationSecret } from "@/lib/automation/deps";
import { verifyInbound } from "@/lib/inbound-auth";

export const dynamic = "force-dynamic";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, " ").trim().slice(0, max) : "");

/**
 * Réception d'un mail envoyé par un client (POST JSON : { from, subject, text, receivedAt?, messageId? }).
 * Appelé par la redirection de la boîte de contact (fournisseur d'e-mail entrant ou scénario d'automatisation).
 * Authentification : signature HMAC (x-timestamp + x-signature) ou x-inbound-secret, comme /api/inbound/quote-request.
 * Le mail est rattaché à la fiche client dont l'e-mail correspond ; aucune réponse n'est envoyée automatiquement.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const auth = verifyInbound(req.headers, raw, process.env.INBOUND_SECRET);
  if (!auth.ok) return Response.json({ error: auth.reason }, { status: 401 });
  if (raw.length > 200_000) return Response.json({ error: "Mail trop volumineux" }, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }
  const from = s(b.from, 200).replace(/^.*<([^>]+)>.*$/, "$1");
  const body = s(b.text, 20_000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from) || !body) return Response.json({ error: "Expéditeur valide et texte requis" }, { status: 400 });
  const { data, error } = await automationClient().rpc("automation_log_inbound_email", {
    p_secret: automationSecret(),
    p: { from_email: from, subject: s(b.subject, 300), body, received_at: s(b.receivedAt, 40) || null, external_id: s(b.messageId, 300) || null }
  });
  if (error) return Response.json({ error: "Enregistrement impossible" }, { status: 500 });
  return Response.json(data);
}
