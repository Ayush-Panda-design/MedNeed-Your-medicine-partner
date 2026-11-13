"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { PrescriptionUploader } from "@/components/PrescriptionUploader";
import { api } from "@/lib/api";
import { RX_LABEL, RX_STYLE, rxState } from "@/lib/prescriptionStatus";
import type { PrescriptionHint } from "@/lib/useQuote";
import type { PrescriptionSummary } from "@/server/prescriptions/service";

type CartRx = { slug: string; name: string; qty: number };

/** Checkout step for prescription medicines: pick prescriptions you already have, or upload one right here. */
export function PrescriptionPicker({ cartRx, selected, onChange, hint }: { cartRx: CartRx[]; selected: string[]; onChange: (ids: string[]) => void; hint?: PrescriptionHint }) {
  const [list, setList] = useState<PrescriptionSummary[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const auto = useRef(false);

  const load = useCallback(async () => {
    const res = await api<{ items: PrescriptionSummary[] }>("/api/prescriptions");
    if (!res.ok) return setError(res.error);
    setList(res.data.items);
    return res.data.items;
  }, []);

  useEffect(() => {
    load().then((items) => {
      if (!items || auto.current) return;
      auto.current = true;
      // Start with the prescriptions that already cover something in the cart.
      const slugs = new Set(cartRx.map((c) => c.slug));
      const usable = items.filter((p) => p.status === "approved" && !p.expired && p.items.some((i) => slugs.has(i.slug) && i.remaining > 0));
      const waiting = items.filter((p) => p.status === "pending").slice(0, 1);
      const pick = (usable.length ? usable : waiting).map((p) => p.id);
      if (pick.length && selected.length === 0) onChange(pick);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const visible = (list ?? []).filter((p) => (p.status === "approved" && !p.expired) || p.status === "pending" || p.status === "needs_info");
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id].slice(0, 5));

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-5" aria-label="Prescription">
      <h2 className="flex items-center gap-2 font-bold"><ShieldAlert className="h-5 w-5 text-amber-600" /> Prescription</h2>
      <p className="mt-1 text-sm text-slate-600">
        Your cart has {cartRx.map((c) => c.name).join(", ")}. {cartRx.length === 1 ? "It needs" : "These need"} a doctor&apos;s prescription. Choose one you have uploaded, or upload it now.
      </p>

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {list === null && !error && <p className="mt-3 text-sm text-slate-500" aria-busy="true">Loading your prescriptions…</p>}

      {visible.length > 0 && (
        <ul className="mt-3 space-y-2">
          {visible.map((p) => {
            const st = rxState(p);
            const relevant = p.items.filter((i) => cartRx.some((c) => c.slug === i.slug));
            return (
              <li key={p.id}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected.includes(p.id) ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="mt-1 accent-teal-600" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.doctorName ? `Dr ${p.doctorName.replace(/^dr\.?\s*/i, "")}` : "Prescription"}{p.patientName ? ` · ${p.patientName}` : ""}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RX_STYLE[st] ?? ""}`}>{RX_LABEL[st] ?? st}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">Uploaded {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{p.validUntil ? ` · valid until ${p.validUntil}` : ""}</span>
                    {relevant.length > 0 && <span className="mt-1 block text-xs text-slate-600">{relevant.map((i) => `${i.name}: ${i.remaining} left`).join(" · ")}</span>}
                    {p.status !== "approved" && <span className="mt-1 block text-xs text-amber-800">{p.status === "needs_info" ? "The pharmacist asked you a question. Reply from My prescriptions." : "Waiting for pharmacist review. We will hold your order until it is verified."}</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {hint?.required && hint.state === "none" && <p role="alert" className="mt-3 text-sm text-rose-700">Choose or upload a prescription to place this order.</p>}
      {hint?.required && hint.state === "short" && <p role="alert" className="mt-3 text-sm text-rose-700">{hint.message} Reduce the quantity, add another prescription, or upload a new one.</p>}
      {hint?.required && hint.state === "pending" && <p role="status" className="mt-3 text-sm text-amber-800">A pharmacist will verify this before your order is packed. If it is not accepted, the order is cancelled and any payment refunded.</p>}
      {hint?.required && hint.state === "verified" && <p role="status" className="mt-3 text-sm text-emerald-700">Your approved prescription covers this order.</p>}

      <div className="mt-4">
        {uploading ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <PrescriptionUploader submitLabel="Upload and use for this order" onUploaded={async (id) => { await load(); onChange([...selected.filter((x) => x !== id), id].slice(-5)); setUploading(false); }} />
            <button type="button" onClick={() => setUploading(false)} className="mt-3 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setUploading(true)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Upload a new prescription</button>
            <Link href="/account/prescriptions" className="text-sm text-teal-700 hover:underline">Manage my prescriptions</Link>
          </div>
        )}
      </div>
    </section>
  );
}
