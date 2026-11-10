"use client";

import { useState } from "react";
import { LEVEL_LABEL, ROLES, ROLE_KEYS, SECTIONS, type Perms, type RoleKey } from "@/lib/team";

/** Rôle + droits par section. Choisir un rôle remplit la grille avec ses droits de départ ; chaque case reste modifiable. */
export function TeamPerms({ role = "commercial", perms = {}, idPrefix = "p" }: { role?: string; perms?: Perms; idPrefix?: string }) {
  const [r, setR] = useState<string>(role);
  const [p, setP] = useState<Perms>(perms);
  const pick = (v: string) => { setR(v); if (v in ROLES) setP({ ...(ROLES[v as RoleKey].perms as Perms) }); };
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-role`} className="mb-1.5 block text-sm font-semibold text-slate-700">Rôle</label>
        <select id={`${idPrefix}-role`} name="role" value={r} onChange={(e) => pick(e.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-card px-3.5 text-[15px]">
          {ROLE_KEYS.map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">Le rôle propose des droits de départ ; ajustez-les ci-dessous.</p>
      </div>
      <fieldset className="divide-y rounded-lg border">
        <legend className="sr-only">Droits par section</legend>
        {SECTIONS.map((s) => (
          <div key={s.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`${idPrefix}-${s.key}`} className="block text-sm font-medium text-foreground">{s.label}</label>
              <span className="block text-xs text-muted-foreground">{s.hint}</span>
            </div>
            <select id={`${idPrefix}-${s.key}`} name={`perm_${s.key}`} value={p[s.key] ?? "none"} onChange={(e) => setP({ ...p, [s.key]: e.target.value === "none" ? undefined : (e.target.value as "read" | "write") })} className="h-9 rounded-lg border border-slate-300 bg-card px-2 text-sm">
              {(["none", "read", "write"] as const).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </div>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">Toujours réservés au patron : paramètres, équipe et invitations, JARVIS, connecteurs.</p>
    </div>
  );
}
