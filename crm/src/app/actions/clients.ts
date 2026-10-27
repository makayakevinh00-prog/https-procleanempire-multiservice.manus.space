"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, str } from "@/lib/data";

function payload(fd: FormData) {
  const name = str(fd, "name");
  if (!name) flash("/clients/new", "error", "Le nom est obligatoire.");
  const siret = str(fd, "siret")?.replace(/\s/g, "") ?? null;
  if (siret && !/^\d{14}$/.test(siret)) flash("/clients/new", "error", "Le SIRET doit contenir 14 chiffres.");
  const reserved = checked(fd, "is_reserved");
  return {
    name: name!, kind: str(fd, "kind") ?? "entreprise", status: str(fd, "status") ?? "actif",
    address: str(fd, "address"), postal_code: str(fd, "postal_code"), city: str(fd, "city"),
    email: str(fd, "email"), phone: str(fd, "phone"), siret, notes: str(fd, "notes"),
    is_reserved: reserved, reserved_reason: reserved ? str(fd, "reserved_reason") : null
  };
}

export async function createClientAction(fd: FormData) {
  const { data, error } = await createClient().from("clients").insert(payload(fd)).select("id").single();
  if (error) flash("/clients/new", "error", error.code === "23505" ? "Un client porte déjà ce nom." : dbMessage(error));
  revalidatePath("/clients");
  flash(`/clients/${data!.id}`, "ok", "Client créé.");
}

export async function updateClientAction(id: string, fd: FormData) {
  const { error } = await createClient().from("clients").update(payload(fd)).eq("id", id);
  if (error) flash(`/clients/${id}/edit`, "error", error.code === "23505" ? "Un client porte déjà ce nom." : dbMessage(error));
  revalidatePath("/clients");
  flash(`/clients/${id}`, "ok", "Client mis à jour.");
}

export async function addInteractionAction(clientId: string, fd: FormData) {
  const summary = str(fd, "summary");
  if (!summary) flash(`/clients/${clientId}`, "error", "Le résumé est obligatoire.");
  const { error } = await createClient().from("interactions").insert({ client_id: clientId, kind: str(fd, "kind") ?? "note", summary });
  if (error) flash(`/clients/${clientId}`, "error", dbMessage(error));
  revalidatePath(`/clients/${clientId}`);
  flash(`/clients/${clientId}`, "ok", "Interaction ajoutée.");
}
