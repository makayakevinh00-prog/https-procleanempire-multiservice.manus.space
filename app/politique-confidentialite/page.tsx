import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";

export const metadata = buildMetadata({
  title: "Politique de confidentialité",
  description:
    "Politique de traitement des données personnelles collectées via le site ProClean Empire.",
  path: "/politique-confidentialite"
});

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Politique de confidentialité"
        description="Transparence sur la collecte et l'utilisation de vos données."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Politique de confidentialité" }
        ]}
      />
      <section className="section pt-0">
        <article className="card space-y-4 p-6 text-sm leading-relaxed text-slate-700 md:p-8">
          <p>
            Les informations transmises via les formulaires de contact et devis sont utilisées
            uniquement pour traiter votre demande commerciale.
          </p>
          <p>
            Les données ne sont pas revendues et sont conservées pendant la durée nécessaire au
            suivi de la relation commerciale.
          </p>
          <p>
            Conformément au RGPD, vous pouvez demander l&apos;accès, la correction ou la
            suppression de vos données à l&apos;adresse: contact@proclean-empire.fr
          </p>
        </article>
      </section>
    </>
  );
}
