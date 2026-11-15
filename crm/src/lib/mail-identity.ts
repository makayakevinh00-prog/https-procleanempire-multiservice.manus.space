/**
 * Qui écrit au client : jamais une personne, toujours le service concerné.
 * Une facture ou une relance de facture vient du service facturation ; un devis ou une relance de devis, du service commercial ;
 * le reste, de l'entreprise. Le même choix sert à la signature et au nom d'expéditeur affiché dans la boîte du client.
 */
export type Service = "facturation" | "commercial" | "entreprise";

export const CONTACT_EMAIL = "contact@procleanempire.com";

const SIGNS: Record<Service, string | null> = { facturation: "Le service facturation", commercial: "Le service commercial", entreprise: null };
const SENDS: Record<Service, string | null> = { facturation: "Service facturation", commercial: "Service commercial", entreprise: null };

/** Le service qui écrit, d'après la nature de l'e-mail (celle du journal : facture, relance_facture, devis, relance_devis…) ou l'agent qui le propose (finance, commercial…). */
export function serviceFor(kind: string | null | undefined): Service {
  const k = (kind ?? "").toLowerCase();
  if (/factur|paiement|recouvrement|mandat|finance|compta/.test(k)) return "facturation";
  if (/devis|commercial|prospect/.test(k)) return "commercial";
  return "entreprise";
}

/** Lignes de signature : service, entreprise, adresse de contact, téléphone. */
export function signatureLines(company: string, service: Service, phone?: string | null): string[] {
  return [...(SIGNS[service] ? [SIGNS[service]!] : []), company, CONTACT_EMAIL, ...(phone ? [phone] : [])];
}

/** Nom d'expéditeur affiché chez le client, ex. « ProClean Empire - Service facturation ». */
export function senderName(company: string, service: Service): string {
  return SENDS[service] ? `${company} - ${SENDS[service]}` : company;
}

/** En-tête « De » : garde l'adresse d'envoi configurée et ne change que le nom affiché. Sans nom, l'en-tête configuré est rendu tel quel. */
export function fromHeader(base: string, name?: string | null): string {
  const clean = (name ?? "").replace(/["<>\r\n,;:]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return base;
  const addr = /<\s*([^<>\s]+@[^<>\s]+)\s*>/.exec(base)?.[1] ?? (/^[^\s<>]+@[^\s<>]+$/.test(base.trim()) ? base.trim() : null);
  return addr ? `${clean} <${addr}>` : base;
}
