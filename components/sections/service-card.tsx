import Link from "next/link";
import { Service, serviceHref } from "@/lib/data";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="card flex h-full flex-col p-6">
      <h3 className="text-xl font-semibold text-[#101828]">{service.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#475467]">{service.shortDescription}</p>
      <ul className="mt-5 space-y-2 text-sm text-[#475467]">
        {service.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 text-[#1e3a6e]">
              ✓
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <Link
        href={serviceHref(service.slug)}
        className="mt-6 inline-flex items-center text-sm font-semibold text-[#1e3a6e] hover:text-[#1e3a6e]"
      >
        Découvrir la prestation →
      </Link>
    </article>
  );
}
