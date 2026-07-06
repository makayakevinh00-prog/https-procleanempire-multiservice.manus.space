import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";

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
        <article className="card p-6 md:p-8 text-sm leading-relaxed text-slate-700">
          <p>Raison sociale: ProClean Empire</p>
          <p>SAS au capital social: à compléter</p>
          <p>RCS: à compléter</p>
          <p>Siège social: à compléter</p>
          <p>Directeur de publication: à compléter</p>
          <p>Hébergeur: Vercel Inc.</p>
        </article>
      </section>
    </>
  );
}
