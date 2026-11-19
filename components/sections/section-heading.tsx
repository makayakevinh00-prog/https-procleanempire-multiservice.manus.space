import "@/components/landing/landing.css";
type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false
}: SectionHeadingProps) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? (
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#1e3a6e]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="lp-serif text-3xl leading-[1.05] text-[#101828] [text-wrap:balance] md:text-5xl">{title}</h2>
      {description ? (
        <p className="mt-5 text-lg leading-relaxed text-[#475467]">{description}</p>
      ) : null}
    </div>
  );
}
