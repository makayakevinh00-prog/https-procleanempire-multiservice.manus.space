import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal";
import { COMPANY, HOST } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales — ProClean Empire",
  description:
    "Éditeur, hébergeur et contact du service de réservation de ménage et de l'application nettoyeur ProClean Empire.",
  robots: { index: true, follow: true },
};

/** Mentions légales des pages publiques (réservation d'un ménage, application nettoyeur). */
export default function LegalNotice() {
  return (
    <LegalPage
      title="Mentions légales"
      intro="Qui édite ce service, qui l'héberge, et comment nous joindre."
      sections={[
        {
          h: "Éditeur",
          p: [
            `${COMPANY.name}, ${COMPANY.form} au capital de ${COMPANY.capital}.`,
            `Siège social : ${COMPANY.address}.`,
            `${COMPANY.rcs} — SIRET ${COMPANY.siret}.`,
            `Directeur de la publication : ${COMPANY.publisher}.`,
          ],
        },
        {
          h: "Contact",
          p: [
            <>
              E-mail :{" "}
              <a
                className="font-bold text-[var(--a-pri)]"
                href={`mailto:${COMPANY.email}`}
              >
                {COMPANY.email}
              </a>
            </>,
            <>
              Téléphone :{" "}
              <a
                className="font-bold text-[var(--a-pri)]"
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
              >
                {COMPANY.phone}
              </a>
            </>,
            <>
              Site de l&apos;entreprise :{" "}
              <a className="font-bold text-[var(--a-pri)]" href={COMPANY.site}>
                procleanempire.com
              </a>
            </>,
          ],
        },
        {
          h: "Hébergement",
          p: [
            `Ce service est hébergé par ${HOST.name}, ${HOST.address} (${HOST.site.replace("https://", "")}).`,
          ],
        },
        {
          h: "Propriété intellectuelle",
          p: [
            "Les textes, le logo, les images et l'application sont la propriété de ProClean Empire. Toute reproduction sans accord écrit est interdite.",
          ],
        },
      ]}
    />
  );
}
