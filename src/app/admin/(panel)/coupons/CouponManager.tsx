"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import type { Coupon } from "@/server/orders/coupons";

const f = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600";
type V = { code: string; description: string; kind: "percent" | "flat"; value: string; maxDiscount: string; minOrder: string; startsAt: string; endsAt: string; usageLimit: string; perUserLimit: string; isActive: boolean };
const blank: V = { code: "", description: "", kind: "percent", value: "", maxDiscount: "", minOrder: "0", startsAt: "", endsAt: "", usageLimit: "", perUserLimit: "1", isActive: true };
const dayOf = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromCoupon = (c: Coupon): V => ({ code: c.code, description: c.description, kind: c.kind, value: String(c.value), maxDiscount: c.maxDiscount == null ? "" : String(c.maxDiscount), minOrder: String(c.minOrder), startsAt: dayOf(c.startsAt), endsAt: dayOf(c.endsAt), usageLimit: c.usageLimit == null ? "" : String(c.usageLimit), perUserLimit: String(c.perUserLimit), isActive: c.isActive });

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [v, setV] = useState<V>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof V>(k: K, val: V[K]) => setV((p) => ({ ...p, [k]: val }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body = {
      code: v.code.trim(), description: v.description.trim(), kind: v.kind, value: Number(v.value), maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : null,
      minOrder: Number(v.minOrder || 0), startsAt: v.startsAt ? `${v.startsAt}T00:00:00+05:30` : null, endsAt: v.endsAt ? `${v.endsAt}T23:59:59+05:30` : null,
      usageLimit: v.usageLimit ? Number(v.usageLimit) : null, perUserLimit: Number(v.perUserLimit || 1), isActive: v.isActive,
    };
    setBusy(true);
    const res = editing === "new" ? await api("/api/admin/coupons", { body }) : await api(`/api/admin/coupons/${editing}`, { method: "PATCH", body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {editing === null ? (
        <button type="button" onClick={() => { setV(blank); setError(""); setEditing("new"); }} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Add coupon</button>
      ) : (
        <form onSubmit={save} noValidate aria-label="Coupon" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">{editing === "new" ? "New coupon" : "Edit coupon"}</h2>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label htmlFor="cp-code" className="mb-1 block text-sm font-medium">Code</label><input id="cp-code" className={`${f} uppercase`} value={v.code} onChange={(e) => set("code", e.target.value)} maxLength={20} /></div>
            <div className="sm:col-span-2"><label htmlFor="cp-desc" className="mb-1 block text-sm font-medium">Description</label><input id="cp-desc" className={f} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={120} /></div>
            <div><label htmlFor="cp-kind" className="mb-1 block text-sm font-medium">Type</label><select id="cp-kind" className={f} value={v.kind} onChange={(e) => set("kind", e.target.value as V["kind"])}><option value="percent">Percent off</option><option value="flat">Flat amount off</option></select></div>
            <div><label htmlFor="cp-val" className="mb-1 block text-sm font-medium">{v.kind === "percent" ? "Percent (%)" : "Amount (₹)"}</label><input id="cp-val" inputMode="decimal" className={f} value={v.value} onChange={(e) => set("value", e.target.value)} /></div>
            <div><label htmlFor="cp-max" className="mb-1 block text-sm font-medium">Largest discount (₹, optional)</label><input id="cp-max" inputMode="decimal" className={f} value={v.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} /></div>
            <div><label htmlFor="cp-min" className="mb-1 block text-sm font-medium">Minimum order (₹)</label><input id="cp-min" inputMode="decimal" className={f} value={v.minOrder} onChange={(e) => set("minOrder", e.target.value)} /></div>
            <div><label htmlFor="cp-start" className="mb-1 block text-sm font-medium">Starts (optional)</label><input id="cp-start" type="date" className={f} value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></div>
            <div><label htmlFor="cp-end" className="mb-1 block text-sm font-medium">Ends (optional)</label><input id="cp-end" type="date" className={f} value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></div>
            <div><label htmlFor="cp-lim" className="mb-1 block text-sm font-medium">Total uses allowed (optional)</label><input id="cp-lim" inputMode="numeric" className={f} value={v.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} /></div>
            <div><label htmlFor="cp-per" className="mb-1 block text-sm font-medium">Uses per customer</label><input id="cp-per" inputMode="numeric" className={f} value={v.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active</label>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : "Save coupon"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Offer</th><th className="px-4 py-3">Min order</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Valid</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {coupons.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No coupons yet.</td></tr>}
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold">{c.code}<span className="block text-xs font-normal text-slate-500">{c.description}</span></td>
                <td className="px-4 py-3">{c.kind === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`}{c.maxDiscount != null && <span className="block text-xs text-slate-500">up to {formatINR(c.maxDiscount)}</span>}</td>
                <td className="px-4 py-3">{formatINR(c.minOrder)}</td>
                <td className="px-4 py-3">{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}</td>
                <td className="px-4 py-3 text-slate-600">{c.startsAt || c.endsAt ? `${dayOf(c.startsAt) || "…"} to ${dayOf(c.endsAt) || "…"}` : "Always"}</td>
                <td className="px-4 py-3">{c.isActive ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Active</span> : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Off</span>}</td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setV(fromCoupon(c)); setError(""); setEditing(c.id); }} className="text-teal-700 hover:underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
