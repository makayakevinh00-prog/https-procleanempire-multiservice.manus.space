/**
 * Réponses factices déterministes, activées par `MOCK_AI=1`.
 *
 * Elles permettent de dérouler et de tester l'intégralité du pipeline — choix
 * de l'angle, anti-répétition, génération du visuel, planification — sans clé
 * d'API ni accès réseau. Le contenu varie selon le prompt reçu, sinon le
 * contrôle anti-répétition rejetterait tout dès le deuxième jour.
 */

export type MockTask = "vision" | "copy";

const hash = (input: string): number => {
  let value = 2_166_136_261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16_777_619);
  }
  return Math.abs(value);
};

const SUBJECTS = [
  {
    service: "vitrerie",
    topic: "Traces sur les vitres après nettoyage",
    hookIg: "Une vitre propre qui laisse des traces au soleil, c'est presque toujours la même cause.",
    hookFb: "Vos vitres semblent propres, jusqu'au premier rayon de soleil ?",
    hookLi: "Sur un immeuble de bureaux, l'état des vitrages est la première chose que voit un visiteur.",
    hookTk: "Ta vitre est propre mais elle fait des traces ? Regarde ça.",
    tags: ["vitrerie", "nettoyagevitres", "proprete", "entretien"],
  },
  {
    service: "bureaux",
    topic: "Points de contact négligés dans les bureaux",
    hookIg: "Dans un bureau, les surfaces les plus touchées sont rarement les plus nettoyées.",
    hookFb: "Poignées, interrupteurs, accoudoirs : les vrais points sensibles d'un bureau.",
    hookLi: "La qualité perçue d'un prestataire de propreté se joue sur des détails mesurables.",
    hookTk: "Les 3 endroits que personne ne nettoie au bureau.",
    tags: ["nettoyagebureaux", "proprete", "entreprise", "hygiene"],
  },
  {
    service: "automobile",
    topic: "Entretien des sièges en tissu",
    hookIg: "Un siège en tissu ne se lave pas : il s'extrait.",
    hookFb: "Une tache sur un siège en tissu, c'est réparable plus souvent qu'on ne le croit.",
    hookLi: "L'entretien des flottes de véhicules est un poste souvent sous-estimé.",
    hookTk: "Ton siège est taché ? Ne frotte surtout pas.",
    tags: ["nettoyageauto", "detailing", "interieurauto", "proprete"],
  },
  {
    service: "sols",
    topic: "Protection des sols en période humide",
    hookIg: "En hiver, un sol s'abîme moins par l'usure que par ce qu'on y laisse entrer.",
    hookFb: "Les sols de vos locaux souffrent surtout entre novembre et mars.",
    hookLi: "Un sol dégradé coûte plus cher à rénover qu'à entretenir.",
    hookTk: "Pourquoi ton sol devient terne en hiver.",
    tags: ["entretiensols", "proprete", "locauxprofessionnels", "hygiene"],
  },
  {
    service: "textile-mobilier",
    topic: "Remise en état d'un canapé en tissu",
    hookIg: "Un canapé terne n'est pas usé : il est chargé.",
    hookFb: "Avant de changer votre canapé, faites-le nettoyer en profondeur.",
    hookLi: "En espace d'accueil, l'état du mobilier participe directement à l'image.",
    hookTk: "Ce canapé n'était pas usé. Juste sale.",
    tags: ["nettoyagecanape", "textile", "mobilier", "proprete"],
  },
  {
    service: "hôtellerie",
    topic: "Préparation d'un logement entre deux locations",
    hookIg: "Entre deux locations, le temps manque toujours. La méthode, elle, ne doit pas.",
    hookFb: "Un logement prêt à louer, ce n'est pas seulement un logement rangé.",
    hookLi: "La régularité du ménage conditionne directement la note laissée par les voyageurs.",
    hookTk: "Comment préparer un logement en 45 minutes.",
    tags: ["conciergerie", "locationcourteduree", "menage", "proprete"],
  },
];

const GEO_TAGS = ["pontoise", "valdoise", "iledefrance", "95"];
const BRAND_TAGS = ["procleanempire", "nettoyageprofessionnel", "multiservices", "qualite"];

const pick = <T>(items: readonly T[], seed: number): T =>
  items[seed % items.length] as T;

const buildHashtags = (base: string[], seed: number, count: number): string[] => {
  const pool = [
    ...base,
    ...BRAND_TAGS,
    ...GEO_TAGS,
    "entretien",
    "hygienepro",
    "servicepro",
    "btob",
  ];

  const selected: string[] = [];
  for (let i = 0; selected.length < count && i < pool.length * 2; i += 1) {
    const tag = pool[(seed + i * 3) % pool.length] as string;
    if (!selected.includes(`#${tag}`)) selected.push(`#${tag}`);
  }
  return selected;
};

const visionResponse = (seed: number): string => {
  const subject = pick(SUBJECTS, seed);

  return JSON.stringify({
    serviceType: subject.service,
    subject: `Vue rapprochée d'une intervention de ${subject.service}.`,
    notableElements: [
      "contraste net entre la zone traitée et la zone non traitée",
      "reflet régulier sur la surface",
      "absence de traces après passage",
    ],
    isBeforeAfter: seed % 3 === 0,
    quality: "publiable",
  });
};

const copyResponse = (seed: number): string => {
  const subject = pick(SUBJECTS, seed);
  const cta = pick(
    [
      "Décrivez-nous votre besoin, nous revenons vers vous sous 24h.",
      "Demandez votre devis sur www.procleanempire.com.",
      "Un doute sur votre cas précis ? Écrivez-nous, la réponse est gratuite.",
      "Appelez-nous au 06 17 21 22 30 pour une visite technique.",
    ],
    seed + 1,
  );

  return JSON.stringify({
    topic: subject.topic,
    instagram: {
      body: `${subject.hookIg}\n\nLa plupart du temps, le produit n'est pas en cause : c'est la méthode et l'ordre des gestes qui laissent le résultat inégal.\n\nSur nos interventions, chaque surface suit un protocole défini à l'avance, avec un contrôle en fin de passage.`,
      cta,
      hashtags: buildHashtags(subject.tags, seed, 10),
    },
    facebook: {
      body: `${subject.hookFb}\n\nNous intervenons à Pontoise et dans toute l'Île-de-France, avec des créneaux adaptés à l'activité de nos clients.\n\nEt chez vous, quelle est la surface la plus difficile à maintenir propre ?`,
      cta,
      hashtags: buildHashtags(subject.tags, seed + 5, 9),
    },
    linkedin: {
      body: `${subject.hookLi}\n\nUn prestataire de propreté se juge sur trois points : la régularité, la traçabilité des passages et la capacité à s'adapter aux contraintes d'exploitation.\n\nC'est sur ces trois points que nous construisons nos prestations, avec un interlocuteur unique pour chaque site.`,
      cta,
      hashtags: buildHashtags(subject.tags, seed + 11, 8),
    },
    tiktok: {
      body: `${subject.hookTk}\n\nLa méthode compte plus que le produit.`,
      cta,
      hashtags: buildHashtags(subject.tags, seed + 17, 9),
    },
  });
};

export const mockResponse = (task: MockTask, prompt: string): string => {
  const seed = hash(prompt);
  return task === "vision" ? visionResponse(seed) : copyResponse(seed);
};
