"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function RetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <>
      <button disabled={busy} onClick={async () => { setBusy(true); setErr(""); const r = await api(`/api/admin/notifications/${id}/retry`, { body: {} }); setBusy(false); if (!r.ok) return setErr(r.error); router.refresh(); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60">{busy ? "Queuing…" : "Send again"}</button>
      {err && <span role="alert" className="block text-xs text-rose-700">{err}</span>}
    </>
  );
}
