import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { legalInfo } from "@/lib/content/legal";

export const metadata = buildMetadata({
  title: "Mentions légales",
  description: "Informations légales de ProClean Empire.",
  path: "/mentions-legales"
});

export default function LegalPage() {
  return (
    <>
      <PageHero
        title="Mentions légales"
        description="Informations obligatoires relatives à l'éditeur du site."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Mentions légales" }
        ]}
      />
      <section className="section pt-0">
        <article className="card space-y-3 p-6 text-sm leading-relaxed text-slate-700 md:p-8">
          <p>
            <strong>Raison sociale:</strong> {legalInfo.companyName}
          </p>
          <p>
            <strong>Sigle:</strong> {legalInfo.tradeName}
          </p>
          <p>
            <strong>Forme juridique:</strong> {legalInfo.legalForm}
          </p>
          <p>
            <strong>Capital social:</strong> {legalInfo.capital}
          </p>
          <p>
            <strong>RCS {legalInfo.rcsCity}:</strong> {legalInfo.rcsNumber}
          </p>
          <p>
            <strong>SIREN:</strong> {legalInfo.siren}
          </p>
          <p>
            <strong>SIRET:</strong> {legalInfo.siret}
          </p>
          <p>
            <strong>EUID:</strong> {legalInfo.euid}
          </p>
          <p>
            <strong>Siège social:</strong> {legalInfo.headOffice}
          </p>
          <p>
            <strong>Date de début d&apos;activité:</strong> {legalInfo.activityStartDate}
          </p>
          <p>
            <strong>Directeur de publication:</strong> {legalInfo.publicationDirector}
          </p>
          <p>
            <strong>Hébergeur:</strong> {legalInfo.host}
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Le numéro SIRET complet doit être confirmé avec le NIC figurant sur l&apos;avis
            INSEE ou l&apos;extrait RNE détaillé.
          </p>
        </article>
      </section>
    </>
  );
}
