"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Truck } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import "./cart.css";

type Props = {
  /** Minimum order for home delivery, when the cart is below it. */
  belowMin: { minOrder: number; subtotal: number } | null;
  /** The next delivery-fee band to reach, and how far away it is. */
  next: { below: number; fee: number; isLast: boolean; shortBy: number; subtotal: number } | null;
  /** True when the cart already qualifies for free delivery. */
  unlocked: boolean;
};

const CONFETTI = ["#84cc16", "#30982f", "#facc15", "#5cb44f", "#bef264", "#1b7f33", "#fbbf24", "#92cf85"];

export function FreeDeliveryProgress({ belowMin, next, unlocked }: Props) {
  // Celebrate only when free delivery is reached while the page is open, not on first render.
  const prev = useRef(unlocked);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (unlocked && !prev.current) setBurst((n) => n + 1);
    prev.current = unlocked;
  }, [unlocked]);

  if (belowMin) {
    const pct = Math.max(0, Math.min(1, belowMin.subtotal / belowMin.minOrder));
    return (
      <div role="status" className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p>
          Home delivery needs a minimum order of <strong>{formatINR(belowMin.minOrder)}</strong>. Add {formatINR(belowMin.minOrder - belowMin.subtotal)} more, or choose store pickup at checkout.
        </p>
        <Bar pct={pct} track="bg-amber-100" fill="bg-amber-500" label="Progress to minimum order" />
      </div>
    );
  }

  if (next && next.shortBy > 0) {
    const pct = Math.max(0, Math.min(1, next.subtotal / next.below));
    return (
      <div role="status" className="rounded-card border border-line bg-tint px-4 py-3 text-sm text-tint-fg">
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0 text-teal-600" />
          <span>
            {next.fee > 0 && next.isLast
              ? <>Add items worth <strong>{formatINR(next.shortBy)}</strong> more for free delivery.</>
              : <>Add items worth <strong>{formatINR(next.shortBy)}</strong> more to pay a lower delivery fee.</>}
          </span>
        </p>
        <Bar pct={pct} track="bg-surface" fill="bg-gradient-to-r from-teal-500 to-lime-400" label="Progress to free delivery" />
      </div>
    );
  }

  if (unlocked) {
    return (
      <div role="status" className="relative overflow-visible rounded-card border border-line bg-tint px-4 py-3 text-sm font-medium text-tint-fg">
        <p className="flex items-center gap-2">
          <CheckCircle2 key={burst} className={`h-5 w-5 shrink-0 text-teal-600 ${burst ? "mc-check" : ""}`} />
          You have unlocked <strong>free delivery</strong> on this order.
        </p>
        {burst > 0 && (
          <span key={burst} className="mc-confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <i key={i} style={{ background: c, ["--dx" as string]: `${(i - 3.5) * 22}px`, ["--dy" as string]: `${-34 - (i % 3) * 14}px`, ["--rot" as string]: `${(i - 3.5) * 50}deg`, animationDelay: `${i * 20}ms` }} />
            ))}
          </span>
        )}
      </div>
    );
  }

  return null;
}

function Bar({ pct, track, fill, label }: { pct: number; track: string; fill: string; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className={`mt-2.5 h-2 overflow-hidden rounded-full ${track}`}
    >
      <div className={`mc-bar-fill h-full w-full rounded-full ${fill}`} style={{ transform: `scaleX(${pct})` }} />
    </div>
  );
}
