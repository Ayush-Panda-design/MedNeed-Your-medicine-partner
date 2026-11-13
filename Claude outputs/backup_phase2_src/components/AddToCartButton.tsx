"use client";

import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/providers";

export function AddToCartButton({ slug, disabled, compact = false }: { slug: string; disabled?: boolean; compact?: boolean }) {
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.lines.find((l) => l.product.slug === slug);

  if (disabled) {
    return (
      <button disabled className="w-full cursor-not-allowed rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
        Out of stock
      </button>
    );
  }

  if (inCart) {
    return (
      <div className="flex w-full items-center justify-between rounded-lg border border-teal-600 bg-teal-50 text-teal-700">
        <button aria-label="Decrease quantity" onClick={() => cart.setQty(slug, inCart.qty - 1)} className="grid h-9 w-10 place-items-center rounded-l-lg hover:bg-teal-100">
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{inCart.qty} in cart</span>
        <button aria-label="Increase quantity" onClick={() => cart.setQty(slug, inCart.qty + 1)} className="grid h-9 w-10 place-items-center rounded-r-lg hover:bg-teal-100">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        cart.add(slug);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1200);
      }}
      className={`flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98] ${compact ? "px-3 py-2 text-sm" : "px-5 py-3 text-base"}`}
    >
      {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      {justAdded ? "Added" : "Add to cart"}
    </button>
  );
}
