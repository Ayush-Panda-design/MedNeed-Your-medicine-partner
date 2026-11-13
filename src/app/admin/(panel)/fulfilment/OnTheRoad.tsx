"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { dateTime } from "@/lib/orderStatus";
import type { FulfilmentOrder } from "@/server/orders/fulfilment";

export function OnTheRoad({ orders, partners }: { orders: FulfilmentOrder[]; partners: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function reassign(orderId: string, partnerId: string) {
    if (!partnerId) return;
    setBusy(orderId); setError("");
    const res = await api(`/api/admin/orders/${orderId}/reassign`, { body: { partnerId } });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">{o.orderNumber} <span className="font-normal text-slate-500">· {o.customerName}</span></p>
              <p className="text-slate-600">{o.area}</p>
              <p className="text-xs text-slate-500">With <strong>{o.partnerName ?? "unknown"}</strong>{o.partnerPhone ? ` (${o.partnerPhone.replace(/^\+91/, "")})` : ""}{o.dispatchedAt ? ` · since ${dateTime(o.dispatchedAt)}` : ""} · {formatINR(o.total)}{o.paymentStatus === "unpaid" ? " · cash due" : ""}</p>
              {o.codeLocked && <p className="mt-1 inline-block rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">Delivery code locked after wrong tries. Reassign to issue a new code.</p>}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`re-${o.id}`} className="sr-only">Reassign to</label>
              <select id={`re-${o.id}`} disabled={busy === o.id} defaultValue="" onChange={(e) => { void reassign(o.id, e.target.value); e.target.value = ""; }} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                <option value="">Reassign / new code…</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Link href={`/admin/orders/${o.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Open</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
