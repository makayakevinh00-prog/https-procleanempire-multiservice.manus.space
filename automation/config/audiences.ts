/**
 * Cibles commerciales.
 *
 * L'angle décide de la *forme* de la publication, la cible décide à *qui* elle
 * parle. Les deux tournent indépendamment : c'est ce qui permet de publier
 * quinze conseils de nettoyage sans jamais s'adresser deux fois de suite aux
 * mêmes personnes.
 */

export type AudienceId =
  | "conciergerie-airbnb"
  | "bureaux-entreprises"
  | "commerces-restaurants"
  | "hotellerie"
  | "automobile"
  | "aeronautique"
  | "syndics-coproprietes"
  | "particuliers";

export type Audience = {
  id: AudienceId;
  label: string;
  /** À qui l'on parle, et ce qui compte pour ces gens-là. */
  brief: string;
  cooldownDays: number;
  weight: number;
};

export const audiences: Audience[] = [
  {
    id: "conciergerie-airbnb",
    label: "Conciergeries et locations courte durée (Airbnb)",
    brief:
      "Conciergeries, hôtes Airbnb et gestionnaires de meublés touristiques. Leurs enjeux : rotation rapide entre deux voyageurs, ménage irréprochable dès la première impression, note et commentaires en jeu à chaque séjour, linge et réassort, créneaux serrés le jour du départ-arrivée. Parler délais, régularité et fiabilité, jamais de généralités.",
    cooldownDays: 3,
    // Segment en forte croissance : volontairement le plus fréquent.
    weight: 4,
  },
  {
    id: "bureaux-entreprises",
    label: "Bureaux et locaux professionnels",
    brief:
      "Dirigeants, office managers et services généraux. Enjeux : image auprès des visiteurs, confort des salariés, respect des horaires d'exploitation, traçabilité des passages, interlocuteur unique.",
    cooldownDays: 3,
    weight: 3,
  },
  {
    id: "commerces-restaurants",
    label: "Commerces et restaurants",
    brief:
      "Commerçants et restaurateurs. Enjeux : vitrine et devanture, hygiène en zone alimentaire, interventions en dehors des heures d'ouverture, contrôles sanitaires.",
    cooldownDays: 4,
    weight: 2,
  },
  {
    id: "hotellerie",
    label: "Hôtellerie",
    brief:
      "Hôtels et résidences. Enjeux : constance sur un grand nombre de chambres, parties communes très fréquentées, notes en ligne, personnel en rotation.",
    cooldownDays: 5,
    weight: 2,
  },
  {
    id: "automobile",
    label: "Automobile",
    brief:
      "Particuliers exigeants, concessions, loueurs et flottes d'entreprise. Enjeux : valeur de revente, remise en état intérieure, traitement des matériaux (cuir, tissu, alcantara).",
    cooldownDays: 4,
    weight: 2,
  },
  {
    id: "aeronautique",
    label: "Aéronautique",
    brief:
      "Propriétaires et exploitants d'aéronefs. Enjeux : matériaux fragiles, produits compatibles, cabines et cockpits, intervention entre deux vols. Segment de niche : ton très technique.",
    cooldownDays: 8,
    weight: 1,
  },
  {
    id: "syndics-coproprietes",
    label: "Syndics et copropriétés",
    brief:
      "Syndics, conseils syndicaux et gestionnaires. Enjeux : parties communes, régularité contractuelle, budget maîtrisé, réactivité en cas d'incident.",
    cooldownDays: 5,
    weight: 2,
  },
  {
    id: "particuliers",
    label: "Particuliers",
    brief:
      "Particuliers du Val-d'Oise. Enjeux : ponctuel plutôt que contractuel, remise en état après travaux ou déménagement, canapés et tapis, confiance et discrétion.",
    cooldownDays: 5,
    weight: 2,
  },
];

export const audienceById = new Map(
  audiences.map((audience) => [audience.id, audience]),
);
