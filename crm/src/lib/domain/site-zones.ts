/** Zones d'un site : « Salon » puis « - tâche » et « ! point d'attention », une ligne chacun. */
export type Zone = { name: string; tasks: string[]; attention: string[] };

export function parseZones(text: string | null | undefined): Zone[] {
  const zones: Zone[] = [];
  let cur: Zone | null = null;
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("!")) { (cur ??= newZone(zones, "Général")).attention.push(line.replace(/^!\s*/, "")); }
    else if (line.startsWith("-") || line.startsWith("•")) { (cur ??= newZone(zones, "Général")).tasks.push(line.replace(/^[-•]\s*/, "")); }
    else cur = newZone(zones, line.slice(0, 80));
  }
  return zones.filter((z) => z.tasks.length || z.attention.length);
}
function newZone(zones: Zone[], name: string): Zone { const z = { name, tasks: [], attention: [] }; zones.push(z); return z; }

export function zonesToText(zones: Zone[] | null | undefined): string {
  return (zones ?? []).map((z) => [z.name, ...z.tasks.map((t) => `- ${t}`), ...z.attention.map((a) => `! ${a}`)].join("\n")).join("\n\n");
}

export const parseSpecifics = (text: string | null | undefined): string[] =>
  [...new Set((text ?? "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, 12);

/** Rotation d'un site : les éléments faits à tour de rôle, un par passage (« Étagère 1 », « Étagère 2 »…), et celui du prochain passage. */
export type Rotation = { items: string[]; next: number };
export function parseRotation(text: string | null | undefined, prev?: Rotation | null): Rotation | null {
  const items = [...new Set((text ?? "").split("\n").map((l) => l.trim().slice(0, 80)).filter(Boolean))].slice(0, 40);
  if (!items.length) return null;
  // La liste n'a pas changé : on garde où on en est. Sinon on reprend sur le même élément s'il existe encore, ou au début.
  const cur = prev?.items?.[prev.next ?? 0];
  const same = prev && prev.items.length === items.length && prev.items.every((x, i) => x === items[i]);
  return { items, next: same ? prev!.next : Math.max(0, cur ? items.indexOf(cur) : 0) };
}
export const rotationToText = (r: Rotation | null | undefined) => (r?.items ?? []).join("\n");
