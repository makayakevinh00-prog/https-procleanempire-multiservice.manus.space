/** Formation ProClean : fiches de révision (les questions et la correction sont dans la base, voir la migration 0083). */
export type FormationModule = "app" | "process" | "incident";
export type Revision = { title: string; points: string[] };

export const MODULES: Record<FormationModule, { title: string; lead: string; revision: Revision[] }> = {
  app: {
    title: "Utiliser l'application",
    lead: "Comment se déroule un ménage dans l'application, du départ jusqu'au paiement.",
    revision: [
      { title: "Avant le ménage", points: ["Gardez la localisation activée : l'arrivée est pointée toute seule quand vous êtes devant le logement.", "Appuyez sur « Je pars » : choisissez voiture ou transports, le trajet et l'heure d'arrivée sont partagés.", "L'adresse et les consignes d'accès n'apparaissent qu'après avoir accepté le ménage.", "Le bouton « En ligne » vous rend visible : les propositions proches arrivent en premier.", "Code ou clé qui ne marche pas : ne forcez jamais, contactez la direction."] },
      { title: "Pendant le ménage", points: ["Filmez d'abord tout le logement : c'est le film d'arrivée, l'IA prépare votre liste de tâches.", "Signalez avec une photo tout dégât avant de commencer : il ne sera pas mis sur votre compte.", "Cochez les tâches dans l'ordre de la liste.", "Draps : déposé, renvoyé, récupéré, remis en place. Chaque étape se coche dans l'application."] },
      { title: "Après le ménage", points: ["Filmez le logement propre : c'est le film de fin, sans lui le ménage n'est pas validé.", "Si l'IA signale des zones à reprendre, refaites-les, refilmez-les, puis renvoyez.", "Paiement : ménage validé, « à recevoir », versement, payé. Tout est dans l'onglet Gains.", "Un ménage que vous ne pouvez plus faire : libérez-le tout de suite dans l'application."] }
    ]
  },
  process: {
    title: "Les process de ménage",
    lead: "Les gestes ProClean pour un logement impeccable, à chaque fois.",
    revision: [
      { title: "L'ordre de travail", points: ["Toujours du haut vers le bas : poussière, surfaces, puis sol, en reculant vers la sortie.", "Aspirez d'abord, lavez le sol ensuite.", "Salle de bain et WC en dernier, avec des chiffons dédiés.", "Chiffons séparés par zone : cuisine, sanitaires, WC. Jamais le même."] },
      { title: "Produits et sécurité", points: ["Ne mélangez jamais l'eau de Javel avec du vinaigre ou de l'ammoniaque : gaz toxique.", "Un produit à la fois, la fenêtre ouverte.", "Miroirs et vitres : produit adapté, puis microfibre sèche, du haut vers le bas."] },
      { title: "Les points qu'on regarde", points: ["Cuisine : évier, plaques, micro-ondes, réfrigérateur, surfaces et poignées.", "Lit : draps propres bien tendus, oreillers et couvertures en place.", "Poubelles vidées, sac propre remis, déchets sortis selon la consigne.", "Taches sur le linge, objet oublié, produit manquant : on photographie et on signale dans l'application."] },
      { title: "Avant de partir", points: ["Relisez la check-list pièce par pièce.", "Lumières éteintes, fenêtres fermées, clés selon la consigne.", "Soyez discret chez le client : rien n'est pris, rien n'est photographié d'objets personnels."] }
    ]
  },
  incident: {
    title: "Casse, dégâts et voyageurs difficiles",
    lead: "Que faire quand quelque chose est cassé, quand le logement est dans un état choquant ou quand un client dérape.",
    revision: [
      { title: "Constater avant de toucher", points: ["À l'arrivée, filmez ou photographiez tout dégât ou saleté inhabituelle avant de toucher à quoi que ce soit.", "Ne réparez pas, ne jetez pas, ne remplacez pas : signalez à la direction depuis l'application, preuves à l'appui.", "Logement saccagé : ne nettoyez rien avant d'avoir documenté et attendu les consignes."] },
      { title: "Si c'est vous qui cassez", points: ["Dites-le tout de suite à la direction, avec une photo.", "Une casse déclarée se règle ; une casse cachée devient une faute.", "Ne remplacez jamais l'objet en douce."] },
      { title: "Objets de valeur et objets dangereux", points: ["Argent, bijou, papiers : ne les emportez pas, photographiez et signalez.", "Seringue, drogue, objet dangereux : n'y touchez pas, prévenez la direction.", "Fuite d'eau, gaz, fumée : sécurité d'abord (18 ou 112), puis la direction. Vous ne réparez jamais."] },
      { title: "Face aux personnes", points: ["Voyageur encore présent : ne commencez pas, prévenez la direction.", "Client agressif ou menaçant : restez calme, ne discutez pas, quittez les lieux si besoin, prévenez la direction.", "Vous constatez et vous signalez : n'accusez personne et ne demandez jamais d'argent. Tout paiement passe par ProClean."] }
    ]
  }
};
export const MODULE_LIST: FormationModule[] = ["app", "process", "incident"];
export const isModule = (m: string): m is FormationModule => (MODULE_LIST as string[]).includes(m);

export type TrainingState = {
  name: string; certified_at: string | null; certificate_no: string | null; score: number | null; pass_mark: number; paris_min: number;
  modules: Record<FormationModule, { best: number | null; passed: boolean; attempts: number; questions: number }>;
};
export type TrainingResult = { score: number; passed: boolean; good: number; total: number; wrong: { id: string; why: string }[]; certified: boolean; pass_mark: number };
export type TrainingQuestion = { id: string; question: string; options: string[] };
