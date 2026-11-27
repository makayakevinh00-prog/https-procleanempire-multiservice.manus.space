/**
 * Contrat de sous-traitance avec un entrepreneur indépendant (auto-entrepreneur, EI, société) pour l'entretien
 * régulier d'un site client de ProClean Empire. Les rôles sont inversés par rapport aux autres contrats :
 * ProClean Empire est le Donneur d'ordre, l'entrepreneur est le Prestataire.
 * Les passages entre crochets [ … ] sont à compléter : ils s'affichent en bleu dans le PDF.
 * Ce texte doit être relu par un conseil juridique avant tout usage contractuel.
 */
import type { Article, BuiltContract } from "./clauses";

export interface EntrepreneurInput {
  ref: string;
  name?: string;
  legalForm?: string;
  siret?: string;
  address?: string;
  phone?: string;
  email?: string;
  start?: string;
  months?: number;
  monthlyHt?: number | null;
  site?: string;
  weekdays?: string;
  time?: string;
  hoursPerVisit?: number;
}

const ph = (x: string) => `[ ${x} ]`;
const eur = (n: number) =>
  `${n
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d),)/g, " ")} €`;
const dateFr = (d?: string) =>
  d
    ? new Date(`${d.slice(0, 10)}T12:00:00`)
        .toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
        .replace(/^1 /, "1er ")
    : ph("date de début");
const addMonths = (d: string, n: number) => {
  const x = new Date(`${d.slice(0, 10)}T12:00:00`);
  x.setMonth(x.getMonth() + n);
  x.setDate(x.getDate() - 1);
  return x.toISOString().slice(0, 10);
};

export function buildEntrepreneurContract(i: EntrepreneurInput): BuiltContract {
  const months = i.months ?? 6;
  const site = i.site ?? "41-43 rue Lavoisier, 95220 Herblay-sur-Seine";
  const days = i.weekdays ?? "mercredi et samedi";
  const time = i.time ?? "de 7 h à 10 h";
  const hours = i.hoursPerVisit ?? 3;
  const price = i.monthlyHt ? eur(i.monthlyHt) : ph("montant mensuel");
  const perVisitNote = i.monthlyHt
    ? `Soit, pour information, environ ${eur(Math.round(((i.monthlyHt * 12) / 52 / 2) * 100) / 100)} par passage de ${String(hours).replace(".", ",")} h.`
    : "";
  const end = i.start ? dateFr(addMonths(i.start, months)) : ph("date de fin");

  const articles: Article[] = [
    {
      title: "Objet du contrat",
      blocks: [
        {
          p: `Le Donneur d'ordre confie au Prestataire, qui l'accepte, l'entretien régulier des locaux professionnels de ses clients situés ${site} (le « Site »). Le Site est occupé par deux clients du Donneur d'ordre, SEA et Île-de-France Recyclage : un seul passage, de ${String(hours).replace(".", ",")} h, couvre les deux.`,
        },
        {
          p: "Il s'agit d'un contrat de prestation de services entre professionnels indépendants. Le Prestataire exerce son activité en toute indépendance : il n'existe entre les Parties aucun lien de subordination, ni contrat de travail, ni exclusivité. Le Prestataire organise librement ses méthodes de travail dans le respect des résultats attendus et du planning du Site.",
        },
      ],
    },
    {
      title: "Description des prestations",
      blocks: [
        {
          h: "Prestations à réaliser à chaque passage",
          bullets: [
            "Nettoyage des sols (aspiration et lavage) des bureaux, des zones de circulation et des espaces de pause.",
            "Dépoussiérage des postes de travail et du mobilier, vidage des corbeilles et évacuation des déchets.",
            "Nettoyage et désinfection des sanitaires.",
            "Réapprovisionnement des consommables sanitaires, si le Donneur d'ordre les met à disposition.",
          ],
        },
        {
          h: "Compte-rendu",
          p: "Après chaque passage, le Prestataire signale sans délai au Donneur d'ordre toute anomalie (dégât, accès impossible, local inhabituellement sale, matériel manquant). Le Donneur d'ordre peut lui demander quelques photos de l'état du Site à l'arrivée et au départ.",
        },
        {
          h: "Produits et matériel",
          p: `Le Prestataire fournit à ses frais les produits et le matériel professionnels nécessaires, en bon état et conformes à la réglementation. ${ph("Variante : produits fournis par le Donneur d'ordre")}`,
        },
      ],
    },
    {
      title: "Planning et remplacement",
      blocks: [
        {
          h: "Jours et horaires",
          p: `Les passages ont lieu deux fois par semaine, le ${days}, ${time}, soit ${String(hours).replace(".", ",")} h par passage. Ces horaires correspondent aux besoins du client final sur le Site. Ils ne peuvent être modifiés que par accord écrit des Parties.`,
        },
        {
          h: "Absence et remplacement",
          p: "Le Prestataire peut se faire remplacer par un autre professionnel indépendant, ou par son propre personnel déclaré, à condition d'en informer le Donneur d'ordre au moins 48 heures à l'avance et d'obtenir son accord écrit. Le remplaçant est tenu aux mêmes obligations ; le Prestataire en répond. En cas d'empêchement imprévu, le Prestataire prévient le Donneur d'ordre au plus tôt, et dans tous les cas avant l'heure du passage.",
        },
        {
          h: "Passage non réalisé",
          p: "Un passage non réalisé n'est pas rémunéré. Le Prestataire le rattrape dans les 24 heures si le Site le permet. Si le passage n'est ni réalisé ni rattrapé du fait du Prestataire, le Donneur d'ordre peut en confier la réalisation à un tiers.",
        },
      ],
    },
    {
      title: "Rémunération",
      blocks: [
        {
          h: "Forfait mensuel",
          p: `Le Prestataire perçoit un forfait de ${price} HT par mois, pour deux passages par semaine. ${perVisitNote} Ce forfait couvre l'ensemble de ses frais : produits et matériel, déplacements, assurance, charges sociales et fiscales, tenue de travail.`.trim(),
        },
        {
          h: "TVA",
          p: `${ph("TVA non applicable, art. 293 B du CGI")} ${ph("ou : TVA au taux de 20 % en sus")}. Le Prestataire indique le régime qui s'applique à lui sur sa facture.`,
        },
        {
          h: "Mois incomplet",
          p: "Lorsque tous les passages d'un mois ne sont pas réalisés, le forfait est réduit au prorata du nombre de passages réalisés par rapport au nombre de passages prévus dans le mois. Il en va de même pour le premier et le dernier mois du contrat s'ils sont incomplets.",
        },
        {
          h: "Facturation et paiement",
          p: `Le Prestataire émet une facture à la fin de chaque mois, avec son numéro de SIRET et les dates des passages. Le Donneur d'ordre la règle par virement sous ${ph("15")} jours après réception. Tout retard entraîne des pénalités égales à trois fois le taux d'intérêt légal et une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 et D441-5 du Code de commerce).`,
        },
      ],
    },
    {
      title: "Durée, engagement et résiliation",
      blocks: [
        {
          h: "Durée",
          p: `Le contrat prend effet le ${dateFr(i.start)} pour une durée ferme de ${months} mois, soit jusqu'au ${end}. Il prend fin à cette date sans formalité. Il peut être renouvelé par avenant écrit signé des deux Parties.`,
        },
        {
          h: "Engagement du premier mois",
          p: "Chaque Partie s'engage à poursuivre le contrat pendant au moins un mois à compter de son entrée en vigueur. Aucune résiliation n'est possible pendant ce premier mois, sauf faute grave au sens du présent article.",
        },
        {
          h: "Résiliation anticipée",
          p: "À l'issue du premier mois, chaque Partie peut résilier le contrat avant son terme avec un préavis de 15 jours, par lettre recommandée ou e-mail avec accusé de réception. Pendant le préavis, les passages restent dus et rémunérés.",
        },
        {
          h: "Faute grave et fin du contrat client",
          p: "En cas de manquement grave (passages non réalisés à plusieurs reprises, vol, dégradation volontaire, violation de la confidentialité, impayé), l'autre Partie peut résilier de plein droit, 48 heures après une mise en demeure restée sans effet. Si le contrat conclu par le Donneur d'ordre avec le client du Site prend fin, le Donneur d'ordre peut aussi mettre fin au présent contrat avec un préavis de 15 jours.",
        },
        {
          h: "Fin de contrat",
          p: "À la fin du contrat, le Prestataire restitue immédiatement toutes les clés, badges et codes d'accès, contre décharge.",
        },
      ],
    },
    {
      title: "Obligations du Prestataire",
      blocks: [
        {
          p: "Le Prestataire déclare exercer son activité de façon régulière et déclarée. Avant le premier passage, puis tous les 6 mois, il remet au Donneur d'ordre : son numéro de SIRET (extrait d'immatriculation ou avis de situation Sirene), son attestation de vigilance URSSAF en cours de validité, et son attestation d'assurance de responsabilité civile professionnelle. Il informe le Donneur d'ordre sans délai de tout changement de sa situation.",
        },
        {
          p: "Le Prestataire exécute les prestations avec soin et selon les règles de l'art, en tenue propre et en respectant les consignes de sécurité du Site, l'accès aux locaux et le règlement intérieur du client final. Il est tenu à une obligation de moyens.",
        },
      ],
    },
    {
      title: "Obligations du Donneur d'ordre",
      blocks: [
        {
          p: "Le Donneur d'ordre remet au Prestataire les clés, badges ou codes nécessaires, l'informe des consignes du Site, met à disposition l'eau, l'électricité et un local de rangement, et lui signale sans délai toute remarque du client final. Il règle le forfait dans les délais prévus.",
        },
      ],
    },
    {
      title: "Responsabilité et assurance",
      blocks: [
        {
          p: `Le Prestataire est assuré en responsabilité civile professionnelle auprès de ${ph("assureur")}, contrat n° ${ph("numéro")}, et maintient cette assurance pendant toute la durée du contrat. Il répond des dommages causés aux locaux, au mobilier et aux tiers par lui-même ou par son remplaçant lors de ses interventions.`,
        },
        {
          p: "Force majeure : aucune Partie n'est responsable d'une inexécution causée par un cas de force majeure au sens de l'article 1218 du Code civil.",
        },
      ],
    },
    {
      title: "Confidentialité et non-sollicitation",
      blocks: [
        {
          p: "Le Prestataire garde confidentiels les codes, clés, badges et informations relatives au Site et aux clients du Donneur d'ordre, pendant le contrat et 2 ans après. Les données personnelles sont traitées uniquement pour exécuter le contrat, conformément au RGPD.",
        },
        {
          p: "Pendant la durée du contrat et 12 mois après sa fin, le Prestataire s'interdit de proposer directement ses services d'entretien aux clients du Donneur d'ordre présents sur le Site, sans l'accord écrit de celui-ci.",
        },
      ],
    },
    {
      title: "Droit applicable et litiges",
      blocks: [
        {
          p: `Le contrat est soumis au droit français. Les Parties recherchent d'abord une solution amiable. À défaut d'accord, le litige est porté devant ${ph("tribunal de commerce de Pontoise")}.`,
        },
      ],
    },
  ];

  const prestataire = [
    i.name || ph("nom et prénom ou raison sociale"),
    [
      i.legalForm ||
        ph("entrepreneur individuel / micro-entrepreneur / société"),
      i.siret ? `SIRET ${i.siret}` : `SIRET ${ph("numéro")}`,
    ].join(" · "),
    i.address || ph("adresse"),
    [i.phone, i.email].filter(Boolean).join(" · ") || ph("téléphone · e-mail"),
  ];

  return {
    title: "Contrat de prestation de services — entretien de locaux",
    subtitle: "Sous-traitance à un entrepreneur indépendant",
    ref: i.ref,
    summary: [
      ["Référence", i.ref],
      ["Durée", `${months} mois`],
      [
        "Rémunération",
        i.monthlyHt ? `${price} HT par mois` : ph("à compléter"),
      ],
    ],
    parties: { provider: [], client: prestataire, place: `Le Site : ${site}.` },
    articles,
    reverse: true,
  };
}
