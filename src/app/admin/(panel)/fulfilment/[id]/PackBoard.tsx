"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, PackageCheck } from "lucide-react";
import { api } from "@/lib/api";

type Batch = { rowId: string; batchNo: string; expiry: string; qty: number; picked: boolean };
type Line = { itemId: string; name: string; packSize: string; manufacturer: string; schedule: string; batches: Batch[] };

/**
 * One row per batch the system reserved. The packer types or scans the batch number printed on the pack, which proves they
 * picked the right one. Marking the order packed is only possible once every batch is confirmed (the server checks too).
 */
export function PackBoard({ orderId, items, blocked }: { orderId: string; items: Line[]; blocked: boolean }) {
  const router = useRouter();
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ row: string; text: string } | null>(null);
  const [packing, setPacking] = useState(false);
  const [packError, setPackError] = useState("");

  const all = items.flatMap((i) => i.batches);
  const done = all.filter((b) => b.picked).length;

  async function pick(b: Batch, batchNo: string | null) {
    setBusy(b.rowId); setError(null);
    const res = await api(`/api/admin/orders/${orderId}/pick`, { body: { rowId: b.rowId, batchNo } });
    setBusy(null);
    if (!res.ok) return setError({ row: b.rowId, text: res.error });
    setTyped((t) => ({ ...t, [b.rowId]: "" }));
    router.refresh();
  }

  async function pack() {
    setPacking(true); setPackError("");
    const res = await api(`/api/admin/orders/${orderId}/status`, { body: { to: "packed" } });
    if (!res.ok) { setPacking(false); return setPackError(res.error); }
    router.push("/admin/fulfilment");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-semibold">{done} of {all.length} batches confirmed</p>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={all.length} aria-valuenow={done}><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></div>
      </div>

      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.itemId} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold">{i.name} <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">{i.schedule}</span></p>
            <p className="text-xs text-slate-500">{i.manufacturer} · {i.packSize}</p>
            <ul className="mt-3 space-y-2">
              {i.batches.map((b) => (
                <li key={b.rowId} className={`rounded-xl p-3 text-sm ${b.picked ? "bg-emerald-50" : "bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>Take <strong className="text-base">{b.qty}</strong> from batch <span className="font-mono font-semibold">{b.batchNo}</span> <span className="text-slate-500">(expires {b.expiry})</span></p>
                    {b.picked ? (
                      <span className="inline-flex items-center gap-2 font-semibold text-emerald-700"><Check className="h-4 w-4" /> Confirmed <button onClick={() => pick(b, null)} disabled={busy === b.rowId} className="text-xs font-medium text-slate-500 underline hover:text-slate-800">Undo</button></span>
                    ) : (
                      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (typed[b.rowId]?.trim()) void pick(b, typed[b.rowId]); }}>
                        <label htmlFor={`b-${b.rowId}`} className="sr-only">Batch number on the pack</label>
                        <input id={`b-${b.rowId}`} value={typed[b.rowId] ?? ""} onChange={(e) => setTyped((t) => ({ ...t, [b.rowId]: e.target.value }))} placeholder="Type or scan batch no." autoComplete="off" disabled={blocked} className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-teal-600" />
                        <button disabled={busy === b.rowId || blocked || !typed[b.rowId]?.trim()} className="rounded-lg bg-teal-600 px-3 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">Confirm</button>
                      </form>
                    )}
                  </div>
                  {error?.row === b.rowId && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{error.text}</p>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {packError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{packError}</p>}
      <button onClick={pack} disabled={packing || blocked || done < all.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto"><PackageCheck className="h-5 w-5" /> {packing ? "Marking packed…" : "Mark order as packed"}</button>
    </div>
  );
}
