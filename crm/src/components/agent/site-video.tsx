"use client";

import { useRef, useState } from "react";
import { Video } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Filmer le site (30 à 45 s) : la vidéo part directement vers le stockage, avec un emplacement réservé par la base (jeton + mission vérifiés). */
export function SiteVideo({ token, mission }: { token: string; mission: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onFile(f: File | undefined) {
    if (!f) return;
    const type = f.type || "video/mp4", ext = EXT[type];
    if (!ext) { setState("error"); setMsg("Format non accepté (vidéo MP4 ou MOV)."); return; }
    if (f.size > 50 * 1024 * 1024) { setState("error"); setMsg("Vidéo trop lourde (50 Mo maximum) : filmez 30 à 45 secondes."); return; }
    setState("busy"); setMsg("Envoi en cours, ne fermez pas l'application…");
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      const kind = type.startsWith("video/") ? "video" : "photo";
      const slot = await sb.rpc("agent_media_slot", { p_token: token, p_id: mission, p_kind: kind, p_ext: ext });
      if (slot.error) throw new Error(slot.error.message.replace(/^[A-Z_]{4,}:\s*/, ""));
      const up = await sb.storage.from("site-media").upload(slot.data as string, f, { contentType: type, upsert: false });
      if (up.error) throw new Error("Envoi impossible, réessayez avec le Wi-Fi.");
      await sb.rpc("agent_media_done", { p_token: token, p_path: slot.data as string });
      setState("ok"); setMsg("Vidéo envoyée ✓ Merci, le site est enregistré.");
    } catch (e: any) { setState("error"); setMsg(e.message ?? "Envoi impossible."); }
    finally { if (input.current) input.current.value = ""; }
  }
  return (
    <div className="rounded-2xl border-2 border-[var(--a-pri)] p-3">
      <p className="mb-2 text-[14px]"><b>Premier passage ici :</b> filmez le site en marchant dans chaque zone (30 à 45 secondes). Cela sert à former les prochains agents et à améliorer le nettoyage.</p>
      <button type="button" disabled={state === "busy"} onClick={() => input.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--a-pri)] text-base font-extrabold text-white disabled:opacity-60"><Video className="h-5 w-5" />{state === "busy" ? "Envoi…" : "Filmer le site"}</button>
      <input ref={input} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      {msg && <p role={state === "error" ? "alert" : "status"} className={`mt-2 text-sm font-semibold ${state === "error" ? "text-[var(--a-bad)]" : "text-[var(--a-ok)]"}`}>{msg}</p>}
    </div>
  );
}
