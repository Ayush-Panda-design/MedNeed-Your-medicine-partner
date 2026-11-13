"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

type Row = { pincode: string; area: string; lat: number; lng: number; isActive: boolean };
const f = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600";

export function PincodeManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [v, setV] = useState({ pincode: "", area: "", lat: "", lng: "", isActive: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(r: Row) {
    setBusy(true); setError("");
    const res = await api("/api/admin/pincodes", { body: r });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const lat = Number(v.lat), lng = Number(v.lng);
    if (!/^[1-9]\d{5}$/.test(v.pincode)) return setError("Enter a 6-digit pincode.");
    if (!v.lat || !v.lng || Number.isNaN(lat) || Number.isNaN(lng)) return setError("Enter the latitude and longitude of the middle of the area.");
    await save({ pincode: v.pincode, area: v.area.trim(), lat, lng, isActive: v.isActive });
    setV({ pincode: "", area: "", lat: "", lng: "", isActive: true });
  }
  async function remove(p: string) {
    if (!window.confirm(`Remove pincode ${p}? Customers using it will no longer be able to order delivery.`)) return;
    const res = await api(`/api/admin/pincodes/${p}`, { method: "DELETE" });
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={add} noValidate aria-label="Add pincode" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-5">
        <div><label htmlFor="pc-pin" className="mb-1 block text-sm font-medium">Pincode</label><input id="pc-pin" inputMode="numeric" maxLength={6} className={f} value={v.pincode} onChange={(e) => setV({ ...v, pincode: e.target.value.replace(/\D/g, "") })} /></div>
        <div><label htmlFor="pc-area" className="mb-1 block text-sm font-medium">Area</label><input id="pc-area" className={f} value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })} /></div>
        <div><label htmlFor="pc-lat" className="mb-1 block text-sm font-medium">Latitude</label><input id="pc-lat" inputMode="decimal" className={f} value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} /></div>
        <div><label htmlFor="pc-lng" className="mb-1 block text-sm font-medium">Longitude</label><input id="pc-lng" inputMode="decimal" className={f} value={v.lng} onChange={(e) => setV({ ...v, lng: e.target.value })} /></div>
        <div className="flex items-end"><button disabled={busy} className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">Add / update</button></div>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Pincode</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Centre</th><th className="px-4 py-3">Delivering</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No pincodes yet. Customers who share their location are still served within the distance limit; others cannot confirm distance.</td></tr>}
            {rows.map((r) => (
              <tr key={r.pincode}>
                <td className="px-4 py-3 font-semibold">{r.pincode}</td><td className="px-4 py-3">{r.area}</td><td className="px-4 py-3 text-slate-500">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</td>
                <td className="px-4 py-3"><label className="flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={r.isActive} disabled={busy} onChange={(e) => save({ ...r, isActive: e.target.checked })} /> {r.isActive ? "Yes" : "No"}</label></td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(r.pincode)} className="text-rose-600 hover:underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
