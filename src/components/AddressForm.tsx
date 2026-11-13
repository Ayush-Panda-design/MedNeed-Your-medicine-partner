"use client";

import { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { INDIAN_STATES, type Address } from "@/lib/addresses";

export type AddressValues = {
  label: "home" | "work" | "other";
  fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string;
  isDefault: boolean;
  lat?: number | null; lng?: number | null;
};

export const emptyAddress: AddressValues = { label: "home", fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };
export const valuesOf = (a: Address): AddressValues => ({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault });
const input = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

/** Create or edit one address. Used on the addresses page and inside checkout. */
export function AddressForm({ initial, editingId, hasLocation, onSaved, onCancel }: {
  initial: AddressValues; editingId: string | null; hasLocation?: boolean; onSaved: (a: Address) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof AddressValues>(k: K, v: AddressValues[K]) => setForm((f) => ({ ...f, [k]: v }));
  const located = form.lat != null && form.lng != null;

  function locate() {
    setError("");
    if (!navigator.geolocation) return setError("Your browser cannot share its location. You can still save the address.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setForm((f) => ({ ...f, lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) })); setLocating(false); },
      () => { setLocating(false); setError("We could not get your location. Allow location access, or save the address without it."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<{ address: Address }>(editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses", { method: editingId ? "PATCH" : "POST", body: form });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onSaved(res.data.address);
  }

  return (
    <form onSubmit={save} noValidate className="mt-5 rounded-2xl border border-slate-200 bg-white p-6" aria-label="Address">
      <h3 className="font-bold">{editingId ? "Edit address" : "New address"}</h3>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Address type</legend>
        <div className="mt-2 flex gap-2">
          {(["home", "work", "other"] as const).map((l) => (
            <label key={l} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium capitalize ${form.label === l ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-300 text-slate-600"}`}>
              <input type="radio" name="label" value={l} checked={form.label === l} onChange={() => set("label", l)} className="sr-only" /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="a-name" className="text-sm font-medium">Recipient name</label><input id="a-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" className={input} /></div>
        <div><label htmlFor="a-phone" className="text-sm font-medium">Mobile number</label><input id="a-phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} autoComplete="tel-national" className={input} /></div>
        <div className="sm:col-span-2"><label htmlFor="a-l1" className="text-sm font-medium">House / flat / street</label><input id="a-l1" value={form.line1} onChange={(e) => set("line1", e.target.value)} autoComplete="address-line1" className={input} /></div>
        <div className="sm:col-span-2"><label htmlFor="a-l2" className="text-sm font-medium">Area / locality (optional)</label><input id="a-l2" value={form.line2} onChange={(e) => set("line2", e.target.value)} autoComplete="address-line2" className={input} /></div>
        <div className="sm:col-span-2"><label htmlFor="a-lm" className="text-sm font-medium">Landmark (optional)</label><input id="a-lm" value={form.landmark} onChange={(e) => set("landmark", e.target.value)} className={input} /></div>
        <div><label htmlFor="a-pin" className="text-sm font-medium">Pincode</label><input id="a-pin" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} autoComplete="postal-code" className={input} /></div>
        <div><label htmlFor="a-city" className="text-sm font-medium">City</label><input id="a-city" value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" className={input} /></div>
        <div className="sm:col-span-2">
          <label htmlFor="a-state" className="text-sm font-medium">State</label>
          <select id="a-state" value={form.state} onChange={(e) => set("state", e.target.value)} className={input}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
        <p className="font-medium">Delivery location</p>
        <p className="mt-1 text-slate-600">Share your location so we can work out the delivery distance exactly. Do this while you are at the delivery address.</p>
        <button type="button" onClick={locate} disabled={locating} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-70">
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} Use my current location
        </button>
        {located ? <p role="status" className="mt-2 font-medium text-emerald-700">Location saved with this address.</p>
          : hasLocation ? <p className="mt-2 text-slate-500">This address already has a saved location. Tap the button to replace it.</p>
          : <p className="mt-2 text-slate-500">Optional. Without it we use the middle of your pincode area.</p>}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="accent-teal-600" /> Make this my default address</label>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save address</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  );
}
