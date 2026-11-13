"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { ACCEPT, MAX_FILES, MAX_FILE_MB } from "@/lib/prescriptionStatus";

const field = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

/** Picks photos/PDFs and uploads them. Used on the upload page and inline at checkout. */
export function PrescriptionUploader({ onUploaded, submitLabel = "Upload prescription" }: { onUploaded: (id: string) => void; submitLabel?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    if (next.length > MAX_FILES) return setError(`You can upload at most ${MAX_FILES} files.`);
    const big = next.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (big) return setError(`${big.name} is larger than ${MAX_FILE_MB} MB.`);
    setError("");
    setFiles(next);
    if (input.current) input.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return setError("Choose a photo or PDF of the prescription.");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      form.append("patientName", patientName);
      form.append("doctorName", doctorName);
      form.append("note", note);
      const res = await fetch("/api/prescriptions", { method: "POST", body: form, cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBusy(false);
        return setError(data.error ?? "The upload failed. Please try again.");
      }
      setFiles([]); setPatientName(""); setDoctorName(""); setNote("");
      setBusy(false);
      onUploaded(data.id as string);
    } catch {
      setBusy(false);
      setError("Network problem. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Upload a prescription">
      <div>
        <label htmlFor="rx-files" className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-teal-400">
          <UploadCloud className="h-8 w-8 text-teal-600" />
          <span className="font-semibold">Choose photos or a PDF</span>
          <span className="text-xs text-slate-500">JPEG, PNG, WebP or PDF · up to {MAX_FILES} files · {MAX_FILE_MB} MB each</span>
        </label>
        <input id="rx-files" ref={input} type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => pick(e.target.files)} />
        {files.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{f.name}</span><span className="shrink-0 text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(1)} MB</span></span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="rx-patient" className="text-sm font-medium">Patient name <span className="font-normal text-slate-500">(optional)</span></label><input id="rx-patient" className={`${field} mt-1.5`} maxLength={80} value={patientName} onChange={(e) => setPatientName(e.target.value)} /></div>
        <div><label htmlFor="rx-doctor" className="text-sm font-medium">Doctor&apos;s name <span className="font-normal text-slate-500">(optional)</span></label><input id="rx-doctor" className={`${field} mt-1.5`} maxLength={80} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} /></div>
      </div>
      <div><label htmlFor="rx-note" className="text-sm font-medium">Message for the pharmacist <span className="font-normal text-slate-500">(optional)</span></label><textarea id="rx-note" rows={2} maxLength={300} className={`${field} mt-1.5`} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <p className="text-xs text-slate-500">Make sure the doctor&apos;s name, the date and every medicine are clearly visible. Only you and our pharmacists can see your prescription.</p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <button type="submit" disabled={busy || files.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Uploading…" : submitLabel}
      </button>
    </form>
  );
}
