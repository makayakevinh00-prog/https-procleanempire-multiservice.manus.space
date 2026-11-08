/**
 * Serveur MCP minimal (JSON-RPC 2.0 sur HTTP) pour les agents Claude Cowork.
 * Fonctions pures : l'accès aux données passe par `call(op, args)`, qui appelle agent_api() dans la base (lien secret vérifié là-bas).
 */
export type CallFn = (op: string, args: Record<string, unknown>, meta?: { agent?: string }) => Promise<unknown>;
type Json = Record<string, any>;

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const SERVER_INFO = { name: "proclean-crm", version: "1.0.0" };

const str = (description: string, extra: Json = {}) => ({ type: "string", description, ...extra });
const AGENT_PROP = { type: "string", description: "Votre clé d'agent, toujours à renseigner : core, finance, commercial, operations, relation, marketing, studio, rh ou juridique. Elle sert à vous afficher au travail dans l'Open space de Kevinh." };
export const TOOLS: { name: string; description: string; op: string; inputSchema: Json }[] = [
  { name: "crm_apercu", op: "overview", description: "Vue d'ensemble du jour : factures ouvertes et en retard, paiements à rapprocher, missions des 7 jours, missions sans intervenant, demandes du site, propositions en attente.", inputSchema: { type: "object", properties: {} } },
  { name: "factures_ouvertes", op: "open_invoices", description: "Factures envoyées ou en retard (50 max), triées par échéance : numéro, client, reste dû, jours de retard, nombre de relances. Les contacts réservés sont exclus.", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "paiements_non_rapproches", op: "unmatched_payments", description: "Virements Qonto reçus qui ne sont pas encore rapprochés d'une facture (date, montant, payeur, libellé, référence).", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "missions_a_venir", op: "upcoming_missions", description: "Missions planifiées dans les prochains jours (1 à 30) : date, heure, client, site, intervenant, étape.", inputSchema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 30 }, limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "demandes_du_site", op: "quote_requests", description: "Nouvelles demandes de devis reçues par le site (nom, société, ville, prestation, message). Aucune coordonnée n'est donnée.", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "chercher_client", op: "find_client", description: "Retrouve un client par son nom (10 résultats max) : identifiant, statut, factures ouvertes, reste dû, et s'il possède une adresse e-mail (sans la révéler).", inputSchema: { type: "object", properties: { name: str("Nom ou début de nom (2 caractères minimum)") }, required: ["name"] } },
  { name: "creer_tache", op: "create_task", description: "Ajoute une tâche dans la liste de Kevinh (aucun effet extérieur). Utilisez dedupe_key pour ne pas créer deux fois la même tâche.", inputSchema: { type: "object", properties: { title: str("Titre court (3 à 200 caractères)"), detail: str("Détail (2000 caractères max)"), priority: { type: "string", enum: ["basse", "normale", "haute"] }, dedupe_key: str("Clé stable de la tâche, ex. relance:F2610-000057") }, required: ["title"] } },
  { name: "proposer_email_client", op: "propose_action", description: "Rédige un e-mail à un client et le PROPOSE à Kevinh : rien ne part avant sa validation, et l'e-mail est envoyé aux adresses de la fiche client (vous ne donnez jamais d'adresse). Ton professionnel, en français, vouvoiement, signé « ProClean Empire ». Impossible pour un contact réservé.", inputSchema: { type: "object", properties: { client_id: str("Identifiant du client (voir chercher_client)"), subject: str("Objet (3 à 200 caractères)"), body: str("Corps du message en texte brut (10 à 5000 caractères)"), title: str("Titre affiché dans la liste à valider, ex. « Relance courtoise F2610-000057 »"), summary: str("Pourquoi cet e-mail (1000 caractères max)"), dedupe_key: str("Clé stable, ex. relance:F2610-000057:1") }, required: ["client_id", "subject", "body", "title", "dedupe_key"] } }
];

const ok = (id: unknown, result: Json) => ({ jsonrpc: "2.0", id, result });
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const clean = (m: string) => { const x = /^([A-Z_]{4,}):\s*(.*)$/s.exec(m.trim()); return x ? `${x[1]} : ${x[2]}` : "Erreur interne : réessayez ou prévenez Kevinh."; };

export async function handleMcp(body: unknown, call: CallFn): Promise<{ status: number; json?: Json }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, json: err(null, -32600, "Requête JSON-RPC invalide (un objet est attendu).") };
  const { id, method, params } = body as Json;
  if (typeof method !== "string") return { status: 400, json: err(id, -32600, "Méthode absente.") };
  if (id === undefined && method.startsWith("notifications/")) return { status: 202 };   // notification : pas de réponse
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return { status: 200, json: ok(id, { protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[1], capabilities: { tools: {} }, serverInfo: SERVER_INFO,
        instructions: "Connecteur ProClean Empire. Vous lisez des données limitées et vous PROPOSEZ : tâches et e-mails. Rien n'est envoyé ni modifié sans la validation de Kevinh. Les contacts réservés sont exclus." }) };
    }
    case "ping": return { status: 200, json: ok(id, {}) };
    case "tools/list": return { status: 200, json: ok(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema: { ...inputSchema, properties: { ...(inputSchema.properties ?? {}), agent: AGENT_PROP } } })) }) };
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return { status: 200, json: err(id, -32602, `Outil inconnu : ${String(params?.name)}`) };
      const raw: Json = params?.arguments && typeof params.arguments === "object" ? params.arguments : {};
      const { agent, ...args } = raw;                                  // l'agent annoncé ne sert qu'à la présence : il n'est pas transmis à l'API des données
      const who = typeof agent === "string" && /^[a-z]{2,12}$/.test(agent) ? agent : undefined;
      if (JSON.stringify(args).length > 20_000) return { status: 200, json: err(id, -32602, "Arguments trop volumineux.") };
      try {
        const payload = tool.name === "proposer_email_client"
          ? { kind: "send_email", title: args.title, summary: args.summary, dedupe_key: args.dedupe_key, payload: { client_id: args.client_id, subject: args.subject, body: args.body } }
          : args;
        const data = await call(tool.op, payload, { agent: who });
        return { status: 200, json: ok(id, { content: [{ type: "text", text: JSON.stringify(data, null, 1) }] }) };
      } catch (e) {
        return { status: 200, json: ok(id, { isError: true, content: [{ type: "text", text: clean((e as Error).message) }] }) };
      }
    }
    default: return { status: 200, json: err(id, -32601, `Méthode non prise en charge : ${method}`) };
  }
}
