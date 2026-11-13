"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function CancelOrder({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) return setError("Please tell us why (at least 5 characters).");
    setBusy(true);
    setError("");
    const res = await api(`/api/orders/${id}/cancel`, { body: { reason: reason.trim() } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Cancel order</button>;
  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-rose-200 bg-white p-5" aria-label="Cancel order">
      <label htmlFor="cr" className="text-sm font-medium">Why are you cancelling?</label>
      <input id="cr" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-teal-600" />
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button disabled={busy} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? "Cancelling…" : "Confirm cancel"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Keep order</button>
      </div>
    </form>
  );
}
