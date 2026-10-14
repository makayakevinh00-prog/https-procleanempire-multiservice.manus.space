/**
 * Envoi d'une demande du site vers le CRM Axonaut (côté serveur uniquement).
 * La clé reste dans la variable d'environnement Vercel AXONAUT_API_KEY : jamais dans le navigateur.
 * Si la clé est absente ou si Axonaut répond en erreur, la demande part quand même par e-mail.
 */
const BASE = "https://axonaut.com/api/v2";

export type Lead = {
  service: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  street: string;
  postcode: string;
  city: string;
  summary: string;
};

async function call<T>(path: string, init: RequestInit, key: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { userApiKey: key, "Content-Type": "application/json", Accept: "application/json", ...init.headers },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Axonaut ${init.method ?? "GET"} ${path} → ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

type Company = { id: number; name: string };

export async function pushLeadToAxonaut(lead: Lead): Promise<{ companyId: number; opportunityId?: number } | null> {
  const key = process.env.AXONAUT_API_KEY;
  if (!key) return null;

  const managerEmail = process.env.AXONAUT_MANAGER_EMAIL ?? "contact@procleanempire.com";
  const pipeName = process.env.AXONAUT_PIPE_NAME ?? "Cycle commercial";
  const pipeStep = process.env.AXONAUT_PIPE_STEP ?? "Proposition";
  const companyName = (lead.company || lead.name).slice(0, 255);
  const [firstname, ...rest] = lead.name.split(" ");

  // Anti-doublon : réutilise la fiche existante portant exactement le même nom.
  let companyId: number | undefined;
  try {
    const found = await call<Company[]>(`/companies?search=${encodeURIComponent(companyName)}`, { method: "GET" }, key);
    companyId = found.find((item) => item.name.trim().toLowerCase() === companyName.trim().toLowerCase())?.id;
  } catch {
    companyId = undefined;
  }

  if (!companyId) {
    const created = await call<Company>(
      "/companies",
      {
        method: "POST",
        body: JSON.stringify({
          name: companyName,
          is_prospect: true,
          address_street: lead.street,
          address_zip_code: lead.postcode,
          address_city: lead.city,
          address_country: "France",
          comments: `Prospect venu du site web (formulaire de devis).`,
          employees: [
            {
              firstname: rest.length ? firstname : "",
              lastname: rest.length ? rest.join(" ") : lead.name,
              email: lead.email,
              cellphoneNumber: lead.phone
            }
          ]
        })
      },
      key
    );
    companyId = created.id;
  }

  const opportunity = await call<{ id: number }>(
    "/opportunities",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Site web — ${lead.service} — ${companyName} (${lead.city})`.slice(0, 255),
        company_id: companyId,
        amount: 0,
        probability: 10,
        pipe_name: pipeName,
        pipe_step_name: pipeStep,
        business_manager_email: managerEmail,
        comments: `[DEVIS SITE] À traiter par le Manager Commercial.\n${lead.summary}`,
        employees: [{ employee_email: lead.email, employee_cellphone: lead.phone }]
      })
    },
    key
  );

  return { companyId, opportunityId: opportunity.id };
}
