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
    metaTitle: "Ménage Airbnb et nettoyage de locaux à Paris",
    metaDescription:
      "Ménage Airbnb à Paris pour conciergeries et propriétaires : préparation du logement entre deux voyageurs, le jour fixé par vos réservations. Nettoyage de bureaux et boutiques parisiennes. Devis sous 24 h.",
    props: {
      eyebrow: "Paris · Tous arrondissements",
      title: "Ménage Airbnb à Paris, réglé sur vos réservations.",
      lead: "À Paris, les arrivées s'enchaînent. Nous préparons vos appartements entre deux voyageurs, aux dates de votre calendrier, et entretenons aussi bureaux et boutiques.",
      image: { src: "/media/photos/airbnb-salon-table-basse.webp", alt: "Salon d'un appartement parisien en location courte durée prêt à accueillir" },
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
        { title: "Nous confirmons", text: "Prix clair sous 24 h, avant le premier passage." },
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
  }
];

export function getLocalPage(slug: string): LocalPage {
  const page = localPages.find((item) => item.slug === slug);
  if (!page) throw new Error(`Page locale inconnue : ${slug}`);
  return page;
}
