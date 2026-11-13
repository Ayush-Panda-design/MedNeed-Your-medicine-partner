"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Check, Phone, ShieldCheck, Truck } from "lucide-react";
import { TRACK_STEPS, dateTime } from "@/lib/orderStatus";

type Ev = { status: string; at: string };
type Props = {
  status: string; fulfilment: string; events: Ev[];
  partnerName: string | null; partnerPhone: string | null; deliveryCode: string | null; collectAmount: string | null; attempts: number;
};

/** Progress bar for an order that is still moving. Refreshes itself while the page is open so the customer sees changes without reloading. */
export function OrderTracker({ status, fulfilment, events, partnerName, partnerPhone, deliveryCode, collectAmount, attempts }: Props) {
  const router = useRouter();
  const live = ["confirmed", "packed", "out_for_delivery"].includes(status);

  useEffect(() => {
    if (!live) return;
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const t = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [live, router]);

  if (!["confirmed", "packed", "out_for_delivery", "delivered"].includes(status)) return null;
  const steps = TRACK_STEPS(fulfilment);
  const current = steps.findIndex((s) => s.key === status);
  const when = (key: string) => {
    const e = [...events].reverse().find((x) => x.status === key);
    return e ? dateTime(e.at) : null;
  };

  return (
    <section aria-label="Order tracking" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <ol className="flex items-start">
        {steps.map((s, i) => {
          const done = i < current || status === "delivered";
          const active = i === current && status !== "delivered";
          return (
            <li key={s.key} aria-current={active ? "step" : undefined} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span aria-hidden className={`absolute right-1/2 top-[15px] h-0.5 w-full ${i <= current || status === "delivered" ? "bg-teal-500" : "bg-slate-200"}`} />}
              <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${done ? "border-teal-500 bg-teal-500 text-white" : active ? "mn-pulse border-teal-500 bg-white text-teal-700 ring-4 ring-teal-100" : "border-slate-200 bg-white text-slate-400"}`}>
                {done ? <Check className="h-4 w-4" /> : active && s.key === "out_for_delivery" ? <Truck className="mn-truck h-4 w-4" /> : i + 1}
              </span>
              <span className={`mt-2 text-xs font-semibold ${done || active ? "text-slate-900" : "text-slate-400"}`}>{s.label}</span>
              <span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{done || active ? when(s.key) : ""}</span>
            </li>
          );
        })}
      </ol>

      {attempts > 0 && status === "packed" && fulfilment === "delivery" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">We could not deliver your order the last time. We will contact you to arrange another delivery.</p>
      )}

      {status === "out_for_delivery" && deliveryCode && (
        <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-950">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Your delivery code</p>
          <p aria-label={`Delivery code ${deliveryCode.split("").join(" ")}`} className="mt-2 font-mono text-4xl font-bold tracking-[0.3em]">{deliveryCode}</p>
          <p className="mt-2 text-violet-900">Tell this code to the delivery person only when you have your order in hand. Never share it by phone or message.</p>
          {collectAmount && <p className="mt-1 font-semibold">Please keep {collectAmount} ready.</p>}
          {partnerName && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-violet-200 pt-3">
              <span>Delivering: <strong>{partnerName}</strong></span>
              {partnerPhone && <a href={`tel:+91${partnerPhone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100"><Phone className="h-4 w-4" /> Call {partnerPhone}</a>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
