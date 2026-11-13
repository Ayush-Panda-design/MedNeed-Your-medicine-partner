"use client";

import { useState } from "react";
import { Briefcase, Home, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { INDIAN_STATES, type Address } from "@/lib/addresses";

type Form = {
  label: "home" | "work" | "other";
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const empty: Form = { label: "home", fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };
const input = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const LabelIcon = { home: Home, work: Briefcase, other: MapPin } as const;

export function AddressManager({ initial }: { initial: Address[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    const res = await api<{ addresses: Address[] }>("/api/account/addresses");
    if (res.ok) setList(res.data.addresses);
  }

  function startNew() {
    setForm({ ...empty, isDefault: list.length === 0 });
    setEditing("new");
    setError("");
  }

  function startEdit(a: Address) {
    setForm({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault });
    setEditing(a.id);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api(editing === "new" ? "/api/account/addresses" : `/api/account/addresses/${editing}`, {
      method: editing === "new" ? "POST" : "PATCH",
      body: form,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    await reload();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;
    const res = await api(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
    else setError(res.error);
  }

  async function makeDefault(a: Address) {
    const res = await api(`/api/account/addresses/${a.id}`, { method: "PATCH", body: { ...a, line2: a.line2 ?? "", landmark: a.landmark ?? "", isDefault: true } });
    if (res.ok) await reload();
    else setError(res.error);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Saved addresses</h2>
        {!editing && list.length < 10 && (
          <button onClick={startNew} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Add address
          </button>
        )}
      </div>
      {error && !editing && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {editing && (
        <form onSubmit={save} noValidate className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-bold">{editing === "new" ? "New address" : "Edit address"}</h3>
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
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="accent-teal-600" /> Make this my default address</label>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save address</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {list.length === 0 && !editing ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <MapPin className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold">No saved addresses yet</p>
          <p className="mt-1 text-sm text-slate-500">Add an address to speed up checkout.</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {list.map((a) => {
            const Icon = LabelIcon[a.label];
            return (
              <li key={a.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold capitalize"><Icon className="h-4 w-4 text-teal-600" /> {a.label}</span>
                  {a.isDefault && <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">Default</span>}
                </div>
                <p className="mt-3 font-medium">{a.fullName}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.landmark ? `, near ${a.landmark}` : ""}<br />{a.city}, {a.state} {a.pincode}
                </p>
                <p className="mt-1 text-sm text-slate-500">+91 {a.phone}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4 text-sm">
                  <button onClick={() => startEdit(a)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => remove(a.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  {!a.isDefault && <button onClick={() => makeDefault(a)} className="rounded-lg px-2 py-1 font-medium text-teal-700 hover:bg-teal-50">Set as default</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
