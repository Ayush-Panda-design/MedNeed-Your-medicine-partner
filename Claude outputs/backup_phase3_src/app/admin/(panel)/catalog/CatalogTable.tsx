"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatINRExact } from "@/lib/catalog";
import { DataBadge, ScheduleBadge, StatusBadge } from "./badges";

export type AdminRow = {
  id: string; name: string; composition: string; manufacturer: string; categoryName: string; schedule: string;
  mrp: number; price: number; status: string; dataStatus: string; inStock: boolean; noOnlineSale: boolean;
};

type Result = { done: string[]; failed: { id: string; error: string }[] };

export function CatalogTable({ rows, canBulk }: { rows: AdminRow[]; canBulk: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; details?: string[] } | null>(null);

  const allOn = rows.length > 0 && sel.length === rows.length;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const nameOf = (id: string) => rows.find((r) => r.id === id)?.name ?? id;

  async function run(action: "verify" | "publish" | "unpublish" | "list" | "unlist") {
    setBusy(true);
    setMessage(null);
    const res = await api<Result>("/api/admin/catalog/medicines/bulk", { body: { ids: sel, action } });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.error });
    const { done, failed } = res.data;
    setMessage({
      ok: failed.length === 0,
      text: `${done.length} updated${failed.length ? `, ${failed.length} not changed` : ""}.`,
      details: failed.map((f) => f.error.startsWith(nameOf(f.id)) ? f.error : `${nameOf(f.id)}: ${f.error}`),
    });
    setSel([]);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canBulk && sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm">
          <span className="font-semibold">{sel.length} selected</span>
          <button disabled={busy} onClick={() => run("verify")} className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60">Mark verified</button>
          <button disabled={busy} onClick={() => run("publish")} className="rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">Publish</button>
          <button disabled={busy} onClick={() => run("list")} className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60">Show in catalog</button>
          <button disabled={busy} onClick={() => run("unpublish")} className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60">Unpublish</button>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          <p className="w-full text-xs text-slate-600">Verifying confirms the name, composition, schedule and pack details are correct. Only verified medicines can be published.</p>
        </div>
      )}
      {message && (
        <div role="status" className={`rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          <p className="font-semibold">{message.text}</p>
          {message.details && message.details.length > 0 && <ul className="mt-1 list-disc pl-5">{message.details.map((d) => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {canBulk && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Select all on this page" checked={allOn} onChange={() => setSel(allOn ? [] : rows.map((r) => r.id))} className="accent-teal-600" />
                </th>
              )}
              <th className="px-4 py-3">Medicine</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Rx</th>
              <th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No medicines found.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                {canBulk && (
                  <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.includes(r.id)} onChange={() => toggle(r.id)} className="accent-teal-600" /></td>
                )}
                <td className="px-4 py-3">
                  <Link href={`/admin/catalog/${r.id}`} className="font-semibold text-slate-900 hover:text-teal-700">{r.name}</Link>
                  <p className="text-xs text-slate-500">{r.manufacturer}{r.composition ? ` · ${r.composition}` : ""}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.categoryName}</td>
                <td className="px-4 py-3"><ScheduleBadge value={r.schedule} />{r.noOnlineSale && <span className="ml-1 rounded bg-rose-600 px-1.5 py-0.5 text-xs font-bold text-white">No online sale</span>}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <p className="font-semibold">{formatINRExact(r.price)}</p>
                  {r.price < r.mrp && <p className="text-xs text-slate-400 line-through">{formatINRExact(r.mrp)}</p>}
                </td>
                <td className="px-4 py-3"><StatusBadge value={r.status} />{!r.inStock && <p className="mt-1 text-xs text-rose-600">Out of stock</p>}</td>
                <td className="px-4 py-3"><DataBadge value={r.dataStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
