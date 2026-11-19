import { socialLinks } from "@/lib/content/phase3";

const realSocialLinks = socialLinks.filter((social) => !social.href.startsWith("["));

export function SocialNetworksSection() {
  if (realSocialLinks.length === 0) {
    return null;
  }

  return (
    <section className="section pt-0">
      <div className="rounded-[28px] border border-[#dbe6fc] bg-white p-6 md:p-10">
        <h2 className="text-3xl lp-serif text-[#101828] md:text-4xl">Réseaux sociaux</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#475467]">
          Suivez ProClean Empire sur les plateformes qui comptent pour valider notre niveau
          d&apos;exigence, notre régularité et nos résultats terrain.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {realSocialLinks.map((social) => (
            <article key={social.label} className="rounded-[24px] border border-[#dbe6fc] bg-[#f7f9fd] p-5">
              <h3 className="text-xl font-semibold text-[#101828]">{social.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#475467]">{social.description}</p>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-[#101828] underline"
              >
                Ouvrir {social.label}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
