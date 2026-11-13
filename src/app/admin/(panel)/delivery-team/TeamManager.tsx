"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { dateTime } from "@/lib/orderStatus";

type Partner = { id: string; name: string; phone: string; status: string; lastLoginAt: string | null; active: number; deliveredToday: number; cashPending: number; cashOrders: number };
const inp = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600";

export function TeamManager({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    setBusy(key); setError(""); setNotice("");
    const res = await fn();
    setBusy(null);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    if (done) setNotice(done);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); void run("add", async () => { const r = await api("/api/admin/delivery/partners", { body: { name, phone } }); if (r.ok) { setName(""); setPhone(""); } return r; }, "Added. They can now sign in with this mobile number."); }}>
        <div><label htmlFor="dp-name" className="mb-1 block text-sm font-medium">Name</label><input id="dp-name" className={inp} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></div>
        <div><label htmlFor="dp-phone" className="mb-1 block text-sm font-medium">Mobile number</label><input id="dp-phone" inputMode="numeric" className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" required /></div>
        <button disabled={busy === "add"} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">Add delivery person</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {partners.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No delivery people yet. Add the first one above.</p> : (
          <ul className="divide-y divide-slate-100">
            {partners.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-semibold">{p.name || "Unnamed"} <span className="font-normal text-slate-500">· {p.phone.replace(/^\+91/, "+91 ")}</span></p>
                  <p className="text-xs text-slate-500">{p.active} on the road · {p.deliveredToday} delivered today · {p.lastLoginAt ? `last sign-in ${dateTime(p.lastLoginAt)}` : "has not signed in yet"}</p>
                  {p.cashPending > 0 && <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Holding {formatINR(p.cashPending)} cash from {p.cashOrders} order{p.cashOrders === 1 ? "" : "s"}</p>}
                </div>
                <div className="flex gap-2">
                  {p.cashPending > 0 && <button disabled={busy === p.id} onClick={() => run(p.id, () => api(`/api/admin/delivery/partners/${p.id}/settle`, { body: {} }), `Recorded ${formatINR(p.cashPending)} received from ${p.name || "the delivery person"}.`)} className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Cash received</button>}
                  <button disabled={busy === p.id} onClick={() => { if (confirm(`Remove ${p.name || p.phone} from the delivery team?`)) void run(p.id, () => api(`/api/admin/delivery/partners/${p.id}`, { method: "DELETE" }), "Removed from the delivery team."); }} className="rounded-lg border border-rose-300 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
