import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Confidentialité — ProClean Empire",
  description:
    "Quelles données ProClean Empire recueille lors d'une réservation de ménage ou d'une inscription comme nettoyeur, pourquoi, et quels sont vos droits.",
  robots: { index: true, follow: true },
};

/** Ce que les pages publiques recueillent réellement, en langage simple. À faire relire par un avocat avant l'ouverture au grand public. */
export default function Privacy() {
  return (
    <LegalPage
      title="Confidentialité"
      intro={`${COMPANY.name} est responsable des données recueillies sur ce service. Voici ce que nous recueillons et pourquoi.`}
      sections={[
        {
          h: "Quand vous réservez un ménage",
          p: [
            "Nom, e-mail, téléphone (facultatif), adresse du logement, moyen d'accès et précisions que vous indiquez.",
            "Ces informations servent à étudier votre demande, à vous répondre, à réaliser le ménage et à établir la facture. L'adresse et le moyen d'accès sont transmis au nettoyeur chargé de l'intervention.",
          ],
        },
        {
          h: "Quand vous vous inscrivez comme nettoyeur",
          p: [
            "Nom, e-mail, téléphone (facultatif), situation professionnelle, SIRET, adresse et rayon de déplacement ; puis, dans votre profil, votre IBAN.",
            "Ces informations servent à créer votre compte, à vérifier votre SIRET dans l'annuaire officiel des entreprises, à vous proposer les ménages proches de chez vous et à vous payer par virement.",
            "Votre position n'est relevée que si vous choisissez de l'utiliser dans l'application, pour situer votre point de départ.",
          ],
        },
        {
          h: "Le film du ménage et l'analyse par intelligence artificielle",
          p: [
            "Pour chaque ménage, le nettoyeur filme le logement à son arrivée et à la fin. L'application utilise pour cela la caméra du téléphone, uniquement quand le nettoyeur lance le film. Aucune photo n'est demandée.",
            "Des images extraites de ces films sont analysées par un service d'intelligence artificielle pour contrôler le nettoyage et repérer un objet non retrouvé ou abîmé. Le résultat est un signalement à vérifier : il n'est jamais une accusation, et une personne de ProClean Empire le relit.",
            "Les films ne montrent que le logement. Ils sont réservés à ProClean Empire, au propriétaire ou à la conciergerie concernés, et au nettoyeur qui les a tournés.",
          ],
        },
        {
          h: "Qui y accède",
          p: [
            "La direction de ProClean Empire et, pour ce qui est nécessaire à une intervention, le nettoyeur concerné. Nos prestataires techniques (hébergement, envoi des e-mails) y accèdent uniquement pour faire fonctionner le service.",
            "Aucune donnée n'est vendue ni utilisée à des fins publicitaires.",
          ],
        },
        {
          h: "Durée de conservation",
          p: [
            "Vos données sont conservées le temps nécessaire au traitement de votre demande ou à la vie de votre compte, puis pendant la durée imposée par nos obligations légales, notamment comptables.",
          ],
        },
        {
          h: "Vos droits",
          p: [
            <>
              Vous pouvez demander l&apos;accès à vos données, leur
              rectification ou leur effacement en écrivant à{" "}
              <a
                className="font-bold text-[var(--a-pri)]"
                href={`mailto:${COMPANY.email}`}
              >
                {COMPANY.email}
              </a>
              .
            </>,
            "Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (cnil.fr).",
          ],
        },
        {
          h: "Cookies",
          p: [
            "Ce service n'utilise que les cookies nécessaires à son fonctionnement (connexion, préférences d'affichage). Aucun cookie publicitaire n'est déposé.",
          ],
        },
      ]}
    />
  );
}
