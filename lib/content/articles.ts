export type Article = {
  slug: string;
  title: string;
  metaDescription: string;
  category: string;
  date: string;
  isoDate: string;
  excerpt: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
};

export const articles: Article[] = [
  {
    slug: "menage-airbnb-checklist-prix",
    title: "Ménage Airbnb : prix et checklist complète entre deux voyageurs",
    metaDescription:
      "Combien coûte un ménage Airbnb en Île-de-France et que doit-il comprendre ? Prix par type de logement, checklist entre deux voyageurs et conseils pour conciergeries.",
    category: "Airbnb",
    date: "14 octobre 2026",
    isoDate: "2026-10-14",
    excerpt:
      "Prix par type de logement, checklist complète entre deux voyageurs et conseils pour les conciergeries : tout pour des avis 5 étoiles.",
    sections: [
      {
        title: "Pourquoi le ménage fait vos avis",
        paragraphs: [
          "Sur Airbnb, la propreté est l'un des critères notés par chaque voyageur. Un cheveu dans la douche ou une poussière sur la table de nuit suffit à perdre une étoile, et une note qui baisse fait reculer l'annonce dans les résultats.",
          "Un ménage professionnel, toujours fait selon la même checklist, protège votre note et donc votre taux de remplissage."
        ]
      },
      {
        title: "La checklist entre deux voyageurs",
        paragraphs: [
          "Chambre : changer draps et housses, refaire le lit façon hôtel, dépoussiérer tables de nuit et têtes de lit, vérifier sous le lit.",
          "Salle de bain : nettoyer et désinfecter douche, lavabo, WC et miroirs, retirer le calcaire, remettre serviettes propres et consommables.",
          "Cuisine : vaisselle propre et rangée, plaques, four, micro-ondes et réfrigérateur vidés et nettoyés, poubelles sorties.",
          "Séjour et entrée : poussières, coussins, sols aspirés et lavés, vitres et traces de doigts.",
          "Contrôle final : photos du logement prêt, vérification des équipements et signalement des dégâts ou oublis."
        ]
      },
      {
        title: "Combien coûte un ménage Airbnb ?",
        paragraphs: [
          "Le prix dépend surtout de la taille du logement et de la gestion du linge. Chez ProClean Empire, comptez à partir de 35 € pour un studio, 55 € pour un T2, 65 € pour un T3 et 85 € pour un T4 ou une maison, avec le linge en option dès 8 € par jeu de draps.",
          "Les conciergeries qui confient plusieurs logements bénéficient de tarifs dégressifs selon le volume mensuel."
        ]
      },
      {
        title: "Conciergeries : bien choisir son partenaire ménage",
        paragraphs: [
          "Vérifiez la capacité à intervenir le jour même entre un départ à 11 h et une arrivée à 15 h, la gestion du linge, l'envoi de photos de fin de ménage et la facturation mensuelle regroupée. Un interlocuteur unique simplifie tout."
        ]
      },
      {
        title: "Ménage Airbnb à Paris et en Île-de-France",
        paragraphs: [
          "ProClean Empire prépare des logements en location courte durée à Paris, Saint-Ouen-sur-Seine, Pontoise, Cergy et dans toute l'Île-de-France, pour les propriétaires comme pour les conciergeries. Découvrez notre offre ménage Airbnb ou demandez un devis."
        ]
      }
    ]
  },
  {
    slug: "prix-nettoyage-bureaux-ile-de-france",
    title: "Prix d'un nettoyage de bureaux en Île-de-France : comment est-il calculé ?",
    metaDescription:
      "Surface, fréquence, horaires, sanitaires : les critères qui fixent le prix d'un contrat de nettoyage de bureaux en Île-de-France, et comment obtenir un devis juste.",
    category: "Entretien bureaux",
    date: "14 octobre 2026",
    isoDate: "2026-10-14",
    excerpt:
      "Surface, fréquence, horaires, nombre de sanitaires : voici les critères qui déterminent le prix d'un contrat de nettoyage de bureaux, et comment comparer les devis.",
    sections: [
      {
        title: "Pourquoi il n'existe pas de prix unique",
        paragraphs: [
          "Deux bureaux de même surface peuvent avoir des besoins très différents. Un cabinet de 80 m² avec un seul sanitaire et un passage par semaine n'a rien à voir avec un open space de 80 m² occupé par vingt personnes, avec cuisine et passage quotidien.",
          "C'est pour cela que les entreprises de nettoyage sérieuses chiffrent après une visite ou un échange détaillé, plutôt qu'avec un tarif au m² appliqué à l'aveugle."
        ]
      },
      {
        title: "Les 6 critères qui font le prix",
        paragraphs: [
          "1. La surface et la configuration : nombre de pièces, open space ou bureaux cloisonnés, étages.",
          "2. La fréquence : quotidienne, plusieurs fois par semaine ou hebdomadaire. Plus la fréquence est élevée, plus chaque passage est rapide.",
          "3. Les sanitaires et cuisines : ce sont les zones qui demandent le plus de temps.",
          "4. Les horaires : une intervention tôt le matin, tard le soir ou le week-end peut avoir un coût différent.",
          "5. Le niveau d'exigence : accueil client, salle de réunion de direction, contraintes d'hygiène particulières.",
          "6. Les prestations complémentaires : vitres, shampoing de moquette, remise en état ponctuelle."
        ]
      },
      {
        title: "Taux horaire ou forfait mensuel ?",
        paragraphs: [
          "La plupart des contrats d'entretien de bureaux sont facturés au forfait mensuel : le prestataire estime le temps nécessaire, et vous payez un montant fixe chaque mois. C'est plus simple à budgéter.",
          "Pour les interventions ponctuelles (nettoyage après travaux, remise en état), le prix est généralement établi au forfait selon la surface et l'état des locaux."
        ]
      },
      {
        title: "Comment comparer les devis",
        paragraphs: [
          "Vérifiez que chaque devis détaille la liste des tâches par zone, la fréquence, les horaires, la fourniture des produits et du matériel, et les modalités de contrôle qualité. Un prix bas sans cahier des charges précis cache souvent un temps de passage insuffisant.",
          "Demandez aussi qui sera votre interlocuteur en cas de problème, et sous quel délai il intervient."
        ]
      },
      {
        title: "Obtenir un devis à Pontoise, Cergy ou en Île-de-France",
        paragraphs: [
          "ProClean Empire, entreprise de nettoyage basée à Pontoise, se déplace gratuitement pour visiter vos locaux et vous envoie un devis détaillé sous 24 h. Demandez le vôtre via notre formulaire de devis."
        ]
      }
    ]
  },
  {
    slug: "choisir-entreprise-nettoyage-val-d-oise",
    title: "Comment choisir son entreprise de nettoyage dans le Val-d'Oise ?",
    metaDescription:
      "Proximité, assurance, cahier des charges, contrôle qualité : la checklist pour choisir une entreprise de nettoyage fiable à Pontoise, Cergy et dans le Val-d'Oise.",
    category: "Conseils",
    date: "14 octobre 2026",
    isoDate: "2026-10-14",
    excerpt:
      "Proximité, assurance, cahier des charges, contrôle qualité : notre checklist pour choisir une entreprise de nettoyage fiable dans le Val-d'Oise.",
    sections: [
      {
        title: "1. Privilégier la proximité",
        paragraphs: [
          "Une entreprise implantée près de chez vous intervient plus vite en cas d'urgence, est plus ponctuelle et connaît le territoire. À Pontoise, Cergy, Osny ou Saint-Ouen-l'Aumône, un prestataire local peut souvent intervenir dans l'heure pour un imprévu."
        ]
      },
      {
        title: "2. Vérifier l'existence légale et l'assurance",
        paragraphs: [
          "Demandez le numéro SIRET et vérifiez-le sur l'annuaire officiel des entreprises. Exigez une attestation d'assurance responsabilité civile professionnelle à jour : elle vous protège en cas de dommage dans vos locaux.",
          "Pour tout contrat d'un montant significatif, le donneur d'ordre doit aussi obtenir l'attestation de vigilance URSSAF du prestataire."
        ]
      },
      {
        title: "3. Exiger un cahier des charges écrit",
        paragraphs: [
          "Le devis doit lister les tâches pièce par pièce, la fréquence de chaque tâche, les horaires de passage et ce qui est fourni (produits, matériel, consommables). C'est la base pour mesurer la qualité ensuite."
        ]
      },
      {
        title: "4. Demander comment la qualité est contrôlée",
        paragraphs: [
          "Un bon prestataire réalise des contrôles réguliers, vous donne un interlocuteur unique et réagit vite en cas de remarque. Demandez concrètement : qui contrôle, à quelle fréquence, et comment vous signalez un problème."
        ]
      },
      {
        title: "5. Lire les avis clients",
        paragraphs: [
          "Les avis Google sont un bon indicateur de sérieux. Regardez la note, mais surtout le contenu des avis et la façon dont l'entreprise y répond."
        ]
      },
      {
        title: "Votre entreprise de nettoyage à Pontoise",
        paragraphs: [
          "ProClean Empire est basée à Pontoise et intervient dans tout le Val-d'Oise et l'Île-de-France : bureaux, commerces, restaurants, vitrerie et remise en état. Visite et devis gratuits sous 24 h."
        ]
      }
    ]
  },
  {
    slug: "nettoyage-apres-chantier-checklist",
    title: "Nettoyage après chantier : la checklist complète avant livraison",
    metaDescription:
      "Poussières, traces de peinture, vitres, sols, sanitaires : la checklist complète d'un nettoyage de fin de chantier pour livrer des locaux impeccables.",
    category: "Conseils",
    date: "14 octobre 2026",
    isoDate: "2026-10-14",
    excerpt:
      "Poussières fines, traces de peinture et de plâtre, vitres, sols : la checklist complète pour livrer des locaux impeccables après des travaux.",
    sections: [
      {
        title: "Pourquoi un nettoyage spécifique après travaux",
        paragraphs: [
          "La poussière de chantier est très fine : elle se dépose sur toutes les surfaces, pénètre dans les rails, les prises et les grilles de ventilation, et réapparaît si elle est mal retirée. Un ménage classique ne suffit pas."
        ]
      },
      {
        title: "Étape 1 : évacuer et dépoussiérer du haut vers le bas",
        paragraphs: [
          "Retirer les résidus légers, protections et emballages. Dépoussiérer ensuite plafonds accessibles, luminaires, haut des portes, murs, plinthes, en terminant par les sols. Utiliser un aspirateur équipé d'un filtre adapté aux poussières fines."
        ]
      },
      {
        title: "Étape 2 : retirer les traces",
        paragraphs: [
          "Traces de peinture, de plâtre, de colle et d'adhésif sur les menuiseries, vitres, carrelages et sanitaires. Chaque surface demande un produit et un outil adaptés pour ne rien rayer."
        ]
      },
      {
        title: "Étape 3 : vitres, menuiseries et équipements",
        paragraphs: [
          "Nettoyage des vitres et encadrements, rails de baies, poignées, interrupteurs, prises, radiateurs, grilles de ventilation, intérieur des placards et équipements de cuisine."
        ]
      },
      {
        title: "Étape 4 : sols et sanitaires",
        paragraphs: [
          "Lavage des sols adapté au revêtement (carrelage, parquet, PVC, béton ciré), détartrage et désinfection des sanitaires, puis contrôle final pièce par pièce."
        ]
      },
      {
        title: "Faire appel à un professionnel",
        paragraphs: [
          "ProClean Empire réalise des nettoyages de fin de chantier à Pontoise, Cergy et dans toute l'Île-de-France pour les artisans, entreprises du bâtiment, agences et propriétaires. Envoyez-nous la surface et quelques photos : devis sous 24 h."
        ]
      }
    ]
  }
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
