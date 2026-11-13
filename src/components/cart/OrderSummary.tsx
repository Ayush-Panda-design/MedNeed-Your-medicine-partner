"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Lock, PillBottle, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import { AnimatedNumber } from "./AnimatedNumber";
import "./cart.css";

type Props = {
  mrpTotal: number;
  savings: number;
  /** Undefined while the server quote is still loading. */
  deliveryFee: number | undefined;
  total: number;
  signedIn: boolean;
  /** True when the server reports a problem with a line, so checkout is blocked. */
  blocked: boolean;
  onClear: () => void;
};

function Cta({ signedIn, blocked, className = "" }: { signedIn: boolean; blocked: boolean; className?: string }) {
  return signedIn ? (
    <Link
      href="/checkout"
      aria-disabled={blocked}
      className={`mc-cta block w-full rounded-xl py-3.5 text-center font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${blocked ? "pointer-events-none bg-slate-400" : "bg-gradient-to-r from-teal-700 to-teal-600"} ${className}`}
    >
      Proceed to checkout
    </Link>
  ) : (
    <Link
      href="/login?next=/checkout"
      className={`mc-cta block w-full rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 py-3.5 text-center font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${className}`}
    >
      Sign in to continue
    </Link>
  );
}

export function OrderSummary({ mrpTotal, savings, deliveryFee, total, signedIn, blocked, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <aside className="mc-in h-fit rounded-card border border-line bg-surface p-6 lg:sticky lg:top-44" style={{ animationDelay: "140ms", boxShadow: "var(--mc-shadow-3)" }}>
      <h2 className="text-lg font-bold">Order summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-slate-600">Total MRP</dt><dd className="tabular-nums"><AnimatedNumber value={mrpTotal} format={formatINR} /></dd></div>
        {savings > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd className="tabular-nums">− <AnimatedNumber value={savings} format={formatINR} /></dd></div>}
        <div className="flex justify-between"><dt className="text-slate-600">Delivery</dt><dd>{deliveryFee === undefined ? "…" : deliveryFee === 0 ? <span className="font-semibold text-emerald-700">FREE</span> : <>from {formatINR(deliveryFee)}</>}</dd></div>
        <div className="flex items-baseline justify-between border-t border-slate-200 pt-3 text-base font-bold">
          <dt>Estimated total</dt>
          <dd className="text-xl tabular-nums"><AnimatedNumber value={total} format={formatINR} /></dd>
        </div>
      </dl>
      <p className="sr-only" aria-live="polite">Estimated total {formatINR(total)}</p>
      <p className="mt-3 text-xs text-slate-500">The exact delivery fee depends on your address and is shown at checkout. Store pickup has no fee.</p>
      {savings > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-control bg-tint px-3 py-2 text-xs font-medium text-tint-fg">
          <Sparkles className="h-4 w-4 shrink-0" /> You are saving {formatINR(savings)} on this order.
        </p>
      )}

      <div className="mt-5"><Cta signedIn={signedIn} blocked={blocked} /></div>

      <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium leading-tight text-slate-600">
        <li className="flex flex-col items-center gap-1"><PillBottle className="h-5 w-5 text-teal-600" /> Genuine medicines</li>
        <li className="flex flex-col items-center gap-1"><BadgeCheck className="h-5 w-5 text-teal-600" /> Pharmacist verified</li>
        <li className="flex flex-col items-center gap-1"><Lock className="h-5 w-5 text-teal-600" /> Secure payments</li>
      </ul>

      {confirming ? (
        <div role="alertdialog" aria-label="Clear cart?" className="mt-4 rounded-xl bg-rose-50 p-3 text-center text-sm">
          <p className="font-medium text-rose-900">Remove all items from your cart?</p>
          <div className="mt-2 flex justify-center gap-2">
            <button onClick={() => { setConfirming(false); onClear(); }} className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700">Yes, clear cart</button>
            <button autoFocus onClick={() => setConfirming(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">Keep items</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-rose-600 focus-visible:text-rose-600">Clear cart</button>
      )}
    </aside>
  );
}

/** Phone-sized sticky bar: total plus the same call to action as the summary. Hidden from the large layout up. */
export function MobileCheckoutBar({ total, savings, signedIn, blocked }: { total: number; savings: number; signedIn: boolean; blocked: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(9,71,31,.25)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-4 pr-16">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Estimated total</p>
          <p className="text-lg font-bold leading-tight tabular-nums"><AnimatedNumber value={total} format={formatINR} /></p>
          {savings > 0 && <p className="text-[11px] font-medium text-tint-fg">You save {formatINR(savings)}</p>}
        </div>
        <div className="flex-1"><Cta signedIn={signedIn} blocked={blocked} className="py-3" /></div>
      </div>
    </div>
  );
}
