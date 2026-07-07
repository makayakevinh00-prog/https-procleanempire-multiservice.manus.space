import { socialLinks } from "@/lib/content/phase3";

export function SocialNetworksSection() {
  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">Réseaux sociaux</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          Suivez ProClean Empire sur les plateformes qui comptent pour valider notre niveau
          d&apos;exigence, notre régularité et nos résultats terrain.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {socialLinks.map((social) => (
            <article key={social.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-semibold text-[#14213d]">{social.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{social.description}</p>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-[#14213d] underline"
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
