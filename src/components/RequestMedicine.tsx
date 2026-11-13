"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const field = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600";

export function RequestMedicine({ slug }: { slug: string }) {
  const [v, setV] = useState({ name: "", phone: "", quantity: "1", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await api("/api/catalog/request", { body: { slug, name: v.name, phone: v.phone, quantity: Number(v.quantity) || 1, note: v.note } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(true);
  }

  if (done)
    return (
      <div role="status" className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Thank you. We have your request and will call you on {v.phone} to confirm availability and price.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div>
        <label htmlFor="rq-name" className="mb-1 block text-sm font-medium">Your name</label>
        <input id="rq-name" className={field} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} autoComplete="name" />
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <div>
          <label htmlFor="rq-phone" className="mb-1 block text-sm font-medium">Mobile number</label>
          <input id="rq-phone" inputMode="tel" className={field} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} maxLength={16} autoComplete="tel" placeholder="10-digit number" />
        </div>
        <div>
          <label htmlFor="rq-qty" className="mb-1 block text-sm font-medium">Qty</label>
          <input id="rq-qty" inputMode="numeric" className={field} value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} maxLength={2} />
        </div>
      </div>
      <div>
        <label htmlFor="rq-note" className="mb-1 block text-sm font-medium">Note <span className="font-normal text-slate-400">(optional)</span></label>
        <input id="rq-note" className={field} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={200} placeholder="e.g. strip of 10, needed this week" />
      </div>
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Request this medicine
      </button>
    </form>
  );
}
