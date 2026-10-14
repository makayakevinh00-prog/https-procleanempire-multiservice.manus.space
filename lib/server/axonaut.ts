/**
 * Envoi d'une demande du site vers le CRM Axonaut (côté serveur uniquement).
 * La clé reste dans la variable d'environnement Vercel AXONAUT_API_KEY : jamais dans le navigateur.
 *
 * Variables :
 * - AXONAUT_API_KEY (obligatoire)
 * - AXONAUT_MANAGER_EMAIL (défaut contact@procleanempire.com — e-mail d'un utilisateur Axonaut)
 * - AXONAUT_PIPE_NAME (défaut « Cycle commercial »)
 * - AXONAUT_PIPE_STEP (défaut « Proposition »)
 */
const BASE = process.env.AXONAUT_API_BASE || "https://axonaut.com/api/v2";
const TIMEOUT_MS = 10_000;

export type Lead = {
  service: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  street: string;
  postcode: string;
  city: string;
  /** Détail complet de la demande (service, champs du formulaire, message). */
  detail: string;
};

export type AxonautResult = { companyId: number; companyCreated: boolean; opportunityId: number };

export class AxonautError extends Error {}

async function call<T>(path: string, init: RequestInit, key: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { userApiKey: key, "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (error) {
    throw new AxonautError(`Axonaut ${init.method ?? "GET"} ${path} injoignable : ${String(error)}`);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new AxonautError(`Axonaut ${init.method ?? "GET"} ${path} → ${response.status} ${text.slice(0, 1000)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AxonautError(`Axonaut ${init.method ?? "GET"} ${path} → réponse illisible : ${text.slice(0, 300)}`);
  }
}

type Company = { id: number; name: string };

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Date et heure de Paris, ex. « 15/10/2026 14:32 ». */
export function parisNow() {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date());
}

/**
 * 1. Retrouve la fiche client (même nom d'entreprise, ou même nom de personne pour un particulier)
 *    ou la crée avec le contact (nom, e-mail, téléphone) et l'adresse.
 * 2. Crée l'opportunité dans le pipeline, avec tout le détail de la demande.
 * Lève une AxonautError si la clé manque ou si Axonaut refuse une étape.
 */
export async function pushLeadToAxonaut(lead: Lead): Promise<AxonautResult> {
  const key = process.env.AXONAUT_API_KEY;
  if (!key) throw new AxonautError("AXONAUT_API_KEY absente des variables d'environnement.");

  const managerEmail = process.env.AXONAUT_MANAGER_EMAIL || "contact@procleanempire.com";
  const pipeName = process.env.AXONAUT_PIPE_NAME || "Cycle commercial";
  const pipeStep = process.env.AXONAUT_PIPE_STEP || "Proposition";
  const companyName = (lead.company || lead.name).slice(0, 255);
  const parts = lead.name.trim().split(/\s+/);
  const firstname = parts.length > 1 ? parts[0] : "";
  const lastname = parts.length > 1 ? parts.slice(1).join(" ") : lead.name;
  const stamp = parisNow();

  // Recherche d'une fiche existante (une erreur de recherche ne bloque pas : on crée la fiche).
  let companyId: number | undefined;
  try {
    const found = await call<Company[]>(`/companies?search=${encodeURIComponent(companyName)}`, { method: "GET" }, key);
    if (Array.isArray(found)) {
      companyId = found.find((item) => normalize(item.name ?? "") === normalize(companyName))?.id;
    }
  } catch (error) {
    console.warn("[devis] Recherche Axonaut impossible, création d'une nouvelle fiche :", error);
  }

  let companyCreated = false;
  if (!companyId) {
    const created = await call<Company>(
      "/companies",
      {
        method: "POST",
        body: JSON.stringify({
          name: companyName,
          is_prospect: true,
          isB2C: !lead.company,
          address_street: lead.street,
          address_zip_code: lead.postcode,
          address_city: lead.city,
          address_country: "France",
          comments: `Demande site — ${stamp}`,
          employees: [
            { firstname, lastname, email: lead.email, cellphoneNumber: lead.phone }
          ]
        })
      },
      key
    );
    if (!created?.id) throw new AxonautError("Axonaut n'a pas renvoyé d'identifiant de fiche client.");
    companyId = created.id;
    companyCreated = true;
  }

  const opportunity = await call<{ id: number }>(
    "/opportunities",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Demande site — ${lead.service} — ${companyName} (${lead.city})`.slice(0, 255),
        company_id: companyId,
        amount: 0,
        probability: 10,
        pipe_name: pipeName,
        pipe_step_name: pipeStep,
        business_manager_email: managerEmail,
        comments: [`Demande site — ${stamp}`, "", lead.detail].join("\n"),
        employees: [
          {
            employee_firstname: firstname,
            employee_lastname: lastname,
            employee_email: lead.email,
            employee_cellphone: lead.phone
          }
        ]
      })
    },
    key
  );
  if (!opportunity?.id) throw new AxonautError("Axonaut n'a pas renvoyé d'identifiant d'opportunité.");

  return { companyId, companyCreated, opportunityId: opportunity.id };
}
