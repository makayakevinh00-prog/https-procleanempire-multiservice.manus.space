export const REQUEST_TYPES = ["devis", "rendez_vous", "airbnb", "copropriete", "professionnel", "conciergerie"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  devis: "Devis", rendez_vous: "Rendez-vous", airbnb: "Airbnb", copropriete: "Copropriété", professionnel: "Professionnel", conciergerie: "Conciergerie"
};

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Type de demande : champ `type` du site s'il est reconnu, sinon déduit du libellé du service
 * (« Ménage Airbnb studio » → airbnb). Par défaut : devis.
 */
export function requestType(type: unknown, service: unknown): RequestType {
  const t = typeof type === "string" ? strip(type).replace(/[\s-]+/g, "_").trim() : "";
  const alias: Record<string, RequestType> = {
    rdv: "rendez_vous", rendezvous: "rendez_vous", rendez_vous: "rendez_vous", rendez: "rendez_vous", copro: "copropriete", syndic: "copropriete",
    pro: "professionnel", entreprise: "professionnel", bureaux: "professionnel", concierge: "conciergerie", airbnb: "airbnb", devis: "devis", copropriete: "copropriete",
    professionnel: "professionnel", conciergerie: "conciergerie"
  };
  if (alias[t]) return alias[t];
  const s = typeof service === "string" ? strip(service) : "";
  if (/concierg/.test(s)) return "conciergerie";                       // le mot « conciergerie » prime sur « location courte durée »
  if (/airbnb|location courte|meuble de tourisme/.test(s)) return "airbnb";
  if (/copropriet|syndic|parties communes|residence/.test(s)) return "copropriete";
  if (/rendez-?vous|\brdv\b/.test(s)) return "rendez_vous";
  if (/bureau|entreprise|professionnel|local commercial|commerce/.test(s)) return "professionnel";
  return "devis";
}

export const PIPELINE = [
  ["nouveau_prospect", "Nouveau prospect"], ["a_contacter", "À contacter"], ["rdv_programme", "Rendez-vous programmé"],
  ["devis_envoye", "Devis envoyé"], ["devis_accepte", "Devis accepté"], ["devis_refuse", "Devis refusé"], ["client_actif", "Client actif"]
] as const;
export type Pipeline = (typeof PIPELINE)[number][0];
export const PIPELINE_LABEL = Object.fromEntries(PIPELINE) as Record<Pipeline, string>;
export const PIPELINE_TONE: Record<Pipeline, string> = {
  nouveau_prospect: "bg-sky-100 text-sky-800", a_contacter: "bg-amber-100 text-amber-900", rdv_programme: "bg-violet-100 text-violet-800",
  devis_envoye: "bg-blue-100 text-blue-800", devis_accepte: "bg-emerald-100 text-emerald-800", devis_refuse: "bg-red-100 text-red-800", client_actif: "bg-green-200 text-green-900"
};
