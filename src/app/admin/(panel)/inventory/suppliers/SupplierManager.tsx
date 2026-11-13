"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

type Supplier = { id: string; name: string; phone: string; gstin: string; drugLicense: string; address: string; notes: string; isActive: boolean; purchaseCount: number };
const blank = { name: "", phone: "", gstin: "", drugLicense: "", address: "", notes: "", isActive: true };
const f = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600";

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [v, setV] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function open(s?: Supplier) {
    setError("");
    setNotice("");
    setEditing(s ? s.id : "new");
    setV(s ? { name: s.name, phone: s.phone, gstin: s.gstin, drugLicense: s.drugLicense, address: s.address, notes: s.notes, isActive: s.isActive } : blank);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (v.name.trim().length < 2) return setError("Enter the supplier name.");
    setBusy(true);
    const res = editing === "new" ? await api("/api/admin/inventory/suppliers", { body: v }) : await api(`/api/admin/inventory/suppliers/${editing}`, { method: "PATCH", body: v });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotice(editing === "new" ? "Supplier added." : "Supplier updated.");
    setEditing(null);
    router.refresh();
  }

  const set = (k: keyof typeof blank, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));
  return (
    <div className="space-y-6">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {editing === null ? (
        <button type="button" onClick={() => open()} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Add supplier</button>
      ) : (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" aria-label="Supplier" noValidate>
          <h2 className="font-bold">{editing === "new" ? "New supplier" : "Edit supplier"}</h2>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="sp-name" className="mb-1 block text-sm font-medium">Name</label><input id="sp-name" className={f} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={120} /></div>
            <div><label htmlFor="sp-phone" className="mb-1 block text-sm font-medium">Phone</label><input id="sp-phone" className={f} value={v.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} /></div>
            <div><label htmlFor="sp-gst" className="mb-1 block text-sm font-medium">GSTIN</label><input id="sp-gst" className={f} value={v.gstin} onChange={(e) => set("gstin", e.target.value)} maxLength={20} /></div>
            <div><label htmlFor="sp-dl" className="mb-1 block text-sm font-medium">Drug licence no.</label><input id="sp-dl" className={f} value={v.drugLicense} onChange={(e) => set("drugLicense", e.target.value)} maxLength={60} /></div>
            <div className="sm:col-span-2"><label htmlFor="sp-addr" className="mb-1 block text-sm font-medium">Address</label><input id="sp-addr" className={f} value={v.address} onChange={(e) => set("address", e.target.value)} maxLength={300} /></div>
            <div className="sm:col-span-2"><label htmlFor="sp-notes" className="mb-1 block text-sm font-medium">Notes</label><input id="sp-notes" className={f} value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active (can be chosen on new bills)</label>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : "Save supplier"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">GSTIN / Licence</th><th className="px-5 py-3">Bills</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"><span className="sr-only">Edit</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No suppliers yet. Add the wholesalers you buy from.</td></tr>}
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-semibold">{s.name}{s.address && <p className="text-xs font-normal text-slate-500">{s.address}</p>}</td>
                <td className="px-5 py-3">{s.phone || "—"}</td>
                <td className="px-5 py-3 text-xs">{s.gstin || "—"}<br />{s.drugLicense || ""}</td>
                <td className="px-5 py-3">{s.purchaseCount}</td>
                <td className="px-5 py-3">{s.isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Active</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">Inactive</span>}</td>
                <td className="px-5 py-3"><button type="button" onClick={() => open(s)} aria-label={`Edit ${s.name}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
