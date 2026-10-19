import type { PremiumServiceProps } from "@/components/pages/premium-service";

/** Pages locales (SEO) : un contenu propre à chaque ville, sans texte dupliqué. */
export type LocalPage = {
  slug: string;
  city: string;
  postalCode: string;
  metaTitle: string;
  metaDescription: string;
  /** Libellé du lien (pied de page, page Zones). Par défaut : la ville. */
  label?: string;
  /** Nom et type du service pour le JSON-LD (par défaut : nettoyage et ménage Airbnb). */
  serviceName?: string;
  serviceType?: string;
  /** Pages liées affichées en bas de page (maillage interne). */
  related?: { href: string; label: string }[];
  /** Texte long propre à la page (SEO), affiché après le contenu principal. Liens : [libellé](/chemin). */
  article?: { heading: string; paragraphs: string[] }[];
  /** Liste de quartiers / arrondissements / communes desservis, avec un élément mis en avant. */
  districts?: { heading: string; intro: string; highlight?: string; list: string[] };
  /** Affiche la bannière « Ils nous font confiance ». */
  showPartners?: boolean;
  props: Omit<PremiumServiceProps, "schema">;
};

export const localPages: LocalPage[] = [
  {
    slug: "nettoyage-pontoise",
    city: "Pontoise",
    postalCode: "95300",
    metaTitle: "Ménage Airbnb et nettoyage de bureaux à Pontoise (95)",
    metaDescription:
      "Entreprise de nettoyage basée à Pontoise : ménage Airbnb entre deux voyageurs, nettoyage de bureaux et commerces, conciergerie d'entreprise. Intervention rapide dans tout Pontoise. Devis sous 24 h.",
    props: {
      eyebrow: "Pontoise · Val-d'Oise (95)",
      title: "Votre équipe de nettoyage, à Pontoise.",
      lead: "ProClean Empire est installée à Pontoise. Logements en location courte durée, bureaux, boutiques du centre-ville ou parties communes : nous sommes à quelques minutes de chez vous.",
      image: { src: "/media/photos/airbnb-entree-logement.webp", alt: "Entrée d'un logement préparé pour des voyageurs à Pontoise" },
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
        { title: "Devis sous 24 h", text: "Un prix clair, avant toute intervention." },
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
      "Nettoyage de bureaux, commerces et ménage Airbnb à Cergy et dans l'agglomération de Cergy-Pontoise : passages réguliers ou ponctuels, produits professionnels, devis sous 24 h.",
    props: {
      eyebrow: "Cergy · Agglomération de Cergy-Pontoise",
      title: "Des locaux nets à Cergy, à vos horaires.",
      lead: "Entreprises, commerces et propriétaires de Cergy : nous entretenons vos espaces de travail et préparons vos logements en location courte durée, depuis notre base voisine de Pontoise.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Bureaux modernes entretenus par ProClean Empire à Cergy" },
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
        { title: "Nous vous répondons", text: "Un devis sous 24 h, sans engagement." },
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
    label: "Entreprise de nettoyage à Paris",
    metaTitle: "Entreprise de nettoyage à Paris : bureaux, commerces, Airbnb",
    metaDescription:
      "Entreprise de nettoyage à Paris : entretien de bureaux et de commerces, ménage Airbnb, remise en état et vitrerie dans les 20 arrondissements. Interventions tôt le matin ou le soir. Devis sous 24 h.",
    serviceName: "Entreprise de nettoyage à Paris",
    serviceType: "Nettoyage de bureaux, nettoyage de commerces, ménage Airbnb, remise en état, vitrerie",
    showPartners: true,
    related: [
      { href: "/menage-airbnb-paris", label: "Ménage fin de séjour Airbnb à Paris" },
      { href: "/nettoyage-bureaux", label: "Nettoyage de bureaux" },
      { href: "/nettoyage-commerces", label: "Nettoyage de commerces" },
      { href: "/remise-en-etat", label: "Remise en état" },
      { href: "/nettoyage-vitrerie", label: "Vitres et vitrines" },
      { href: "/entreprise-de-nettoyage-paris-16", label: "Paris 16e" },
      { href: "/entreprise-de-nettoyage-seine-saint-denis", label: "Seine-Saint-Denis (93)" },
      { href: "/nettoyage-saint-ouen", label: "Saint-Ouen (93)" }
    ],
    props: {
      eyebrow: "Paris · 20 arrondissements",
      title: "Entreprise de nettoyage à Paris",
      lead: "Bureaux, boutiques, cabinets, showrooms et appartements en location courte durée : nous entretenons vos espaces parisiens à vos horaires, avec un seul interlocuteur et un devis clair avant toute intervention.",
      image: { src: "/media/photos/airbnb-salon-table-basse.webp", alt: "Salon d'appartement nettoyé et préparé par ProClean Empire" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Paris",
      intro: [
        { title: "Avant l'ouverture, après la fermeture", text: "Nous passons tôt le matin ou en soirée pour que vos équipes et vos clients trouvent des lieux nets, sans croiser le chariot de ménage." },
        { title: "Un contrat qui suit votre activité", text: "Un passage par semaine, plusieurs passages ou un entretien quotidien : la fréquence s'ajuste à votre surface et à votre fréquentation." },
        { title: "Un interlocuteur, une facture", text: "Plusieurs sites ou plusieurs logements à Paris ? Un planning commun et une facture mensuelle unique." }
      ],
      blocks: [
        {
          heading: "Nos prestations de nettoyage à Paris.",
          items: [
            { title: "Nettoyage de bureaux", text: "Postes de travail, salles de réunion, sanitaires, espace pause et sols : un entretien régulier qui garde vos locaux présentables pour vos collaborateurs comme pour vos visiteurs." },
            { title: "Nettoyage de commerces", text: "Boutiques, agences, instituts et showrooms : surface de vente, comptoir, cabines et vitrine intérieure prêts avant l'arrivée des premiers clients." },
            { title: "Ménage Airbnb", text: "Préparation du logement entre deux voyageurs, le jour fixé par vos réservations. Tout le détail est sur notre page ménage de fin de séjour à Paris." },
            { title: "Remise en état", text: "Grand nettoyage après travaux, avant une mise en location, à la fin d'un bail ou avant l'emménagement d'une équipe dans de nouveaux bureaux." },
            { title: "Vitrerie", text: "Vitres intérieures, cloisons vitrées et vitrines de boutique, pour une façade qui donne envie d'entrer." },
            { title: "Parties communes", text: "Halls d'entrée, escaliers et paliers d'immeubles parisiens, entretenus à jour fixe pour les résidents et les visiteurs." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez vos locaux", text: "Type d'espace, surface, arrondissement, fréquence souhaitée et contraintes d'accès." },
        { title: "Nous chiffrons", text: "Un devis clair sous 24 h, et une visite si la surface ou la prestation le demande." },
        { title: "Nous démarrons", text: "Aux jours et horaires convenus, avec la même check-list à chaque passage." }
      ],
      faq: [
        { question: "Dans quels arrondissements intervenez-vous ?", answer: "Dans les 20 arrondissements de Paris, du 1er au 20e, ainsi qu'en proche banlieue (Saint-Ouen, Clichy, Saint-Denis, Boulogne-Billancourt, Neuilly-sur-Seine)." },
        { question: "Pouvez-vous nettoyer nos bureaux en dehors des heures de travail ?", answer: "Oui. Nous intervenons tôt le matin ou en soirée, selon vos horaires d'ouverture et le planning convenu ensemble." },
        { question: "Quelle fréquence de passage choisir pour des bureaux à Paris ?", answer: "Pour une petite équipe, un passage par semaine suffit souvent ; dès que vous recevez du public ou que l'équipe grandit, deux à cinq passages par semaine sont plus adaptés. Nous vous conseillons lors du devis." },
        { question: "Faut-il fournir les produits et le matériel ?", answer: "Non. Nous venons avec nos produits et notre matériel professionnels. Si vous avez des produits imposés, nous les utilisons." },
        { question: "Proposez-vous aussi le ménage Airbnb à Paris ?", answer: "Oui, pour les conciergeries et les propriétaires : préparation complète du logement entre deux voyageurs, le jour fixé par vos réservations. Tous les détails sont sur notre page ménage de fin de séjour Airbnb à Paris." }
      ]
    },
    article: [
      {
        heading: "Pourquoi confier le nettoyage de vos locaux parisiens à ProClean Empire ?",
        paragraphs: [
          "À Paris, les locaux sont souvent compacts, très fréquentés et ouverts tard. Un bureau de dix personnes dans le 9e, une boutique dans le Marais ou un cabinet dans le 16e n'ont pas les mêmes besoins, mais tous attendent la même chose : arriver le matin dans un espace propre, sans avoir à y penser. C'est notre métier.",
          "Nous définissons avec vous une check-list adaptée à vos locaux : ce qui est fait à chaque passage (poubelles, sanitaires, cuisine, sols, points de contact), ce qui est fait chaque semaine (dépoussiérage en hauteur, vitres intérieures, électroménager) et ce qui est fait ponctuellement. Vous savez exactement ce que vous payez.",
          "Les contraintes parisiennes font partie du travail : badges et digicodes, gardiens, ascenseurs étroits, stationnement limité, horaires de copropriété. Nous les prenons en compte dès le devis pour que les passages se déroulent sans surprise."
        ]
      },
      {
        heading: "Bureaux, commerces et logements : une seule entreprise de nettoyage",
        paragraphs: [
          "Beaucoup de nos clients parisiens nous confient plusieurs types d'espaces : les bureaux de leur société, une boutique, et parfois des appartements en location courte durée. Regrouper ces prestations chez un même prestataire simplifie le suivi : un seul contact, un planning commun et une facture mensuelle.",
          "Pour les logements meublés et la location courte durée, nous travaillons pour des conciergeries et des propriétaires qui nous confient leurs logements à Paris et en Seine-Saint-Denis. Le ménage suit vos réservations, quel que soit le jour de la semaine : la méthode complète est décrite sur la page [ménage de fin de séjour Airbnb à Paris](/menage-airbnb-paris).",
          "Pour un déménagement, la fin d'un bail ou la livraison de travaux, notre [remise en état](/remise-en-etat) prépare les locaux en une intervention : dépoussiérage complet, traces de chantier, sanitaires, cuisine, sols et [vitres](/nettoyage-vitrerie)."
        ]
      }
    ],
    districts: {
      heading: "Nous intervenons dans tous les arrondissements",
      intro: "Bureaux, commerces et logements : nos équipes se déplacent dans tout Paris et en proche banlieue.",
      highlight: "Paris 16e — Passy, Auteuil, Chaillot, Porte Dauphine : bureaux, cabinets, boutiques et appartements entretenus à vos horaires.",
      list: [
        "Paris 1er", "Paris 2e", "Paris 3e", "Paris 4e", "Paris 5e", "Paris 6e", "Paris 7e", "Paris 8e", "Paris 9e", "Paris 10e",
        "Paris 11e", "Paris 12e", "Paris 13e", "Paris 14e", "Paris 15e", "Paris 16e", "Paris 17e", "Paris 18e", "Paris 19e", "Paris 20e"
      ]
    }
  },
  {
    slug: "nettoyage-saint-ouen",
    city: "Saint-Ouen-sur-Seine",
    postalCode: "93400",
    metaTitle: "Ménage Airbnb et nettoyage à Saint-Ouen (93)",
    metaDescription:
      "Ménage Airbnb et nettoyage de locaux à Saint-Ouen-sur-Seine (93) : logements préparés entre deux voyageurs, bureaux et commerces entretenus. Équipe habituée au secteur. Devis sous 24 h.",
    props: {
      eyebrow: "Saint-Ouen-sur-Seine · Seine-Saint-Denis (93)",
      title: "Saint-Ouen, logement après logement.",
      lead: "Nous préparons régulièrement des logements en location courte durée en Seine-Saint-Denis. Propriétaires, conciergeries et entreprises de Saint-Ouen : profitez d'une équipe qui connaît le secteur.",
      image: { src: "/media/photos/airbnb-table-accueil.webp", alt: "Table d'accueil préparée dans un logement de location courte durée à Saint-Ouen" },
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
        { title: "Nous vous répondons", text: "Devis sous 24 h, sans engagement." },
        { title: "Nous intervenons", text: "Aux dates convenues, avec la même checklist à chaque fois." }
      ],
      faq: [
        { question: "Intervenez-vous aussi à Saint-Denis ou Clichy ?", answer: "Oui, dans les communes voisines de Seine-Saint-Denis et des Hauts-de-Seine." },
        { question: "Le ménage peut-il avoir lieu le lundi ?", answer: "Oui : pour la location courte durée, la date suit toujours vos réservations." },
        { question: "Qui intervient chez moi ?", answer: "Une personne de notre équipe habituée au secteur, que vous connaîtrez." }
      ]
    }
  },
  {
    slug: "nettoyage-bureaux-pontoise",
    city: "Pontoise",
    postalCode: "95300",
    label: "Bureaux à Pontoise",
    serviceName: "Nettoyage de bureaux à Pontoise",
    serviceType: "Nettoyage de bureaux et de locaux professionnels",
    metaTitle: "Nettoyage de bureaux à Pontoise (95300) – Devis gratuit",
    metaDescription:
      "Nettoyage de bureaux à Pontoise (95300) par une entreprise installée à Pontoise : passages tôt le matin ou le soir, sanitaires, espace pause, vitres intérieures. Devis gratuit sous 24 h.",
    related: [
      { href: "/nettoyage-bureaux", label: "Bureaux & commerces" },
      { href: "/entreprise-de-nettoyage-cergy", label: "Entreprise de nettoyage à Cergy" },
      { href: "/conciergerie-entreprise", label: "Conciergerie d'entreprise" },
      { href: "/nettoyage-pontoise", label: "Tous nos services à Pontoise" }
    ],
    props: {
      eyebrow: "Nettoyage de bureaux · Pontoise (95300)",
      title: "Nettoyage de bureaux à Pontoise.",
      lead: "Cabinets, agences, plateaux de bureaux et petites entreprises de Pontoise : notre siège est dans la ville. Vos locaux sont entretenus avant l'arrivée de vos équipes ou après leur départ, par une équipe qui peut repasser dans l'heure en cas d'imprévu.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Bureaux lumineux nettoyés par ProClean Empire à Pontoise" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis gratuit",
      intro: [
        { title: "Une équipe de Pontoise", text: "Nous ne venons pas de l'autre bout de l'Île-de-France : notre base est à Pontoise, donc les horaires sont tenus et les urgences traitées vite." },
        { title: "Avant 8h ou après 18h", text: "Les passages se font quand vos bureaux sont vides : vos équipes arrivent dans des locaux propres, sans bruit d'aspirateur en pleine réunion." },
        { title: "Un devis gratuit sous 24 h", text: "Vous décrivez la surface et la fréquence, nous revenons vers vous avec une proposition claire, avant tout engagement." }
      ],
      blocks: [
        {
          heading: "Ce que comprend un passage dans vos bureaux.",
          items: [
            { title: "Postes de travail", text: "Bureaux dépoussiérés sans déplacer vos dossiers, écrans et téléphones essuyés, corbeilles vidées et sacs remplacés." },
            { title: "Sols", text: "Aspiration des moquettes, lavage des sols durs avec un produit adapté au revêtement, attention particulière aux entrées." },
            { title: "Sanitaires", text: "Cuvettes, lavabos, robinetterie et miroirs nettoyés et désinfectés ; papier et savon contrôlés à chaque passage." },
            { title: "Espace pause et kitchenette", text: "Plan de travail, évier, micro-ondes, réfrigérateur sur demande, tables et chaises nettoyés." },
            { title: "Points de contact", text: "Poignées, interrupteurs, rampes et boutons d'ascenseur : les surfaces touchées par tous sont traitées à chaque fois." },
            { title: "Vitres intérieures", text: "Cloisons vitrées, portes et parois de salles de réunion débarrassées des traces de doigts." }
          ]
        },
        {
          heading: "Pontoise et les communes voisines.",
          items: [
            { title: "Centre de Pontoise", text: "Cabinets médicaux et paramédicaux, études, agences et bureaux du centre historique, souvent dans des immeubles anciens aux accès étroits : nous venons avec un matériel compact." },
            { title: "Saint-Ouen-l'Aumône", text: "Entreprises de la zone d'activités des Béthunes et des parcs d'activités, juste de l'autre côté de l'Oise." },
            { title: "Osny et Éragny", text: "Bureaux de PME, locaux administratifs et showrooms, à quelques minutes de notre base." },
            { title: "Cergy", text: "Pour vos locaux de Cergy-Préfecture ou Saint-Christophe, voir notre page dédiée à Cergy." }
          ]
        },
        {
          heading: "Pourquoi un contrat régulier.",
          items: [
            { title: "Même intervenant", text: "La même personne connaît vos locaux, vos consignes et vos zones sensibles : pas besoin de tout réexpliquer." },
            { title: "Jour et heure fixes", text: "Le passage est calé une fois pour toutes dans votre semaine, selon la fréquence choisie ensemble." },
            { title: "Une facture par mois", text: "Tous les passages du mois regroupés sur une seule facture claire." },
            { title: "Ajustable", text: "Un séminaire, une visite client, un déménagement interne : nous ajoutons un passage ou un grand nettoyage." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez vos bureaux", text: "Surface approximative, nombre de pièces et de sanitaires, fréquence souhaitée." },
        { title: "Visite si nécessaire", text: "Pour un plateau ou plusieurs étages, nous passons voir les lieux : c'est à côté." },
        { title: "Premier passage", text: "Aux jour et heure convenus, avec une liste de tâches validée ensemble." }
      ],
      faq: [
        { question: "Intervenez-vous tôt le matin ou le soir à Pontoise ?", answer: "Oui. La plupart de nos passages en bureaux ont lieu avant l'ouverture ou après la fermeture, pour ne pas gêner vos équipes." },
        { question: "Quelle fréquence choisir pour des bureaux ?", answer: "Pour une petite équipe, un passage par semaine suffit souvent ; au-delà, ou avec de l'accueil du public, plusieurs passages par semaine sont recommandés. Nous vous conseillons lors du devis." },
        { question: "Faut-il être présent pendant le nettoyage ?", answer: "Non. Une clé, un badge ou un code d'accès suffit ; les modalités sont convenues avec vous et restent confidentielles." },
        { question: "Fournissez-vous les produits et le matériel ?", answer: "Oui, produits professionnels et matériel sont apportés par nos soins. Nous pouvons aussi assurer le réassort du papier et du savon." },
        { question: "Le devis est-il vraiment gratuit ?", answer: "Oui, le devis est gratuit et sans engagement, envoyé sous 24 h après votre demande." }
      ]
    }
  },
  {
    slug: "entreprise-de-nettoyage-cergy",
    city: "Cergy",
    postalCode: "95000",
    label: "Entreprise de nettoyage à Cergy",
    serviceName: "Entreprise de nettoyage à Cergy – bureaux et commerces",
    serviceType: "Nettoyage de bureaux, commerces et parties communes",
    metaTitle: "Entreprise de nettoyage à Cergy (95000) – Bureaux & commerces",
    metaDescription:
      "Entreprise de nettoyage à Cergy (95000) : entretien de bureaux, commerces et parties communes à Cergy-Préfecture, Saint-Christophe, Cergy-le-Haut et Port-Cergy. Passages à vos horaires, devis gratuit sous 24 h.",
    related: [
      { href: "/nettoyage-bureaux", label: "Bureaux & commerces" },
      { href: "/nettoyage-bureaux-pontoise", label: "Nettoyage de bureaux à Pontoise" },
      { href: "/conciergerie-entreprise", label: "Conciergerie d'entreprise" },
      { href: "/nettoyage-cergy", label: "Tous nos services à Cergy" }
    ],
    props: {
      eyebrow: "Entreprise de nettoyage · Cergy (95000)",
      title: "Entreprise de nettoyage à Cergy.",
      lead: "Bureaux, commerces, agences et halls d'immeuble de Cergy : nous assurons l'entretien régulier de vos locaux, quartier par quartier, depuis notre base de Pontoise, dans la même agglomération.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Plateau de bureaux entretenu par une entreprise de nettoyage à Cergy" },
      serviceId: "bureaux",
      ctaLabel: "Obtenir un devis à Cergy",
      intro: [
        { title: "Toute l'agglomération", text: "Cergy-Préfecture, Saint-Christophe, Cergy-le-Haut, Port-Cergy : nous connaissons les accès, les parkings et les horaires de chaque secteur." },
        { title: "Bureaux et commerces", text: "Un même prestataire pour vos bureaux, votre boutique, votre agence ou les parties communes de votre immeuble." },
        { title: "Des horaires décalés", text: "Interventions tôt le matin, en soirée ou le samedi, selon l'ouverture de vos locaux." }
      ],
      blocks: [
        {
          heading: "Nos clients à Cergy.",
          items: [
            { title: "Bureaux et sièges", text: "Plateaux, salles de réunion et open spaces des immeubles tertiaires de Cergy-Préfecture et de Saint-Christophe." },
            { title: "Commerces et agences", text: "Boutiques, agences immobilières, bancaires ou d'intérim : surface de vente propre et vitrine intérieure nette avant l'ouverture." },
            { title: "Cabinets et professions libérales", text: "Salles d'attente, cabinets de consultation et sanitaires entretenus avec des produits adaptés." },
            { title: "Parties communes", text: "Halls, escaliers, ascenseurs et locaux poubelles d'immeubles de bureaux ou résidentiels." },
            { title: "Remise en état", text: "Après travaux, à la fin d'un bail ou avant l'installation d'une équipe dans de nouveaux locaux." },
            { title: "Véhicules de société", text: "Nettoyage intérieur des voitures et utilitaires sur votre parking, en complément." }
          ]
        },
        {
          heading: "Notre méthode, à chaque passage.",
          items: [
            { title: "Une liste de tâches écrite", text: "Pièce par pièce, définie avec vous au démarrage : chacun sait ce qui est fait et quand." },
            { title: "Du haut vers le bas", text: "Dépoussiérage des surfaces hautes, puis plans de travail, puis sols : rien ne retombe sur ce qui vient d'être nettoyé." },
            { title: "Produits adaptés", text: "Un produit par usage (sanitaires, vitres, sols, surfaces), dosé correctement, avec du matériel professionnel." },
            { title: "Contrôle et signalement", text: "Ampoule grillée, fuite, consommable en rupture : vous êtes prévenu pour agir vite." }
          ]
        }
      ],
      steps: [
        { title: "Votre demande", text: "Adresse à Cergy, type de locaux, surface et fréquence souhaitée : deux minutes avec le formulaire." },
        { title: "Votre devis", text: "Gratuit, sous 24 h, après une visite si vos locaux sont grands ou sur plusieurs niveaux." },
        { title: "Votre planning", text: "Jours et horaires fixes, même intervenant, et une facture mensuelle." }
      ],
      faq: [
        { question: "Intervenez-vous dans tous les quartiers de Cergy ?", answer: "Oui : Cergy-Préfecture, Saint-Christophe, Cergy-le-Haut, Port-Cergy, le Grand Centre et les communes voisines comme Osny, Vauréal, Jouy-le-Moutier ou Saint-Ouen-l'Aumône." },
        { question: "Pouvez-vous nettoyer pendant nos heures d'ouverture ?", answer: "C'est possible pour les zones peu fréquentées, mais nous privilégions les horaires où vos locaux sont vides : tôt le matin ou le soir." },
        { question: "Proposez-vous des interventions ponctuelles ?", answer: "Oui : grand nettoyage, remise en état après travaux ou avant un événement, sans contrat régulier." },
        { question: "Comment se passe l'accès aux locaux ?", answer: "Badge, clé ou code d'accès confiés à notre équipe et conservés de façon confidentielle ; tout est convenu avec vous au démarrage." },
        { question: "Gérez-vous aussi les plantes ou la décoration ?", answer: "Oui, avec notre conciergerie d'entreprise : décoration des fêtes, plantes, réassort des consommables et petits services." }
      ]
    }
  },
  {
    slug: "menage-airbnb-paris",
    city: "Paris",
    postalCode: "75000",
    label: "Ménage Airbnb à Paris",
    serviceName: "Ménage de fin de séjour Airbnb à Paris",
    serviceType: "Ménage Airbnb / location courte durée",
    metaTitle: "Ménage fin de séjour Airbnb à Paris – check-out entre deux voyageurs",
    metaDescription:
      "Ménage de fin de séjour Airbnb à Paris : check-out entre deux voyageurs le jour de vos réservations, passage entre 11h et 14h, linge en option, Paris Nord (17e, 18e, 20e) et Saint-Ouen. Devis gratuit sous 24 h.",
    related: [
      { href: "/menage-airbnb", label: "Ménage Airbnb" },
      { href: "/nettoyage-saint-ouen", label: "Saint-Ouen-sur-Seine" },
      { href: "/nettoyage-paris", label: "Tous nos services à Paris" }
    ],
    props: {
      eyebrow: "Ménage Airbnb · Fin de séjour · Paris",
      title: "Ménage de fin de séjour Airbnb à Paris.",
      lead: "Le voyageur part à 11h, le suivant arrive à 15h. Entre les deux, nous faisons le check-out complet de votre appartement parisien : ménage, lits, salle de bain, cuisine et contrôle final, le jour exact de vos réservations.",
      image: { src: "/media/photos/airbnb-salon-table-basse.webp", alt: "Appartement parisien en location courte durée prêt après un ménage de fin de séjour" },
      serviceId: "airbnb",
      ctaLabel: "Demander un devis pour mon appartement",
      intro: [
        { title: "Entre 11h et 14h", text: "Le créneau du check-out : votre logement est prêt bien avant l'heure d'arrivée du voyageur suivant." },
        { title: "Votre calendrier fait foi", text: "Week-end, jour férié, lundi : nous ne déplaçons jamais un ménage de fin de séjour." },
        { title: "Paris Nord et Saint-Ouen", text: "Nous intervenons régulièrement dans les 17e, 18e et 20e arrondissements et à Saint-Ouen-sur-Seine, et dans tout Paris sur demande." }
      ],
      blocks: [
        {
          heading: "La check-list de fin de séjour.",
          items: [
            { title: "Entrée et pièces de vie", text: "Sols aspirés et lavés, surfaces et étagères dépoussiérées, canapé et coussins remis en place, objets oubliés mis de côté." },
            { title: "Chambres", text: "Draps et taies retirés, lit refait avec du linge propre, dessous de lit et tables de chevet contrôlés." },
            { title: "Salle de bain", text: "Douche ou baignoire, lavabo, WC, robinetterie et miroirs nettoyés et désinfectés, serviettes remplacées." },
            { title: "Cuisine", text: "Plaques, évier, plan de travail, intérieur du micro-ondes et du réfrigérateur vérifiés, vaisselle rangée propre." },
            { title: "Poubelles et consommables", text: "Poubelles vidées, sacs remplacés ; papier toilette, savon et produits d'accueil contrôlés et réassortis sur demande." },
            { title: "Contrôle final", text: "Tour complet du logement, fenêtres fermées, lumières éteintes, clés remises comme convenu." }
          ]
        },
        {
          heading: "Pensé pour les appartements parisiens.",
          items: [
            { title: "Petites surfaces", text: "Studios et deux-pièces sous les toits ou en étage sans ascenseur : nous venons avec un matériel compact." },
            { title: "Accès variés", text: "Boîte à clés, digicode, gardien ou conciergerie : nous suivons vos consignes d'accès, qui restent confidentielles." },
            { title: "Linge en option", text: "Vous fournissez le linge, ou nous l'organisons avec vous selon le nombre de couchages." },
            { title: "Imprévus signalés", text: "Casse, tache, objet oublié ou logement laissé très sale : vous êtes prévenu immédiatement." }
          ]
        },
        {
          heading: "Conciergeries et multi-logements.",
          items: [
            { title: "Un planning commun", text: "Vous nous transmettez les départs de tous vos logements, nous organisons les passages." },
            { title: "Une facture mensuelle", text: "Tous les ménages du mois sur une seule facture claire." },
            { title: "Un interlocuteur", text: "Une seule personne à contacter pour un changement de dernière minute." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez le logement", text: "Arrondissement, surface, couchages, linge et accès : deux minutes avec le formulaire." },
        { title: "Devis gratuit sous 24 h", text: "Un prix clair par ménage, avant le premier passage." },
        { title: "Check-out à chaque départ", text: "Nous intervenons aux dates de vos réservations et vous confirmons quand le logement est prêt." }
      ],
      faq: [
        { question: "Combien de temps dure un ménage de fin de séjour à Paris ?", answer: "Cela dépend de la surface et de l'état du logement ; pour un studio ou un deux-pièces, le passage tient largement dans le créneau 11h-14h." },
        { question: "Intervenez-vous le dimanche et les jours fériés ?", answer: "Oui : le ménage suit vos réservations, quel que soit le jour de la semaine." },
        { question: "Quels arrondissements couvrez-vous ?", answer: "Tout Paris, avec des passages très réguliers dans les 17e, 18e et 20e arrondissements, ainsi qu'à Saint-Ouen-sur-Seine et dans les communes voisines." },
        { question: "Pouvez-vous gérer le linge ?", answer: "Oui, en option : changement des draps et des serviettes à chaque départ, avec votre linge ou un linge que nous organisons avec vous." },
        { question: "Travaillez-vous avec les conciergeries ?", answer: "Oui, nous préparons des logements pour des conciergeries et des propriétaires, avec un planning commun et une facture mensuelle." }
      ]
    }
  },
  {
    slug: "entreprise-de-nettoyage-paris-16",
    city: "Paris 16e",
    postalCode: "75016",
    label: "Entreprise de nettoyage Paris 16e",
    metaTitle: "Entreprise de nettoyage Paris 16e : bureaux, cabinets, appartements",
    metaDescription:
      "Entreprise de nettoyage dans le 16e arrondissement de Paris (Passy, Auteuil, Chaillot) : entretien de bureaux, cabinets, boutiques, halls d'immeuble et appartements meublés. Devis sous 24 h.",
    serviceName: "Entreprise de nettoyage à Paris 16e",
    serviceType: "Nettoyage de bureaux, cabinets, commerces, parties communes et appartements meublés",
    related: [
      { href: "/nettoyage-paris", label: "Entreprise de nettoyage à Paris" },
      { href: "/menage-airbnb-paris", label: "Ménage Airbnb à Paris" },
      { href: "/nettoyage-bureaux", label: "Nettoyage de bureaux" },
      { href: "/nettoyage-vitrerie", label: "Vitres et vitrines" }
    ],
    props: {
      eyebrow: "Paris 16e · Passy · Auteuil · Chaillot",
      title: "Entreprise de nettoyage dans le 16e arrondissement",
      lead: "Cabinets, sièges sociaux, boutiques de quartier, immeubles haussmanniens et appartements meublés : dans le 16e, la propreté fait partie de l'image. Nous l'entretenons avec discrétion, à vos horaires.",
      image: { src: "/media/photos/airbnb-entree-logement.webp", alt: "Entrée d'appartement nettoyée par ProClean Empire" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis dans le 16e",
      intro: [
        { title: "Discrétion", text: "Interventions hors des heures de rendez-vous et de réception, pour que vos clients ne voient que le résultat." },
        { title: "Matériaux délicats", text: "Parquets, marbre, boiseries et vitrages anciens traités avec les produits adaptés." },
        { title: "Un seul contact", text: "Le même interlocuteur pour le devis, le planning et les ajustements." }
      ],
      blocks: [
        {
          heading: "Ce que nous entretenons dans le 16e.",
          items: [
            { title: "Cabinets et professions libérales", text: "Salle d'attente, bureaux, sanitaires et points de contact nettoyés avant l'arrivée des patients ou des clients." },
            { title: "Bureaux et sièges", text: "Plateaux, salles de réunion et espaces d'accueil entretenus tôt le matin ou en soirée." },
            { title: "Boutiques", text: "Commerces de la rue de Passy, de l'avenue Victor-Hugo ou d'Auteuil prêts avant l'ouverture." },
            { title: "Halls d'immeuble", text: "Halls, escaliers, miroirs et paliers entretenus à jour fixe pour les copropriétés et les syndics." },
            { title: "Appartements meublés", text: "Préparation entre deux occupants et remise en état avant une nouvelle location." },
            { title: "Vitres et miroirs", text: "Vitres intérieures, portes vitrées et miroirs de hall sans traces." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous écrivez", text: "Adresse, type de local, surface, horaires d'accès et fréquence souhaitée." },
        { title: "Nous chiffrons", text: "Devis clair sous 24 h, visite sur place si nécessaire." },
        { title: "Nous assurons le suivi", text: "Même check-list à chaque passage, ajustée avec vous au fil des semaines." }
      ],
      faq: [
        { question: "Intervenez-vous dans tout le 16e ?", answer: "Oui : Passy, Auteuil, la Muette, Chaillot, Porte Dauphine, Trocadéro et Point-du-Jour, ainsi qu'à Boulogne-Billancourt et Neuilly-sur-Seine." },
        { question: "Pouvez-vous intervenir avant l'ouverture d'un cabinet ?", answer: "Oui, nous passons tôt le matin ou après la dernière consultation, selon le planning convenu." },
        { question: "Entretenez-vous les parties communes d'immeubles ?", answer: "Oui, halls, escaliers et paliers, à jour et heure fixes, pour les copropriétés comme pour les syndics." },
        { question: "Vos produits conviennent-ils aux parquets et au marbre ?", answer: "Oui, nous adaptons produits et méthodes à chaque surface. Si vous avez des consignes ou des produits imposés, nous les suivons." }
      ]
    },
    article: [
      {
        heading: "Nettoyer dans le 16e : des locaux qui reçoivent",
        paragraphs: [
          "Le 16e arrondissement compte beaucoup de cabinets médicaux et d'avocats, de sièges de sociétés, d'ambassades et de boutiques de quartier. Ce sont des lieux qui reçoivent : un hall terne ou une salle d'attente négligée se remarque tout de suite. Notre travail consiste à rendre ces espaces impeccables sans que personne ne nous voie.",
          "Les immeubles anciens demandent des gestes précis : parquets cirés ou vitrifiés, sols en marbre, boiseries, moulures et grandes fenêtres. Nous choisissons les produits et le matériel en fonction de chaque surface, et nous notons dans la check-list de votre site ce qu'il faut éviter.",
          "Pour les propriétaires d'appartements meublés du quartier, nous préparons le logement entre deux occupants ou avant une mise en location, et nous pouvons réaliser une [remise en état](/remise-en-etat) complète après travaux. Pour la location courte durée, voir notre page [ménage Airbnb à Paris](/menage-airbnb-paris)."
        ]
      }
    ],
    districts: {
      heading: "Quartiers desservis",
      intro: "Nous intervenons dans tout le 16e arrondissement et dans les communes limitrophes.",
      list: ["Passy", "Auteuil", "La Muette", "Chaillot", "Trocadéro", "Porte Dauphine", "Point-du-Jour", "Victor-Hugo", "Boulogne-Billancourt", "Neuilly-sur-Seine"]
    }
  },
  {
    slug: "entreprise-de-nettoyage-seine-saint-denis",
    city: "Seine-Saint-Denis",
    postalCode: "93000",
    label: "Entreprise de nettoyage Seine-Saint-Denis",
    metaTitle: "Entreprise de nettoyage en Seine-Saint-Denis (93) : bureaux, commerces, Airbnb",
    metaDescription:
      "Entreprise de nettoyage en Seine-Saint-Denis (93) : bureaux, entrepôts, commerces, parties communes et ménage Airbnb à Saint-Ouen, Saint-Denis, Aubervilliers, Montreuil et Pantin. Devis sous 24 h.",
    serviceName: "Entreprise de nettoyage en Seine-Saint-Denis",
    serviceType: "Nettoyage de bureaux, locaux d'activité, commerces, parties communes et ménage Airbnb",
    related: [
      { href: "/nettoyage-saint-ouen", label: "Saint-Ouen-sur-Seine" },
      { href: "/nettoyage-paris", label: "Entreprise de nettoyage à Paris" },
      { href: "/menage-airbnb", label: "Ménage Airbnb" },
      { href: "/remise-en-etat", label: "Remise en état" }
    ],
    props: {
      eyebrow: "Seine-Saint-Denis · 93",
      title: "Entreprise de nettoyage en Seine-Saint-Denis",
      lead: "Bureaux de zones d'activité, commerces, locaux mixtes, halls d'immeuble et logements en location courte durée : nous intervenons déjà régulièrement dans le 93, avec des créneaux faciles à caler.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Intervention de nettoyage professionnel par ProClean Empire" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis dans le 93",
      intro: [
        { title: "Déjà sur place", text: "Des passages réguliers à Saint-Ouen et dans les communes voisines, donc des créneaux disponibles rapidement." },
        { title: "Locaux variés", text: "Bureaux, ateliers, showrooms, entrepôts légers et commerces : chaque site a sa check-list." },
        { title: "Location courte durée", text: "Ménage entre deux voyageurs pour les conciergeries et propriétaires du département." }
      ],
      blocks: [
        {
          heading: "Nos prestations dans le 93.",
          items: [
            { title: "Bureaux et sièges", text: "Entretien régulier des bureaux des zones d'activité de Saint-Denis Pleyel, Saint-Ouen, Pantin ou Montreuil." },
            { title: "Locaux d'activité", text: "Showrooms, ateliers et zones de stockage légères : sols, sanitaires, vestiaires et espaces de pause." },
            { title: "Commerces", text: "Boutiques et restaurants prêts à l'ouverture, avec un passage tôt le matin ou après la fermeture." },
            { title: "Parties communes", text: "Halls, escaliers, ascenseurs et local poubelles d'immeubles résidentiels ou de bureaux." },
            { title: "Ménage Airbnb", text: "Préparation complète du logement entre deux séjours, le jour fixé par vos réservations." },
            { title: "Remise en état", text: "Grand nettoyage après travaux, avant une première location ou une livraison de locaux." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez le site", text: "Commune, type de local, surface, fréquence et accès." },
        { title: "Nous vous répondons", text: "Un devis sous 24 h, sans engagement." },
        { title: "Nous démarrons", text: "Aux jours convenus, avec un contrôle régulier du résultat." }
      ],
      faq: [
        { question: "Dans quelles communes du 93 intervenez-vous ?", answer: "Saint-Ouen-sur-Seine, Saint-Denis, Aubervilliers, Pantin, Montreuil, Bagnolet, Les Lilas, Épinay-sur-Seine, L'Île-Saint-Denis et les communes voisines." },
        { question: "Nettoyez-vous des locaux mixtes bureaux et atelier ?", answer: "Oui, nous adaptons la check-list à chaque zone : bureaux, sanitaires, vestiaires, espace de pause et zones d'activité." },
        { question: "Proposez-vous le ménage Airbnb à Saint-Denis ou Aubervilliers ?", answer: "Oui, pour les conciergeries et les propriétaires, avec un planning commun si vous gérez plusieurs logements." },
        { question: "Pouvez-vous intervenir le week-end ?", answer: "Oui selon la prestation : le ménage de location courte durée suit toujours vos réservations, et les locaux professionnels peuvent être entretenus en dehors de vos heures d'ouverture." }
      ]
    },
    article: [
      {
        heading: "Le nettoyage professionnel en Seine-Saint-Denis",
        paragraphs: [
          "La Seine-Saint-Denis accueille à la fois de grands quartiers de bureaux, des zones d'activité, des commerces de centre-ville et un nombre croissant de logements en location courte durée, notamment autour des gares et du Stade de France. Ces locaux n'ont pas les mêmes contraintes : nous construisons une check-list propre à chaque site plutôt qu'une prestation standard.",
          "Pour les entreprises, nous assurons l'entretien de bureaux et de locaux d'activité à la fréquence choisie, avec des horaires décalés pour ne pas gêner vos équipes. Pour les copropriétés et les gestionnaires, nous entretenons les parties communes à jour fixe. Pour la location courte durée, notre [ménage Airbnb](/menage-airbnb) prépare chaque logement entre deux voyageurs.",
          "Nous intervenons déjà régulièrement à [Saint-Ouen-sur-Seine](/nettoyage-saint-ouen) et dans les communes voisines, ce qui permet de proposer des créneaux rapidement. Pour vos locaux parisiens, voir aussi notre page [entreprise de nettoyage à Paris](/nettoyage-paris)."
        ]
      }
    ],
    districts: {
      heading: "Communes desservies dans le 93",
      intro: "Nos interventions couvrent l'ouest et le sud du département, au plus près de Paris.",
      list: ["Saint-Ouen-sur-Seine", "Saint-Denis", "Aubervilliers", "Pantin", "Montreuil", "Bagnolet", "Les Lilas", "Épinay-sur-Seine", "L'Île-Saint-Denis", "La Plaine Saint-Denis"]
    }
  },
  {
    slug: "lavage-auto-domicile-cergy-pontoise",
    city: "Cergy-Pontoise",
    postalCode: "95000",
    label: "Lavage auto à Cergy-Pontoise",
    serviceName: "Lavage auto à domicile à Cergy-Pontoise",
    serviceType: "Nettoyage automobile à domicile et en entreprise (detailing)",
    metaTitle: "Lavage auto à domicile à Cergy-Pontoise – intérieur et extérieur",
    metaDescription:
      "Lavage et nettoyage de voiture à domicile ou sur le parking de votre entreprise à Cergy, Pontoise, Osny, Éragny, Saint-Ouen-l'Aumône et Herblay : intérieur, extérieur ou complet. Devis gratuit sous 24 h.",
    related: [
      { href: "/nettoyage-automobile", label: "Nettoyage auto & avion" },
      { href: "/conciergerie-entreprise", label: "Conciergerie d'entreprise" },
      { href: "/entreprise-de-nettoyage-cergy", label: "Entreprise de nettoyage à Cergy" },
      { href: "/nettoyage-pontoise", label: "Tous nos services à Pontoise" }
    ],
    props: {
      eyebrow: "Lavage auto à domicile · Cergy-Pontoise (95)",
      title: "Votre voiture nettoyée, là où elle est garée.",
      lead: "Devant chez vous, dans votre résidence ou sur le parking de votre entreprise : nous venons nettoyer votre voiture à Cergy, Pontoise et dans les communes voisines. Vous ne perdez ni votre samedi ni votre pause déjeuner dans une station de lavage.",
      image: { src: "/media/photos/interieur-auto-apres.webp", alt: "Intérieur de voiture nettoyé à domicile par ProClean Empire à Cergy-Pontoise" },
      serviceId: "vehicules",
      ctaLabel: "Demander un devis pour ma voiture",
      intro: [
        { title: "On vient à vous", text: "À votre domicile ou sur votre lieu de travail, dans toute l'agglomération de Cergy-Pontoise : la voiture ne bouge pas." },
        { title: "Trois formules", text: "Intérieur, extérieur ou complet : vous choisissez selon l'état du véhicule et l'occasion (vente, retour de vacances, entretien régulier)." },
        { title: "Particuliers et entreprises", text: "Votre voiture personnelle, les véhicules de société ou ceux de vos salariés pendant leur journée de travail." }
      ],
      blocks: [
        {
          heading: "Ce que nous nettoyons.",
          items: [
            { title: "Habitacle", text: "Aspiration des sièges, tapis, moquettes et coffre, y compris sous les sièges et dans les rangements." },
            { title: "Plastiques et tableau de bord", text: "Tableau de bord, console, contre-portes et volant dépoussiérés et nettoyés avec un produit adapté à chaque matière." },
            { title: "Vitres", text: "Vitres et rétroviseurs nettoyés à l'intérieur et à l'extérieur, pour une visibilité nette sans traces." },
            { title: "Sièges et tissus", text: "Taches et salissures des sièges en tissu traitées ; cuir nettoyé avec un produit dédié." },
            { title: "Carrosserie", text: "Lavage extérieur de la carrosserie, des jantes et des bas de caisse, puis séchage soigné." },
            { title: "Finitions", text: "Seuils de portes, poignées et détails contrôlés avant de vous rendre les clés." }
          ]
        },
        {
          heading: "Où nous intervenons.",
          items: [
            { title: "Cergy et Pontoise", text: "Cergy-Préfecture, Saint-Christophe, Cergy-le-Haut, Port-Cergy, centre de Pontoise et quartiers résidentiels : notre base est à Pontoise." },
            { title: "Osny, Éragny et Vauréal", text: "Maisons, résidences et parkings d'entreprises, à quelques minutes de notre base." },
            { title: "Saint-Ouen-l'Aumône et Herblay", text: "Zones d'activités et parkings de bureaux : idéal pour faire nettoyer les véhicules de l'équipe pendant la journée." },
            { title: "Plus loin en Île-de-France", text: "Pour une flotte ou plusieurs véhicules au même endroit, nous nous déplaçons ailleurs en Île-de-France sur devis." }
          ]
        },
        {
          heading: "Pour les entreprises.",
          items: [
            { title: "Véhicules de société", text: "Voitures de service, commerciaux et utilitaires légers nettoyés sur votre parking, sans immobiliser vos équipes." },
            { title: "Un avantage pour vos salariés", text: "Le nettoyage des voitures de vos collaborateurs pendant qu'ils travaillent, en complément de notre conciergerie d'entreprise." },
            { title: "Un seul prestataire", text: "Le même interlocuteur que pour l'entretien de vos bureaux, avec une facture professionnelle." }
          ]
        }
      ],
      steps: [
        { title: "Votre demande", text: "Modèle du véhicule, formule souhaitée, adresse et disponibilités : deux minutes avec le formulaire." },
        { title: "Votre devis", text: "Gratuit, sous 24 h, avec le créneau proposé." },
        { title: "Le nettoyage", text: "Nous venons à l'adresse convenue avec notre matériel et nos produits professionnels." }
      ],
      faq: [
        { question: "Faut-il être présent pendant le nettoyage ?", answer: "Pas forcément : il suffit que la voiture soit accessible et que les clés nous soient confiées au début de l'intervention selon ce qui est convenu avec vous." },
        { question: "De quoi avez-vous besoin sur place ?", answer: "Nous venons avec notre matériel et nos produits. Les conditions d'accès (stationnement, point d'eau, prise électrique) sont vérifiées avec vous au moment du devis." },
        { question: "Nettoyez-vous les SUV, monospaces et utilitaires ?", answer: "Oui. Les grands véhicules et les véhicules très sales font l'objet d'un devis adapté." },
        { question: "Pouvez-vous nettoyer plusieurs véhicules d'une entreprise ?", answer: "Oui, sur votre parking, en une ou plusieurs fois, avec une facture unique." },
        { question: "Le devis est-il gratuit ?", answer: "Oui, gratuit et sans engagement, envoyé sous 24 h après votre demande." }
      ]
    }
  }
];

export function getLocalPage(slug: string): LocalPage {
  const page = localPages.find((item) => item.slug === slug);
  if (!page) throw new Error(`Page locale inconnue : ${slug}`);
  return page;
}
