"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { inr } from "../shared";

export function SettingsForm({ id, discountPercent, reorderLevel, gstPercent, hsn, mrp, ceiling }: { id: string; discountPercent: number; reorderLevel: number; gstPercent: number | null; hsn: string; mrp: number; ceiling: number | null }) {
  const router = useRouter();
  const [discount, setDiscount] = useState(String(discountPercent));
  const [reorder, setReorder] = useState(String(reorderLevel));
  const [gst, setGst] = useState(gstPercent == null ? "" : String(gstPercent));
  const [hsnCode, setHsnCode] = useState(hsn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const d = Number(discount);
  const valid = discount.trim() !== "" && Number.isFinite(d) && d >= 0 && d <= 90;
  const preview = valid ? Math.min(mrp, Math.max(0.01, Math.round(mrp * (1 - d / 100) * 100) / 100)) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const r = Number(reorder);
    if (!valid) return setError("Discount must be between 0 and 90.");
    if (!Number.isInteger(r) || r < 0) return setError("Reorder level must be a whole number.");
    const g = gst.trim() === "" ? null : Number(gst);
    if (g !== null && (!Number.isFinite(g) || g < 0 || g > 40)) return setError("GST must be between 0 and 40, or blank to use the shop default.");
    if (!/^(\d{4,8})?$/.test(hsnCode.trim())) return setError("HSN must be 4 to 8 digits.");
    setBusy(true);
    const res = await api(`/api/admin/inventory/medicines/${id}/settings`, { method: "PATCH", body: { discountPercent: Math.round(d * 100) / 100, reorderLevel: r, gstPercent: g, hsn: hsnCode.trim() } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  const f = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600";
  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5" noValidate>
      <h2 className="font-bold">Pricing and reorder level</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">The MRP comes from the batch being sold. The selling price is the MRP less your discount.</p>
      {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {saved && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="s-disc" className="mb-1 block text-sm font-medium">Discount on MRP (%)</label>
          <input id="s-disc" inputMode="decimal" className={f} value={discount} onChange={(e) => { setDiscount(e.target.value); setSaved(false); }} />
          <p className="mt-1 text-xs text-slate-500">{preview != null ? `Customers pay ${inr.format(preview)} on an MRP of ${inr.format(mrp)}.` : "Enter 0 to 90."}{ceiling != null && preview != null && preview > ceiling ? ` Capped at the NPPA ceiling of ${inr.format(ceiling)}.` : ""}</p>
        </div>
        <div>
          <label htmlFor="s-reorder" className="mb-1 block text-sm font-medium">Reorder level (units)</label>
          <input id="s-reorder" inputMode="numeric" className={f} value={reorder} onChange={(e) => { setReorder(e.target.value); setSaved(false); }} />
          <p className="mt-1 text-xs text-slate-500">You are alerted when available units fall to this number.</p>
        </div>
        <div>
          <label htmlFor="s-gst" className="mb-1 block text-sm font-medium">GST rate (%)</label>
          <input id="s-gst" inputMode="decimal" className={f} value={gst} placeholder="Shop default" onChange={(e) => { setGst(e.target.value); setSaved(false); }} />
          <p className="mt-1 text-xs text-slate-500">Printed on invoices. Ask your accountant for the rate. Blank uses the shop default.</p>
        </div>
        <div>
          <label htmlFor="s-hsn" className="mb-1 block text-sm font-medium">HSN code</label>
          <input id="s-hsn" inputMode="numeric" className={f} value={hsnCode} placeholder="3004" onChange={(e) => { setHsnCode(e.target.value); setSaved(false); }} />
          <p className="mt-1 text-xs text-slate-500">Blank uses 3004 (medicines).</p>
        </div>
        <div className="flex items-end"><button disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button></div>
      </div>
    </form>
  );
}
