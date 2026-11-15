"use client";

import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/lib/providers";
import { toast } from "./Toaster";

/** A small dot flies from the button to the header cart (design from the Lovable concept). Skipped with reduced motion. */
function flyToCart(from: HTMLElement) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cart = document.querySelector<HTMLElement>('header a[aria-label="Cart"]');
  if (!cart || !("animate" in HTMLElement.prototype)) return;
  const a = from.getBoundingClientRect();
  const b = cart.getBoundingClientRect();
  if (b.bottom < 0 || b.width === 0) return;
  const dot = document.createElement("span");
  dot.className = "mn-flydot";
  dot.style.left = `${a.left + a.width / 2 - 7}px`;
  dot.style.top = `${a.top + a.height / 2 - 7}px`;
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  dot
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(1.1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.35)`, opacity: 0.2 },
      ],
      { duration: 650, easing: "cubic-bezier(.45,.05,.35,1)" },
    )
    .finished.finally(() => dot.remove());
}

export function AddToCartButton({ slug, product, disabled, compact = false }: { slug: string; product?: Product; disabled?: boolean; compact?: boolean }) {
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.lines.find((l) => l.product.slug === slug);

  if (disabled) {
    return (
      <button disabled className={`w-full cursor-not-allowed rounded-full bg-slate-100 px-3 font-semibold text-slate-400 ${compact ? "h-10 text-sm" : "h-12 text-base"}`}>
        Out of stock
      </button>
    );
  }

  if (inCart) {
    return (
      <div role="group" aria-label={`Quantity of ${product?.name ?? "item"}`} className={`mn-stepper flex w-full items-center justify-between rounded-full bg-teal-50 p-1 text-teal-800 ${compact ? "h-10" : "h-12"}`}>
        <button aria-label="Decrease quantity" onClick={() => cart.setQty(slug, inCart.qty - 1)} className={`grid place-items-center rounded-full bg-white text-teal-800 shadow-sm transition hover:bg-teal-100 ${compact ? "h-8 w-8" : "h-10 w-10"}`}>
          <Minus className="h-4 w-4" />
        </button>
        <span key={inCart.qty} aria-live="polite" className="mn-qty text-sm font-semibold">
          {inCart.qty} in cart
        </span>
        <button
          aria-label="Increase quantity"
          onClick={(e) => {
            cart.setQty(slug, inCart.qty + 1);
            flyToCart(e.currentTarget);
          }}
          className={`grid place-items-center rounded-full bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 ${compact ? "h-8 w-8" : "h-10 w-10"}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        cart.add(slug, 1, product);
        flyToCart(e.currentTarget);
        toast(product?.name ? `${product.name} added to cart` : "Added to cart");
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1200);
      }}
      className={`mn-addbtn flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98] ${compact ? "h-10 px-3 text-sm" : "h-12 px-5 text-base"}`}
    >
      {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      {justAdded ? "Added" : "Add to cart"}
    </button>
  );
}
