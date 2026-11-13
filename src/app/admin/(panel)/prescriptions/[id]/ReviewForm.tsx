"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const inp = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600";
type Item = { medicineId: string; name: string; packSize: string; maxQty: number };
type Hit = { id: string; name: string; packSize: string; manufacturer: string; status: string };

type AiMatch = { medicineId: string; name: string; packSize: string } | null;
type AiReading = {
  patientName: string; doctorName: string; doctorRegNo: string; prescribedOn: string | null;
  notes: string; legible: boolean; medicines: { text: string; match: AiMatch }[];
};

export function ReviewForm({ id, status, reviewNote, validityDays, initial, suggested, aiEnabled }: {
  id: string; status: string; reviewNote: string; validityDays: number;
  initial: { doctorName: string; patientName: string }; suggested: { medicineId: string; name: string; packSize: string; qty: number }[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState(initial.doctorName);
  const [doctorRegNo, setDoctorRegNo] = useState("");
  const [patientName, setPatientName] = useState(initial.patientName);
  const [prescribedOn, setPrescribedOn] = useState("");
  const [items, setItems] = useState<Item[]>(suggested.map((s) => ({ medicineId: s.medicineId, name: s.name, packSize: s.packSize, maxQty: s.qty })));
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const waitingOnCustomer = status === "needs_info";

  const [aiReading, setAiReading] = useState<AiReading | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  async function readWithAI() {
    setAiBusy(true); setAiError("");
    const res = await api<{ reading: AiReading }>(`/api/admin/prescriptions/${id}/ai-read`, { body: {} });
    setAiBusy(false);
    if (!res.ok) return setAiError(res.error);
    setAiReading(res.data.reading);
  }

  function addMatch(m: NonNullable<AiMatch>) {
    if (items.some((i) => i.medicineId === m.medicineId)) return;
    setItems((prev) => [...prev, { medicineId: m.medicineId, name: m.name, packSize: m.packSize, maxQty: 1 }]);
  }

  function applyAll(r: AiReading) {
    if (r.doctorName && !doctorName) setDoctorName(r.doctorName);
    if (r.doctorRegNo && !doctorRegNo) setDoctorRegNo(r.doctorRegNo);
    if (r.patientName && !patientName) setPatientName(r.patientName);
    if (r.prescribedOn && !prescribedOn) setPrescribedOn(r.prescribedOn);
    for (const med of r.medicines) if (med.match) addMatch(med.match);
  }

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    let off = false;
    const t = setTimeout(async () => {
      const res = await api<{ items: Hit[] }>(`/api/admin/inventory/medicines?q=${encodeURIComponent(q.trim())}`);
      if (!off && res.ok) setHits(res.data.items.filter((h) => !items.some((i) => i.medicineId === h.id)));
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [q, items]);

  async function submit(decision: "approve" | "reject" | "needs_info") {
    setBusy(true); setError("");
    const res = await api(`/api/admin/prescriptions/${id}/review`, {
      body: { decision, note: note.trim(), doctorName: doctorName.trim(), doctorRegNo: doctorRegNo.trim(), patientName: patientName.trim(), prescribedOn: prescribedOn || undefined, items: items.map((i) => ({ medicineId: i.medicineId, maxQty: i.maxQty })) },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Review">
      <h2 className="font-bold">Review</h2>
      {waitingOnCustomer && <p className="rounded-lg bg-orange-50 p-3 text-orange-900">Waiting for the customer to reply to: {reviewNote}. You can still reject it.</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}

      {!waitingOnCustomer && aiEnabled && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
          {!aiReading ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600">Let AI read the prescription and pre-fill the fields below. You must verify every detail against the image before approving.</p>
              <button type="button" onClick={readWithAI} disabled={aiBusy} className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {aiBusy ? "Reading…" : "✨ Read with AI"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-teal-800">AI suggestion — verify against the image. Not a medical opinion.</p>
                <button type="button" onClick={() => applyAll(aiReading)} className="shrink-0 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">Apply all to empty fields</button>
              </div>
              {!aiReading.legible && <p className="rounded-lg bg-amber-100 p-2 text-xs text-amber-900">The image was hard to read — check carefully.</p>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-700">
                {aiReading.doctorName && <><dt className="text-slate-500">Doctor</dt><dd>{aiReading.doctorName}{aiReading.doctorRegNo ? ` · Reg ${aiReading.doctorRegNo}` : ""}</dd></>}
                {aiReading.patientName && <><dt className="text-slate-500">Patient</dt><dd>{aiReading.patientName}</dd></>}
                {aiReading.prescribedOn && <><dt className="text-slate-500">Date</dt><dd>{aiReading.prescribedOn}</dd></>}
                {aiReading.notes && <><dt className="text-slate-500">Notes</dt><dd>{aiReading.notes}</dd></>}
              </dl>
              {aiReading.medicines.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600">Medicines read ({aiReading.medicines.length}):</p>
                  <ul className="mt-1 space-y-1">
                    {aiReading.medicines.map((m, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0"><span className="truncate">{m.text}</span>{m.match ? <span className="text-teal-700"> → {m.match.name}</span> : <span className="text-slate-400"> → no catalogue match</span>}</span>
                        {m.match && !items.some((it) => it.medicineId === m.match!.medicineId) && (
                          <button type="button" onClick={() => addMatch(m.match!)} className="shrink-0 rounded border border-teal-300 bg-white px-2 py-0.5 font-semibold text-teal-700 hover:bg-teal-50">Add</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {aiError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{aiError}</p>}
        </div>
      )}

      {!waitingOnCustomer && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="rv-doc" className="mb-1 block font-medium">Doctor&apos;s name</label><input id="rv-doc" className={inp} value={doctorName} maxLength={80} onChange={(e) => setDoctorName(e.target.value)} /></div>
            <div><label htmlFor="rv-reg" className="mb-1 block font-medium">Registration no.</label><input id="rv-reg" className={inp} value={doctorRegNo} maxLength={40} onChange={(e) => setDoctorRegNo(e.target.value)} /></div>
            <div><label htmlFor="rv-pat" className="mb-1 block font-medium">Patient name</label><input id="rv-pat" className={inp} value={patientName} maxLength={80} onChange={(e) => setPatientName(e.target.value)} /></div>
            <div><label htmlFor="rv-date" className="mb-1 block font-medium">Date on prescription</label><input id="rv-date" type="date" className={inp} value={prescribedOn} onChange={(e) => setPrescribedOn(e.target.value)} /></div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">Valid for {validityDays} days from that date.</p>

          <div>
            <p className="font-medium">Medicines it covers, and the most units it may supply</p>
            <ul className="mt-2 space-y-2">
              {items.length === 0 && <li className="text-slate-500">None yet. Search below.</li>}
              {items.map((i, idx) => (
                <li key={i.medicineId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.name}</span><span className="text-xs text-slate-500">{i.packSize}</span></span>
                  <input aria-label={`Most units of ${i.name}`} inputMode="numeric" className={`${inp} w-20`} value={i.maxQty} onChange={(e) => setItems(items.map((x, j) => (j === idx ? { ...x, maxQty: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} />
                  <button type="button" aria-label={`Remove ${i.name}`} onClick={() => setItems(items.filter((_, j) => j !== idx))} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">✕</button>
                </li>
              ))}
            </ul>
            <label htmlFor="rv-search" className="mt-3 block font-medium">Add a medicine</label>
            <input id="rv-search" className={inp} placeholder="Type at least 2 letters" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            {hits.length > 0 && (
              <ul className="mt-1 max-h-48 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
                {hits.map((h) => (
                  <li key={h.id}><button type="button" onClick={() => { setItems([...items, { medicineId: h.id, name: h.name, packSize: h.packSize, maxQty: 1 }]); setQ(""); setHits([]); }} className="block w-full px-3 py-2 text-left hover:bg-slate-50"><span className="font-medium">{h.name}</span> <span className="text-xs text-slate-500">{h.packSize} · {h.manufacturer}</span></button></li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div>
        <label htmlFor="rv-note" className="mb-1 block font-medium">Note <span className="font-normal text-slate-500">(the customer sees this if you reject or ask a question)</span></label>
        <textarea id="rv-note" rows={2} maxLength={300} className={inp} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {!waitingOnCustomer && <button disabled={busy} onClick={() => submit("approve")} className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>}
        {!waitingOnCustomer && <button disabled={busy || note.trim().length < 3} onClick={() => submit("needs_info")} className="rounded-xl border border-orange-300 px-4 py-2.5 font-semibold text-orange-800 hover:bg-orange-50 disabled:opacity-50">Ask the customer</button>}
        <button disabled={busy || note.trim().length < 3} onClick={() => submit("reject")} className="rounded-xl border border-rose-300 px-4 py-2.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
      </div>
      <p className="text-xs text-slate-500">Rejecting cancels any order that depends only on this prescription, puts the stock back and refunds online payments.</p>
    </section>
  );
}
