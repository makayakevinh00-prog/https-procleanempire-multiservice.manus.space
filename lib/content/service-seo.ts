export type ServiceSeo = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  sections: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export const serviceSeo: Record<string, ServiceSeo> = {
  "nettoyage-bureaux": {
    metaTitle: "Nettoyage de bureaux à Pontoise, Cergy et Val-d'Oise",
    metaDescription:
      "Entreprise de nettoyage de bureaux à Pontoise, Cergy et en Île-de-France : entretien quotidien ou hebdomadaire, horaires décalés, devis gratuit sous 24 h.",
    h1: "Nettoyage de bureaux à Pontoise, Cergy et dans le Val-d'Oise",
    sections: [
      {
        title: "Ce que comprend l'entretien de vos bureaux",
        body:
          "Dépoussiérage des postes de travail et du mobilier, vidage des corbeilles et tri, aspiration et lavage des sols, nettoyage et désinfection des sanitaires, entretien de la cuisine ou de l'espace pause, salles de réunion remises en ordre, traces sur portes et vitres intérieures. Le cahier des charges est défini avec vous, pièce par pièce."
      },
      {
        title: "Une fréquence et des horaires adaptés",
        body:
          "Passage quotidien, plusieurs fois par semaine ou hebdomadaire : nous intervenons tôt le matin, en soirée ou le week-end pour ne pas perturber vos équipes. Des prestations complémentaires (vitres, shampoing de moquette, remise en état) peuvent être ajoutées ponctuellement."
      },
      {
        title: "Combien coûte le nettoyage de bureaux ?",
        body:
          "Le prix dépend de la surface, du nombre de sanitaires, de la fréquence et des horaires. Après une visite gratuite, vous recevez un devis détaillé sous 24 h, avec un prix fixe mensuel pour les contrats réguliers."
      },
      {
        title: "Où intervenons-nous ?",
        body:
          "Basés à Pontoise, nous entretenons des bureaux à Pontoise, Cergy, Osny, Saint-Ouen-l'Aumône, Conflans-Sainte-Honorine, Argenteuil et dans toute l'Île-de-France."
      }
    ],
    faqs: [
      {
        question: "Fournissez-vous les produits et le matériel ?",
        answer: "Oui, nos équipes viennent avec les produits et le matériel professionnels nécessaires."
      },
      {
        question: "Faut-il être présent pendant le nettoyage ?",
        answer:
          "Non. Nous définissons ensemble les modalités d'accès (badge, clés, code) et intervenons en toute autonomie."
      },
      {
        question: "Y a-t-il une durée minimale d'engagement ?",
        answer: "Les conditions sont précisées dans le devis ; nous proposons des contrats souples adaptés à votre activité."
      }
    ]
  },
  "nettoyage-commerces": {
    metaTitle: "Nettoyage de commerces et boutiques à Pontoise et Cergy",
    metaDescription:
      "Nettoyage de commerces, boutiques et showrooms à Pontoise, Cergy et en Île-de-France : sols, vitrines, sanitaires, avant ou après l'ouverture. Devis gratuit.",
    h1: "Nettoyage de commerces et boutiques à Pontoise et en Île-de-France",
    sections: [
      {
        title: "Un magasin impeccable pour vos clients",
        body:
          "Sols, vitrines, cabines d'essayage, rayonnages, caisses, réserves et sanitaires : nous entretenons votre point de vente pour qu'il donne la meilleure image dès l'ouverture."
      },
      {
        title: "Des interventions en dehors des heures d'ouverture",
        body:
          "Nous passons avant l'ouverture, après la fermeture ou le dimanche, selon votre planning. Aucun impact sur vos ventes."
      },
      {
        title: "Ouverture, travaux, inventaire",
        body:
          "Avant l'ouverture d'une nouvelle boutique ou après des travaux d'aménagement, nous réalisons un nettoyage complet de remise en état."
      },
      {
        title: "Zones couvertes",
        body:
          "Centre-ville de Pontoise, Cergy Grand Centre, Saint-Ouen-l'Aumône, Conflans, Argenteuil et toute l'Île-de-France."
      }
    ],
    faqs: [
      {
        question: "Nettoyez-vous les vitrines côté rue ?",
        answer: "Oui, vitrines intérieures et extérieures accessibles sont incluses ou proposées en option."
      },
      {
        question: "Intervenez-vous le dimanche ?",
        answer: "Oui, nous intervenons 7 jours sur 7."
      },
      {
        question: "Proposez-vous un forfait mensuel ?",
        answer: "Oui, après visite nous vous proposons un prix fixe mensuel selon la fréquence choisie."
      }
    ]
  },
  "nettoyage-restaurants": {
    metaTitle: "Nettoyage de restaurants à Pontoise, Cergy et Val-d'Oise",
    metaDescription:
      "Nettoyage de restaurants, cuisines professionnelles et salles à Pontoise, Cergy et en Île-de-France. Protocoles d'hygiène, intervention après le service.",
    h1: "Nettoyage de restaurants et cuisines professionnelles à Pontoise",
    sections: [
      {
        title: "Salle, cuisine et sanitaires",
        body:
          "Nettoyage des sols et du mobilier de salle, dégraissage des surfaces de cuisine, plans de travail, éviers, sols antidérapants, sanitaires clients et vestiaires du personnel."
      },
      {
        title: "Des protocoles d'hygiène rigoureux",
        body:
          "Nos protocoles tiennent compte des exigences d'hygiène de la restauration : produits adaptés au contact alimentaire, ordre de nettoyage du plus propre au plus sale, contrôle visuel en fin d'intervention."
      },
      {
        title: "Après le service ou avant l'ouverture",
        body:
          "Nous intervenons après le service du soir ou tôt le matin pour que votre équipe trouve un établissement prêt à fonctionner."
      },
      {
        title: "Où intervenons-nous ?",
        body: "Pontoise, Cergy, Osny, Conflans-Sainte-Honorine, Argenteuil et toute l'Île-de-France."
      }
    ],
    faqs: [
      {
        question: "Nettoyez-vous les hottes ?",
        answer:
          "Nous nettoyons les surfaces extérieures des hottes et les filtres accessibles. Le dégraissage complet des gaines relève d'un prestataire spécialisé."
      },
      {
        question: "Pouvez-vous intervenir tard le soir ?",
        answer: "Oui, nous nous adaptons à l'heure de fin de votre service."
      },
      {
        question: "Faites-vous des grands nettoyages ponctuels ?",
        answer: "Oui, avant un contrôle, une réouverture ou après des travaux."
      }
    ]
  },
  "nettoyage-hotels": {
    metaTitle: "Nettoyage d'hôtels et résidences en Île-de-France",
    metaDescription:
      "Nettoyage d'hôtels, résidences et locations courte durée en Île-de-France : chambres, parties communes, linge. Contrôle qualité renforcé, devis gratuit.",
    h1: "Nettoyage d'hôtels, résidences et locations courte durée",
    sections: [
      {
        title: "Chambres et parties communes",
        body:
          "Recouche et départ, salles de bain, literie, hall, couloirs, ascenseurs, espace petit-déjeuner : nous travaillons selon une check-list définie avec vous et adaptée à votre standing."
      },
      {
        title: "Locations courte durée et conciergeries",
        body:
          "Nous accompagnons aussi les conciergeries et propriétaires de logements en location courte durée : ménage entre deux voyageurs, gestion du linge et contrôle avant arrivée. Voir notre offre dédiée : ménage Airbnb."
      },
      {
        title: "Un contrôle qualité renforcé",
        body:
          "Des points de contrôle réguliers et un interlocuteur unique garantissent un niveau constant, même en haute saison."
      }
    ],
    faqs: [
      {
        question: "Pouvez-vous renforcer l'équipe en haute saison ?",
        answer: "Oui, le dispositif est ajusté selon votre taux d'occupation."
      },
      {
        question: "Gérez-vous le linge ?",
        answer: "Oui, la gestion du linge peut être incluse selon votre besoin."
      },
      {
        question: "Où intervenez-vous ?",
        answer: "Paris et toute l'Île-de-France, avec une base à Pontoise (95)."
      }
    ]
  },
  "nettoyage-vitrerie": {
    metaTitle: "Nettoyage de vitres professionnel à Pontoise et Cergy",
    metaDescription:
      "Nettoyage de vitres et vitrines pour bureaux et commerces à Pontoise, Cergy et en Île-de-France. Passage ponctuel ou régulier, devis gratuit sous 24 h.",
    h1: "Nettoyage de vitres et vitrines à Pontoise et en Île-de-France",
    sections: [
      {
        title: "Vitres, vitrines, baies et cloisons vitrées",
        body:
          "Nettoyage des vitres intérieures et extérieures accessibles, encadrements, vitrines de commerces, baies vitrées et cloisons de bureaux, pour des surfaces nettes et sans traces."
      },
      {
        title: "Fréquence au choix",
        body:
          "Passage mensuel, trimestriel ou ponctuel (après travaux, avant un événement). La vitrerie peut aussi être intégrée à votre contrat d'entretien de bureaux."
      },
      {
        title: "Zones d'intervention",
        body: "Pontoise, Cergy, Osny, Saint-Ouen-l'Aumône, Conflans-Sainte-Honorine, Argenteuil et toute l'Île-de-France."
      }
    ],
    faqs: [
      {
        question: "Nettoyez-vous les vitres en hauteur ?",
        answer: "Nous intervenons sur les vitres accessibles en sécurité. Pour les grandes hauteurs, contactez-nous pour étudier la faisabilité."
      },
      {
        question: "Le devis est-il gratuit ?",
        answer: "Oui, gratuit et sans engagement, envoyé sous 24 h."
      },
      {
        question: "Intervenez-vous pour les particuliers ?",
        answer: "Notre priorité va aux professionnels, mais contactez-nous pour toute demande."
      }
    ]
  },
  "apres-chantier": {
    metaTitle: "Nettoyage après chantier à Pontoise, Cergy et Val-d'Oise",
    metaDescription:
      "Nettoyage de fin de chantier à Pontoise, Cergy et en Île-de-France : poussières, traces de peinture et de plâtre, vitres, sols. Locaux prêts à être livrés.",
    h1: "Nettoyage après chantier à Pontoise et dans le Val-d'Oise",
    sections: [
      {
        title: "Des locaux prêts à être livrés",
        body:
          "Après des travaux, la poussière se dépose partout. Nous dépoussiérons murs, plafonds accessibles, menuiseries et équipements, retirons les traces de plâtre, de peinture et d'adhésif, nettoyons vitres et sols, puis réalisons une finition complète."
      },
      {
        title: "Pour les entreprises du bâtiment et les maîtres d'ouvrage",
        body:
          "Nous travaillons avec les artisans, entreprises générales, promoteurs, agences et propriétaires pour livrer des locaux propres dans les délais."
      },
      {
        title: "Un devis rapide",
        body:
          "Le prix dépend de la surface, du niveau de salissure et des délais. Envoyez-nous quelques photos et la surface : vous recevez un devis sous 24 h."
      }
    ],
    faqs: [
      {
        question: "Évacuez-vous les gravats ?",
        answer: "Nous évacuons les résidus légers de fin de chantier. Les gravats lourds relèvent de l'entreprise de travaux."
      },
      {
        question: "Pouvez-vous intervenir rapidement ?",
        answer: "Oui, souvent sous 48 h pour tenir une date de livraison."
      },
      {
        question: "Intervenez-vous sur des logements ?",
        answer: "Oui, logements, bureaux et commerces."
      }
    ]
  },
  "remise-en-etat": {
    metaTitle: "Remise en état de locaux à Pontoise et en Île-de-France",
    metaDescription:
      "Remise en état de locaux professionnels et logements à Pontoise, Cergy et en Île-de-France : avant emménagement, après départ ou état des lieux. Devis gratuit.",
    h1: "Remise en état de locaux à Pontoise et en Île-de-France",
    sections: [
      {
        title: "Repartir sur une base propre",
        body:
          "Avant un emménagement, après le départ d'un locataire ou avant un état des lieux, nous réalisons un nettoyage en profondeur : sols, sanitaires, cuisine, vitres, portes, plinthes, interrupteurs et rangements."
      },
      {
        title: "Pour qui ?",
        body:
          "Entreprises, agences immobilières, syndics, bailleurs, propriétaires et conciergeries en Île-de-France."
      },
      {
        title: "Délais et prix",
        body:
          "Le tarif est établi selon la surface et l'état des locaux. Une visite ou quelques photos suffisent pour recevoir un devis sous 24 h."
      }
    ],
    faqs: [
      {
        question: "Intervenez-vous avant un état des lieux ?",
        answer: "Oui, c'est une de nos demandes les plus fréquentes."
      },
      {
        question: "Traitez-vous le calcaire et les graisses incrustées ?",
        answer: "Oui, avec des produits professionnels adaptés à chaque surface."
      },
      {
        question: "Quelles villes couvrez-vous ?",
        answer: "Pontoise, Cergy, Osny, Saint-Ouen-l'Aumône, Conflans, Argenteuil, Paris et toute l'Île-de-France."
      }
    ]
  },
  "nettoyage-automobile": {
    metaTitle: "Nettoyage automobile et flottes d'entreprise en Île-de-France",
    metaDescription:
      "Nettoyage et detailing automobile pour flottes d'entreprise et particuliers à Pontoise, Cergy et en Île-de-France : intérieur, extérieur, intervention sur site.",
    h1: "Nettoyage automobile et detailing de flottes d'entreprise",
    sections: [
      {
        title: "Intérieur et extérieur",
        body:
          "Aspiration, nettoyage des plastiques et des sièges, vitres, traitement des tissus et du cuir, lavage extérieur et finitions : vos véhicules retrouvent un aspect soigné."
      },
      {
        title: "Flottes d'entreprise",
        body:
          "Véhicules de service, utilitaires, véhicules de location ou de concession : nous planifions des passages réguliers pour garder votre flotte présentable, directement sur votre site quand c'est possible."
      },
      {
        title: "Zones d'intervention",
        body: "Pontoise, Cergy, Val-d'Oise et toute l'Île-de-France."
      }
    ],
    faqs: [
      {
        question: "Vous déplacez-vous sur notre parking ?",
        answer: "Oui, selon l'accès et les conditions du site, nous intervenons directement chez vous."
      },
      {
        question: "Traitez-vous les flottes importantes ?",
        answer: "Oui, nous planifions les interventions par lots pour limiter l'immobilisation."
      },
      {
        question: "Travaillez-vous aussi pour les particuliers ?",
        answer: "Oui, pour du detailing haut de gamme."
      }
    ]
  }
};
