"use client";

import { useState } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { CSV_OPTIONAL_COLUMNS, CSV_REQUIRED_COLUMNS, CSV_TEMPLATE_EXAMPLE, CSV_TEMPLATE_HEADER, formatINRExact } from "@/lib/catalog";

type Report = {
  ok: boolean; imported: boolean; total: number; create: number; update: number;
  errors: { row: number; message: string }[]; warnings: string[];
  preview: { row: number; name: string; manufacturer: string; schedule: string; mrp: number; price: number; action: "create" | "update" }[];
};

const MAX_BYTES = 3 * 1024 * 1024;
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function ImportTool() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [checkedCsv, setCheckedCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    setReport(null);
    setError("");
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("The file is larger than 3 MB. Split it into smaller files.");
    setCsv(await file.text());
    setFileName(file.name);
  }

  async function run(commit: boolean) {
    setBusy(true);
    setError("");
    const res = await api<Report>("/api/admin/catalog/import", { body: { csv, commit } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setReport(res.data);
    if (!commit) setCheckedCsv(csv);
  }

  function template() {
    const text = [CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "medneed-import-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const canImport = report?.ok && !report.imported && checkedCsv === csv && csv !== "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-teal-500">
            <FileUp className="h-8 w-8 text-slate-400" />
            <span className="font-semibold">{fileName || "Choose a CSV file"}</span>
            <span className="text-xs text-slate-500">UTF-8 CSV, up to 3 MB and 5,000 rows</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={busy || !csv} onClick={() => run(false)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Check file
            </button>
            <button disabled={busy || !canImport} onClick={() => run(true)} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              Import {report?.ok && !report.imported ? `${report.create + report.update} rows` : ""}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Always check first. The import is all-or-nothing: if any row has an error, nothing is saved.</p>
        </section>

        {report && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
            {report.imported ? (
              <p className="rounded-lg bg-emerald-50 p-3 font-semibold text-emerald-800">Imported {report.create} new and updated {report.update} existing medicines as drafts. Review and verify them in the catalog.</p>
            ) : report.ok ? (
              <p className="rounded-lg bg-emerald-50 p-3 font-semibold text-emerald-800">No problems found: {report.create} to create, {report.update} to update.</p>
            ) : (
              <p className="rounded-lg bg-rose-50 p-3 font-semibold text-rose-800">{report.errors.length} problem{report.errors.length === 1 ? "" : "s"} found. Nothing was imported.</p>
            )}
            {report.warnings.map((w) => <p key={w} className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{w}</p>)}
            {report.errors.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-4">Line</th><th className="py-2">Problem</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.errors.slice(0, 100).map((e, i) => <tr key={i}><td className="py-2 pr-4 font-mono">{e.row || "-"}</td><td className="py-2">{e.message}</td></tr>)}
                  </tbody>
                </table>
                {report.errors.length > 100 && <p className="mt-2 text-xs text-slate-500">Showing the first 100 problems.</p>}
              </div>
            )}
            {report.ok && report.preview.length > 0 && !report.imported && (
              <div className="mt-4 overflow-x-auto">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Preview (first {report.preview.length})</p>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {report.preview.map((p) => (
                      <tr key={p.row}>
                        <td className="py-2 pr-3 font-mono text-xs text-slate-400">{p.row}</td>
                        <td className="py-2 pr-3"><span className="font-medium">{p.name}</span><span className="block text-xs text-slate-500">{p.manufacturer}</span></td>
                        <td className="py-2 pr-3">{p.schedule}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatINRExact(p.price)} <span className="text-xs text-slate-400">/ {formatINRExact(p.mrp)}</span></td>
                        <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.action === "create" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{p.action}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <button onClick={template} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold hover:bg-slate-50"><Download className="h-4 w-4" /> Download template</button>
        <div>
          <h2 className="font-bold">Required columns</h2>
          <p className="mt-1 font-mono text-xs leading-6 text-slate-600">{CSV_REQUIRED_COLUMNS.join(", ")}</p>
        </div>
        <div>
          <h2 className="font-bold">Optional columns</h2>
          <p className="mt-1 font-mono text-xs leading-6 text-slate-600">{CSV_OPTIONAL_COLUMNS.join(", ")}</p>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-slate-600">
          <li><strong>schedule</strong> must be OTC, H, H1 or X. It is never guessed.</li>
          <li><strong>category</strong> is a category slug or name that already exists.</li>
          <li><strong>composition</strong> looks like <span className="font-mono text-xs">Amoxycillin (500mg) + Clavulanic Acid (125mg)</span>.</li>
          <li>Separate list values (uses, side effects) with <span className="font-mono">|</span>.</li>
          <li>A row with the same name, manufacturer and pack size as an existing medicine updates it. Blank optional cells never erase existing content.</li>
          <li>Images are not imported. Upload them on each medicine.</li>
        </ul>
      </aside>
    </div>
  );
}
