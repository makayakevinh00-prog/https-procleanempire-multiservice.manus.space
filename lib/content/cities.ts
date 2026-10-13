export type CityPage = {
  slug: string;
  name: string;
  postalCode: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: Array<{ title: string; body: string[] }>;
  areas: string[];
  faqs: Array<{ question: string; answer: string }>;
  nearby: string[];
};

export const cityServiceLinks = [
  { label: "Ménage Airbnb", href: "/menage-airbnb" },
  { label: "Nettoyage de bureaux", href: "/nettoyage-bureaux" },
  { label: "Nettoyage de commerces", href: "/nettoyage-commerces" },
  { label: "Nettoyage de restaurants", href: "/nettoyage-restaurants" },
  { label: "Nettoyage d'hôtels", href: "/nettoyage-hotels" },
  { label: "Nettoyage de vitres", href: "/nettoyage-vitrerie" },
  { label: "Nettoyage après chantier", href: "/apres-chantier" },
  { label: "Remise en état", href: "/remise-en-etat" },
  { label: "Nettoyage automobile", href: "/nettoyage-automobile" }
];

export const cityPages: CityPage[] = [
  {
    slug: "entreprise-nettoyage-pontoise",
    name: "Pontoise",
    postalCode: "95300",
    metaTitle: "Entreprise de nettoyage à Pontoise (95300)",
    metaDescription:
      "Entreprise de nettoyage basée à Pontoise : nettoyage de bureaux, commerces, restaurants, vitres et remise en état. Intervention rapide, devis gratuit sous 24 h.",
    h1: "Entreprise de nettoyage à Pontoise (95300)",
    intro:
      "ProClean Empire est une entreprise de nettoyage installée à Pontoise. Nous entretenons les bureaux, commerces, restaurants, cabinets et parties communes du centre-ville comme des quartiers périphériques, avec des équipes locales capables d'intervenir rapidement, tôt le matin, en soirée ou le week-end.",
    sections: [
      {
        title: "Une société de nettoyage locale, basée à Pontoise",
        body: [
          "Notre siège est à Pontoise, rue Stéphane Charbonnier. Cette proximité change tout pour nos clients : moins de temps de trajet, une meilleure ponctualité et la possibilité d'intervenir en urgence après un dégât des eaux, une livraison ou un événement.",
          "Vous avez un interlocuteur unique, joignable directement, qui connaît vos locaux, vos horaires d'ouverture et vos contraintes d'accès."
        ]
      },
      {
        title: "Nos prestations de nettoyage à Pontoise",
        body: [
          "Entretien régulier de bureaux et d'open spaces, nettoyage de boutiques et de vitrines du centre historique, propreté des cuisines et salles de restaurants, nettoyage des vitres, remise en état après travaux ou déménagement, et detailing de véhicules d'entreprise.",
          "Chaque contrat est construit sur mesure : fréquence (quotidienne, hebdomadaire, ponctuelle), plages horaires et liste précise des tâches figurent dans le devis."
        ]
      },
      {
        title: "Comment se déroule une prestation",
        body: [
          "1. Un échange téléphonique pour comprendre vos besoins. 2. Une visite de vos locaux à Pontoise, gratuite. 3. Un devis clair sous 24 h. 4. Le démarrage avec une équipe briefée. 5. Des contrôles qualité réguliers et un ajustement du dispositif si vos besoins évoluent."
        ]
      }
    ],
    areas: ["Centre-ville", "Quartier de la cathédrale Saint-Maclou", "Les Louvrais", "Marcouville", "Saint-Martin", "Gare de Pontoise"],
    faqs: [
      {
        question: "Intervenez-vous rapidement à Pontoise ?",
        answer:
          "Oui. Notre siège étant à Pontoise, nous pouvons généralement démarrer sous 24 à 48 h après validation du devis, et plus vite pour une urgence."
      },
      {
        question: "Le devis est-il gratuit ?",
        answer: "Oui, la visite des locaux et le devis sont gratuits et sans engagement."
      },
      {
        question: "Proposez-vous des contrats d'entretien mensuels ?",
        answer:
          "Oui, nous proposons des contrats récurrents adaptés à votre fréquence, ainsi que des interventions ponctuelles."
      }
    ],
    nearby: ["entreprise-nettoyage-cergy", "entreprise-nettoyage-osny", "entreprise-nettoyage-saint-ouen-l-aumone"]
  },
  {
    slug: "entreprise-nettoyage-cergy",
    name: "Cergy",
    postalCode: "95000",
    metaTitle: "Entreprise de nettoyage à Cergy (95000) – Bureaux et commerces",
    metaDescription:
      "Société de nettoyage à Cergy : entretien de bureaux, commerces, restaurants et vitres à Cergy-Préfecture, Saint-Christophe et Cergy-le-Haut. Devis gratuit sous 24 h.",
    h1: "Entreprise de nettoyage à Cergy (95000)",
    intro:
      "Cergy concentre de nombreux bureaux, administrations, écoles, commerces et restaurants. Basés à Pontoise, juste à côté, nous assurons l'entretien de ces locaux avec des équipes réactives et un suivi qualité régulier.",
    sections: [
      {
        title: "Nettoyage de bureaux à Cergy",
        body: [
          "Des sièges d'entreprise de Cergy-Préfecture aux petits cabinets de Cergy-le-Haut, nous entretenons les postes de travail, salles de réunion, sanitaires et espaces de pause. Les passages peuvent avoir lieu avant l'arrivée de vos équipes ou après leur départ.",
          "Nous adaptons le cahier des charges à votre taille : quelques heures par semaine pour un cabinet, ou un passage quotidien pour un plateau de bureaux."
        ]
      },
      {
        title: "Commerces, restaurants et établissements recevant du public",
        body: [
          "Pour les commerces et restaurants de Cergy, la propreté fait partie de l'expérience client. Nous intervenons en dehors des heures d'ouverture : sols, vitrines, sanitaires, cuisines et zones de stockage.",
          "Nous réalisons aussi des remises en état avant ouverture, après travaux ou lors d'un changement de locataire."
        ]
      },
      {
        title: "Pourquoi choisir ProClean Empire à Cergy",
        body: [
          "Une équipe locale à quelques minutes, un interlocuteur unique, un devis détaillé sous 24 h, et des contrôles qualité réguliers pour garantir un niveau constant dans le temps."
        ]
      }
    ],
    areas: ["Cergy-Préfecture", "Cergy-Saint-Christophe", "Cergy-le-Haut", "Grand Centre", "Axe Majeur – Horloge", "Port de Cergy"],
    faqs: [
      {
        question: "Intervenez-vous dans toute la ville de Cergy ?",
        answer:
          "Oui, nous intervenons dans tous les quartiers de Cergy ainsi que dans l'ensemble de l'agglomération de Cergy-Pontoise."
      },
      {
        question: "Pouvez-vous nettoyer nos bureaux le soir ?",
        answer: "Oui, nous intervenons tôt le matin, en soirée, la nuit ou le week-end selon vos besoins."
      },
      {
        question: "Quel est le délai pour obtenir un devis ?",
        answer: "Vous recevez un devis détaillé sous 24 h après l'échange ou la visite de vos locaux."
      }
    ],
    nearby: ["entreprise-nettoyage-pontoise", "entreprise-nettoyage-osny", "entreprise-nettoyage-conflans-sainte-honorine"]
  },
  {
    slug: "entreprise-nettoyage-osny",
    name: "Osny",
    postalCode: "95520",
    metaTitle: "Entreprise de nettoyage à Osny (95520)",
    metaDescription:
      "Nettoyage professionnel à Osny : bureaux, locaux d'activité, commerces et vitres. Entreprise basée à Pontoise, intervention rapide et devis gratuit sous 24 h.",
    h1: "Entreprise de nettoyage à Osny (95520)",
    intro:
      "Voisine directe de Pontoise, Osny accueille des entreprises, des locaux d'activité et des commerces. ProClean Empire y assure le nettoyage régulier ou ponctuel de vos locaux, avec la réactivité d'une équipe installée à quelques minutes.",
    sections: [
      {
        title: "Entretien des bureaux et locaux d'activité à Osny",
        body: [
          "Bureaux, showrooms, ateliers propres, zones d'accueil et sanitaires : nous définissons avec vous une fréquence et une liste de tâches adaptées à votre activité.",
          "Les interventions sont planifiées pour ne pas gêner vos équipes ni vos clients."
        ]
      },
      {
        title: "Nettoyage ponctuel et remise en état",
        body: [
          "Avant un emménagement, après des travaux ou avant la restitution de locaux, nous réalisons un nettoyage en profondeur : dépoussiérage, sols, vitres, sanitaires, évacuation des résidus de chantier légers."
        ]
      },
      {
        title: "Une relation simple et suivie",
        body: [
          "Un seul interlocuteur, un devis clair, et des points de contrôle réguliers pour s'assurer que la qualité reste constante."
        ]
      }
    ],
    areas: ["Centre d'Osny", "Zones d'activités d'Osny", "Secteur de la gare", "Limite Pontoise – Cergy"],
    faqs: [
      {
        question: "Êtes-vous loin d'Osny ?",
        answer: "Non, notre siège est à Pontoise, à quelques minutes d'Osny."
      },
      {
        question: "Faites-vous du nettoyage après travaux à Osny ?",
        answer: "Oui, nous réalisons des nettoyages de fin de chantier et des remises en état complètes."
      },
      {
        question: "Travaillez-vous avec les petites entreprises ?",
        answer: "Oui, nous accompagnons aussi bien les indépendants et cabinets que les PME."
      }
    ],
    nearby: ["entreprise-nettoyage-pontoise", "entreprise-nettoyage-cergy", "entreprise-nettoyage-saint-ouen-l-aumone"]
  },
  {
    slug: "entreprise-nettoyage-saint-ouen-l-aumone",
    name: "Saint-Ouen-l'Aumône",
    postalCode: "95310",
    metaTitle: "Entreprise de nettoyage à Saint-Ouen-l'Aumône (95310)",
    metaDescription:
      "Nettoyage de bureaux, entrepôts, commerces et vitres à Saint-Ouen-l'Aumône et au parc d'activités des Béthunes. Intervention rapide, devis gratuit sous 24 h.",
    h1: "Entreprise de nettoyage à Saint-Ouen-l'Aumône (95310)",
    intro:
      "Saint-Ouen-l'Aumône accueille l'un des plus grands parcs d'activités du Val-d'Oise. ProClean Empire, installée de l'autre côté de l'Oise à Pontoise, entretient bureaux, espaces logistiques, commerces et showrooms de la commune.",
    sections: [
      {
        title: "Nettoyage en parc d'activités",
        body: [
          "Au parc d'activités des Béthunes et dans les zones d'activités de la commune, nous entretenons les bureaux administratifs, vestiaires, salles de pause, sanitaires et zones d'accueil des entreprises industrielles et logistiques.",
          "Nos horaires s'adaptent aux équipes postées : intervention tôt le matin, entre deux équipes ou le week-end."
        ]
      },
      {
        title: "Commerces et showrooms",
        body: [
          "Pour les enseignes et showrooms, nous assurons sols, vitrines, cabines, sanitaires et espaces clients, avec une attention particulière à l'image de marque."
        ]
      },
      {
        title: "Nettoyage ponctuel",
        body: [
          "Remise en état avant l'arrivée d'un nouveau locataire, nettoyage après travaux, lavage de vitres en hauteur accessible : nous intervenons aussi pour des besoins ponctuels."
        ]
      }
    ],
    areas: ["Parc d'activités des Béthunes", "Centre-ville", "Liesse", "Secteur de la gare", "Bords de l'Oise"],
    faqs: [
      {
        question: "Intervenez-vous dans la zone des Béthunes ?",
        answer: "Oui, nous intervenons dans l'ensemble des zones d'activités de Saint-Ouen-l'Aumône."
      },
      {
        question: "Pouvez-vous intervenir en horaires décalés ?",
        answer: "Oui, nous adaptons nos passages à vos horaires d'exploitation, y compris tôt le matin et le week-end."
      },
      {
        question: "Nettoyez-vous les entrepôts ?",
        answer:
          "Nous entretenons les bureaux, vestiaires, sanitaires et espaces communs des sites logistiques. Pour les grandes surfaces de stockage, contactez-nous pour étudier votre besoin."
      }
    ],
    nearby: ["entreprise-nettoyage-pontoise", "entreprise-nettoyage-osny", "entreprise-nettoyage-cergy"]
  },
  {
    slug: "entreprise-nettoyage-conflans-sainte-honorine",
    name: "Conflans-Sainte-Honorine",
    postalCode: "78700",
    metaTitle: "Entreprise de nettoyage à Conflans-Sainte-Honorine (78700)",
    metaDescription:
      "Société de nettoyage à Conflans-Sainte-Honorine : bureaux, commerces, restaurants, vitres et remise en état. Équipe proche, devis gratuit sous 24 h.",
    h1: "Entreprise de nettoyage à Conflans-Sainte-Honorine (78700)",
    intro:
      "Au confluent de la Seine et de l'Oise, Conflans-Sainte-Honorine compte de nombreux commerces, restaurants, cabinets et bureaux. Depuis Pontoise, ProClean Empire y assure un nettoyage professionnel régulier ou ponctuel.",
    sections: [
      {
        title: "Nettoyage de commerces et restaurants à Conflans",
        body: [
          "Boutiques du centre-ville, restaurants et cafés : nous intervenons avant l'ouverture ou après la fermeture pour les sols, vitrines, sanitaires, salles et cuisines.",
          "Nos protocoles respectent les exigences d'hygiène propres à la restauration."
        ]
      },
      {
        title: "Entretien de bureaux et cabinets",
        body: [
          "Cabinets médicaux et paramédicaux, agences, bureaux : un entretien régulier, discret et suivi, avec un cahier des charges précis."
        ]
      },
      {
        title: "Vitrerie et remise en état",
        body: [
          "Nettoyage des vitres et vitrines, remise en état après travaux ou avant ouverture d'un nouveau commerce."
        ]
      }
    ],
    areas: ["Centre-ville", "Quartier de la gare", "Chennevières", "Fin-d'Oise", "Bords de Seine"],
    faqs: [
      {
        question: "Intervenez-vous dans les Yvelines ?",
        answer: "Oui, Conflans-Sainte-Honorine et les communes voisines des Yvelines font partie de notre zone d'intervention."
      },
      {
        question: "Faites-vous le nettoyage des vitrines ?",
        answer: "Oui, nous nettoyons vitrines et vitres intérieures et extérieures accessibles."
      },
      {
        question: "Proposez-vous des interventions ponctuelles ?",
        answer: "Oui, en plus des contrats réguliers, nous réalisons des nettoyages ponctuels et des remises en état."
      }
    ],
    nearby: ["entreprise-nettoyage-cergy", "entreprise-nettoyage-pontoise", "entreprise-nettoyage-argenteuil"]
  },
  {
    slug: "entreprise-nettoyage-argenteuil",
    name: "Argenteuil",
    postalCode: "95100",
    metaTitle: "Entreprise de nettoyage à Argenteuil (95100)",
    metaDescription:
      "Nettoyage professionnel à Argenteuil : bureaux, commerces, restaurants, hôtels, vitres et remise en état. Devis gratuit sous 24 h, intervention 7j/7.",
    h1: "Entreprise de nettoyage à Argenteuil (95100)",
    intro:
      "Plus grande ville du Val-d'Oise, Argenteuil rassemble bureaux, commerces, restaurants et établissements recevant du public. ProClean Empire y propose un nettoyage professionnel régulier ou ponctuel, avec un suivi qualité rigoureux.",
    sections: [
      {
        title: "Nettoyage de bureaux à Argenteuil",
        body: [
          "Postes de travail, salles de réunion, cuisines d'entreprise et sanitaires : nous établissons un planning adapté à vos horaires et à votre niveau d'exigence.",
          "Votre interlocuteur unique ajuste le dispositif dès que vos besoins changent."
        ]
      },
      {
        title: "Commerces, restaurants et hôtels",
        body: [
          "Pour les établissements recevant du public, nous intervenons en dehors des heures d'affluence afin que vos clients trouvent toujours des espaces impeccables.",
          "Hôtels : chambres, parties communes et espaces petit-déjeuner selon un protocole défini avec vous."
        ]
      },
      {
        title: "Interventions ponctuelles",
        body: [
          "Remise en état après travaux, nettoyage avant restitution de locaux, lavage de vitres : nous intervenons aussi à la demande, 7 jours sur 7."
        ]
      }
    ],
    areas: ["Centre-ville", "Val-d'Argent", "Orgemont", "Coteaux", "Val Notre-Dame", "Secteur de la gare"],
    faqs: [
      {
        question: "Intervenez-vous le week-end à Argenteuil ?",
        answer: "Oui, nous intervenons 7 jours sur 7 selon vos besoins."
      },
      {
        question: "Nettoyez-vous les hôtels ?",
        answer: "Oui, nous assurons l'entretien des chambres et des parties communes selon un protocole défini ensemble."
      },
      {
        question: "Comment obtenir un devis ?",
        answer: "Remplissez le formulaire de devis ou appelez-nous : vous recevez une proposition détaillée sous 24 h."
      }
    ],
    nearby: ["entreprise-nettoyage-conflans-sainte-honorine", "entreprise-nettoyage-saint-ouen-l-aumone", "entreprise-nettoyage-pontoise"]
  }
];

export function getCityPage(slug: string) {
  return cityPages.find((city) => city.slug === slug);
}
