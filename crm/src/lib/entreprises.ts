export type Company = {
  siren: string;
  siret: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  naf_code: string | null;
  legal_form: string | null;
  creation_date: string | null;
  manager: string | null;
  vat_number: string;
  active: boolean;
  is_hq: boolean;
};

export type Query = { kind: "siret" | "siren" | "name" | "short"; q: string };

/** Ce que la personne a tapé : SIRET (14 chiffres), SIREN (9), n° de TVA FR… ou nom commercial. */
export function classifyQuery(raw: string): Query {
  const t = raw.trim().slice(0, 100);
  const compact = t.replace(/[\s.]/g, "");
  if (/^\d{14}$/.test(compact)) return { kind: "siret", q: compact };
  if (/^\d{9}$/.test(compact)) return { kind: "siren", q: compact };
  const vat = /^FR[0-9A-Z]{2}(\d{9})$/i.exec(compact);
  if (vat) return { kind: "siren", q: vat[1] };
  if (/^\d+$/.test(compact) || t.length < 3) return { kind: "short", q: t };
  return { kind: "name", q: t };
}

/** N° de TVA intracommunautaire français : FR + clé (12 + 3 × (SIREN mod 97)) mod 97 + SIREN. */
export function tvaFromSiren(siren: string): string {
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${siren}`;
}

const LEGAL_FORMS: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "5202": "Société en nom collectif",
  "5498": "EURL",
  "5499": "SARL",
  "5710": "SAS",
  "5720": "SASU",
  "6540": "SCI",
  "9220": "Association déclarée",
};
export const legalFormLabel = (code: string | null | undefined) =>
  code ? (LEGAL_FORMS[code] ?? `Forme juridique ${code}`) : null;

export function titleCase(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .toLowerCase()
    .replace(/(^|[\s'’\-(])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Sur|Sous|De|Du|Des|La|Le|Les|Et|Aux?|En|D'|L')(?=\s)/g, (m) =>
      m.toLowerCase(),
    )
    .replace(/^./, (c) => c.toUpperCase());
}

type Raw = Record<string, any>;

/** Une réponse de l'API « recherche-entreprises » → les champs de la fiche client. Rien n'est inventé : champ absent = null. */
export function mapResult(r: Raw): Company | null {
  const siren = String(r?.siren ?? "");
  if (!/^\d{9}$/.test(siren)) return null;
  const s: Raw = r.siege ?? {};
  const siret = /^\d{14}$/.test(String(s.siret ?? "")) ? String(s.siret) : "";
  const street = [
    s.numero_voie,
    s.indice_repetition,
    s.type_voie,
    s.libelle_voie,
  ]
    .filter(Boolean)
    .join(" ");
  const address =
    titleCase([street, s.complement_adresse].filter(Boolean).join(", ")) ||
    null;
  const dir = Array.isArray(r.dirigeants) ? r.dirigeants : [];
  const person = dir.find(
    (d: Raw) => d.type_dirigeant === "personne physique" && d.nom,
  );
  const manager = person
    ? `${titleCase(String(person.prenoms ?? "").split(/[\s,]/)[0]) ?? ""} ${titleCase(person.nom) ?? ""}`.trim()
    : (titleCase(dir.find((d: Raw) => d.denomination)?.denomination) ?? null);
  const naf = /^\d{2}\.\d{2}[A-Z]$/.test(String(r.activite_principale ?? ""))
    ? String(r.activite_principale)
    : null;
  const tva =
    Array.isArray(r.tva) && /^FR[0-9A-Z]{2}\d{9}$/.test(String(r.tva[0] ?? ""))
      ? String(r.tva[0])
      : tvaFromSiren(siren);
  return {
    siren,
    siret,
    name: String(r.nom_raison_sociale || r.nom_complet || "").trim(),
    address,
    postal_code: s.code_postal ? String(s.code_postal) : null,
    city: titleCase(s.libelle_commune),
    naf_code: naf,
    legal_form: legalFormLabel(r.nature_juridique),
    manager: manager || null,
    creation_date: /^\d{4}-\d{2}-\d{2}$/.test(String(r.date_creation ?? ""))
      ? String(r.date_creation)
      : null,
    vat_number: tva,
    active:
      r.etat_administratif === "A" && (s.etat_administratif ?? "A") === "A",
    is_hq: s.est_siege !== false,
  };
}
