"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { videoFrames, toJpeg } from "@/components/nettoyeur/live";

/** Référence d'un logement : photos, ou une vidéo dont 10 images sont tirées dans le navigateur (la vidéo n'est jamais envoyée). */
export function RefUpload({ listing, endpoint = "/api/conciergerie/reference", token, dark }: { listing: string; endpoint?: string; token?: string; dark?: boolean }) {
  const photos = useRef<HTMLInputElement>(null), video = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState("");
  const send = async (blobs: Blob[]) => {
    for (let i = 0; i < blobs.length; i++) {
      setBusy(`Envoi ${i + 1}/${blobs.length}…`);
      const fd = new FormData(); fd.set("listing", listing); if (token) fd.set("token", token); fd.set("file", blobs[i]!, "ref.jpg");
      const r = await fetch(endpoint, { method: "POST", body: fd });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Envoi impossible.");
    }
  };
  const run = async (fn: () => Promise<void>) => { setMsg(""); try { await fn(); router.refresh(); } catch (e) { setMsg((e as Error).message || "Envoi impossible."); } finally { setBusy(""); if (photos.current) photos.current.value = ""; if (video.current) video.current.value = ""; } };
  const onPhotos = (files: FileList | null) => run(async () => {
    const out: Blob[] = [];
    for (const f of Array.from(files ?? []).slice(0, 20)) { setBusy("Préparation…"); const bmp = await createImageBitmap(f); out.push(await toJpeg(bmp, bmp.width, bmp.height)); }
    await send(out);
  });
  const onVideo = (f: File | undefined) => run(async () => { if (!f) return; setBusy("Lecture de la vidéo…"); await send(await videoFrames(f, 10, (i) => setBusy(`Images ${i}/10…`))); });
  const btn = dark ? "inline-flex h-11 items-center rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-4 text-sm font-bold text-[var(--a-pri)] disabled:opacity-60" : "inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-secondary disabled:opacity-60";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={!!busy} onClick={() => photos.current?.click()}>{busy || "Ajouter des photos"}</button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => video.current?.click()}>Ajouter une vidéo (visite du logement)</button>
      </div>
      <input ref={photos} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPhotos(e.target.files)} />
      <input ref={video} type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0])} />
      {msg && <p role="alert" className="text-sm font-medium text-red-700">{msg}</p>}
    </div>
  );
}
