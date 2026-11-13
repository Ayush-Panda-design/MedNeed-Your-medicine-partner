"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { api } from "@/lib/api";

type Result = { examined: number; assigned: Record<string, number>; left: number; flaggedNoOnlineSale: number };

export function AutoCategorise({ uncategorised }: { uncategorised: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const res = await api<Result>("/api/admin/catalog/autocategorise", { body: {} });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setResult(res.data);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          <b>{uncategorised.toLocaleString("en-IN")}</b> draft medicine{uncategorised === 1 ? " is" : "s are"} not in a section yet. Sorting uses each product&apos;s active ingredients and form, and leaves anything unclear for you to place.
        </p>
        <button onClick={run} disabled={busy || uncategorised === 0} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Sort into sections
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-rose-700">{error}</p>}
      {result && (
        <p role="status" className="mt-3 text-emerald-800">
          Sorted {(result.examined - result.left).toLocaleString("en-IN")} of {result.examined.toLocaleString("en-IN")}. {result.left.toLocaleString("en-IN")} left for manual review.
          {result.flaggedNoOnlineSale > 0 && ` ${result.flaggedNoOnlineSale.toLocaleString("en-IN")} contain possible narcotic or psychotropic ingredients and were marked "never sold online" until a pharmacist clears them.`}
        </p>
      )}
    </div>
  );
}
