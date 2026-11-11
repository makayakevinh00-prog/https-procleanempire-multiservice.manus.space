/**
 * Démarchage et messages indésirables reçus par le formulaire de devis. Score prudent : on écarte seulement quand plusieurs signaux concordent,
 * et tout ce qui est écarté reste consultable (le patron peut le rétablir). Module pur : aucun accès base.
 */
export type RequestLike = {
  name?: string | null; company?: string | null; email?: string | null; phone?: string | null;
  service?: string | null; message?: string | null; details?: Record<string, unknown> | null;
};

/** Mots qui montrent une vraie demande de prestation de nettoyage ou de conciergerie. */
const GENUINE = /\b(nettoy|m[ée]nage|entretien (de|des|du|d')|vitres?|vitrerie|bureaux?|locaux|copropri|r[ée]sidence|airbnb|booking|conciergerie|d[ée]sinfect|remise en [ée]tat|fin de chantier|parkings?|cuisines?|sanitaires?|moquettes?|sols?\b|m2|m²|fr[ée]quence|hebdomadaire|commerces?|boutique|magasin|restaurant|v[ée]hicules?|flotte|lavage)/i;
/** Signaux d'une entreprise qui vend quelque chose plutôt qu'un client qui achète. */
const PITCH: [RegExp, string, number][] = [
  [/\b(r[ée]f[ée]rencement|seo|backlink|visibilit[ée] (en ligne|sur google)|google my business|cr[ée]ation de site|agence (web|digitale|de communication)|community manag|leads?\b|g[ée]n[ée]ration de (leads|prospects))/i, "offre de marketing / référencement", 3],
  [/\b(nous (vous )?propos|notre (soci[ée]t[ée]|agence|entreprise|[ée]quipe) (est|propose|sp[ée]cialis)|je me permets de (vous )?(contacter|proposer)|opportunit[ée] (commerciale|de collaboration)|partenariat|collaboration (commerciale|gagnant)|offre (commerciale|exceptionnelle|sp[ée]ciale)|remise exceptionnelle|sans engagement)/i, "formule de démarchage commercial", 2],
  [/\b(panneaux? solaires?|isolation|pompe [àa] chaleur|ravalement|toiture|couverture|charpente|plomberie|[ée]lectricit[ée]|rénovation énergétique|aides? de l'[ée]tat|cr[ée]dit|pr[êe]t|financement|assurance|rachat de cr[ée]dit|trading|crypto|casino|viagra)/i, "secteur sans rapport avec le nettoyage", 2],
  [/\b(logiciel|application mobile|solution (digitale|informatique)|h[ée]bergement|nom de domaine|formation professionnelle|recrutement|int[ée]rim|sous-traitance)\b/i, "offre de service aux entreprises", 1]
];
const DISPOSABLE = /@(mailinator|yopmail|guerrillamail|tempmail|10minutemail|trashmail|sharklasers|getnada|maildrop)\./i;

export function spamScore(r: RequestLike): { score: number; reasons: string[]; spam: boolean } {
  const text = [r.company, r.service, r.message, ...Object.values(r.details ?? {})].filter(Boolean).join(" \n ");
  const reasons: string[] = [];
  let score = 0;
  for (const [re, why, pts] of PITCH) if (re.test(text) || re.test(r.company ?? "")) { score += pts; reasons.push(why); }
  const links = (text.match(/https?:\/\/|www\./gi) ?? []).length;
  if (links >= 2) { score += 2; reasons.push("plusieurs liens dans le message"); }
  if (/[Ѐ-ӿ؀-ۿ぀-ヿ一-鿿]/.test(text)) { score += 3; reasons.push("texte dans un autre alphabet"); }
  if (r.email && DISPOSABLE.test(r.email)) { score += 3; reasons.push("adresse e-mail jetable"); }
  if (/(.)\1{6,}/.test(text) || /[A-Z]{12,}/.test(text.replace(/\s/g, ""))) { score += 1; reasons.push("texte incohérent"); }
  const genuine = GENUINE.test(text);
  if (!genuine && text.replace(/\W/g, "").length > 40) { score += 1; reasons.push("aucun rapport avec une prestation de nettoyage"); }
  // Une vraie demande de nettoyage (mots du métier) n'est jamais écartée par un seul signal faible.
  const spam = genuine ? score >= 5 : score >= 3;
  return { score, reasons, spam };
}
