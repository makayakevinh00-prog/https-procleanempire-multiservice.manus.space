"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Timer } from "lucide-react";
import { cleanerTrainingSubmitAction } from "@/app/actions/nettoyeur";
import { agentTrainingSubmitAction } from "@/app/actions/agent";
import type { FormationModule, TrainingQuestion, TrainingResult } from "@/lib/formation";

/** Durée de l'examen, en secondes. */
export const EXAM_SECONDS = 20 * 60;

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Test à choix multiples : la correction est faite dans la base, ici on affiche seulement le résultat et les explications. */
export function Quiz({ token, module, questions, base = "nettoyeur" }: { token: string; module: FormationModule; questions: TrainingQuestion[]; base?: "nettoyeur" | "agent" }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const done = Object.keys(answers).length;
  const [left, setLeft] = useState(EXAM_SECONDS);
  const deadline = useRef(Date.now() + EXAM_SECONDS * 1000);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const wrong = new Map((result?.wrong ?? []).map((w) => [w.id, w.why]));

  const send = useCallback(() => start(async () => {
    setError(null);
    const r = await (base === "agent" ? agentTrainingSubmitAction : cleanerTrainingSubmitAction)(token, module, answersRef.current);
    if (r.error) setError(r.error);
    else if (r.result) { setResult(r.result); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }), [token, module, base]);

  /** Chronomètre : calculé sur l'heure de fin pour ne pas dériver ; à zéro, les réponses données partent toutes seules. */
  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(t); send(); }
    }, 500);
    return () => clearInterval(t);
  }, [result, send]);

  return (
    <div className="space-y-4">
      {!result && (
        <div role="timer" aria-live="off" className={`sticky top-2 z-10 flex items-center justify-between rounded-2xl px-4 py-3 shadow-lg ${left <= 60 ? "animate-pulse bg-[var(--a-bad)] text-white" : left <= 300 ? "bg-[var(--a-warn)] text-white" : "bg-[var(--a-ink)] text-[var(--a-bg)]"}`}>
          <span className="flex items-center gap-2 text-[14px] font-bold"><Timer className="h-5 w-5" />Temps restant</span>
          <span className="num text-[26px] font-extrabold leading-none">{clock(left)}</span>
        </div>
      )}
      {result && (
        <div role="status" className={`rounded-3xl p-5 text-center ${result.passed ? "bg-[var(--a-okbg)] text-[var(--a-ok)]" : "bg-[var(--a-warnbg)] text-[var(--a-warn)]"}`}>
          <div className="num text-[44px] font-extrabold leading-none">{result.score} %</div>
          <b className="mt-1 block text-[17px]">{result.certified ? "Bravo, vous êtes certifié(e) ProClean !" : result.passed ? "Module réussi" : `Il faut ${result.pass_mark} % pour réussir : relisez le cours puis repassez l'examen`}</b>
          <span className="text-[14px]">{result.good} bonne{result.good > 1 ? "s" : ""} réponse{result.good > 1 ? "s" : ""} sur {result.total}</span>
          <div className="mt-3 flex flex-col gap-2">
            {result.certified && <Link href={`/${base}/${token}/certificat`} className="flex h-12 items-center justify-center rounded-2xl bg-[var(--a-ok)] text-base font-extrabold text-[var(--a-bg)]">Voir mon certificat</Link>}
            {!result.passed && <Link href={`/${base}/${token}/formation/${module}`} className="flex h-12 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Revoir le cours</Link>}
            <Link href={`/${base}/${token}/formation`} className="flex h-12 items-center justify-center rounded-2xl bg-[var(--a-card)] text-base font-bold text-[var(--a-ink)]">Retour à la formation</Link>
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
      {result && !result.passed && <button onClick={() => { deadline.current = Date.now() + EXAM_SECONDS * 1000; setLeft(EXAM_SECONDS); setResult(null); setAnswers({}); window.scrollTo({ top: 0 }); }} className="h-14 w-full rounded-2xl bg-[var(--a-soft)] text-lg font-extrabold text-[var(--a-pri)]">Repasser l&apos;examen maintenant</button>}
    </div>
  );
}
