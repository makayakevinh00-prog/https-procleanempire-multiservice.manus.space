import Link from "next/link";

/** Territoire : la carte de prospection et les sites où l'on intervient déjà, au même endroit. */
export function TerritoireSwitch({ active, sites }: { active: "prospection" | "sites"; sites?: number }) {
  const item = (key: "prospection" | "sites", href: string, label: string) => (
    <Link href={href} aria-current={active === key ? "page" : undefined}
      className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold transition-colors ${active === key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-white"}`}>{label}</Link>
  );
  return (
    <div className="mb-5 inline-flex gap-1 rounded-full bg-secondary p-1" role="navigation" aria-label="Territoire">
      {item("prospection", "/veille/territoire", "Carte de prospection")}
      {item("sites", "/sites", `Mes sites d'intervention${sites != null ? ` (${sites})` : ""}`)}
    </div>
  );
}
