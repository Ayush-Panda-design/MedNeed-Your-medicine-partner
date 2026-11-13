"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { slotText } from "@/lib/orderStatus";
import type { FulfilmentOrder } from "@/server/orders/fulfilment";

type Partner = { id: string; name: string; active: number };

/** Pick several packed orders, pick a delivery person, send them out together. */
export function DispatchBoard({ orders, partners }: { orders: FulfilmentOrder[]; partners: Partner[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [partnerId, setPartnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (orders.length === 0) return <p className="py-8 text-center text-sm text-slate-500">No packed orders are waiting to be sent.</p>;
  const ready = orders.filter((o) => !(o.requiresRx && o.rxStatus !== "verified"));
  const toggle = (id: string) => setChosen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = ready.length > 0 && ready.every((o) => chosen.has(o.id));

  async function send() {
    setBusy(true); setError("");
    const res = await api("/api/admin/fulfilment/dispatch", { body: { orderIds: [...chosen], partnerId } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setChosen(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {partners.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Add a delivery person first. <Link href="/admin/delivery-team" className="font-semibold underline">Delivery team</Link></p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
        <label className="inline-flex items-center gap-2 font-medium"><input type="checkbox" className="accent-teal-600" checked={allOn} onChange={() => setChosen(allOn ? new Set() : new Set(ready.map((o) => o.id)))} /> Select all</label>
        <span className="text-slate-500">{chosen.size} selected</span>
        <label htmlFor="partner" className="sr-only">Delivery person</label>
        <select id="partner" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="">Choose delivery person</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? ` (${p.active} on the road)` : ""}</option>)}
        </select>
        <button onClick={send} disabled={busy || chosen.size === 0 || !partnerId} className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Sending…" : `Send out ${chosen.size || ""}`.trim()}</button>
      </div>
      <ul className="divide-y divide-slate-100">
        {orders.map((o) => {
          const waiting = o.requiresRx && o.rxStatus !== "verified";
          return (
            <li key={o.id} className="flex items-start gap-3 py-3 text-sm">
              <input id={`o-${o.id}`} type="checkbox" className="mt-1 accent-teal-600" disabled={waiting} checked={chosen.has(o.id)} onChange={() => toggle(o.id)} />
              <label htmlFor={`o-${o.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="font-semibold">{o.orderNumber}</span> <span className="text-slate-500">· {o.customerName}</span>
                <span className="block text-slate-600">{o.area}</span>
                <span className="block text-xs text-slate-500">{slotText(o.slotDate, o.slotWindow)} · {formatINR(o.total)}{o.paymentStatus === "unpaid" ? " · collect cash" : " · paid"}{o.deliveryAttempts > 0 ? ` · ${o.deliveryAttempts} failed attempt${o.deliveryAttempts === 1 ? "" : "s"}` : ""}</span>
                {waiting && <span className="block text-xs font-semibold text-amber-800">Prescription not verified yet</span>}
              </label>
              <Link href={`/admin/orders/${o.id}`} className="text-xs font-medium text-teal-700 hover:underline">Open</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
