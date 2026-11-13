"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

// Packing and sending out have their own screens (batch checks, delivery person and code). Only handing a pickup order over
// the counter, or closing a delivery that is on the road, is a plain status change.
const NEXT: Record<string, { to: string; label: string }[]> = {
  packed: [{ to: "delivered", label: "Mark as collected (handed over)" }],
  out_for_delivery: [{ to: "delivered", label: "Mark as delivered (shop override)" }],
};
const btn = "rounded-xl bg-teal-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-teal-700";
const inp = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600";

export function OrderActions({ id, status, fulfilment, requiresRx, hasUploaded, rxStatus, rxNote, canRetryRefund }: { id: string; status: string; fulfilment: string; requiresRx: boolean; hasUploaded: boolean; rxStatus: string; rxNote: string; canRetryRefund: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const live = ["pending_payment", "confirmed", "packed", "out_for_delivery"].includes(status);

  async function run(url: string, body: unknown) {
    setBusy(true);
    setError("");
    const res = await api(url, { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNote(""); setReason("");
    router.refresh();
  }

  const moves = (NEXT[status] ?? []).filter((m) => !(status === "packed" && fulfilment === "delivery"));
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Actions">
      <h2 className="font-bold">Actions</h2>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
      {requiresRx && (
        <div className="space-y-2 rounded-xl bg-amber-50 p-3">
          <p className="font-semibold text-amber-900">Prescription: {rxStatus}{rxNote ? ` · ${rxNote}` : ""}</p>
          {rxStatus === "pending" && live && hasUploaded && <p className="text-xs text-amber-900">Review the uploaded prescription from the Prescriptions queue. The order is verified automatically once it is approved.</p>}
          {rxStatus === "pending" && live && !hasUploaded && (
            <>
              <label htmlFor="rx-note" className="block font-medium">Doctor name / registration no. (or reason if rejecting)</label>
              <input id="rx-note" className={inp} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => run(`/api/admin/orders/${id}/prescription`, { decision: "verified", note })} className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Verify</button>
                <button disabled={busy} onClick={() => run(`/api/admin/orders/${id}/prescription`, { decision: "rejected", note })} className="rounded-lg border border-rose-300 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Reject &amp; cancel</button>
              </div>
              <p className="text-xs text-amber-900">Rejecting cancels the order and puts the stock back.</p>
            </>
          )}
        </div>
      )}
      {canRetryRefund && (
        <button disabled={busy} onClick={() => run(`/api/admin/orders/${id}/refund`, {})} className="rounded-xl border border-sky-300 px-4 py-2.5 font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-60">Retry the failed refund</button>
      )}
      {status === "confirmed" && <Link href={`/admin/fulfilment/${id}`} className={btn}>Open the packing screen</Link>}
      {status === "packed" && fulfilment === "delivery" && <Link href="/admin/fulfilment?tab=send" className={btn}>Send out with a delivery person</Link>}
      {status === "out_for_delivery" && <Link href="/admin/fulfilment?tab=road" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center font-semibold hover:bg-slate-50">Reassign or issue a new code</Link>}
      {moves.length > 0 && (
        <div className="flex flex-col gap-2">
          {moves.map((m) => <button key={m.to} disabled={busy} onClick={() => run(`/api/admin/orders/${id}/status`, { to: m.to })} className={`${btn} disabled:opacity-60`}>{m.label}</button>)}
        </div>
      )}
      {status === "pending_payment" && <p className="text-slate-600">Waiting for the customer to pay. Stock is held until the timer runs out.</p>}
      {live && (
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <label htmlFor="cancel-reason" className="block font-medium">Cancel this order</label>
          <input id="cancel-reason" className={inp} placeholder="Reason (shown to the customer)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          <button disabled={busy || reason.trim().length < 5} onClick={() => run(`/api/admin/orders/${id}/cancel`, { reason: reason.trim() })} className="rounded-xl border border-rose-300 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Cancel order &amp; restock</button>
        </div>
      )}
      {!live && !requiresRx && <p className="text-slate-500">No further actions.</p>}
    </section>
  );
}
