"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Clock, X } from "lucide-react";

type Reminder = { id: string; slug: string; name: string; intervalDays: number; remindAt: string; status: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function RemindersManager({ initial, optout: initialOptout }: { initial: Reminder[]; optout: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [optout, setOptout] = useState(initialOptout);

  async function act(id: string, action: "cancel" | "snooze", days?: number) {
    setBusy(id + action);
    try {
      await fetch(`/api/account/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, days }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleOptout(next: boolean) {
    setOptout(next);
    await fetch("/api/account/reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optout: next }) });
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Refill reminders</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={!optout} onChange={(e) => toggleOptout(!e.target.checked)} className="h-4 w-4 accent-teal-600" />
          Remind me to refill my regular medicines
        </label>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        We send a friendly nudge when a long-term medicine you ordered is likely running low, so you can reorder in time. These are reminders only — not medical advice.
      </p>

      {initial.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BellRing className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold">No reminders yet</p>
          <p className="mt-1 text-sm text-slate-500">When you order a regular medicine, a refill reminder will appear here.</p>
          <Link href="/medicines" className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline">Browse medicines</Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {initial.map((r) => {
            const notified = r.status === "notified";
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="min-w-0">
                  <Link href={`/medicines/${r.slug}`} className="font-semibold hover:text-teal-700">{r.name}</Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {notified ? "Reminder sent" : `Next nudge around ${fmt(r.remindAt)}`} · every ~{r.intervalDays} days
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => act(r.id, "snooze", 14)}
                    disabled={busy === r.id + "snooze"}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Remind later
                  </button>
                  {!notified && (
                    <button
                      onClick={() => act(r.id, "cancel")}
                      disabled={busy === r.id + "cancel"}
                      aria-label="Cancel reminder"
                      className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
