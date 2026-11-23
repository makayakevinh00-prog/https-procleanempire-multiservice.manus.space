import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — ProClean Empire",
  description:
    "Comment fonctionnent la réservation d'un ménage et l'application pour nettoyeurs indépendants ProClean Empire.",
  robots: { index: true, follow: true },
};

const link = "font-bold text-[var(--a-pri)]";

/**
 * Conditions d'utilisation des pages publiques. Elles décrivent le fonctionnement réel du service
 * (demande confirmée par l'entreprise, paiement sur facture, nettoyeurs indépendants payés par virement).
 * À faire relire par un avocat avant toute ouverture au grand public.
 */
export default function Terms() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      intro="Ces conditions s'appliquent à la réservation d'un ménage en ligne et à l'application pour nettoyeurs indépendants."
      sections={[
        {
          h: "1. Le service",
          p: [
            `${COMPANY.name} propose deux services en ligne : la réservation d'un ménage à domicile par un particulier ou un propriétaire, et une application qui présente des ménages à des nettoyeurs indépendants.`,
            "Utiliser l'un de ces services vaut acceptation des présentes conditions.",
          ],
        },
        {
          h: "2. Réserver un ménage",
          p: [
            "Vous choisissez votre type de logement, le jour et l'adresse. Votre demande n'est pas un engagement : elle est étudiée par ProClean Empire, qui vous confirme le créneau par e-mail.",
            "Tant que votre demande n'est pas confirmée, vous pouvez y renoncer sans frais. Après confirmation, prévenez-nous dès que possible en cas d'empêchement.",
            "Les prix affichés sont en euros, toutes taxes comprises, pour un ménage standard. Si votre logement demande une prestation différente, un prix adapté vous est proposé avant toute intervention.",
            "Le paiement se fait après le ménage, sur facture.",
            "Vous vous engagez à fournir une adresse exacte et un moyen d'accès au logement le jour prévu.",
          ],
        },
        {
          h: "3. Nettoyeurs indépendants",
          p: [
            "L'inscription est ouverte aux étudiants, aux auto-entrepreneurs et aux entreprises. Un numéro SIRET valide est nécessaire pour recevoir des ménages : il est contrôlé dans l'annuaire officiel des entreprises. Sans SIRET, votre compte est créé et s'active une fois le numéro saisi et vérifié.",
            "Vous êtes libre d'accepter ou de refuser chaque ménage proposé. Vous exercez votre activité en votre nom et restez responsable de vos déclarations sociales et fiscales ainsi que de votre assurance professionnelle.",
            "Chaque ménage réalisé est validé par la direction, puis payé par virement, en début de semaine ou en fin de mois, sur l'IBAN renseigné dans votre profil.",
            "Votre lien personnel donne accès à votre compte : ne le partagez pas. En cas de perte, demandez-en un nouveau depuis la page d'inscription ; l'ancien cesse de fonctionner.",
          ],
        },
        {
          h: "4. Bon usage",
          p: [
            "Les informations que vous saisissez doivent être exactes. ProClean Empire peut refuser une demande ou suspendre un compte en cas d'informations fausses, d'usage frauduleux ou de manquement répété.",
          ],
        },
        {
          h: "5. Données personnelles",
          p: [
            <>
              Les données que vous nous confiez sont traitées comme décrit dans
              la page{" "}
              <Link className={link} href="/confidentialite">
                Confidentialité
              </Link>
              .
            </>,
          ],
        },
        {
          h: "6. Contact et droit applicable",
          p: [
            <>
              Pour toute question ou réclamation :{" "}
              <a className={link} href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>{" "}
              ou {COMPANY.phone}.
            </>,
            "Les présentes conditions sont soumises au droit français.",
          ],
        },
      ]}
    />
  );
}
