import type { PremiumServiceProps } from "@/components/pages/premium-service";

/** Pages locales (SEO) : un contenu propre à chaque ville, sans texte dupliqué. */
export type LocalPage = {
  slug: string;
  city: string;
  postalCode: string;
  metaTitle: string;
  metaDescription: string;
  props: Omit<PremiumServiceProps, "schema">;
};

export const localPages: LocalPage[] = [
  {
    slug: "nettoyage-pontoise",
    city: "Pontoise",
    postalCode: "95300",
    metaTitle: "Ménage Airbnb et nettoyage de bureaux à Pontoise (95)",
    metaDescription:
      "Entreprise de nettoyage basée à Pontoise : ménage Airbnb entre deux voyageurs, nettoyage de bureaux et commerces, conciergerie d'entreprise. Intervention rapide dans tout Pontoise. Devis sous 24h.",
    props: {
      eyebrow: "Pontoise · Val-d'Oise (95)",
      title: "Votre équipe de nettoyage, à Pontoise.",
      lead: "ProClean Empire est installée à Pontoise. Logements en location courte durée, bureaux, boutiques du centre-ville ou parties communes : nous sommes à quelques minutes de chez vous.",
      image: { src: "/media/photos/airbnb-entree-logement.jpeg", alt: "Entrée d'un logement préparé pour des voyageurs à Pontoise" },
      serviceId: "airbnb",
      ctaLabel: "Demander un devis à Pontoise",
      intro: [
        { title: "Notre ville", text: "Notre siège est à Pontoise : c'est ici que nous sommes le plus réactifs." },
        { title: "Airbnb et courte durée", text: "Ménage entre deux voyageurs, le jour que vous fixez, entre 11h et 14h." },
        { title: "Commerces et bureaux", text: "Entretien régulier ou ponctuel, avant l'ouverture ou après la fermeture." }
      ],
      blocks: [
        {
          heading: "Ce que nous faisons à Pontoise.",
          items: [
            { title: "Ménage Airbnb", text: "Studios et appartements du centre historique comme des quartiers résidentiels." },
            { title: "Bureaux et cabinets", text: "Professions libérales, agences et petites entreprises : un entretien à votre rythme." },
            { title: "Boutiques", text: "Surface de vente, comptoir et vitrine intérieure prêts à l'ouverture." },
            { title: "Halls d'immeuble", text: "Parties communes propres pour les résidents et les visiteurs." },
            { title: "Remise en état", text: "Après travaux, avant une mise en location ou à la fin d'un bail." },
            { title: "Conciergerie d'entreprise", text: "Décoration des fêtes, plantes et consommables pour vos locaux." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous écrivez", text: "Le formulaire prend deux minutes ; vous pouvez aussi nous appeler." },
        { title: "Devis sous 24h", text: "Un prix clair, avant toute intervention." },
        { title: "Nous intervenons", text: "Rapidement, puisque nous sommes sur place." }
      ],
      faq: [
        { question: "Êtes-vous vraiment basés à Pontoise ?", answer: "Oui, le siège de ProClean Empire est à Pontoise (95)." },
        { question: "Pouvez-vous intervenir en urgence ?", answer: "Contactez-nous : à Pontoise, nous trouvons souvent un créneau rapidement." },
        { question: "Travaillez-vous aussi dans les villes voisines ?", answer: "Oui : Cergy, Saint-Ouen-l'Aumône, Osny, Éragny et tout le Val-d'Oise." }
      ]
    }
  },
  {
    slug: "nettoyage-cergy",
    city: "Cergy",
    postalCode: "95000",
    metaTitle: "Nettoyage de bureaux et ménage Airbnb à Cergy (95)",
    metaDescription:
      "Nettoyage de bureaux, commerces et ménage Airbnb à Cergy et dans l'agglomération de Cergy-Pontoise : passages réguliers ou ponctuels, produits professionnels, devis sous 24h.",
    props: {
      eyebrow: "Cergy · Agglomération de Cergy-Pontoise",
      title: "Des locaux nets à Cergy, à vos horaires.",
      lead: "Entreprises, commerces et propriétaires de Cergy : nous entretenons vos espaces de travail et préparons vos logements en location courte durée, depuis notre base voisine de Pontoise.",
      image: { src: "/media/photos/hero-showcase.jpg", alt: "Bureaux modernes entretenus par ProClean Empire à Cergy" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Cergy",
      intro: [
        { title: "Espaces de travail", text: "Bureaux, plateaux et salles de réunion entretenus sans perturber vos équipes." },
        { title: "Logements meublés", text: "Ménage entre deux locataires ou voyageurs, aux dates que vous choisissez." },
        { title: "À deux pas", text: "Notre équipe est basée à Pontoise, dans la même agglomération." }
      ],
      blocks: [
        {
          heading: "Pour les entreprises et les propriétaires de Cergy.",
          items: [
            { title: "Bureaux", text: "Entretien quotidien ou hebdomadaire, sanitaires et espace pause compris." },
            { title: "Commerces", text: "Boutiques, instituts et agences : un lieu accueillant dès l'ouverture." },
            { title: "Locations courte durée", text: "Studios et appartements préparés entre deux séjours, linge en option." },
            { title: "Fin de bail", text: "Remise en état complète avant l'état des lieux ou une nouvelle location." },
            { title: "Conciergerie d'entreprise", text: "Plantes, décoration des fêtes et réassort des consommables." },
            { title: "Detailing", text: "Nettoyage intérieur de véhicules de société sur demande." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez votre besoin", text: "Locaux ou logement, surface et fréquence." },
        { title: "Nous vous répondons", text: "Un devis sous 24h, sans engagement." },
        { title: "Nous démarrons", text: "Aux jours convenus, avec un contrôle régulier." }
      ],
      faq: [
        { question: "Intervenez-vous dans tous les quartiers de Cergy ?", answer: "Oui, ainsi que dans les communes de l'agglomération de Cergy-Pontoise." },
        { question: "Proposez-vous des passages le soir ?", answer: "Oui, après la fermeture de vos locaux si c'est plus pratique pour vous." },
        { question: "Peut-on commencer par un passage d'essai ?", answer: "Oui, une première intervention ponctuelle permet de valider le résultat." }
      ]
    }
  },
  {
    slug: "nettoyage-paris",
    city: "Paris",
    postalCode: "75000",
    metaTitle: "Ménage Airbnb et nettoyage de locaux à Paris",
    metaDescription:
      "Ménage Airbnb à Paris pour conciergeries et propriétaires : préparation du logement entre deux voyageurs, le jour fixé par vos réservations. Nettoyage de bureaux et boutiques parisiennes. Devis sous 24h.",
    props: {
      eyebrow: "Paris · Tous arrondissements",
      title: "Ménage Airbnb à Paris, réglé sur vos réservations.",
      lead: "À Paris, les arrivées s'enchaînent. Nous préparons vos appartements entre deux voyageurs, aux dates de votre calendrier, et entretenons aussi bureaux et boutiques.",
      image: { src: "/media/photos/airbnb-salon-table-basse.jpeg", alt: "Salon d'un appartement parisien en location courte durée prêt à accueillir" },
      serviceId: "airbnb",
      ctaLabel: "Demander un devis à Paris",
      intro: [
        { title: "Rotations rapides", text: "Passage entre 11h et 14h, entre le départ et l'arrivée." },
        { title: "Conciergeries", text: "Plusieurs appartements ? Un planning commun et une facture mensuelle." },
        { title: "Petits espaces", text: "Studios et deux-pièces parisiens : chaque mètre carré est soigné." }
      ],
      blocks: [
        {
          heading: "Nos interventions à Paris.",
          items: [
            { title: "Ménage entre voyageurs", text: "Lits, salle de bain, cuisine, sols et contrôle final à chaque passage." },
            { title: "Linge et consommables", text: "Changement du linge et réassort sur demande." },
            { title: "Signalement des imprévus", text: "Casse ou oubli : vous êtes prévenu immédiatement." },
            { title: "Bureaux", text: "Petits bureaux, showrooms et cabinets entretenus à vos horaires." },
            { title: "Boutiques", text: "Surface de vente prête avant l'arrivée des clients." },
            { title: "Grand nettoyage", text: "Remise en état avant une mise en location ou après travaux." }
          ]
        }
      ],
      steps: [
        { title: "Vous partagez votre calendrier", text: "Dates de départ et d'arrivée, accès au logement." },
        { title: "Nous confirmons", text: "Prix clair sous 24h, avant le premier passage." },
        { title: "Nous préparons", text: "Le logement est prêt avant l'arrivée du voyageur suivant." }
      ],
      faq: [
        { question: "Couvrez-vous tous les arrondissements ?", answer: "Oui, nous intervenons dans tout Paris." },
        { question: "Comment récupérez-vous les clés ?", answer: "Boîte à clés, digicode, gardien ou remise en main propre : nous nous adaptons." },
        { question: "Intervenez-vous le week-end ?", answer: "Oui, le ménage suit vos réservations, quel que soit le jour." }
      ]
    }
  },
  {
    slug: "nettoyage-saint-ouen",
    city: "Saint-Ouen-sur-Seine",
    postalCode: "93400",
    metaTitle: "Ménage Airbnb et nettoyage à Saint-Ouen (93)",
    metaDescription:
      "Ménage Airbnb et nettoyage de locaux à Saint-Ouen-sur-Seine (93) : logements préparés entre deux voyageurs, bureaux et commerces entretenus. Équipe habituée au secteur. Devis sous 24h.",
    props: {
      eyebrow: "Saint-Ouen-sur-Seine · Seine-Saint-Denis (93)",
      title: "Saint-Ouen, logement après logement.",
      lead: "Nous préparons régulièrement des logements en location courte durée en Seine-Saint-Denis. Propriétaires, conciergeries et entreprises de Saint-Ouen : profitez d'une équipe qui connaît le secteur.",
      image: { src: "/media/photos/airbnb-table-accueil.jpeg", alt: "Table d'accueil préparée dans un logement de location courte durée à Saint-Ouen" },
      serviceId: "airbnb",
      ctaLabel: "Demander un devis à Saint-Ouen",
      intro: [
        { title: "Secteur connu", text: "Des passages réguliers dans le 93, donc des créneaux faciles à caler." },
        { title: "Location courte durée", text: "Votre logement prêt pour chaque voyageur, le jour que vous fixez." },
        { title: "Locaux professionnels", text: "Bureaux et commerces entretenus à la fréquence de votre choix." }
      ],
      blocks: [
        {
          heading: "Ce que nous proposons à Saint-Ouen.",
          items: [
            { title: "Ménage Airbnb", text: "Préparation complète entre deux séjours, avec contrôle final." },
            { title: "Linge en option", text: "Vous fournissez le linge ou nous l'organisons ensemble." },
            { title: "Plusieurs logements", text: "Un planning unique et une facture mensuelle pour les conciergeries." },
            { title: "Bureaux et ateliers", text: "Entretien régulier des espaces de travail." },
            { title: "Commerces", text: "Boutiques et restaurants prêts à l'ouverture." },
            { title: "Remise en état", text: "Grand nettoyage avant une première mise en location." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous contactez", text: "Adresse, type de logement ou de local, fréquence." },
        { title: "Nous vous répondons", text: "Devis sous 24h, sans engagement." },
        { title: "Nous intervenons", text: "Aux dates convenues, avec la même checklist à chaque fois." }
      ],
      faq: [
        { question: "Intervenez-vous aussi à Saint-Denis ou Clichy ?", answer: "Oui, dans les communes voisines de Seine-Saint-Denis et des Hauts-de-Seine." },
        { question: "Le ménage peut-il avoir lieu le lundi ?", answer: "Oui : pour la location courte durée, la date suit toujours vos réservations." },
        { question: "Qui intervient chez moi ?", answer: "Une personne de notre équipe habituée au secteur, que vous connaîtrez." }
      ]
    }
  }
];

export function getLocalPage(slug: string): LocalPage {
  const page = localPages.find((item) => item.slug === slug);
  if (!page) throw new Error(`Page locale inconnue : ${slug}`);
  return page;
}
