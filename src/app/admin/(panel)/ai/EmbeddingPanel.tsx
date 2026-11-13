"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, Loader2 } from "lucide-react";

type Stats = { active: number; embedded: number; pending: number; model: string; aiEnabled: boolean };

export function EmbeddingPanel({ initial }: { initial: Stats }) {
  const [stats, setStats] = useState<Stats>(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const pct = stats.active ? Math.round((stats.embedded / stats.active) * 100) : 0;

  const stop = useRef(false);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Embeds batch after batch. Free Gemini keys are rate-limited per minute, so on a limit we wait a minute and resume
  // automatically; after 3 waits with no progress at all (e.g. the daily quota is used up) we stop and say so.
  async function embedOnce() {
    stop.current = false; setBusy(true); setNote("");
    let stalls = 0;
    while (!stop.current) {
      const res = await api<{ run: { embedded: number; pending: number; limited?: boolean }; stats: Stats }>("/api/admin/ai/embeddings", { body: {} });
      let limited = false;
      if (res.ok) {
        setStats(res.data.stats);
        if (res.data.run.embedded > 0) stalls = 0;
        if (res.data.stats.pending === 0 || (res.data.run.embedded === 0 && res.data.run.pending === 0)) break;
        limited = !!res.data.run.limited;
      } else if (/429|rate|quota/i.test(res.error)) {
        limited = true;
        if (++stalls >= 3) { setNote("Gemini's quota looks used up for now (possibly the daily limit). Click again later, or add more keys. Progress so far is saved."); break; }
      } else { setNote(res.error); break; }
      if (limited) {
        for (let s = 65; s > 0 && !stop.current; s--) { setNote(`Gemini rate limit reached - resuming automatically in ${s}s. Progress is saved.`); await sleep(1000); }
        setNote("");
      }
    }
    setBusy(false);
  }

  return (
    <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-teal-600" />
        <h2 className="text-lg font-bold">Semantic search coverage</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Products that have been embedded can be found by meaning (symptoms, natural language, typos), not just keywords.
      </p>

      {!stats.aiEnabled && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">AI is off — set <code>GEMINI_API_KEYS</code> to enable embeddings.</p>
      )}

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-extrabold text-slate-900">{stats.embedded.toLocaleString()}<span className="text-base font-medium text-slate-400"> / {stats.active.toLocaleString()}</span></p>
          <p className="text-sm font-semibold text-teal-700">{pct}%</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-lime-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {stats.pending > 0 ? `${stats.pending.toLocaleString()} products still to embed.` : "All shoppable products are embedded."} Model: <code>{stats.model}</code>
        </p>
      </div>

      <button
        onClick={embedOnce}
        disabled={busy || !stats.aiEnabled || stats.pending === 0}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Embedding…</> : stats.pending === 0 ? "Up to date" : "Embed now"}
      </button>
      {busy && <button onClick={() => { stop.current = true; }} className="ml-2 mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Stop</button>}
      <p className="mt-2 text-xs text-slate-400">New and edited products are also embedded automatically by the scheduler.</p>
      {note && <p className={`mt-2 rounded-lg p-2 text-sm ${busy ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-700"}`}>{note}</p>}
    </div>
  );
}
