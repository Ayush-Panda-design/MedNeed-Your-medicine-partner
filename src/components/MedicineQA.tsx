"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";

const SUGGESTED = ["What is this used for?", "What are the common side effects?", "How should I take it?", "Any precautions?"];

/** Ask a question about this specific medicine. Answers come only from the product's own details (grounded + safe). */
export function MedicineQA({ slug }: { slug: string }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setError(""); setAnswer(""); setDisclaimer("");
    const res = await api<{ answer: string; disclaimer: string }>("/api/ai/medicine-qa", { body: { slug, question: text } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setAnswer(res.data.answer);
    setDisclaimer(res.data.disclaimer);
  }

  return (
    <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5" aria-label="Ask about this medicine">
      <h2 className="flex items-center gap-2 font-bold text-teal-900"><Sparkles className="h-5 w-5 text-teal-600" /> Ask about this medicine</h2>
      <p className="mt-1 text-sm text-slate-600">Answers use only this product's information. Not a substitute for your doctor or pharmacist.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED.map((s) => (
          <button key={s} onClick={() => { setQ(s); void ask(s); }} disabled={busy} className="rounded-full border border-teal-300 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="mt-3 flex gap-2">
        <label htmlFor={`qa-${slug}`} className="sr-only">Your question</label>
        <input id={`qa-${slug}`} value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Type your question…" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
        <button data-fx="pop" disabled={busy || q.trim().length < 3} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Thinking…" : "Ask"}</button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {answer && (
        <div className="mt-3 rounded-xl bg-white p-4 text-sm leading-relaxed text-slate-800 ring-1 ring-slate-200">
          <p className="whitespace-pre-wrap">{answer}</p>
          {disclaimer && <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">{disclaimer}</p>}
        </div>
      )}
    </section>
  );
}
