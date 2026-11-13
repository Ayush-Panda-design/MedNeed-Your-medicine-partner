"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const STATUSES = [["new", "New"], ["contacted", "Contacted"], ["fulfilled", "Fulfilled"], ["cancelled", "Cancelled"]] as const;

export function RequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(next: string) {
    setBusy(true);
    setError("");
    const res = await api(`/api/admin/catalog/requests/${id}`, { method: "PATCH", body: { status: next } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }
  return (
    <div>
      <select aria-label="Request status" value={status} disabled={busy} onChange={(e) => void change(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
        {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
