"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const field = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function PrescriptionActions({ id, status, canRemove }: { id: string; status: string; canRemove: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = status === "pending" || status === "needs_info";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const form = new FormData();
    for (const f of files) form.append("files", f);
    form.append("note", note);
    const res = await fetch(`/api/prescriptions/${id}/files`, { method: "POST", body: form, cache: "no-store" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) return setError(data.error ?? "Network problem. Please try again.");
    setFiles([]); setNote(""); if (input.current) input.current.value = "";
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this prescription? The files will be deleted.")) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/prescriptions/${id}`, { method: "DELETE", cache: "no-store" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) return setError(data.error ?? "Network problem. Please try again.");
    router.replace("/account/prescriptions");
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Actions">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
      {open && (
        <form onSubmit={send} className="space-y-3">
          <h3 className="font-bold">{status === "needs_info" ? "Reply to the pharmacist" : "Add more pages or a message"}</h3>
          <input ref={input} type="file" aria-label="More files" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />
          <textarea aria-label="Message" rows={2} maxLength={300} placeholder="Message (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          <button type="submit" disabled={busy || (files.length === 0 && note.trim().length < 2)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Send to pharmacist</button>
        </form>
      )}
      {status !== "withdrawn" && canRemove && <button type="button" onClick={remove} disabled={busy} className="rounded-xl border border-rose-300 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Remove this prescription</button>}
    </section>
  );
}
