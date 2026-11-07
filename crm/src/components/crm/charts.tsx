import { formatEUR } from "@/lib/utils";

/** Palette validée (CVD) : bleu ProClean, aqua. Texte toujours en encre neutre. */
export const SERIES = ["#2b4c7e", "#9aa3b2"] as const;

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€` : `${Math.round(n)} €`);

/** Barres verticales, une seule série (le titre de la carte la nomme). Survol : valeur exacte. */
export function MonthlyBars({ data }: { data: { label: string; value: number; current?: boolean }[] }) {
  const W = 640, H = 220, padL = 44, padB = 26, padT = 18;
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const ticks = [0, top / 2, top];
  const slot = (W - padL) / data.length;
  const bw = Math.min(30, slot - 8);
  const y = (v: number) => H - padB - (v / top) * (H - padB - padT);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chiffre d'affaires facturé par mois (HT)">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="#e6e4de" strokeDasharray={t ? "3 3" : undefined} />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{short(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * slot + (slot - bw) / 2;
        const h = Math.max(H - padB - y(d.value), d.value > 0 ? 2 : 0);
        return (
          <g key={d.label} className="group">
            <rect x={padL + i * slot} y={padT} width={slot} height={H - padB - padT} fill="transparent" />
            {h > 0 && <path d={`M${x},${H - padB} V${H - padB - h + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - padB} Z`}
              fill={SERIES[0]} opacity={d.current ? 0.55 : 1} className="transition-opacity group-hover:opacity-80" />}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" className={`text-[11px] ${d.current ? "fill-slate-700 font-semibold" : "fill-slate-500"}`}>{d.label}</text>
            <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
              <rect x={x + bw / 2 - 42} y={Math.max(y(d.value) - 26, 0)} width={84} height={20} rx={4} fill="#111214" />
              <text x={x + bw / 2} y={Math.max(y(d.value) - 12, 14)} textAnchor="middle" className="fill-white text-[11px] font-semibold">{formatEUR(d.value)}</text>
            </g>
            <title>{`${d.label} : ${formatEUR(d.value)} HT${d.current ? " (mois en cours)" : ""}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/** Anneau à 2–4 parts max, légende + valeurs toujours visibles (pas de couleur seule). */
export function Donut({ parts, center, sub }: { parts: { label: string; value: number }[]; center: string; sub: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R, gap = 2;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {parts.map((p, i) => {
          const len = (p.value / total) * C;
          const el = (
            <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="18"
              strokeDasharray={`${Math.max(len - gap, 0)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)">
              <title>{`${p.label} : ${p.value}`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="fill-slate-900 text-[26px] font-bold">{center}</text>
        <text x="70" y="88" textAnchor="middle" className="fill-slate-500 text-[11px]">{sub}</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-3 w-3 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="text-slate-700">{p.label}</span>
            <span className="font-semibold text-slate-900">{p.value}</span>
            <span className="text-xs text-slate-400">{Math.round((p.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barres horizontales simples (classement), valeur en texte à droite. */
export function RankBars({ rows }: { rows: { label: string; value: number; href?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-2"><span className="truncate text-slate-700">{r.label}</span><span className="font-semibold text-slate-900">{formatEUR(r.value)}</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: SERIES[0] }} /></div>
        </li>
      ))}
    </ul>
  );
}
