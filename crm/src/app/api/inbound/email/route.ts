import { automationClient, automationSecret } from "@/lib/automation/deps";
import { verifyInbound } from "@/lib/inbound-auth";

export const dynamic = "force-dynamic";

const s = (v: unknown, max = 300) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, " ").trim().slice(0, max) : "");

/**
 * Réception d'e-mails clients (POST JSON : un message ou { messages: [...] }).
 * Chaque message : message_id (unique), from_email, from_name, subject, body, received_at.
 * Authentification : signature HMAC (x-timestamp + x-signature) ou x-inbound-secret, comme les demandes de devis.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const auth = verifyInbound(req.headers, raw, process.env.INBOUND_SECRET);
  if (!auth.ok) return Response.json({ error: auth.reason }, { status: 401 });
  if (raw.length > 400_000) return Response.json({ error: "Trop volumineux" }, { status: 413 });
  let b: any;
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }
  const list: any[] = Array.isArray(b?.messages) ? b.messages.slice(0, 50) : [b];
  const out: unknown[] = [];
  for (const m of list) {
    const r = await automationClient().rpc("automation_inbound_email", {
      p_secret: automationSecret(),
      p: { message_id: s(m?.message_id), from_email: s(m?.from_email, 200), from_name: s(m?.from_name, 160), subject: s(m?.subject), body: s(m?.body, 20000), received_at: s(m?.received_at, 40) || null }
    });
    out.push(r.error ? { error: "Enregistrement impossible" } : r.data);
  }
  return Response.json({ ok: true, results: out });
}
