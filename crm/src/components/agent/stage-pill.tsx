import { toneOf, type Dict } from "@/lib/field-ui";

const TONE: Record<string, string> = {
  todo: "bg-[var(--a-soft)] text-[var(--a-pri)]", doing: "bg-[var(--a-warnbg)] text-[var(--a-warn)]", done: "bg-[var(--a-okbg)] text-[var(--a-ok)]",
  checked: "bg-[var(--a-okbg)] text-[var(--a-ok)]", cancelled: "bg-[var(--a-badbg)] text-[var(--a-bad)]"
};
export function StagePill({ stage, t }: { stage: string; t: Dict }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${TONE[toneOf(stage)]}`}>{t.stage[stage] ?? stage}</span>;
}
