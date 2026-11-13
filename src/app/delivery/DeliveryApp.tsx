"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin, Navigation, Phone, RefreshCw, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { FAIL_REASON_LABEL } from "@/lib/orderStatus";

type Job = { id: string; orderNumber: string; customerName: string; phone: string; address: string; mapUrl: string; total: number; collect: boolean; note: string; slotWindow: string | null; itemCount: number; locked: boolean };
type Work = { orders: Job[]; deliveredToday: number; cashToday: number };

export function DeliveryApp({ name, initial }: { name: string; initial: Work }) {
  const [work, setWork] = useState(initial);
  const [open, setOpen] = useState<{ id: string; mode: "deliver" | "fail" } | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (busyRef.current) return;
    setLoading(true);
    const res = await api<Work>("/api/delivery/orders");
    setLoading(false);
    if (res.ok) setWork(res.data);
  }, []);

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible" && !open) void load(); }, 30_000);
    return () => clearInterval(t);
  }, [load, open]);

  async function finished(text: string) {
    setOpen(null);
    setMessage(text);
    busyRef.current = false;
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div><h1 className="text-xl font-bold">Hello, {name.split(" ")[0]}</h1><p className="text-sm text-slate-600">{work.orders.length ? `${work.orders.length} to deliver` : "Nothing to deliver right now"}</p></div>
        <button onClick={() => void load()} aria-label="Refresh" className="rounded-full bg-white p-2.5 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"><RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><p className="text-2xl font-bold">{work.deliveredToday}</p><p className="text-xs text-slate-500">Delivered today</p></div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><p className="text-2xl font-bold">{formatINR(work.cashToday)}</p><p className="text-xs text-slate-500">Cash collected today</p></div>
      </div>

      {message && <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}</p>}

      {work.orders.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">New orders appear here when the shop sends them with you.</p>
      ) : (
        <ul className="space-y-3">
          {work.orders.map((o) => (
            <li key={o.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-lg font-bold">{o.customerName}</p><p className="text-xs text-slate-500">Order {o.orderNumber} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}{o.slotWindow ? ` · ${o.slotWindow.replace("-", " – ")}` : ""}</p></div>
                  {o.collect ? <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-900">Collect {formatINR(o.total)}</span> : <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800">Paid</span>}
                </div>
                <p className="flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {o.address}</p>
                {o.note && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Note: {o.note}</p>}
                {o.locked && <p className="rounded-lg bg-rose-50 p-2 text-sm font-medium text-rose-800">Too many wrong codes. Please call the shop for a new code.</p>}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a href={o.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-3 text-sm font-semibold text-white hover:bg-sky-700"><Navigation className="h-4 w-4" /> Navigate</a>
                  <a href={`tel:+91${o.phone}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-900"><Phone className="h-4 w-4" /> Call</a>
                </div>
                {open?.id !== o.id && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setMessage(""); setOpen({ id: o.id, mode: "deliver" }); }} disabled={o.locked} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Delivered</button>
                    <button onClick={() => { setMessage(""); setOpen({ id: o.id, mode: "fail" }); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 px-3 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><XCircle className="h-4 w-4" /> Could not deliver</button>
                  </div>
                )}
              </div>
              {open?.id === o.id && open.mode === "deliver" && <DeliverForm job={o} onCancel={() => setOpen(null)} onDone={() => finished(`Order ${o.orderNumber} delivered. Well done!`)} />}
              {open?.id === o.id && open.mode === "fail" && <FailForm job={o} onCancel={() => setOpen(null)} onDone={() => finished(`Order ${o.orderNumber} sent back to the shop.`)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeliverForm({ job, onCancel, onDone }: { job: Job; onCancel: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [cash, setCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await api(`/api/delivery/orders/${job.id}/deliver`, { body: { code, cashCollected: cash } });
    setBusy(false);
    if (!res.ok) { setCode(""); return setError(res.error); }
    onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-3 border-t border-slate-200 bg-emerald-50 p-4">
      <label htmlFor={`code-${job.id}`} className="block text-sm font-semibold">Ask the customer for their 4-digit code</label>
      <input id={`code-${job.id}`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{4}" maxLength={4} autoFocus aria-describedby={error ? `code-err-${job.id}` : undefined}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.5em] outline-none focus:border-emerald-600" />
      {job.collect && <label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm font-semibold"><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="mt-0.5 h-5 w-5 accent-emerald-600" /> I collected {formatINR(job.total)} from the customer</label>}
      {error && <p id={`code-err-${job.id}`} role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold">Back</button>
        <button disabled={busy || code.length !== 4 || (job.collect && !cash)} className="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Checking…" : "Confirm delivery"}</button>
      </div>
    </form>
  );
}

function FailForm({ job, onCancel, onDone }: { job: Job; onCancel: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("not_reachable");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await api(`/api/delivery/orders/${job.id}/fail`, { body: { reason, note } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-3 border-t border-slate-200 bg-rose-50 p-4">
      <label htmlFor={`why-${job.id}`} className="block text-sm font-semibold">Why could it not be delivered?</label>
      <select id={`why-${job.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
        {Object.entries(FAIL_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label htmlFor={`note-${job.id}`} className="sr-only">Note</label>
      <input id={`note-${job.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Add a note (optional)" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm" />
      {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold">Back</button>
        <button disabled={busy} className="rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? "Saving…" : "Send back to shop"}</button>
      </div>
    </form>
  );
}
