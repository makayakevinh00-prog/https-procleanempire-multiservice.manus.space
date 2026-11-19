type VisualPlaceholderProps = {
  label: string;
  ratio?: "wide" | "square" | "tall";
};

const ratioClass: Record<NonNullable<VisualPlaceholderProps["ratio"]>, string> = {
  wide: "aspect-[16/9]",
  square: "aspect-square",
  tall: "aspect-[4/5]"
};

export function VisualPlaceholder({ label, ratio = "wide" }: VisualPlaceholderProps) {
  return (
    <div
      className={`flex ${ratioClass[ratio]} items-center justify-center rounded-[24px] border-2 border-dashed border-[#c9d8f5] bg-[#f0f4fc] p-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-500`}
      role="img"
      aria-label={label}
    >
      {label}
    </div>
  );
}
