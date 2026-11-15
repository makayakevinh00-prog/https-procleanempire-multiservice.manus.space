/** Aides publiques qui s'adressent à une petite entreprise de propreté / conciergerie en Île-de-France (Val-d'Oise).
 *  Liste de repérage : les conditions et les montants changent souvent, la page officielle fait foi. */
export const NEEDS = {
  investir: "Investir et se développer",
  tresorerie: "Trésorerie et prêts",
  embaucher: "Embaucher",
  former: "Former",
  prevention: "Santé et sécurité au travail",
  ecologie: "Véhicules et écologie",
  numerique: "Numérique",
  accompagnement: "Se faire accompagner"
} as const;
export type Need = keyof typeof NEEDS;
export const NEED_KEYS = Object.keys(NEEDS) as Need[];
export const isNeed = (v: unknown): v is Need => typeof v === "string" && v in NEEDS;

export type Aide = { name: string; by: string; kind: "Subvention" | "Prêt" | "Garantie" | "Aide à l'embauche" | "Prise en charge" | "Allègement" | "Accompagnement"; need: Need; what: string; who: string; amount?: string; url: string; priority?: boolean };

export const AIDES: Aide[] = [
  { name: "TP'up", by: "Région Île-de-France", kind: "Subvention", need: "investir", priority: true,
    what: "Subvention pour un plan de développement sur 12 à 18 mois : matériel, véhicules, conseil, communication, numérique.",
    who: "Très petites entreprises d'Île-de-France (moins de 10 salariés).", amount: "Jusqu'à 55 000 € environ, une partie des dépenses seulement.",
    url: "https://www.iledefrance.fr/aides-et-appels-a-projets/tpup" },
  { name: "Prêt Croissance TPE", by: "Région Île-de-France et Bpifrance", kind: "Prêt", need: "tresorerie", priority: true,
    what: "Prêt sans garantie ni caution personnelle pour financer le développement (embauches, matériel, besoin de trésorerie lié à la croissance).",
    who: "Petites entreprises de plus de 3 ans, avec des salariés.", amount: "De 10 000 à 50 000 € environ, sur 5 ans.",
    url: "https://www.iledefrance.fr/aides-et-appels-a-projets/pret-croissance-tpe" },
  { name: "Prêt d'honneur (Initiative Val-d'Oise, Réseau Entreprendre)", by: "Réseaux associatifs soutenus par la Région et Bpifrance", kind: "Prêt", need: "tresorerie", priority: true,
    what: "Prêt personnel au dirigeant à taux zéro, sans garantie, qui aide ensuite à obtenir un prêt bancaire. Existe pour la création, la croissance et la reprise d'entreprise.",
    who: "Dirigeants qui créent, développent ou rachètent une entreprise.",
    url: "https://www.initiative-valdoise.fr/" },
  { name: "Garantie de prêt bancaire", by: "Bpifrance et Fonds régional de garantie", kind: "Garantie", need: "tresorerie",
    what: "Bpifrance se porte garant d'une partie du prêt demandé à votre banque : la banque prête plus facilement et demande moins de caution personnelle. C'est la banque qui fait la demande.",
    who: "Petites entreprises qui investissent, se développent ou rachètent une entreprise.",
    url: "https://www.bpifrance.fr/catalogue-offres/garanties" },
  { name: "Microcrédit professionnel", by: "Adie", kind: "Prêt", need: "tresorerie",
    what: "Petit prêt rapide pour du matériel, un véhicule ou de la trésorerie quand la banque refuse.",
    who: "Petites entreprises et indépendants sans accès au crédit bancaire.",
    url: "https://www.adie.org/" },
  { name: "Financement du rachat d'une entreprise", by: "Bpifrance, Région, réseaux de prêts d'honneur", kind: "Prêt", need: "investir",
    what: "Prêts d'honneur reprise, garantie Bpifrance sur le prêt de rachat, accompagnement des chambres de commerce pour trouver et évaluer une entreprise à reprendre.",
    who: "Dirigeants qui rachètent une entreprise ou un fonds de commerce.",
    url: "https://bpifrance-creation.fr/encyclopedie/reprise-dentreprise" },

  { name: "Aide à l'embauche en apprentissage", by: "État", kind: "Aide à l'embauche", need: "embaucher", priority: true,
    what: "Aide versée la première année pour l'embauche d'un apprenti (agent de propreté, assistant de gestion, commercial).",
    who: "Entreprises qui signent un contrat d'apprentissage.",
    url: "https://entreprendre.service-public.fr/vosdroits/F23556" },
  { name: "Formation avant l'embauche (POEI)", by: "France Travail", kind: "Prise en charge", need: "embaucher", priority: true,
    what: "France Travail finance la formation d'un demandeur d'emploi avant que vous l'embauchiez, pour qu'il arrive formé à vos méthodes.",
    who: "Entreprises qui s'engagent à embaucher la personne formée.",
    url: "https://www.francetravail.fr/employeur/aides-aux-recrutements/les-aides-a-la-formation.html" },
  { name: "Période d'essai en situation réelle (immersion)", by: "France Travail", kind: "Accompagnement", need: "embaucher",
    what: "Accueillir un candidat quelques jours sans le payer, pour voir comment il travaille avant de l'embaucher.",
    who: "Toutes les entreprises.",
    url: "https://immersion-facile.beta.gouv.fr/" },
  { name: "Aides à l'embauche de personnes handicapées", by: "Agefiph", kind: "Aide à l'embauche", need: "embaucher",
    what: "Aides financières à l'embauche, à l'adaptation du poste et à l'accueil d'un salarié reconnu travailleur handicapé.",
    who: "Entreprises privées, quelle que soit leur taille.",
    url: "https://www.agefiph.fr/aides-handicap" },
  { name: "Emploi dans les quartiers et les zones aidées", by: "État", kind: "Allègement", need: "embaucher",
    what: "Avantages sur les cotisations ou les impôts quand l'entreprise est installée, ou embauche, dans certains quartiers et territoires.",
    who: "Entreprises installées dans une zone concernée : à vérifier avec votre adresse.",
    url: "https://entreprendre.service-public.fr/vosdroits/N31148" },
  { name: "Réduction des cotisations sur les bas salaires", by: "Urssaf", kind: "Allègement", need: "embaucher",
    what: "Baisse automatique des cotisations patronales sur les salaires proches du SMIC. À faire vérifier par votre comptable : elle doit apparaître sur chaque bulletin de paie.",
    who: "Tous les employeurs.",
    url: "https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale-cotisation.html" },

  { name: "Financement des formations des salariés", by: "AKTO (organisme de formation de la branche propreté)", kind: "Prise en charge", need: "former", priority: true,
    what: "Prise en charge de formations pour vos agents (techniques de nettoyage, vitrerie, produits, sécurité) et pour vous. Un conseiller AKTO vous est attribué gratuitement.",
    who: "Entreprises de propreté de moins de 50 salariés.",
    url: "https://www.akto.fr/" },
  { name: "Crédit d'impôt pour la formation du dirigeant", by: "État", kind: "Allègement", need: "former",
    what: "Réduction d'impôt pour les heures de formation suivies par le chef d'entreprise (gestion, commercial, management).",
    who: "Dirigeants d'entreprise.",
    url: "https://entreprendre.service-public.fr/vosdroits/F23460" },

  { name: "Subventions prévention des risques", by: "Assurance Maladie — Risques professionnels (Cramif en Île-de-France)", kind: "Subvention", need: "prevention", priority: true,
    what: "Participation à l'achat de matériel qui réduit la pénibilité : chariots, autolaveuses, aspirateurs dorsaux, perches, matériel de manutention. Très adapté au nettoyage.",
    who: "Entreprises de moins de 50 salariés.",
    url: "https://www.ameli.fr/entreprise/sante-travail/aides-financieres" },
  { name: "Prévention de l'usure professionnelle", by: "Assurance Maladie — Risques professionnels", kind: "Subvention", need: "prevention",
    what: "Aide pour le matériel et les formations qui limitent les postures pénibles, le port de charges et les vibrations.",
    who: "Toutes les entreprises ayant des salariés exposés.",
    url: "https://www.ameli.fr/entreprise/sante-travail/aides-financieres" },

  { name: "Aides à l'achat de véhicules utilitaires électriques", by: "État, Région Île-de-France, Métropole", kind: "Subvention", need: "ecologie",
    what: "Primes à l'achat ou à la location d'un utilitaire électrique. Les règles ont beaucoup changé ces dernières années : vérifiez avant de commander.",
    who: "Entreprises qui remplacent ou achètent un véhicule professionnel.",
    url: "https://www.iledefrance.fr/aides-et-appels-a-projets?thematique=transports" },
  { name: "Aides à la transition écologique", by: "ADEME et Mission Transition écologique des entreprises", kind: "Subvention", need: "ecologie",
    what: "Moteur de recherche officiel des aides pour réduire l'énergie, l'eau, les déchets et passer à des produits plus écologiques. Utile aussi comme argument commercial.",
    who: "Petites et moyennes entreprises.",
    url: "https://mission-transition-ecologique.beta.gouv.fr/" },

  { name: "France Num", by: "État", kind: "Accompagnement", need: "numerique",
    what: "Diagnostic gratuit, formations et conseillers pour le site internet, la visibilité en ligne, la facturation électronique.",
    who: "Très petites et petites entreprises.",
    url: "https://www.francenum.gouv.fr/aides-financieres" },

  { name: "Conseil gratuit des chambres consulaires", by: "CCI Val-d'Oise et Chambre de métiers", kind: "Accompagnement", need: "accompagnement",
    what: "Un conseiller fait le tour des aides auxquelles vous avez droit et aide à monter les dossiers (TP'up, prêts d'honneur, reprise d'entreprise).",
    who: "Toutes les entreprises du Val-d'Oise.",
    url: "https://www.entreprises.cci-paris-idf.fr/web/cci95" },
  { name: "Chèque prévention", by: "Région Île-de-France", kind: "Prise en charge", need: "accompagnement",
    what: "Prise en charge d'honoraires d'accompagnement quand l'entreprise traverse une difficulté (négociation avec les créanciers).",
    who: "Entreprises franciliennes fragilisées.",
    url: "https://www.iledefrance.fr/aides-et-appels-a-projets" }
];

/** Moteurs de recherche officiels : ils connaissent toutes les aides, à jour, selon l'adresse et l'activité. */
export const SEARCH = [
  { name: "Les-aides.fr", by: "Chambres de commerce", what: "Toutes les aides par projet, région et activité.", url: "https://les-aides.fr/" },
  { name: "Aides-entreprises.fr", by: "État", what: "Base nationale des aides publiques aux entreprises.", url: "https://aides-entreprises.fr/" },
  { name: "Aides de la Région Île-de-France", by: "Région", what: "Toutes les aides et appels à projets régionaux.", url: "https://www.iledefrance.fr/aides-et-appels-a-projets" },
  { name: "Bpifrance", by: "Banque publique", what: "Prêts, garanties et accompagnement.", url: "https://www.bpifrance.fr/catalogue-offres" },
  { name: "Aides à l'embauche", by: "France Travail", what: "Toutes les aides au recrutement.", url: "https://www.francetravail.fr/employeur/aides-aux-recrutements.html" },
  { name: "Mes aides publiques", by: "Greffes des tribunaux de commerce", what: "Recherche d'aides par projet et par département.", url: "https://mesaidespubliques.infogreffe.fr/" }
];

export const byNeed = (need: Need | null) => (need ? AIDES.filter((a) => a.need === need) : AIDES);
