"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cleanerTrainingSubmitAction } from "@/app/actions/nettoyeur";
import type { FormationModule, TrainingQuestion, TrainingResult } from "@/lib/formation";

/** Test à choix multiples : la correction est faite dans la base, ici on affiche seulement le résultat et les explications. */
export function Quiz({ token, module, questions }: { token: string; module: FormationModule; questions: TrainingQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const done = Object.keys(answers).length;
  const wrong = new Map((result?.wrong ?? []).map((w) => [w.id, w.why]));

  const send = () => start(async () => {
    setError(null);
    const r = await cleanerTrainingSubmitAction(token, module, answers);
    if (r.error) setError(r.error);
    else if (r.result) { setResult(r.result); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });

  return (
    <div className="space-y-4">
      {result && (
        <div role="status" className={`rounded-3xl p-5 text-center ${result.passed ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-warnbg)] text-[var(--a-warn)]"}`}>
          <div className="num text-[44px] font-extrabold leading-none">{result.score} %</div>
          <b className="mt-1 block text-[17px]">{result.certified ? "Bravo, vous êtes certifié(e) ProClean !" : result.passed ? "Module réussi" : `Il faut ${result.pass_mark} % pour réussir : relisez la révision et réessayez`}</b>
          <span className="text-[14px]">{result.good} bonne{result.good > 1 ? "s" : ""} réponse{result.good > 1 ? "s" : ""} sur {result.total}</span>
          <div className="mt-3 flex flex-col gap-2">
            {result.certified && <Link href={`/nettoyeur/${token}/certificat`} className="flex h-12 items-center justify-center rounded-2xl bg-[var(--a-ok)] text-base font-extrabold text-[var(--a-bg)]">Voir mon certificat</Link>}
            <Link href={`/nettoyeur/${token}/formation`} className="flex h-12 items-center justify-center rounded-2xl bg-[var(--a-card)] text-base font-bold text-[var(--a-ink)]">Retour à la formation</Link>
          </div>
        </div>
      )}
      {questions.map((q, i) => (
        <fieldset key={q.id} className={`rounded-3xl bg-[var(--a-card)] p-4 ${result && wrong.has(q.id) ? "ring-2 ring-[var(--a-bad)]" : ""}`}>
          <legend className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">Question {i + 1} sur {questions.length}</legend>
          <p className="mb-3 text-[17px] font-bold leading-snug">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((o, k) => (
              <label key={k} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-[15px] ${answers[q.id] === k ? "border-[var(--a-pri)] bg-[var(--a-soft)] font-bold" : "border-[var(--a-line)]"}`}>
                <input type="radio" name={q.id} checked={answers[q.id] === k} disabled={!!result} onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))} className="h-5 w-5 accent-[var(--a-pri)]" />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {result && wrong.has(q.id) && <p className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-[14px] font-semibold text-[var(--a-bad)]">À retenir : {wrong.get(q.id)}</p>}
        </fieldset>
      ))}
      {error && <div role="alert" className="rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{error}</div>}
      {!result && (
        <button onClick={send} disabled={busy || done < questions.length} className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white disabled:opacity-50">
          {busy ? "Correction…" : done < questions.length ? `Répondez à toutes les questions (${done}/${questions.length})` : "Valider mes réponses"}
        </button>
      )}
      {result && !result.passed && <button onClick={() => { setResult(null); setAnswers({}); window.scrollTo({ top: 0 }); }} className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Réessayer</button>}
    </div>
  );
}
