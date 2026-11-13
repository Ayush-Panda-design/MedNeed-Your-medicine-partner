"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const KINDS = [
  ["damage", "Damaged / broken", "remove"],
  ["expired", "Expired / write off", "remove"],
  ["supplier_return", "Returned to supplier", "remove"],
  ["correction", "Count correction", "either"],
] as const;

export function BatchAdjust({ batchId, batchNo, onHand }: { batchId: string; batchNo: string; onHand: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("damage");
  const [qty, setQty] = useState("");
  const [direction, setDirection] = useState<"remove" | "add">("remove");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1) return setError("Enter a whole number of units.");
    const sign = kind === "correction" && direction === "add" ? 1 : -1;
    if (sign < 0 && n > onHand) return setError(`Only ${onHand} unit(s) are in this batch.`);
    if (reason.trim().length < 5) return setError("Give a reason (at least 5 characters).");
    setBusy(true);
    const res = await api(`/api/admin/inventory/batches/${batchId}/adjust`, { body: { kind, delta: sign * n, reason: reason.trim() } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setQty("");
    setReason("");
    router.refresh();
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label={`Adjust batch ${batchNo}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Adjust</button>;

  const f = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-teal-600";
  return (
    <form onSubmit={submit} className="w-72 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label={`Adjust batch ${batchNo}`} noValidate>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
      <label className="block text-xs font-medium">Reason type
        <select className={f} value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setDirection("remove"); }}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {kind === "correction" && (
        <div className="flex gap-4 text-xs"><label><input type="radio" name={`dir-${batchId}`} checked={direction === "remove"} onChange={() => setDirection("remove")} /> Remove</label><label><input type="radio" name={`dir-${batchId}`} checked={direction === "add"} onChange={() => setDirection("add")} /> Add</label></div>
      )}
      <label className="block text-xs font-medium">Units
        <input className={f} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
      </label>
      <label className="block text-xs font-medium">Note (why?)
        <input className={f} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. strips crushed in transit" />
      </label>
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-white">Cancel</button>
      </div>
    </form>
  );
}
