import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { FaqList } from "@/components/sections/faq-list";

export const metadata = buildMetadata({
  title: "FAQ",
  description:
    "Retrouvez les réponses aux questions fréquentes sur nos services de nettoyage professionnel.",
  path: "/faq"
});

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="FAQ"
        description="Toutes les informations utiles pour cadrer rapidement votre projet de nettoyage professionnel."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "FAQ" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Poser une question
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <FaqList />
      </section>
    </>
  );
}
