"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export default function AccountPage() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pwd = String(fd.get("password") ?? "");
    if (pwd.length < 10) return setMsg({ ok: false, text: "10 caractères minimum." });
    if (pwd !== fd.get("confirm")) return setMsg({ ok: false, text: "Les deux mots de passe sont différents." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pwd });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Mot de passe modifié." });
    if (!error) e.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="Mon compte" subtitle="Changer votre mot de passe." />
      <Card className="max-w-md">
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nouveau mot de passe" hint="10 caractères minimum"><Input name="password" type="password" required autoComplete="new-password" /></Field>
            <Field label="Confirmer"><Input name="confirm" type="password" required autoComplete="new-password" /></Field>
            {msg && <p role="status" className={`rounded-md p-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
            <Button disabled={busy}>{busy ? "…" : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
