"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { payForOrder } from "@/lib/razorpay-client";

export function PayNow({ orderId, total, expiresAt }: { orderId: string; total: string; expiresAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    const r = await payForOrder(orderId);
    setBusy(false);
    if (r.ok) return router.replace(`/account/orders/${orderId}?paid=1`);
    if (!r.dismissed) setError(r.error);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-label="Payment">
      <p className="font-semibold text-amber-900">Payment is pending</p>
      <p className="mt-1 text-sm text-amber-900">We are holding your medicines{expiresAt ? ` until ${new Date(expiresAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}` : ""}. Pay {total} to confirm the order.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-white p-3 text-sm text-rose-700">{error}</p>}
      <button type="button" onClick={pay} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-70">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Pay {total}
      </button>
    </section>
  );
}
