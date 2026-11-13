"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { inr, prettyDate } from "../../shared";

type Picked = { id: string; name: string; packSize: string; manufacturer: string; mrp: number; status: string; stockQty: number };
type Line = { key: number; med: Picked | null; search: string; batchNo: string; expiry: string; qty: string; free: string; mrp: string; rate: string };

const f = "w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-teal-600";
const blankLine = (key: number): Line => ({ key, med: null, search: "", batchNo: "", expiry: "", qty: "", free: "0", mrp: "", rate: "" });

/** Wholesaler bills print expiry as MM/YY. A batch is good until the end of that month. Also accepts MM/YYYY and YYYY-MM-DD. */
export function parseExpiry(input: string): string | null {
  const t = input.trim();
  let m = /^(\d{1,2})\s*[/-]\s*(\d{2}|\d{4})$/.exec(t);
  if (m) {
    const month = Number(m[1]);
    const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m && new Date(`${t}T00:00:00Z`).toISOString().startsWith(t)) return t;
  return null;
}

function MedicinePicker({ line, onPick, onClear, label }: { line: Line; onPick: (m: Picked) => void; onClear: () => void; label: string }) {
  const [text, setText] = useState(line.search);
  const [items, setItems] = useState<Picked[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (line.med || text.trim().length < 2) {
      setItems([]);
      return;
    }
    const mine = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      const res = await api<{ items: Picked[] }>(`/api/admin/inventory/medicines?q=${encodeURIComponent(text.trim())}`);
      if (mine !== seq.current) return;
      setBusy(false);
      setItems(res.ok ? res.data.items : []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [text, line.med]);

  if (line.med)
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm">
        <span><span className="font-semibold">{line.med.name}</span><span className="block text-xs text-slate-500">{line.med.manufacturer} · {line.med.packSize}</span></span>
        <button type="button" onClick={() => { onClear(); setText(""); }} className="text-xs font-semibold text-teal-700 hover:underline" aria-label={`Change ${label}`}>Change</button>
      </div>
    );
  return (
    <div className="relative">
      <input aria-label={label} className={f} value={text} onChange={(e) => { setText(e.target.value); setOpen(true); }} placeholder="Search medicine name or salt" autoComplete="off" />
      {open && text.trim().length >= 2 && (
        <ul role="listbox" aria-label={`${label} results`} className="absolute z-20 mt-1 max-h-64 w-full min-w-72 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {busy && <li className="px-3 py-2 text-xs text-slate-500">Searching…</li>}
          {!busy && items.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">No medicine found. Add it in the Catalog first.</li>}
          {items.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button type="button" onClick={() => { onPick(m); setOpen(false); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50">
                <span className="font-semibold">{m.name}</span>
                <span className="block text-xs text-slate-500">{m.manufacturer} · {m.packSize}{m.stockQty > 0 ? ` · ${m.stockQty} in stock` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PurchaseForm({ suppliers, today }: { suppliers: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(suppliers.length === 1 ? suppliers[0].id : "");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine(1)]);
  const next = useRef(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // One key per form: if the network drops after the server saved the bill, pressing Save again cannot enter it twice.
  const [idem] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`));

  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const total = lines.reduce((n, l) => n + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const units = lines.reduce((n, l) => n + (Number(l.qty) || 0) + (Number(l.free) || 0), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError("Choose the supplier.");
    if (!billNumber.trim()) return setError("Enter the bill number.");
    if (!billDate) return setError("Enter the bill date.");
    const out = [];
    for (const [i, l] of lines.entries()) {
      const row = `Line ${i + 1}`;
      if (!l.med) return setError(`${row}: choose the medicine.`);
      if (!l.batchNo.trim()) return setError(`${row}: enter the batch number.`);
      const expiry = parseExpiry(l.expiry);
      if (!expiry) return setError(`${row}: enter the expiry as MM/YY, for example 08/27.`);
      if (expiry < today) return setError(`${row}: this batch has already expired.`);
      const qty = Number(l.qty || 0);
      const free = Number(l.free || 0);
      if (!Number.isInteger(qty) || qty < 0 || !Number.isInteger(free) || free < 0 || qty + free < 1) return setError(`${row}: enter the quantity (whole units).`);
      const mrp = Number(l.mrp);
      const rate = Number(l.rate);
      if (!Number.isFinite(mrp) || mrp <= 0) return setError(`${row}: enter the MRP.`);
      if (!Number.isFinite(rate) || rate < 0) return setError(`${row}: enter the purchase rate.`);
      if (rate > mrp) return setError(`${row}: the purchase rate is higher than the MRP. Check the numbers.`);
      out.push({ medicineId: l.med.id, batchNo: l.batchNo.trim(), expiryDate: expiry, qty, freeQty: free, mrp, purchaseRate: rate });
    }
    setBusy(true);
    const res = await api<{ id: string }>("/api/admin/inventory/purchases", { body: { supplierId, billNumber: billNumber.trim(), billDate, notes: notes.trim(), idempotencyKey: idem, lines: out } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/admin/inventory/purchases/${res.data.id}`);
  }

  return (
    <form onSubmit={save} className="space-y-6" noValidate aria-label="Purchase bill">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-bold">Bill details</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="p-sup" className="mb-1 block text-sm font-medium">Supplier</label>
            <select id="p-sup" className={`${f} py-2.5`} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Choose a supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label htmlFor="p-no" className="mb-1 block text-sm font-medium">Bill number</label><input id="p-no" className={`${f} py-2.5`} value={billNumber} onChange={(e) => setBillNumber(e.target.value)} maxLength={40} /></div>
          <div><label htmlFor="p-date" className="mb-1 block text-sm font-medium">Bill date</label><input id="p-date" type="date" max={today} className={`${f} py-2.5`} value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
          <div className="sm:col-span-4"><label htmlFor="p-notes" className="mb-1 block text-sm font-medium">Notes (optional)</label><input id="p-notes" className={`${f} py-2.5`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-bold">Items on the bill</h2>
        <p className="mb-4 text-sm text-slate-500">One row per batch. Type the expiry as printed on the bill, for example <strong>08/27</strong>. The MRP is the printed MRP of the pack; the rate is what you pay per unit.</p>
        <div className="space-y-4">
          {lines.map((l, i) => {
            const exp = parseExpiry(l.expiry);
            return (
              <fieldset key={l.key} className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-500">Line {i + 1}</legend>
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <MedicinePicker line={l} label={`Medicine ${i + 1}`} onPick={(m) => patch(l.key, { med: m, mrp: l.mrp || String(m.mrp) })} onClear={() => patch(l.key, { med: null })} />
                  </div>
                  <label className="text-xs font-medium md:col-span-2">Batch no.<input className={f} value={l.batchNo} onChange={(e) => patch(l.key, { batchNo: e.target.value })} maxLength={40} aria-label={`Batch number ${i + 1}`} /></label>
                  <label className="text-xs font-medium md:col-span-2">Expiry (MM/YY)<input className={f} value={l.expiry} onChange={(e) => patch(l.key, { expiry: e.target.value })} placeholder="08/27" maxLength={10} aria-label={`Expiry ${i + 1}`} />
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{exp ? `Good until ${prettyDate(exp)}` : " "}</span></label>
                  <label className="text-xs font-medium md:col-span-1">Qty<input className={f} inputMode="numeric" value={l.qty} onChange={(e) => patch(l.key, { qty: e.target.value })} aria-label={`Quantity ${i + 1}`} /></label>
                  <label className="text-xs font-medium md:col-span-1">Free<input className={f} inputMode="numeric" value={l.free} onChange={(e) => patch(l.key, { free: e.target.value })} aria-label={`Free quantity ${i + 1}`} /></label>
                  <label className="text-xs font-medium md:col-span-1">MRP ₹<input className={f} inputMode="decimal" value={l.mrp} onChange={(e) => patch(l.key, { mrp: e.target.value })} aria-label={`MRP ${i + 1}`} /></label>
                  <label className="text-xs font-medium md:col-span-1">Rate ₹<input className={f} inputMode="decimal" value={l.rate} onChange={(e) => patch(l.key, { rate: e.target.value })} aria-label={`Rate ${i + 1}`} /></label>
                </div>
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline" aria-label={`Remove line ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /> Remove line</button>
                )}
              </fieldset>
            );
          })}
        </div>
        {lines.length < 200 && (
          <button type="button" onClick={() => setLines((ls) => [...ls, blankLine(next.current++)])} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Plus className="h-4 w-4" /> Add another item</button>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm"><span className="text-slate-500">{lines.length} line(s), {units} unit(s) · Total before tax </span><span className="text-lg font-bold">{inr.format(total)}</span></p>
        <button disabled={busy} className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : "Save bill and add stock"}</button>
      </div>
    </form>
  );
}
