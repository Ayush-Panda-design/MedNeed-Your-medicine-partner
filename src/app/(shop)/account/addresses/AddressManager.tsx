"use client";

import { useState } from "react";
import { Briefcase, Home, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Address } from "@/lib/addresses";
import { AddressForm, emptyAddress, valuesOf, type AddressValues } from "@/components/AddressForm";

const LabelIcon = { home: Home, work: Briefcase, other: MapPin } as const;

export function AddressManager({ initial }: { initial: Address[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<AddressValues>(emptyAddress);
  const [error, setError] = useState("");

  async function reload() {
    const res = await api<{ addresses: Address[] }>("/api/account/addresses");
    if (res.ok) setList(res.data.addresses);
  }

  function startNew() {
    setForm({ ...emptyAddress, isDefault: list.length === 0 });
    setEditing("new");
    setError("");
  }

  function startEdit(a: Address) {
    setForm(valuesOf(a));
    setEditing(a.id);
    setError("");
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
        <AddressForm key={editing} initial={form} editingId={editing === "new" ? null : editing} hasLocation={editing !== "new" && list.find((x) => x.id === editing)?.lat != null}
          onSaved={async () => { setEditing(null); await reload(); }} onCancel={() => setEditing(null)} />
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
