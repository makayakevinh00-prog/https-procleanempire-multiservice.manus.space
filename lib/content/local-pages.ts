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
    metaTitle: "Nettoyage de bureaux et de commerces à Pontoise (95)",
    metaDescription:
      "Entreprise de nettoyage basée à Pontoise : nettoyage de bureaux et commerces, remise en état, conciergerie d'entreprise. Intervention rapide dans tout Pontoise. Devis sous 24 h.",
    props: {
      eyebrow: "Pontoise · Val-d'Oise (95)",
      title: "Votre équipe de nettoyage, à Pontoise.",
      lead: "ProClean Empire est installée à Pontoise. Bureaux, cabinets, boutiques du centre-ville ou parties communes : nous sommes à quelques minutes de chez vous.",
      image: { src: "/media/photos/landing/boutique-accueil.webp", alt: "Accueil d'une boutique entretenue par ProClean Empire" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Pontoise",
      intro: [
        { title: "Notre ville", text: "Notre siège est à Pontoise : c'est ici que nous sommes le plus réactifs." },
        { title: "Commerces et bureaux", text: "Entretien régulier ou ponctuel, avant l'ouverture ou après la fermeture." },
        { title: "Remise en état", text: "Après travaux, avant une mise en location ou à la fin d'un bail." }
      ],
      blocks: [
        {
          heading: "Ce que nous faisons à Pontoise.",
          items: [
            { title: "Bureaux et cabinets", text: "Professions libérales, agences et petites entreprises : un entretien à votre rythme." },
            { title: "Boutiques", text: "Surface de vente, comptoir et vitrine intérieure prêts à l'ouverture." },
            { title: "Halls d'immeuble", text: "Parties communes propres pour les résidents et les visiteurs." },
            { title: "Remise en état", text: "Après travaux, avant une mise en location ou à la fin d'un bail." },
            { title: "Conciergerie d'entreprise", text: "Décoration des fêtes, plantes et consommables pour vos locaux." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous écrivez", text: "Le formulaire prend deux minutes ; vous pouvez aussi nous écrire sur WhatsApp." },
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
    metaTitle: "Nettoyage de bureaux et de commerces à Cergy (95)",
    metaDescription:
      "Nettoyage de bureaux et de commerces à Cergy et dans l'agglomération de Cergy-Pontoise : passages réguliers ou ponctuels, produits professionnels, devis sous 24 h.",
    props: {
      eyebrow: "Cergy · Agglomération de Cergy-Pontoise",
      title: "Des locaux nets à Cergy, à vos horaires.",
      lead: "Entreprises et commerces de Cergy : nous entretenons vos espaces de travail et vos points de vente, depuis notre base voisine de Pontoise.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Bureaux modernes entretenus par ProClean Empire à Cergy" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Cergy",
      intro: [
        { title: "Espaces de travail", text: "Bureaux, plateaux et salles de réunion entretenus sans perturber vos équipes." },
        { title: "Commerces", text: "Boutiques, instituts et agences prêts à l'ouverture." },
        { title: "À deux pas", text: "Notre équipe est basée à Pontoise, dans la même agglomération." }
      ],
      blocks: [
        {
          heading: "Pour les entreprises et les commerces de Cergy.",
          items: [
            { title: "Bureaux", text: "Entretien quotidien ou hebdomadaire, sanitaires et espace pause compris." },
            { title: "Commerces", text: "Boutiques, instituts et agences : un lieu accueillant dès l'ouverture." },
            { title: "Fin de bail", text: "Remise en état complète avant l'état des lieux ou une nouvelle location." },
            { title: "Conciergerie d'entreprise", text: "Plantes, décoration des fêtes et réassort des consommables." },
            { title: "Detailing", text: "Nettoyage intérieur de véhicules de société sur demande." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez votre besoin", text: "Vos locaux, leur surface et la fréquence souhaitée." },
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
  },
  // Communes voisines de Cergy-Pontoise : priorité du référencement local.
  {"slug": "nettoyage-osny", "city": "Osny", "postalCode": "95520", "label": "Nettoyage à Osny", "serviceName": "Nettoyage de bureaux et de commerces à Osny", "serviceType": "Nettoyage de bureaux, commerces et parties communes", "metaTitle": "Entreprise de nettoyage à Osny (95520) – Bureaux et commerces", "metaDescription": "Entreprise de nettoyage à Osny (95520) : entretien de bureaux, commerces, cabinets et parties communes, passages à vos horaires depuis Pontoise. Devis gratuit sous 24 h.", "related": [{"href": "/nettoyage-bureaux", "label": "Bureaux & commerces"}, {"href": "/entreprise-de-nettoyage-cergy", "label": "Entreprise de nettoyage à Cergy"}, {"href": "/nettoyage-bureaux-pontoise", "label": "Nettoyage de bureaux à Pontoise"}, {"href": "/nettoyage-saint-ouen-l-aumone", "label": "Nettoyage à Saint-Ouen-l'Aumône"}, {"href": "/nettoyage-eragny", "label": "Nettoyage à Éragny"}], "article": [{"heading": "Le nettoyage professionnel à Osny", "paragraphs": ["À Osny, l'activité se partage entre les zones commerciales, les parcs d'activités et un centre plus résidentiel autour du château de Grouchy. Les besoins ne sont pas les mêmes : une enseigne veut un magasin net à l'ouverture, une entreprise un passage discret en dehors des heures de travail.", "Nous adaptons donc les horaires à chaque lieu, avec une liste de tâches écrite et le même intervenant d'un passage à l'autre. Pour un chiffrage, décrivez vos locaux dans la [demande de devis](/devis) ; pour Pontoise, voir aussi le [nettoyage de bureaux à Pontoise](/nettoyage-bureaux-pontoise)."]}], "props": {"eyebrow": "Osny · Agglomération de Cergy-Pontoise", "title": "Entreprise de nettoyage à Osny.", "lead": "Commerces de l'Oseraie, entreprises des Beaux Soleils, cabinets du centre : à Osny, nous entretenons vos locaux depuis Pontoise, la commune voisine.", "image": {"src": "/media/photos/landing/boutique-accueil.webp", "alt": "Accueil d'un commerce entretenu par ProClean Empire"}, "serviceId": "bureaux", "ctaLabel": "Demander un devis à Osny", "intro": [{"title": "À côté de chez vous", "text": "Osny touche Pontoise, où se trouve notre siège : quelques minutes de route suffisent."}, {"title": "Zones commerciales", "text": "Boutiques et moyennes surfaces prêtes avant l'ouverture, sols et vitrines compris."}, {"title": "Locaux d'activité", "text": "Bureaux, ateliers et showrooms des parcs d'activités, à la fréquence qui vous convient."}], "blocks": [{"heading": "Ce que nous faisons à Osny.", "items": [{"title": "Boutiques et enseignes", "text": "Surface de vente, réserve, cabines et vitrine intérieure nettoyées avant l'arrivée des clients."}, {"title": "Bureaux et sièges", "text": "Postes de travail, salles de réunion, sanitaires et espace pause, sans déranger vos équipes."}, {"title": "Cabinets médicaux et paramédicaux", "text": "Salle d'attente et salles de soins entretenues avec des produits adaptés."}, {"title": "Parties communes", "text": "Halls, escaliers et locaux poubelles des résidences et immeubles de bureaux."}, {"title": "Remise en état", "text": "Après travaux, avant une ouverture ou à la fin d'un bail commercial."}]}], "steps": [{"title": "Vous décrivez vos locaux", "text": "Adresse à Osny, type de locaux, surface et fréquence : deux minutes avec le formulaire."}, {"title": "Devis sous 24 h", "text": "Gratuit et sans engagement, après une visite si le site est grand."}, {"title": "Planning fixe", "text": "Mêmes jours, mêmes horaires, et une facture mensuelle."}], "faq": [{"question": "Intervenez-vous dans les zones commerciales d'Osny ?", "answer": "Oui, notamment autour de l'Oseraie et dans les parcs d'activités, avant l'ouverture ou après la fermeture."}, {"question": "En combien de temps pouvez-vous venir ?", "answer": "Osny est limitrophe de Pontoise : nous trouvons le plus souvent un créneau dans la semaine."}, {"question": "Faut-il s'engager sur un contrat ?", "answer": "Non : un passage ponctuel est possible, puis un entretien régulier si le résultat vous convient."}]}},
  {"slug": "nettoyage-saint-ouen-l-aumone", "city": "Saint-Ouen-l'Aumône", "postalCode": "95310", "label": "Nettoyage à Saint-Ouen-l'Aumône", "serviceName": "Nettoyage de bureaux et de commerces à Saint-Ouen-l'Aumône", "serviceType": "Nettoyage de bureaux, commerces et parties communes", "metaTitle": "Entreprise de nettoyage à Saint-Ouen-l'Aumône (95310) – Bureaux et commerces", "metaDescription": "Entreprise de nettoyage à Saint-Ouen-l'Aumône (95310) : entretien de bureaux, commerces, cabinets et parties communes, passages à vos horaires depuis Pontoise. Devis gratuit sous 24 h.", "related": [{"href": "/nettoyage-bureaux", "label": "Bureaux & commerces"}, {"href": "/entreprise-de-nettoyage-cergy", "label": "Entreprise de nettoyage à Cergy"}, {"href": "/nettoyage-bureaux-pontoise", "label": "Nettoyage de bureaux à Pontoise"}, {"href": "/nettoyage-osny", "label": "Nettoyage à Osny"}, {"href": "/nettoyage-eragny", "label": "Nettoyage à Éragny"}], "article": [{"heading": "Le nettoyage professionnel à Saint-Ouen-l'Aumône", "paragraphs": ["Saint-Ouen-l'Aumône accueille l'un des grands ensembles de parcs d'activités du Val-d'Oise. On y trouve des sièges, des entrepôts et des ateliers dont les bureaux et les locaux sociaux servent tous les jours à des équipes nombreuses : vestiaires, réfectoires et sanitaires demandent un entretien régulier et sérieux.", "Nous établissons la liste des tâches avec le responsable du site, zone par zone, puis nous tenons un planning fixe. Voir aussi notre page [bureaux et commerces](/nettoyage-bureaux) et le [nettoyage après travaux](/apres-chantier)."]}], "props": {"eyebrow": "Saint-Ouen-l'Aumône · Agglomération de Cergy-Pontoise", "title": "Entreprise de nettoyage à Saint-Ouen-l'Aumône.", "lead": "Entrepôts, bureaux et ateliers des parcs d'activités, commerces du centre : à Saint-Ouen-l'Aumône, nous intervenons de l'autre côté de l'Oise, à quelques minutes de notre base de Pontoise.", "image": {"src": "/media/photos/landing/boutique-presentoirs.webp", "alt": "Espace de vente entretenu par ProClean Empire"}, "serviceId": "bureaux", "ctaLabel": "Demander un devis à Saint-Ouen-l'Aumône", "intro": [{"title": "Parcs d'activités", "text": "Vert-Galant, Béthunes, Épluches : bureaux, locaux sociaux et sanitaires des sites industriels et logistiques."}, {"title": "Avant ou après le travail", "text": "Passages tôt le matin, le soir ou le samedi, selon les horaires de vos équipes."}, {"title": "Un seul interlocuteur", "text": "Entretien, vitres, remise en état : une même équipe pour l'ensemble du site."}], "blocks": [{"heading": "Ce que nous faisons à Saint-Ouen-l'Aumône.", "items": [{"title": "Bureaux d'entreprise", "text": "Open spaces, bureaux de direction et salles de réunion des sièges et agences."}, {"title": "Locaux sociaux", "text": "Vestiaires, réfectoires et sanitaires des entrepôts et ateliers, là où l'hygiène compte le plus."}, {"title": "Showrooms et accueils", "text": "Hall d'entrée, comptoir et espace d'exposition présentables pour vos visiteurs."}, {"title": "Commerces", "text": "Boutiques et agences du centre-ville et du quartier de la gare."}, {"title": "Vitres", "text": "Baies vitrées, cloisons et portes d'entrée, à l'intérieur comme à l'extérieur accessibles."}, {"title": "Fin de chantier", "text": "Nettoyage après travaux d'aménagement, avant l'installation de vos équipes."}]}], "steps": [{"title": "Vous décrivez vos locaux", "text": "Adresse à Saint-Ouen-l'Aumône, type de locaux, surface et fréquence : deux minutes avec le formulaire."}, {"title": "Devis sous 24 h", "text": "Gratuit et sans engagement, après une visite si le site est grand."}, {"title": "Planning fixe", "text": "Mêmes jours, mêmes horaires, et une facture mensuelle."}], "faq": [{"question": "Intervenez-vous dans les parcs d'activités de Saint-Ouen-l'Aumône ?", "answer": "Oui : Vert-Galant, Béthunes et Épluches, pour les bureaux, les locaux sociaux et les accueils."}, {"question": "Nettoyez-vous les zones de stockage ?", "answer": "Nous entretenons les bureaux, sanitaires, vestiaires et réfectoires ; pour les surfaces de stockage, décrivez-nous le site et nous vous dirons ce que nous pouvons prendre."}, {"question": "Pouvez-vous passer avant l'arrivée des équipes ?", "answer": "Oui, les passages tôt le matin sont les plus demandés sur les sites d'activité."}]}},
  {"slug": "nettoyage-eragny", "city": "Éragny", "postalCode": "95610", "label": "Nettoyage à Éragny", "serviceName": "Nettoyage de bureaux et de commerces à Éragny", "serviceType": "Nettoyage de bureaux, commerces et parties communes", "metaTitle": "Entreprise de nettoyage à Éragny (95610) – Bureaux et commerces", "metaDescription": "Entreprise de nettoyage à Éragny (95610) : entretien de bureaux, commerces, cabinets et parties communes, passages à vos horaires depuis Pontoise. Devis gratuit sous 24 h.", "related": [{"href": "/nettoyage-bureaux", "label": "Bureaux & commerces"}, {"href": "/entreprise-de-nettoyage-cergy", "label": "Entreprise de nettoyage à Cergy"}, {"href": "/nettoyage-bureaux-pontoise", "label": "Nettoyage de bureaux à Pontoise"}, {"href": "/nettoyage-osny", "label": "Nettoyage à Osny"}, {"href": "/nettoyage-saint-ouen-l-aumone", "label": "Nettoyage à Saint-Ouen-l'Aumône"}], "article": [{"heading": "Le nettoyage professionnel à Éragny", "paragraphs": ["Éragny réunit un grand centre commercial, un parc d'activités et des quartiers résidentiels le long de l'Oise. Pour un commerce, la propreté se voit dès l'entrée : sols, vitrines et sanitaires clients sont les trois points que nous traitons en premier.", "Pour les bureaux des Bellevues, nous passons quand les locaux sont vides. Tout le détail de nos prestations est sur les pages [nettoyage de commerces](/nettoyage-commerces) et [entreprise de nettoyage à Cergy](/entreprise-de-nettoyage-cergy)."]}], "props": {"eyebrow": "Éragny · Agglomération de Cergy-Pontoise", "title": "Entreprise de nettoyage à Éragny.", "lead": "Enseignes du centre commercial Art de Vivre, entreprises des Bellevues, cabinets et agences : à Éragny, nous entretenons vos locaux à vos horaires.", "image": {"src": "/media/photos/landing/boutique-salon-attente.webp", "alt": "Espace d'attente entretenu par ProClean Empire"}, "serviceId": "bureaux", "ctaLabel": "Demander un devis à Éragny", "intro": [{"title": "Commerces et enseignes", "text": "Un magasin net à l'ouverture, y compris les jours de forte affluence."}, {"title": "Parc des Bellevues", "text": "Bureaux et locaux d'activité entretenus en dehors des heures de travail."}, {"title": "Tout près", "text": "Éragny fait partie de l'agglomération de Cergy-Pontoise, comme notre base de Pontoise."}], "blocks": [{"heading": "Ce que nous faisons à Éragny.", "items": [{"title": "Boutiques et restaurants", "text": "Salle, comptoir, sanitaires clients et sols nettoyés avant le service ou l'ouverture."}, {"title": "Bureaux", "text": "Postes de travail, salles de réunion et espace pause, chaque jour ou chaque semaine."}, {"title": "Cabinets et agences", "text": "Accueil, salle d'attente et bureaux reçus propres par vos clients et patients."}, {"title": "Résidences", "text": "Halls, cages d'escalier et ascenseurs des immeubles d'habitation."}, {"title": "Grand nettoyage", "text": "Une remise à niveau complète avant une inspection, une ouverture ou une saison."}]}], "steps": [{"title": "Vous décrivez vos locaux", "text": "Adresse à Éragny, type de locaux, surface et fréquence : deux minutes avec le formulaire."}, {"title": "Devis sous 24 h", "text": "Gratuit et sans engagement, après une visite si le site est grand."}, {"title": "Planning fixe", "text": "Mêmes jours, mêmes horaires, et une facture mensuelle."}], "faq": [{"question": "Travaillez-vous pour les commerces d'Éragny ?", "answer": "Oui, boutiques, restaurants et agences, avec un passage calé sur vos horaires d'ouverture."}, {"question": "Peut-on demander un passage le dimanche ?", "answer": "Oui, sur demande, notamment pour les commerces ouverts le week-end."}, {"question": "Comment obtenir un prix ?", "answer": "Décrivez vos locaux dans la demande de devis : vous recevez un chiffrage sous 24 h."}]}},
  {"slug": "nettoyage-vaureal", "city": "Vauréal", "postalCode": "95490", "label": "Nettoyage à Vauréal", "serviceName": "Nettoyage de bureaux et de commerces à Vauréal", "serviceType": "Nettoyage de bureaux, commerces et parties communes", "metaTitle": "Entreprise de nettoyage à Vauréal (95490) – Bureaux et commerces", "metaDescription": "Entreprise de nettoyage à Vauréal (95490) : entretien de bureaux, commerces, cabinets et parties communes, passages à vos horaires depuis Pontoise. Devis gratuit sous 24 h.", "related": [{"href": "/nettoyage-bureaux", "label": "Bureaux & commerces"}, {"href": "/entreprise-de-nettoyage-cergy", "label": "Entreprise de nettoyage à Cergy"}, {"href": "/nettoyage-bureaux-pontoise", "label": "Nettoyage de bureaux à Pontoise"}, {"href": "/nettoyage-osny", "label": "Nettoyage à Osny"}, {"href": "/nettoyage-saint-ouen-l-aumone", "label": "Nettoyage à Saint-Ouen-l'Aumône"}], "article": [{"heading": "Le nettoyage professionnel à Vauréal", "paragraphs": ["Vauréal est d'abord une ville où l'on habite : les commerces et les cabinets y servent une clientèle de quartier, qui revient et qui remarque l'état des lieux. Un entretien court mais régulier y fait plus qu'un grand ménage de temps en temps.", "Pour les copropriétés, nous tenons un jour fixe et signalons ce qui doit l'être : ampoule, porte, encombrants. Voir aussi l'[entretien des parties communes](/services/parties-communes) et le [nettoyage de vitres](/nettoyage-vitrerie)."]}], "props": {"eyebrow": "Vauréal · Agglomération de Cergy-Pontoise", "title": "Entreprise de nettoyage à Vauréal.", "lead": "Commerces de proximité, cabinets, écoles privées et résidences : à Vauréal, nous assurons un entretien régulier, depuis Pontoise, dans la même agglomération.", "image": {"src": "/media/photos/landing/equipe-vitrine.webp", "alt": "Un intervenant ProClean Empire nettoie une vitrine"}, "serviceId": "bureaux", "ctaLabel": "Demander un devis à Vauréal", "intro": [{"title": "Commerces de quartier", "text": "Boulangeries, salons, pharmacies, agences : un lieu accueillant chaque matin."}, {"title": "Cabinets et services", "text": "Professions libérales et structures d'accueil, avec des produits adaptés."}, {"title": "Résidences", "text": "Parties communes des copropriétés entretenues à jour fixe."}], "blocks": [{"heading": "Ce que nous faisons à Vauréal.", "items": [{"title": "Boutiques et salons", "text": "Sols, plans de travail, miroirs et vitrine intérieure, avant l'ouverture."}, {"title": "Cabinets", "text": "Salle d'attente, bureaux de consultation et sanitaires."}, {"title": "Parties communes", "text": "Halls, escaliers, paliers et locaux vélos des résidences."}, {"title": "Bureaux", "text": "Petites entreprises et espaces partagés, une à plusieurs fois par semaine."}, {"title": "Vitres", "text": "Vitrines et baies vitrées, au rythme que vous choisissez."}]}], "steps": [{"title": "Vous décrivez vos locaux", "text": "Adresse à Vauréal, type de locaux, surface et fréquence : deux minutes avec le formulaire."}, {"title": "Devis sous 24 h", "text": "Gratuit et sans engagement, après une visite si le site est grand."}, {"title": "Planning fixe", "text": "Mêmes jours, mêmes horaires, et une facture mensuelle."}], "faq": [{"question": "Intervenez-vous pour les petites surfaces ?", "answer": "Oui : une boutique ou un cabinet d'une seule pièce peut être entretenu une à deux fois par semaine."}, {"question": "Travaillez-vous avec les syndics ?", "answer": "Oui, pour l'entretien des parties communes, avec un planning et un compte rendu."}, {"question": "Venez-vous aussi à Jouy-le-Moutier ?", "answer": "Oui, les deux communes sont voisines : voir notre page Jouy-le-Moutier."}]}},
  {"slug": "nettoyage-jouy-le-moutier", "city": "Jouy-le-Moutier", "postalCode": "95280", "label": "Nettoyage à Jouy-le-Moutier", "serviceName": "Nettoyage de bureaux et de commerces à Jouy-le-Moutier", "serviceType": "Nettoyage de bureaux, commerces et parties communes", "metaTitle": "Entreprise de nettoyage à Jouy-le-Moutier (95280) – Bureaux et commerces", "metaDescription": "Entreprise de nettoyage à Jouy-le-Moutier (95280) : entretien de bureaux, commerces, cabinets et parties communes, passages à vos horaires depuis Pontoise. Devis gratuit sous 24 h.", "related": [{"href": "/nettoyage-bureaux", "label": "Bureaux & commerces"}, {"href": "/entreprise-de-nettoyage-cergy", "label": "Entreprise de nettoyage à Cergy"}, {"href": "/nettoyage-bureaux-pontoise", "label": "Nettoyage de bureaux à Pontoise"}, {"href": "/nettoyage-osny", "label": "Nettoyage à Osny"}, {"href": "/nettoyage-saint-ouen-l-aumone", "label": "Nettoyage à Saint-Ouen-l'Aumône"}], "article": [{"heading": "Le nettoyage professionnel à Jouy-le-Moutier", "paragraphs": ["À Jouy-le-Moutier, la plupart des locaux professionnels sont de petite taille : un commerce, un cabinet, une agence. Ce sont des lieux où le gérant fait souvent le ménage lui-même, le soir, après sa journée. Nous prenons ce temps à votre place, sur un créneau fixe.", "La liste des tâches est écrite avec vous dès le départ, et le prix ne change pas d'un mois à l'autre. Pour les communes voisines, voir [Vauréal](/nettoyage-vaureal) et [Cergy](/nettoyage-cergy)."]}], "props": {"eyebrow": "Jouy-le-Moutier · Agglomération de Cergy-Pontoise", "title": "Entreprise de nettoyage à Jouy-le-Moutier.", "lead": "Commerces, cabinets, petites entreprises et copropriétés de Jouy-le-Moutier : nous entretenons vos locaux à la fréquence qui vous convient, depuis notre base de Pontoise.", "image": {"src": "/media/photos/landing/boutique-accueil.webp", "alt": "Accueil de commerce entretenu par ProClean Empire"}, "serviceId": "bureaux", "ctaLabel": "Demander un devis à Jouy-le-Moutier", "intro": [{"title": "Du village aux quartiers récents", "text": "Nous intervenons dans toute la commune, des bords de l'Oise aux quartiers plus récents."}, {"title": "À votre rythme", "text": "Un passage par semaine ou tous les jours : la fréquence suit l'usage réel de vos locaux."}, {"title": "Prix clair", "text": "Un devis écrit avant toute intervention, sans frais cachés."}], "blocks": [{"heading": "Ce que nous faisons à Jouy-le-Moutier.", "items": [{"title": "Commerces de proximité", "text": "Surface de vente et réserve propres, vitrine intérieure nette."}, {"title": "Cabinets et professions libérales", "text": "Accueil, salle d'attente et sanitaires, avec des produits adaptés."}, {"title": "Copropriétés", "text": "Halls, escaliers et locaux communs, à jour fixe."}, {"title": "Bureaux et locaux associatifs", "text": "Salles de réunion, bureaux et cuisines partagées."}, {"title": "Remise en état", "text": "Avant une mise en location, après des travaux ou un déménagement."}]}], "steps": [{"title": "Vous décrivez vos locaux", "text": "Adresse à Jouy-le-Moutier, type de locaux, surface et fréquence : deux minutes avec le formulaire."}, {"title": "Devis sous 24 h", "text": "Gratuit et sans engagement, après une visite si le site est grand."}, {"title": "Planning fixe", "text": "Mêmes jours, mêmes horaires, et une facture mensuelle."}], "faq": [{"question": "Vous déplacez-vous jusqu'à Jouy-le-Moutier ?", "answer": "Oui, la commune fait partie de l'agglomération de Cergy-Pontoise, où nous travaillons chaque semaine."}, {"question": "Peut-on commencer par un essai ?", "answer": "Oui, un premier passage ponctuel permet de juger le résultat avant de s'engager."}, {"question": "Qui vient nettoyer ?", "answer": "Le même intervenant d'un passage à l'autre, autant que possible, pour qu'il connaisse vos locaux."}]}},
  {
    slug: "nettoyage-argenteuil",
    city: "Argenteuil",
    postalCode: "95100",
    label: "Nettoyage à Argenteuil",
    metaTitle: "Nettoyage à Argenteuil (95) : bureaux, commerces, immeubles",
    metaDescription:
      "Entreprise de nettoyage à Argenteuil (95100) : entretien de bureaux, commerces, parties communes d'immeubles et remise en état de logements. Équipe basée à Pontoise, devis sous 24 h.",
    serviceName: "Nettoyage à Argenteuil",
    serviceType: "Nettoyage de bureaux, commerces, parties communes et logements vacants",
    related: [
      { href: "/nettoyage-pontoise", label: "Nettoyage à Pontoise" },
      { href: "/nettoyage-bureaux", label: "Nettoyage de bureaux" },
      { href: "/services/parties-communes", label: "Parties communes" },
      { href: "/nettoyage-sarcelles", label: "Nettoyage à Sarcelles" }
    ],
    props: {
      eyebrow: "Argenteuil · Val-d'Oise (95)",
      title: "Nettoyage de bureaux et d'immeubles à Argenteuil.",
      lead: "Argenteuil est l'une des plus grandes villes du Val-d'Oise : entreprises, commerces de centre-ville, copropriétés et logements loués. Nous venons de Pontoise et nous intervenons à Argenteuil à jours et heures fixes.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Locaux professionnels entretenus par ProClean Empire à Argenteuil" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Argenteuil",
      intro: [
        { title: "Une grande ville, des besoins variés", text: "Petits bureaux, commerces, halls d'immeuble : chaque lieu a sa propre fréquence de passage." },
        { title: "Horaires adaptés", text: "Avant l'ouverture, après la fermeture ou le week-end, selon votre activité." },
        { title: "Interlocuteur unique", text: "Le même contact pour le devis, le planning et les ajustements." }
      ],
      blocks: [
        {
          heading: "Ce que nous entretenons à Argenteuil.",
          items: [
            { title: "Bureaux et plateaux", text: "Entretien régulier des postes de travail, sanitaires, cuisines et salles de réunion." },
            { title: "Commerces", text: "Surface de vente, vitrine intérieure et réserve prêtes avant l'ouverture." },
            { title: "Parties communes", text: "Halls, escaliers et paliers des copropriétés, à jour fixe." },
            { title: "Logements vacants", text: "Nettoyage avant une mise en location ou après le départ d'un locataire." },
            { title: "Remise en état", text: "Grand nettoyage avant une mise en location ou à la fin d'un bail." },
            { title: "Nettoyage de vitres", text: "Vitres et portes vitrées sans traces, intérieur et accès faciles." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez vos locaux", text: "Surface, type de lieu, fréquence et horaires d'accès." },
        { title: "Nous chiffrons", text: "Devis clair sous 24 h, visite sur place si nécessaire." },
        { title: "Nous intervenons", text: "Même check-list à chaque passage." }
      ],
      faq: [
        { question: "Intervenez-vous dans tous les quartiers d'Argenteuil ?", answer: "Oui : centre-ville, Val d'Argent, Orgemont, Coteaux, Joliot-Curie et Val-Notre-Dame." },
        { question: "Quel est votre délai de réponse ?", answer: "Nous répondons aux demandes sous 24 h pendant nos horaires de traitement et chiffrons gratuitement." },
        { question: "Entretenez-vous les copropriétés ?", answer: "Oui, halls, escaliers et paliers, à jour et heure fixes, pour les syndics comme pour les conseils syndicaux." }
      ]
    },
    article: [
      {
        heading: "Faire nettoyer ses locaux à Argenteuil",
        paragraphs: [
          "Argenteuil réunit des quartiers très différents : un centre-ville commerçant, de grands ensembles résidentiels, des zones d'activité et des secteurs pavillonnaires. Selon le lieu, les besoins ne sont pas les mêmes : un cabinet a besoin d'un passage discret avant les rendez-vous, un commerce d'une surface prête avant l'ouverture, une copropriété de parties communes propres chaque semaine.",
          "Nous partons de votre planning et non du nôtre. Le passage est fixé avec vous, noté dans une check-list, et ajusté si vos horaires changent. Pour les entreprises du secteur, nous proposons aussi la [conciergerie d'entreprise](/conciergerie-entreprise) : plantes, consommables et décoration de fin d'année.",
          "Besoin d'un grand nettoyage avant une location ? Voir notre page [remise en état](/remise-en-etat)."
        ]
      }
    ],
    districts: {
      heading: "Quartiers desservis",
      intro: "Nous intervenons dans toute la commune d'Argenteuil et dans les villes voisines.",
      list: ["Centre-ville", "Val d'Argent", "Orgemont", "Les Coteaux", "Joliot-Curie", "Val-Notre-Dame", "Les Champioux", "Bezons", "Sannois", "Cormeilles-en-Parisis"]
    }
  },
  {
    slug: "nettoyage-sarcelles",
    city: "Sarcelles",
    postalCode: "95200",
    label: "Nettoyage à Sarcelles",
    metaTitle: "Nettoyage à Sarcelles (95) : immeubles, commerces, bureaux",
    metaDescription:
      "Entreprise de nettoyage à Sarcelles (95200) : parties communes d'immeubles, commerces, bureaux et remise en état de logements. Devis gratuit sous 24 h, interventions à jours fixes.",
    serviceName: "Nettoyage à Sarcelles",
    serviceType: "Nettoyage de parties communes, commerces, bureaux et remise en état de logements",
    related: [
      { href: "/services/parties-communes", label: "Entretien des parties communes" },
      { href: "/remise-en-etat", label: "Remise en état" },
      { href: "/nettoyage-commerces", label: "Nettoyage de commerces" },
      { href: "/nettoyage-argenteuil", label: "Nettoyage à Argenteuil" }
    ],
    props: {
      eyebrow: "Sarcelles · Val-d'Oise (95)",
      title: "Immeubles, commerces et bureaux propres à Sarcelles.",
      lead: "À Sarcelles, beaucoup de logements sont en copropriété et les commerces de quartier accueillent du monde toute la journée. Nous entretenons les parties communes, les boutiques et les locaux d'activité à une fréquence qui tient dans votre budget.",
      image: { src: "/media/photos/airbnb-entree-logement.webp", alt: "Hall d'entrée propre entretenu par ProClean Empire à Sarcelles" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Sarcelles",
      intro: [
        { title: "Copropriétés", text: "Halls, escaliers, paliers et locaux poubelles entretenus à fréquence fixe." },
        { title: "Commerces de quartier", text: "Sols, vitrines intérieures et réserves nettoyés avant l'ouverture." },
        { title: "Budget clair", text: "Un devis détaillé : surface, fréquence et prix par passage." }
      ],
      blocks: [
        {
          heading: "Ce que nous faisons à Sarcelles.",
          items: [
            { title: "Parties communes", text: "Entretien hebdomadaire ou plusieurs fois par semaine, selon la taille de l'immeuble." },
            { title: "Commerces", text: "Boutiques, restaurants et services de proximité entretenus aux heures creuses." },
            { title: "Bureaux et associations", text: "Locaux administratifs, salles et permanences entretenus régulièrement." },
            { title: "Désinfection", text: "Points de contact et sanitaires traités après une épidémie ou à fréquence régulière." },
            { title: "Remise en état", text: "Appartements et locaux vidés ou rénovés, prêts à être reloués." },
            { title: "Après travaux", text: "Poussières et résidus retirés pour rendre le lieu utilisable." }
          ]
        }
      ],
      steps: [
        { title: "Contactez-nous", text: "Adresse, type d'immeuble ou de local et fréquence souhaitée." },
        { title: "Devis gratuit", text: "Prix et prestations détaillés sous 24 h." },
        { title: "Passage régulier", text: "Équipe identifiée, planning fixe, retour d'intervention." }
      ],
      faq: [
        { question: "Intervenez-vous pour les syndics et conseils syndicaux ?", answer: "Oui, nous établissons un devis adapté à la taille de la résidence et nous pouvons fournir une attestation d'assurance sur demande." },
        { question: "Travaillez-vous aussi à Garges-lès-Gonesse et Villiers-le-Bel ?", answer: "Oui, ces communes voisines sont dans notre secteur d'intervention." },
        { question: "Combien coûte un entretien de hall d'immeuble ?", answer: "Cela dépend du nombre d'étages et de la fréquence : nous chiffrons gratuitement après visite ou photos." }
      ]
    },
    article: [
      {
        heading: "Un entretien régulier plutôt qu'un grand nettoyage",
        paragraphs: [
          "Dans une grande résidence, la saleté s'accumule vite : sols, boîtes aux lettres, ascenseurs et poignées. Un passage régulier coûte moins cher qu'un grand nettoyage tous les six mois, et il évite les plaintes des résidents.",
          "Nous proposons des formules simples pour les copropriétés : fréquence fixe, check-list affichable et interlocuteur unique pour le syndic. Voir aussi notre page [entretien des parties communes](/services/parties-communes) et la [remise en état](/remise-en-etat) pour les logements vidés ou rénovés."
        ]
      }
    ],
    districts: {
      heading: "Quartiers desservis",
      intro: "Nous intervenons à Sarcelles et dans les communes proches.",
      list: ["Sarcelles village", "Les Lochères", "Chantepie", "Les Rosiers", "Gare de Garges-Sarcelles", "Garges-lès-Gonesse", "Villiers-le-Bel", "Arnouville", "Écouen"]
    }
  },
  {
    slug: "nettoyage-enghien-les-bains",
    city: "Enghien-les-Bains",
    postalCode: "95880",
    label: "Nettoyage à Enghien-les-Bains",
    metaTitle: "Nettoyage à Enghien-les-Bains (95) : cabinets, hôtels, boutiques",
    metaDescription:
      "Entreprise de nettoyage à Enghien-les-Bains (95880) : cabinets, hôtels, boutiques, restaurants et parties communes d'immeubles autour du lac. Passages à vos horaires, devis gratuit sous 24 h.",
    serviceName: "Nettoyage à Enghien-les-Bains",
    serviceType: "Nettoyage de cabinets, hôtels, boutiques, restaurants et parties communes",
    related: [
      { href: "/nettoyage-hotels", label: "Nettoyage d'hôtels" },
      { href: "/nettoyage-restaurants", label: "Nettoyage de restaurants" },
      { href: "/nettoyage-commerces", label: "Nettoyage de commerces" },
      { href: "/nettoyage-argenteuil", label: "Nettoyage à Argenteuil" }
    ],
    props: {
      eyebrow: "Enghien-les-Bains · Val-d'Oise (95)",
      title: "Nettoyage de cabinets, hôtels et boutiques à Enghien-les-Bains.",
      lead: "Le lac, le casino et les thermes font venir du monde toute l'année. Hôtels, restaurants, boutiques et cabinets de la ville doivent rester impeccables : nous nous en chargeons, à vos horaires.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Locaux entretenus par ProClean Empire à Enghien-les-Bains" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis à Enghien-les-Bains",
      intro: [
        { title: "Hôtels et restaurants", text: "Chambres, salles et sanitaires entretenus en dehors des heures de service." },
        { title: "Boutiques du centre", text: "Surface de vente et vitrine intérieure prêtes avant l'ouverture." },
        { title: "Cabinets", text: "Locaux de santé et de conseil entretenus avec discrétion." }
      ],
      blocks: [
        {
          heading: "Ce que nous faisons à Enghien-les-Bains.",
          items: [
            { title: "Hôtels et chambres d'hôtes", text: "Chambres et parties communes entretenues à la journée." },
            { title: "Restaurants", text: "Salle, sanitaires et vitres, hors du service." },
            { title: "Cabinets et professions libérales", text: "Salle d'attente et bureaux prêts avant l'arrivée du premier client." },
            { title: "Boutiques", text: "Commerces du centre entretenus aux heures creuses." },
            { title: "Parties communes", text: "Halls et escaliers des résidences, à jour fixe." },
            { title: "Vitres", text: "Vitrines et grandes baies sans traces." }
          ]
        }
      ],
      steps: [
        { title: "Vous décrivez vos locaux", text: "Adresse, type de lieu, fréquence et horaires d'accès." },
        { title: "Devis sous 24 h", text: "Un prix clair, avant toute intervention." },
        { title: "Nous intervenons", text: "Même check-list à chaque passage." }
      ],
      faq: [
        { question: "Pouvez-vous intervenir le week-end ?", answer: "Oui, c'est souvent le moment le plus demandé pour les hôtels et les restaurants." },
        { question: "Travaillez-vous aussi à Montmorency et Saint-Gratien ?", answer: "Oui, ces communes voisines sont dans notre secteur." },
        { question: "Quel est le délai pour un devis ?", answer: "Nous répondons sous 24 h pendant nos horaires de traitement, gratuitement et sans engagement." }
      ]
    },
    article: [
      {
        heading: "Un lieu de visite qui demande un travail soigné",
        paragraphs: [
          "À Enghien-les-Bains, les visiteurs viennent pour le lac, la promenade et les soins : ils s'attendent à des lieux irréprochables. Une vitrine marquée ou une salle d'attente négligée se remarque tout de suite. Notre check-list couvre chaque zone, dans le même ordre à chaque passage.",
          "Pour les hôtels et restaurants, voir [nettoyage d'hôtels](/nettoyage-hotels) et [nettoyage de restaurants](/nettoyage-restaurants). Pour les boutiques, voir [nettoyage de commerces](/nettoyage-commerces)."
        ]
      }
    ],
    districts: {
      heading: "Communes desservies",
      intro: "Nous intervenons à Enghien-les-Bains et dans les communes voisines.",
      list: ["Enghien-les-Bains", "Montmorency", "Saint-Gratien", "Deuil-la-Barre", "Soisy-sous-Montmorency", "Eaubonne", "Sannois"]
    }
  },
  {
    slug: "nettoyage-paris-8",
    city: "Paris 8e",
    postalCode: "75008",
    label: "Nettoyage Paris 8e",
    metaTitle: "Nettoyage Paris 8e : bureaux, boutiques, hôtels, appartements",
    metaDescription:
      "Entreprise de nettoyage dans le 8e arrondissement de Paris (Madeleine, Champs-Élysées, Saint-Lazare, Monceau) : bureaux, boutiques, hôtels et appartements meublés. Devis sous 24 h.",
    serviceName: "Entreprise de nettoyage à Paris 8e",
    serviceType: "Nettoyage de bureaux, boutiques, hôtels et appartements meublés",
    related: [
      { href: "/nettoyage-paris", label: "Entreprise de nettoyage à Paris" },
      { href: "/entreprise-de-nettoyage-paris-16", label: "Nettoyage Paris 16e" },
      { href: "/nettoyage-hotels", label: "Nettoyage d'hôtels" },
      { href: "/nettoyage-vitrerie", label: "Vitres et vitrines" }
    ],
    props: {
      eyebrow: "Paris 8e · Madeleine · Champs-Élysées · Saint-Lazare",
      title: "Entreprise de nettoyage dans le 8e arrondissement",
      lead: "Sièges de sociétés, cabinets d'affaires, boutiques de luxe, hôtels et appartements : dans le 8e, l'image se joue dès l'entrée. Nous entretenons vos locaux tôt le matin ou en soirée, sans gêner votre activité.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Bureaux nettoyés par ProClean Empire à Paris 8e" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis dans le 8e",
      intro: [
        { title: "Avant l'arrivée des équipes", text: "Passages tôt le matin pour que vos bureaux soient prêts à l'ouverture." },
        { title: "Sols et surfaces délicats", text: "Parquets, marbre, verre et laiton traités avec les bons produits." },
        { title: "Un seul interlocuteur", text: "Devis, planning et ajustements avec la même personne." }
      ],
      blocks: [
        {
          heading: "Ce que nous entretenons dans le 8e.",
          items: [
            { title: "Sièges et bureaux", text: "Plateaux, salles de réunion, accueil et sanitaires." },
            { title: "Boutiques", text: "Surface de vente et vitrines intérieures prêtes avant l'ouverture." },
            { title: "Hôtels et résidences", text: "Chambres, couloirs et parties communes entretenus à la journée." },
            { title: "Cabinets d'avocats et de conseil", text: "Salles d'attente et bureaux avec discrétion." },
            { title: "Appartements meublés", text: "Préparation entre deux occupants ou avant une nouvelle location." },
            { title: "Vitres", text: "Vitres intérieures, portes vitrées et miroirs." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous écrivez", text: "Adresse, surface, horaires d'accès et fréquence." },
        { title: "Nous chiffrons", text: "Devis sous 24 h, visite sur place si besoin." },
        { title: "Nous assurons le suivi", text: "Check-list identique à chaque passage." }
      ],
      faq: [
        { question: "Intervenez-vous dans tout le 8e ?", answer: "Oui : Madeleine, Champs-Élysées, Saint-Lazare, Monceau, Europe et Faubourg-Saint-Honoré." },
        { question: "Pouvez-vous passer avant l'ouverture ?", answer: "Oui, tôt le matin ou en soirée, selon vos contraintes d'accès." },
        { question: "Gérez-vous les clés et les badges ?", answer: "Oui, selon vos consignes de sécurité, avec une procédure d'accès notée dans le dossier." }
      ]
    },
    article: [
      {
        heading: "Nettoyer dans le 8e : discrétion et régularité",
        paragraphs: [
          "Le 8e concentre des sièges d'entreprises, des cabinets, des hôtels et des boutiques qui reçoivent une clientèle exigeante. Les accès sont souvent contraints : digicodes, badges, ascenseurs de service, créneaux de livraison. Nous organisons nos passages autour de ces règles.",
          "Pour les propriétaires d'appartements meublés du quartier, nous préparons le logement entre deux occupants (voir [ménage Airbnb à Paris](/menage-airbnb-paris)). Pour le 16e arrondissement, voir [nettoyage Paris 16e](/entreprise-de-nettoyage-paris-16)."
        ]
      }
    ],
    districts: {
      heading: "Quartiers desservis",
      intro: "Nous intervenons dans tout le 8e arrondissement.",
      list: ["Madeleine", "Champs-Élysées", "Saint-Lazare", "Parc Monceau", "Europe", "Faubourg-Saint-Honoré", "Miromesnil", "Triangle d'or"]
    }
  },
  {
    slug: "nettoyage-paris-9",
    city: "Paris 9e",
    postalCode: "75009",
    label: "Nettoyage Paris 9e",
    metaTitle: "Nettoyage Paris 9e : bureaux, hôtels, ménage Airbnb",
    metaDescription:
      "Entreprise de nettoyage dans le 9e arrondissement de Paris (Opéra, Grands Boulevards, Saint-Georges, Trinité) : bureaux, hôtels, commerces et ménage de logements meublés. Devis sous 24 h.",
    serviceName: "Entreprise de nettoyage à Paris 9e",
    serviceType: "Nettoyage de bureaux, hôtels, commerces et ménage de logements meublés",
    related: [
      { href: "/nettoyage-paris", label: "Entreprise de nettoyage à Paris" },
      { href: "/menage-airbnb-paris", label: "Ménage Airbnb à Paris" },
      { href: "/nettoyage-paris-8", label: "Nettoyage Paris 8e" },
      { href: "/nettoyage-restaurants", label: "Nettoyage de restaurants" }
    ],
    props: {
      eyebrow: "Paris 9e · Opéra · Grands Boulevards · Saint-Georges",
      title: "Entreprise de nettoyage dans le 9e arrondissement",
      lead: "Théâtres, hôtels, agences, restaurants et nombreux appartements loués à la nuitée : le 9e vit à toute heure. Nous nous adaptons à vos horaires pour garder vos locaux et vos logements propres sans interrompre l'activité.",
      image: { src: "/media/photos/airbnb-entree-logement.webp", alt: "Appartement préparé par ProClean Empire à Paris 9e" },
      serviceId: "airbnb",
      ctaLabel: "Demander un devis dans le 9e",
      intro: [
        { title: "Un quartier qui ne s'arrête pas", text: "Restaurants, hôtels et spectacles : nous passons avant ou après l'activité." },
        { title: "Logements en location courte durée", text: "Ménage et linge entre deux voyageurs, planning calé sur vos arrivées." },
        { title: "Bureaux et agences", text: "Entretien régulier, tôt le matin ou en soirée." }
      ],
      blocks: [
        {
          heading: "Ce que nous faisons dans le 9e.",
          items: [
            { title: "Ménage Airbnb", text: "Check-out, ménage complet, linge et remise en place." },
            { title: "Hôtels", text: "Chambres et parties communes entretenues à la journée." },
            { title: "Bureaux et agences", text: "Postes de travail, salles de réunion et sanitaires." },
            { title: "Restaurants et brasseries", text: "Salle, sanitaires et vitrines, hors du service." },
            { title: "Halls d'immeuble", text: "Parties communes des copropriétés haussmanniennes." },
            { title: "Remise en état", text: "Avant une location ou après un dégât." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous écrivez", text: "Adresse, type de lieu et fréquence." },
        { title: "Devis gratuit", text: "Prix clair sous 24 h." },
        { title: "Nous intervenons", text: "Même check-list à chaque passage." }
      ],
      faq: [
        { question: "Intervenez-vous dans tout le 9e ?", answer: "Oui : Opéra, Grands Boulevards, Saint-Georges, Trinité, Pigalle-Sud et Faubourg-Montmartre." },
        { question: "Pouvez-vous faire le ménage entre deux voyageurs dans la journée ?", answer: "Oui, nous nous calons sur l'heure de départ et d'arrivée que vous nous communiquez." },
        { question: "Faites-vous les restaurants ?", answer: "Oui, en dehors du service : salle, sanitaires et vitres." }
      ]
    },
    article: [
      {
        heading: "Nettoyer dans le 9e : s'adapter au rythme du quartier",
        paragraphs: [
          "Le 9e mêle sièges d'entreprises, théâtres, hôtels et appartements de location. Les passages doivent s'insérer dans un rythme serré : un départ à 11 h, une arrivée à 15 h, un restaurant qui ouvre à midi. Nous construisons le planning à partir de ces horaires.",
          "Pour la location courte durée, voir [ménage Airbnb à Paris](/menage-airbnb-paris). Pour les bureaux et sièges plus à l'ouest, voir [nettoyage Paris 8e](/nettoyage-paris-8)."
        ]
      }
    ],
    districts: {
      heading: "Quartiers desservis",
      intro: "Nous intervenons dans tout le 9e arrondissement.",
      list: ["Opéra", "Grands Boulevards", "Saint-Georges", "La Trinité", "Faubourg-Montmartre", "Chaussée-d'Antin", "Notre-Dame-de-Lorette", "Rochechouart"]
    }
  },
  {
    slug: "nettoyage-paris-17",
    city: "Paris 17e",
    postalCode: "75017",
    label: "Nettoyage Paris 17e",
    metaTitle: "Nettoyage Paris 17e : cabinets, copropriétés, bureaux, Airbnb",
    metaDescription:
      "Entreprise de nettoyage dans le 17e arrondissement de Paris (Batignolles, Ternes, Wagram, Épinettes) : cabinets, copropriétés, bureaux et appartements meublés. Devis sous 24 h.",
    serviceName: "Entreprise de nettoyage à Paris 17e",
    serviceType: "Nettoyage de cabinets, copropriétés, bureaux et appartements meublés",
    related: [
      { href: "/nettoyage-paris", label: "Entreprise de nettoyage à Paris" },
      { href: "/entreprise-de-nettoyage-paris-16", label: "Nettoyage Paris 16e" },
      { href: "/services/parties-communes", label: "Parties communes" },
      { href: "/menage-airbnb-paris", label: "Ménage Airbnb à Paris" }
    ],
    props: {
      eyebrow: "Paris 17e · Batignolles · Ternes · Wagram",
      title: "Entreprise de nettoyage dans le 17e arrondissement",
      lead: "Quartier résidentiel et d'affaires, le 17e rassemble copropriétés, cabinets, bureaux et logements meublés. Nous assurons un entretien régulier, fiable et discret, avec un planning fixé à l'avance.",
      image: { src: "/media/photos/hero-showcase.webp", alt: "Locaux entretenus par ProClean Empire à Paris 17e" },
      serviceId: "bureaux",
      ctaLabel: "Demander un devis dans le 17e",
      intro: [
        { title: "Copropriétés", text: "Halls, escaliers et paliers entretenus à jour fixe." },
        { title: "Cabinets et bureaux", text: "Passage avant l'arrivée du premier client ou en soirée." },
        { title: "Logements meublés", text: "Ménage entre deux occupants, linge compris si besoin." }
      ],
      blocks: [
        {
          heading: "Ce que nous entretenons dans le 17e.",
          items: [
            { title: "Parties communes", text: "Syndics et conseils syndicaux : un passage régulier et une check-list." },
            { title: "Cabinets médicaux et juridiques", text: "Salle d'attente, bureaux et sanitaires prêts avant les rendez-vous." },
            { title: "Bureaux", text: "Plateaux, cuisines et salles de réunion entretenus." },
            { title: "Boutiques", text: "Commerces des Batignolles et des Ternes prêts avant l'ouverture." },
            { title: "Appartements meublés", text: "Préparation entre deux locataires ou voyageurs." },
            { title: "Remise en état", text: "Après travaux ou avant une mise en vente ou en location." }
          ]
        }
      ],
      steps: [
        { title: "Vous nous écrivez", text: "Adresse, surface, fréquence et horaires d'accès." },
        { title: "Nous chiffrons", text: "Devis clair sous 24 h." },
        { title: "Nous intervenons", text: "Planning fixe et suivi régulier." }
      ],
      faq: [
        { question: "Intervenez-vous dans tout le 17e ?", answer: "Oui : Batignolles, Ternes, Wagram, Monceau, Épinettes, Porte Maillot et Porte de Clichy." },
        { question: "Travaillez-vous pour des syndics ?", answer: "Oui, avec un devis adapté à la taille de la résidence et une attestation d'assurance sur demande." },
        { question: "Pouvez-vous intervenir à Levallois-Perret ou Neuilly ?", answer: "Oui, ces communes voisines sont dans notre secteur." }
      ]
    },
    article: [
      {
        heading: "Nettoyer dans le 17e : de la copropriété au cabinet",
        paragraphs: [
          "Le 17e est un arrondissement de contrastes : immeubles haussmanniens autour de Wagram et des Ternes, quartier vivant des Batignolles, secteurs plus récents vers Clichy-Batignolles. Les besoins vont du hall d'immeuble au cabinet médical, en passant par le studio loué à la semaine.",
          "Pour les propriétaires qui louent en courte durée, voir [ménage Airbnb à Paris](/menage-airbnb-paris). Pour l'arrondissement voisin, voir [nettoyage Paris 16e](/entreprise-de-nettoyage-paris-16)."
        ]
      }
    ],
    districts: {
      heading: "Quartiers desservis",
      intro: "Nous intervenons dans tout le 17e arrondissement et à proximité.",
      list: ["Batignolles", "Ternes", "Wagram", "Monceau", "Épinettes", "Porte Maillot", "Porte de Clichy", "Levallois-Perret", "Neuilly-sur-Seine"]
    }
  }
];

export function getLocalPage(slug: string): LocalPage {
  const page = localPages.find((item) => item.slug === slug);
  if (!page) throw new Error(`Page locale inconnue : ${slug}`);
  return page;
}
