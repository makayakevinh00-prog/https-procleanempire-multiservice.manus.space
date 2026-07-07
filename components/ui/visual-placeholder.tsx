type VisualPlaceholderProps = {
  label: string;
  ratio?: "wide" | "tall" | "square";
};

const ratioClasses: Record<NonNullable<VisualPlaceholderProps["ratio"]>, string> = {
  wide: "aspect-[16/10]",
  tall: "aspect-[3/4]",
  square: "aspect-square"
};

export function VisualPlaceholder({ label, ratio = "wide" }: VisualPlaceholderProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 p-6 text-center ${ratioClasses[ratio]}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-[11px] text-slate-400">À remplacer par une photo réelle</span>
    </div>
  );
}
