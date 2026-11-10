import { formatEUR } from "@/lib/utils";

/** Palette sobre, lisible aussi pour les daltoniens : bleu, orange, vert, gris. Le texte reste en encre neutre. */
export const PALETTE = ["#2b4c7e", "#c98a2b", "#2f7a55", "#9aa3b2"] as const;
/** Coupe un libellé en 2 lignes au plus, sur les espaces. */
const wrap = (t: string): string[] => {
  if (t.length <= 11 || !t.includes(" ")) return [t];
  const words = t.split(" ");
  let best = [t, ""], gap = t.length;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    if (Math.abs(a.length - b.length) < gap) { gap = Math.abs(a.length - b.length); best = [a, b]; }
  }
  return best;
};
const eur0 = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const GRID = "#e6e4de";

const short = (n: number) => {
  const a = Math.abs(n),
    s = n < 0 ? "-" : "";
  return a >= 1000
    ? `${s}${(a / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€`
    : `${s}${Math.round(a)} €`;
};
const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const niceUp = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return (NICE.find((n) => n * p >= v) ?? 10) * p;
};
function scale(max: number, min = 0) {
  return { top: niceUp(max), bottom: min < 0 ? -niceUp(-min) : 0 };
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; dash?: boolean }[];
}) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 rounded"
            style={{
              background: i.dash
                ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)`
                : i.color,
              height: 3,
            }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Courbes (2 à 3 séries) : l'évolution mois par mois. Survol : valeur exacte. */
export function LineChart({
  labels,
  series,
  label,
}: {
  labels: string[];
  series: { name: string; color: string; dash?: boolean; values: number[] }[];
  label: string;
}) {
  const W = 640,
    H = 220,
    padL = 48,
    padR = 14,
    padB = 26,
    padT = 14;
  const { top } = scale(Math.max(...series.flatMap((s) => s.values), 1));
  const x = (i: number) =>
    padL +
    (labels.length <= 1 ? 0 : (i * (W - padL - padR)) / (labels.length - 1));
  const y = (v: number) => H - padB - (v / top) * (H - padB - padT);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      {[0, top / 2, top].map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke={GRID}
            strokeDasharray={t ? "3 3" : undefined}
          />
          <text
            x={padL - 6}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-slate-400 text-[11px]"
          >
            {short(t)}
          </text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text
          key={l + i}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          className="fill-slate-500 text-[11px]"
        >
          {l}
        </text>
      ))}
      {series.map((s) => (
        <g key={s.name}>
          <polyline
            fill="none"
            stroke={s.color}
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeDasharray={s.dash ? "5 4" : undefined}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          />
          {s.values.map((v, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={3.5}
              fill="#fff"
              stroke={s.color}
              strokeWidth={2}
            >
              <title>{`${s.name}, ${labels[i]} : ${formatEUR(v)}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Barres groupées : compare plusieurs périodes (ou scénarios) pour chaque indicateur. */
export function GroupedBars({
  groups,
  names,
  label,
}: {
  groups: { label: string; values: number[] }[];
  names: string[];
  label: string;
}) {
  const W = 480,
    H = 220,
    padL = 44,
    padB = 26,
    padT = 20;
  const { top } = scale(Math.max(...groups.flatMap((g) => g.values), 1));
  const slot = (W - padL) / groups.length;
  const bw = Math.min(26, (slot - 24) / names.length);
  const y = (v: number) => H - padB - (v / top) * (H - padB - padT);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      {[0, top / 2, top].map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W}
            y1={y(t)}
            y2={y(t)}
            stroke={GRID}
            strokeDasharray={t ? "3 3" : undefined}
          />
          <text
            x={padL - 6}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-slate-400 text-[11px]"
          >
            {short(t)}
          </text>
        </g>
      ))}
      {groups.map((g, gi) => {
        const start =
          padL +
          gi * slot +
          (slot - bw * names.length - (names.length - 1) * 4) / 2;
        return (
          <g key={g.label}>
            {g.values.map((v, i) => {
              const bx = start + i * (bw + 4),
                h = Math.max(H - padB - y(v), v > 0 ? 2 : 0);
              return (
                <g key={names[i]}>
                  <rect
                    x={bx}
                    y={H - padB - h}
                    width={bw}
                    height={h}
                    rx={3}
                    fill={PALETTE[i % PALETTE.length]}
                  >
                    <title>{`${g.label}, ${names[i]} : ${formatEUR(v)}`}</title>
                  </rect>
                  {v > 0 && (
                    <text
                      x={bx + bw / 2}
                      y={H - padB - h - 4}
                      textAnchor="middle"
                      className="fill-slate-500 text-[10px]"
                    >
                      {short(v)}
                    </text>
                  )}
                </g>
              );
            })}
            <text
              x={padL + gi * slot + slot / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-600 text-[11px]"
            >
              {g.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Camembert (anneau) à 2–4 parts : répartition ; légende avec montant et pourcentage, jamais la couleur seule. */
export function PieChart({
  parts,
  center,
  sub,
}: {
  parts: { label: string; value: number }[];
  center: string;
  sub: string;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const R = 52,
    C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 140 140"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={parts
          .map((p) => `${p.label} ${formatEUR(p.value)}`)
          .join(", ")}
      >
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="18"
        />
        {total > 0 &&
          parts.map((p, i) => {
            const len = (p.value / total) * C;
            const el = (
              <circle
                key={p.label}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth="18"
                strokeDasharray={`${Math.max(len - 2, 0)} ${C}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 70 70)"
              >
                <title>{`${p.label} : ${formatEUR(p.value)}`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        <text
          x="70"
          y="68"
          textAnchor="middle"
          className="fill-slate-900 text-[16px] font-bold"
        >
          {center}
        </text>
        <text
          x="70"
          y="86"
          textAnchor="middle"
          className="fill-slate-500 text-[10px]"
        >
          {sub}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-slate-700">{p.label}</span>
            <span className="num font-semibold text-slate-900">
              {eur0(p.value)}
            </span>
            <span className="text-xs text-slate-400">
              {total > 0 ? Math.round((p.value / total) * 100) : 0} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type WaterStep = {
  label: string;
  value: number;
  kind: "total" | "cost" | "result";
};

/** Cascade : du chiffre d'affaires au bénéfice, chaque coût fait descendre la barre. */
export function Waterfall({
  steps,
  label,
}: {
  steps: WaterStep[];
  label: string;
}) {
  const W = 480,
    H = 250,
    padL = 44,
    padB = 46,
    padT = 22;
  let level = 0;
  const bars = steps.map((s) => {
    if (s.kind === "total") {
      level = s.value;
      return { ...s, from: 0, to: s.value };
    }
    if (s.kind === "cost") {
      const to = level - s.value;
      const b = { ...s, from: level, to };
      level = to;
      return b;
    }
    return { ...s, from: 0, to: s.value };
  });
  const lo = Math.min(0, ...bars.map((b) => Math.min(b.from, b.to))),
    hi = Math.max(...bars.map((b) => Math.max(b.from, b.to)), 1);
  const { top, bottom } = scale(hi, lo);
  const y = (v: number) =>
    H - padB - ((v - bottom) / (top - bottom)) * (H - padB - padT);
  const slot = (W - padL) / bars.length,
    bw = Math.min(46, slot - 14);
  const colour = (b: (typeof bars)[number]) =>
    b.kind === "total"
      ? PALETTE[0]
      : b.kind === "cost"
        ? PALETTE[1]
        : b.value >= 0
          ? PALETTE[2]
          : "#b3382c";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      {[bottom, 0, top]
        .filter((t, i, a) => a.indexOf(t) === i)
        .map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "#cbd5e1" : GRID}
              strokeDasharray={t === 0 ? undefined : "3 3"}
            />
            <text
              x={padL - 6}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-slate-400 text-[11px]"
            >
              {short(t)}
            </text>
          </g>
        ))}
      {bars.map((b, i) => {
        const x = padL + i * slot + (slot - bw) / 2,
          y1 = y(Math.max(b.from, b.to)),
          h = Math.max(Math.abs(y(b.from) - y(b.to)), 2);
        const next = bars[i + 1];
        return (
          <g key={b.label}>
            <rect x={x} y={y1} width={bw} height={h} rx={3} fill={colour(b)}>
              <title>{`${b.label} : ${b.kind === "cost" ? "-" : ""}${formatEUR(b.value)}`}</title>
            </rect>
            <text
              x={x + bw / 2}
              y={y1 - 5}
              textAnchor="middle"
              className="fill-slate-700 text-[10.5px] font-medium"
            >
              {b.kind === "cost" ? "-" : ""}
              {short(b.value)}
            </text>
            {next && (
              <line
                x1={x + bw}
                x2={x + slot}
                y1={y(b.to)}
                y2={y(b.to)}
                stroke="#94a3b8"
                strokeDasharray="2 3"
              />
            )}
            <text
              x={x + bw / 2}
              y={H - 28}
              textAnchor="middle"
              className="fill-slate-600 text-[10.5px]"
            >
              {wrap(b.label).map((line, li) => (
                <tspan key={li} x={x + bw / 2} dy={li ? 12 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
