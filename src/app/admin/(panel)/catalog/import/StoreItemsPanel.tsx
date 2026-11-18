"use client";

import { useState } from "react";
import { Loader2, Store } from "lucide-react";
import { api } from "@/lib/api";

type Report = {
  committed: boolean; totalInFile: number; alreadyInCatalogue: number; alreadyAddedBefore: number; toAdd: number; added: number;
  bySection: Record<string, number>; unsorted: number; newSections: string[];
  sample: { name: string; company: string; section: string }[];
};

export function StoreItemsPanel({ items }: { items: number }) {
  const [report, setReport] = useState<Report | null>(null);
  const [previewed, setPreviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(commit: boolean) {
    setBusy(true);
    setError("");
    const res = await api<Report>("/api/admin/catalog/store-items", { body: { commit } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setReport(res.data);
    if (!commit) setPreviewed(true);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Store className="h-5 w-5" /></span>
        <div>
          <h2 className="font-bold">Add the store&apos;s own product list</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {items.toLocaleString("en-IN")} items from the billing software&apos;s stock-settings report (name, company, form). They are added as <strong>catalogue-only</strong> listings in the right section:
            customers see them and can ask the store to source them, but there is no price or cart button until real MRP, stock and a prescription type are entered.
            Items already in the catalogue are skipped, and running it again adds nothing twice. <strong>Preview first</strong>: nothing is saved by the preview.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => run(false)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Preview (saves nothing)
        </button>
        <button disabled={busy || !previewed || report?.committed} onClick={() => run(true)} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          Add to catalogue
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {report && (
        <div className="mt-4 space-y-3 text-sm" aria-live="polite">
          {report.committed ? (
            <p className="rounded-lg bg-emerald-50 p-3 font-semibold text-emerald-800">Added {report.added.toLocaleString("en-IN")} items. They now appear in their sections on the store.</p>
          ) : (
            <p className="rounded-lg bg-sky-50 p-3 text-sky-900">Preview only: nothing was saved. {report.toAdd.toLocaleString("en-IN")} items would be added.</p>
          )}
          <ul className="grid gap-2 sm:grid-cols-4">
            <li className="rounded-lg bg-slate-50 p-3"><b className="block text-lg">{report.totalInFile.toLocaleString("en-IN")}</b> in the list</li>
            <li className="rounded-lg bg-slate-50 p-3"><b className="block text-lg">{(report.alreadyInCatalogue + report.alreadyAddedBefore).toLocaleString("en-IN")}</b> already in the catalogue</li>
            <li className="rounded-lg bg-slate-50 p-3"><b className="block text-lg">{report.toAdd.toLocaleString("en-IN")}</b> {report.committed ? "new" : "to add"}</li>
            <li className="rounded-lg bg-amber-50 p-3"><b className="block text-lg">{report.unsorted.toLocaleString("en-IN")}</b> left in Uncategorised for a person to place</li>
          </ul>
          {report.newSections.length > 0 && <p>New sections {report.committed ? "created" : "that would be created"}: <b>{report.newSections.join(", ")}</b>.</p>}
          <div>
            <p className="mb-1 font-semibold">By section</p>
            <ul className="flex flex-wrap gap-2">
              {Object.entries(report.bySection).sort((a, b) => b[1] - a[1]).map(([slug, n]) => (
                <li key={slug} className="rounded-full border border-slate-200 px-3 py-1 text-xs"><code>{slug}</code> · {n.toLocaleString("en-IN")}</li>
              ))}
            </ul>
          </div>
          {report.sample.length > 0 && (
            <details>
              <summary className="cursor-pointer font-semibold">Sample of sorted items</summary>
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {report.sample.map((s, i) => (
                  <li key={i} className="flex justify-between gap-3 px-3 py-2 text-xs"><span className="truncate">{s.name} <span className="text-slate-400">· {s.company}</span></span><code>{s.section}</code></li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
