/**
 * Bibliothèque de clauses des contrats ProClean Empire, par catégorie de client.
 *  - airbnb  : repris du contrat de prestation « logement meublé en courte durée » signé par ProClean Empire.
 *  - bureaux / commerce : même charpente (8 articles), clauses adaptées à l'entretien régulier de locaux.
 * Les passages entre crochets [ … ] sont à compléter : ils s'affichent en bleu dans le PDF.
 * Ces textes doivent être relus par un conseil juridique avant tout usage contractuel.
 */
export type ContractCategory = "airbnb" | "bureaux" | "commerce";
export const CATEGORY_LABEL: Record<ContractCategory, string> = { airbnb: "Airbnb / conciergerie", bureaux: "Bureaux", commerce: "Commerce" };

export const LEGAL_REP = { name: "Kevinh MAKAYA-MATEVE", title: "Président" };

export interface Block { h?: string; p?: string; bullets?: string[] }
export interface Article { title: string; blocks: Block[] }
export interface ContractInput {
  category: ContractCategory;
  contract: { label: string; billing_mode: string; monthly_amount_ht: number | null; per_visit_amount_ht: number | null; terms: string | null; start_date: string | null; end_date: string | null;
    visits_per_week: number | null; weekdays: (number | string)[] | null; start_time: string | null; hours_per_visit: number | null; notes: string | null };
  client: { name: string; kind: string | null; address: string | null; postal_code: string | null; city: string | null; phone: string | null; email: string | null; siret: string | null };
  site: { name: string | null; address: string | null } | null;
  ref: string;
}
export interface BuiltContract {
  title: string; subtitle: string; ref: string;
  summary: [string, string][];
  parties: { provider: string[]; client: string[]; place: string };
  articles: Article[];
}

const ph = (x: string) => `[ ${x} ]`;
const eur = (n: number) => `${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d),)/g, " ")} €`;
const ttc = (ht: number) => Math.round(ht * 1.2 * 100) / 100;
const DAYS: Record<string, string> = { lun: "lundi", mar: "mardi", mer: "mercredi", jeu: "jeudi", ven: "vendredi", sam: "samedi", dim: "dimanche", lundi: "lundi", mardi: "mardi", mercredi: "mercredi", jeudi: "jeudi", vendredi: "vendredi", samedi: "samedi", dimanche: "dimanche" };

function months(a: string | null, b: string | null, fallback: number) {
  if (!a || !b) return fallback;
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / (30.44 * 86_400_000));
  return m > 0 ? m : fallback;
}
const dateFr = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }).replace(/^1 /, "1er ") : ph("date de début"));

function common(i: ContractInput) {
  const c = i.client;
  const addr = [c.address, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const place = i.site?.address ?? addr ?? "";
  return { addr, place: place || ph("adresse du site") };
}

function rhythm(i: ContractInput) {
  const c = i.contract;
  const ISO = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const days = (c.weekdays ?? []).map((d) => (typeof d === "number" ? ISO[d] ?? String(d) : DAYS[String(d).toLowerCase()] ?? String(d)));
  const freq = c.visits_per_week ? (c.visits_per_week >= 1 ? `${String(c.visits_per_week).replace(".", ",")} passage(s) par semaine` : `${Math.round(1 / c.visits_per_week)} semaine(s) sur 1`) : ph("fréquence des passages");
  const when = days.length ? `les ${days.join(", ")}` : ph("jours d'intervention");
  const hour = c.start_time ? `à partir de ${c.start_time.slice(0, 5).replace(":", " h ")}`.replace(" h 00", " h") : ph("horaires d'intervention");
  return { freq, when, hour };
}

const COMMON_ART_END = (resp: Block[], conf: Block[]): Article[] => [
  { title: "Responsabilité et assurance", blocks: resp },
  { title: "Confidentialité et données personnelles", blocks: conf },
  { title: "Droit applicable et litiges", blocks: [{ p: `Le contrat est soumis au droit français. Les Parties recherchent d'abord une solution amiable. À défaut d'accord, le litige est porté devant le tribunal compétent. Si le Client agit en tant que consommateur, il peut recourir gratuitement au médiateur de la consommation ${ph("nom et site du médiateur")}.` }] }
];

const RESP_STD: Block[] = [
  { p: `Le Prestataire est assuré en responsabilité civile professionnelle auprès de ${ph("assureur")}, contrat n° ${ph("numéro")}. Il répond des dommages causés par son personnel pendant ses interventions.` },
  { p: "Réclamations : le Client signale par écrit toute prestation insuffisante dans les 48 heures. Si la réclamation est fondée, le Prestataire intervient à nouveau sans frais." },
  { p: "Force majeure : aucune Partie n'est responsable d'une inexécution causée par un cas de force majeure au sens de l'article 1218 du Code civil." }
];
const CONF_STD: Block[] = [{ p: "Le Prestataire garde confidentiels les codes, clés, badges et informations relatives aux locaux et au Client, pendant le contrat et 2 ans après. Les données personnelles sont traitées uniquement pour exécuter le contrat, conformément au RGPD. Les photos prises sur place servent au suivi des prestations et ne sont pas utilisées à des fins commerciales sans accord." }];

export function buildContract(i: ContractInput): BuiltContract {
  const { addr, place } = common(i);
  const { freq, when, hour } = rhythm(i);
  const c = i.contract;
  const client = i.client;
  const clientLines = [client.name, client.siret ? `SIRET ${client.siret}` : "", addr, [client.phone, client.email].filter(Boolean).join(" · ")].filter(Boolean);
  const provider = ["ProClean Empire", "représentée par " + LEGAL_REP.name + ", " + LEGAL_REP.title];
  const rep = clientLines.length ? clientLines : [ph("identité du client")];

  if (i.category === "airbnb") {
    const pct = /(\d+(?:[.,]\d+)?)\s*%/.exec(c.terms ?? "")?.[1]?.replace(",", ".");
    const forfaitTtc = /(\d+(?:[.,]\d+)?)\s*€\s*(?:TTC)?/.exec((c.terms ?? "").replace(/^[^+]*%/, ""))?.[1]?.replace(",", ".") ?? (c.per_visit_amount_ht ? String(ttc(Number(c.per_visit_amount_ht))) : null);
    const forfait = forfaitTtc ? eur(Number(forfaitTtc)) : ph("montant du forfait ménage");
    const forfaitHt = forfaitTtc ? eur(Math.round((Number(forfaitTtc) / 1.2) * 100) / 100) : ph("montant HT");
    const dur = months(c.start_date, c.end_date, 3);
    const articles: Article[] = [
      { title: "Objet du contrat", blocks: [
        { p: "Le Client confie au Prestataire, qui l'accepte, l'entretien de son Logement et les services associés pendant les séjours des voyageurs et en son absence : suivi du calendrier des réservations, accueil et départ des voyageurs, remise des clés en main propre, ménage, fourniture du linge, approvisionnement en consommables, gestion des réparations et intervention en cas de sinistre ou d'urgence." },
        { p: "Le Client reste seul hôte titulaire de l'annonce et seul à encaisser les loyers des voyageurs. Il ajoute le Prestataire comme co-hôte sur les plateformes, avec accès au calendrier des réservations et à la messagerie des voyageurs, sans accès aux versements. Le Prestataire n'encaisse aucun loyer, ne conclut aucune location au nom du Client et n'intervient pas comme agent immobilier. Il s'agit d'un contrat de prestation de services indépendant, sans lien de subordination." }
      ] },
      { title: "Description des prestations", blocks: [
        { h: "Accueil et départ des voyageurs", bullets: ["Accueil des voyageurs à leur arrivée (check-in) et remise des clés en main propre, à l'heure convenue avec eux.", "Présentation du Logement, de ses équipements et des règles de la maison.", "État des lieux de sortie et récupération des clés au départ (check-out).", `Réponse aux demandes pratiques des voyageurs pendant le séjour, de ${ph("9 h")} à ${ph("21 h")}.`] },
        { h: "Ménage entre chaque séjour", bullets: ["Ménage complet du Logement après chaque départ : toutes les pièces, cuisine, sanitaires, sols, surfaces, vidage des poubelles et remise en ordre, avant l'arrivée des voyageurs suivants."] },
        { h: "Linge et consommables", bullets: ["Fourniture du linge de lit et de toilette, refaite des lits, enlèvement et blanchissage du linge sale.", "Réassort des consommables : papier toilette, savon, produits d'accueil, sacs poubelle et produits d'entretien."] },
        { h: "Suivi du Logement et gestion des réparations", p: "Après chaque séjour, le Prestataire transmet au Client un compte-rendu avec photos et lui signale toute anomalie : casse, panne, dégradation, objet oublié. Le Prestataire gère les réparations nécessaires : il sollicite les devis auprès d'artisans qualifiés, les transmet au Client pour validation, puis organise et contrôle l'intervention. Aucun travail n'est commandé sans l'accord écrit du Client (e-mail ou message suffisant). Le coût des réparations, des travaux et des achats de mobilier ou d'équipement reste à la charge du Client, qui règle directement les artisans." },
        { h: "Sinistres et urgences", p: `En cas de sinistre ou d'urgence (dégât des eaux, panne de chauffage, serrure bloquée, bris de vitre, problème électrique…), le Prestataire intervient dans les meilleurs délais, prévient immédiatement le Client et prend les mesures conservatoires nécessaires. Si le Client ne peut être joint et que la situation l'exige, le Prestataire est autorisé à engager une intervention d'urgence dans la limite de ${ph("300")} € TTC, à la charge du Client, sur justificatif. Au-delà, l'accord du Client reste nécessaire.` }
      ] },
      { title: "Rémunération du Prestataire", blocks: [
        ...(pct ? [{ h: `Rémunération de gestion : ${pct.replace(".", ",")} % des revenus locatifs`, p: `En contrepartie des prestations ci-dessus, hors ménage entre séjours, le Prestataire perçoit ${pct.replace(".", ",")} % TTC des revenus locatifs du Logement, TVA au taux de 20 % incluse. Les revenus locatifs sont les sommes versées au Client par les plateformes pour les séjours terminés dans le mois, hors frais de ménage payés par les voyageurs, hors commissions des plateformes et hors taxe de séjour.` }] : []),
        { h: `Forfait ménage : ${forfait} par séjour`, p: `Le ménage entre deux séjours, incluant le changement et le blanchissage du linge, est facturé séparément au prix forfaitaire de ${forfait} TTC par séjour (soit ${forfaitHt} HT).` },
        { h: "Ce que couvrent les rémunérations", p: "Les rémunérations couvrent tous les frais du Prestataire pour exécuter le contrat : personnel, déplacements, produits et matériel d'entretien, linge et son blanchissage, consommables et coordination des artisans. Sont facturés en plus, après accord du Client : le ménage approfondi ou de remise en état, le coût des artisans et des réparations, et l'achat d'équipements." },
        { h: "Facturation et paiement", p: `Le Client transmet au Prestataire, au plus tard le ${ph("5")} de chaque mois, le relevé des versements des plateformes du mois précédent, ou lui donne un accès en lecture. Le Prestataire émet alors sa facture mensuelle. La facture est payable par virement sous ${ph("15")} jours. Tout retard entraîne des pénalités égales à trois fois le taux d'intérêt légal. Une relance est adressée dès le lendemain de l'échéance ; si la facture reste impayée à la 3e relance, une indemnité forfaitaire de 40 € pour frais de recouvrement est ajoutée (art. L441-10 et D441-5 du Code de commerce). Après une mise en demeure restée sans effet pendant ${ph("15")} jours, le Prestataire peut suspendre ses prestations jusqu'au paiement.` },
        { h: "Révision de la rémunération", p: "Chaque année, les Parties font le bilan du contrat (volume de réservations, revenus locatifs, interventions réalisées) et peuvent réviser le taux de rémunération et le forfait ménage par un avenant signé des deux Parties. À défaut d'accord, les conditions en vigueur continuent de s'appliquer." }
      ] },
      { title: "Durée, exclusivité et résiliation", blocks: [
        { h: "Durée", p: `Le contrat prend effet le ${dateFr(c.start_date)} pour une durée de ${dur} mois. Il se renouvelle ensuite par tacite reconduction par périodes de ${dur} mois. Les ${dur} premiers mois constituent une période d'essai : chaque Partie peut y mettre fin sans indemnité, avec un préavis de 15 jours, par lettre recommandée ou e-mail avec accusé de réception.` },
        { h: "Exclusivité", p: "Pendant la durée du contrat, le Client confie au seul Prestataire l'accueil des voyageurs, la remise des clés, le ménage et le linge du Logement." },
        { h: "Résiliation", p: `Après la période d'essai, chaque Partie peut résilier le contrat avec un préavis de ${ph("2")} mois, par lettre recommandée ou e-mail avec accusé de réception. Les séjours déjà réservés pendant le préavis restent gérés par le Prestataire et donnent lieu à rémunération. En cas de manquement grave (impayé, accès refusé, prestations non réalisées, violation de la confidentialité), l'autre Partie peut résilier de plein droit 15 jours après une mise en demeure restée sans effet. En fin de contrat, le Prestataire restitue toutes les clés, badges et moyens d'accès, contre décharge.` }
      ] },
      { title: "Obligations des Parties", blocks: [
        { p: "Le Prestataire s'engage à : exécuter les prestations avec soin et selon les règles de l'art ; être présent ou représenté aux heures d'arrivée et de départ convenues ; assurer la continuité du service en cas d'absence d'un intervenant ; intervenir dans les meilleurs délais en cas de sinistre ou d'urgence. Il est tenu à une obligation de moyens." },
        { p: `Le Client s'engage à : transmettre chaque réservation dès sa confirmation ; remettre au Prestataire ${ph("4")} jeux de clés, ainsi que les codes d'accès ; rester joignable en cas d'urgence et répondre rapidement aux devis transmis ; maintenir le Logement équipé, conforme et assuré ; respecter la réglementation de la location meublée de tourisme (déclaration en mairie, plafond de nuitées, règlement de copropriété).` }
      ] },
      ...COMMON_ART_END([
        RESP_STD[0],
        { p: "Le Prestataire n'est pas responsable des dégradations, vols, nuisances ou annulations causés par les voyageurs. Il les signale au Client avec photos dans les 24 heures, pour que celui-ci puisse les réclamer via la plateforme. Les artisans intervenant sur devis accepté par le Client agissent sous leur propre responsabilité et leur propre garantie. Le Client souscrit une assurance propriétaire non occupant couvrant la location de courte durée." },
        RESP_STD[1], RESP_STD[2]
      ], CONF_STD)
    ];
    return {
      title: "Contrat de prestation de services de nettoyage", subtitle: "Logement meublé en location de courte durée", ref: i.ref,
      summary: [["Référence", i.ref], ["Durée", `${dur} mois`], ["Rémunération", c.terms ?? ph("à compléter")]],
      parties: { provider, client: rep, place: `Le Logement : ${place}.` }, articles
    };
  }

  // Bureaux & commerce : entretien régulier de locaux
  const isShop = i.category === "commerce";
  const ht = c.monthly_amount_ht ? Number(c.monthly_amount_ht) : null;
  const perVisit = c.per_visit_amount_ht ? Number(c.per_visit_amount_ht) : null;
  const dur = months(c.start_date, c.end_date, 12);
  const priceLine = c.billing_mode === "passage" && perVisit
    ? `${eur(perVisit)} HT par passage, soit ${eur(ttc(perVisit))} TTC (TVA 20 %)`
    : ht ? `${eur(ht)} HT par mois, soit ${eur(ttc(ht))} TTC (TVA 20 %)` : (c.terms ?? ph("prix convenu"));
  const articles: Article[] = [
    { title: "Objet du contrat", blocks: [{ p: `Le Client confie au Prestataire, qui l'accepte, l'entretien et le nettoyage ${isShop ? "de son commerce" : "de ses locaux professionnels"} situés ${place}. Il s'agit d'un contrat de prestation de services indépendant, sans lien de subordination.` }] },
    { title: "Description des prestations", blocks: [
      { h: "Prestations d'entretien", bullets: isShop
        ? ["Nettoyage des sols de la surface de vente, de la réserve et des zones de passage.", "Dépoussiérage des rayonnages, comptoirs, caisses et mobilier, vidage des poubelles.", "Nettoyage et désinfection des sanitaires et de l'espace du personnel.", "Nettoyage de la vitrine et des vitres accessibles, selon la fréquence convenue."]
        : ["Nettoyage des sols (aspiration et lavage) des bureaux, salles de réunion et zones de circulation.", "Dépoussiérage des postes de travail et du mobilier, vidage des corbeilles.", "Nettoyage et désinfection des sanitaires et des espaces de pause.", "Réapprovisionnement des consommables sanitaires, si convenu avec le Client."] },
      { h: "Fréquence et horaires", p: `Les interventions ont lieu ${freq}, ${when}, ${hour}${isShop ? ", avant l'ouverture ou après la fermeture du commerce, de façon à ne pas gêner la clientèle" : ", en dehors de la présence du personnel lorsque c'est possible"}. Les horaires sont fixés d'un commun accord et peuvent être ajustés par écrit.` },
      { h: "Produits et matériel", p: "Le Prestataire fournit les produits et le matériel professionnels nécessaires. Le Client met à disposition l'eau, l'électricité et un local de rangement." }
    ] },
    { title: "Rémunération du Prestataire", blocks: [
      { h: "Prix", p: `Le prix convenu est de ${priceLine}.` },
      { h: "Facturation et paiement", p: `Le Prestataire émet une facture mensuelle. Elle est payable par virement sous ${ph("15")} jours. Tout retard entraîne des pénalités égales à trois fois le taux d'intérêt légal. Une relance est adressée dès le lendemain de l'échéance ; si la facture reste impayée à la 3e relance, une indemnité forfaitaire de 40 € pour frais de recouvrement est ajoutée (art. L441-10 et D441-5 du Code de commerce). Après une mise en demeure restée sans effet pendant ${ph("15")} jours, le Prestataire peut suspendre ses prestations jusqu'au paiement.` },
      { h: "Prestations supplémentaires", p: "Toute prestation non prévue au contrat (remise en état, vitrerie hors fréquence, grand nettoyage) fait l'objet d'un devis accepté par le Client avant exécution." },
      { h: "Révision", p: "Le prix peut être révisé chaque année à la date anniversaire, par un avenant signé des deux Parties. À défaut d'accord, les conditions en vigueur continuent de s'appliquer." }
    ] },
    { title: "Durée et résiliation", blocks: [
      { h: "Durée", p: `Le contrat prend effet le ${dateFr(c.start_date)} pour une durée de ${dur} mois. Il se renouvelle ensuite par tacite reconduction par périodes de ${dur} mois, sauf dénonciation par lettre recommandée ou e-mail avec accusé de réception, avec un préavis de ${ph("2")} mois avant l'échéance.` },
      { h: "Résiliation", p: "En cas de manquement grave (impayé, accès refusé aux locaux, prestations non réalisées, violation de la confidentialité), l'autre Partie peut résilier de plein droit 15 jours après une mise en demeure restée sans effet. En fin de contrat, le Prestataire restitue toutes les clés, badges et moyens d'accès, contre décharge." }
    ] },
    { title: "Obligations des Parties", blocks: [
      { p: "Le Prestataire s'engage à : exécuter les prestations avec soin et selon les règles de l'art ; employer un personnel formé et identifié ; assurer la continuité du service en cas d'absence d'un intervenant ; signaler tout dégât ou anomalie constaté. Il est tenu à une obligation de moyens." },
      { p: `Le Client s'engage à : permettre l'accès aux locaux aux horaires convenus ; remettre les clés, badges ou codes nécessaires${isShop ? ", y compris le code d'alarme" : ""} ; ranger les objets personnels et les documents sensibles ; signaler par écrit toute remarque dans un délai raisonnable.` }
    ] },
    ...COMMON_ART_END([RESP_STD[0], { p: "Le Prestataire n'est pas responsable des objets de valeur, espèces ou documents confidentiels laissés sans protection dans les locaux." }, RESP_STD[1], RESP_STD[2]], CONF_STD)
  ];
  return {
    title: "Contrat de prestation de services de nettoyage", subtitle: isShop ? "Entretien régulier de commerce" : "Entretien régulier de locaux professionnels", ref: i.ref,
    summary: [["Référence", i.ref], ["Durée", `${dur} mois`], ["Rémunération", priceLine]],
    parties: { provider, client: rep, place: `Les locaux : ${place}.` }, articles
  };
}

/** Catégorie probable d'un contrat existant (modifiable à la main au téléchargement). */
export function guessCategory(k: { label?: string | null; terms?: string | null; clients?: { kind?: string | null } | null }): ContractCategory {
  const t = `${k.label ?? ""} ${k.terms ?? ""}`.toLowerCase();
  if (/airbnb|séjour|sejour|conciergerie|location courte|booking/.test(t)) return "airbnb";
  if (/commerce|boutique|magasin|optique|vitrine|restaurant/.test(t)) return "commerce";
  return "bureaux";
}
