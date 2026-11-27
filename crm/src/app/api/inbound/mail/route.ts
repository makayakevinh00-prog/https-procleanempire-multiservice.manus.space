import { verifyInbound } from "@/lib/inbound-auth";
import { createAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, " ").trim().slice(0, max) : "");

/**
 * Enregistre un mail REÇU d'un client dans son historique (POST JSON), pour que l'accueil affiche « X vous a envoyé un mail ».
 * Appelé par l'automatisation qui lit la boîte Outlook (aucun mail n'est lu ni envoyé d'ici).
 * Authentification : signature HMAC (x-timestamp + x-signature) ou x-inbound-secret, comme /api/inbound/quote-request.
 * Corps : { from_email, subject, body, received_at?, external_id? } — `external_id` (id du message Outlook) rend l'appel rejouable sans doublon.
 * Un expéditeur inconnu n'est pas enregistré (réponse matched:false) : aucun client n'est créé à partir d'un mail.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const auth = verifyInbound(req.headers, raw, process.env.INBOUND_SECRET);
  if (!auth.ok) return Response.json({ error: auth.reason }, { status: 401 });
  if (raw.length > 120_000) return Response.json({ error: "Mail trop volumineux" }, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }

  const from = clean(b.from_email, 200).toLowerCase();
  const body = clean(b.body, 20_000);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from) || !body) return Response.json({ error: "from_email et body requis" }, { status: 400 });
  const receivedAt = clean(b.received_at, 40);
  const occurred = receivedAt && !Number.isNaN(Date.parse(receivedAt)) ? new Date(receivedAt).toISOString() : new Date().toISOString();

  const db = createAdmin();
  const { data: clients, error } = await db.from("clients").select("id").ilike("email", from.replace(/[\\%_]/g, "\\$&")).limit(2);
  if (error) return Response.json({ error: "Recherche du client impossible" }, { status: 500 });
  if (!clients?.length) return Response.json({ stored: false, matched: false });
  if (clients.length > 1) return Response.json({ stored: false, matched: false, reason: "plusieurs clients avec cette adresse" }, { status: 409 });

  const row = { client_id: clients[0].id, direction: "recu", kind: "mail", subject: clean(b.subject, 300) || null, body, from_email: from, occurred_at: occurred, external_id: clean(b.external_id, 300) || null };
  const { error: ie } = row.external_id
    ? await db.from("client_mails").upsert(row, { onConflict: "external_id", ignoreDuplicates: true })
    : await db.from("client_mails").insert(row);
  if (ie) return Response.json({ error: "Enregistrement impossible" }, { status: 500 });
  return Response.json({ stored: true, matched: true });
}
