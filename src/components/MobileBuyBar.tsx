"use client";

import { useEffect } from "react";
import type { Product } from "@/lib/catalog";
import { formatINR } from "@/lib/catalog";
import { AddToCartButton } from "./AddToCartButton";

/** A fixed add-to-cart bar on phones, so the price and button stay within thumb reach while scrolling a product page. */
export function MobileBuyBar({ product, inStock }: { product: Product; inStock: boolean }) {
  useEffect(() => {
    // Lift the back-to-top button and give the page clearance so the footer isn't hidden behind the bar.
    document.body.classList.add("mn-has-buybar");
    document.body.style.setProperty("scroll-padding-bottom", "5rem");
    return () => {
      document.body.classList.remove("mn-has-buybar");
      document.body.style.removeProperty("scroll-padding-bottom");
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-4">
        <div className="shrink-0">
          <p className="text-lg font-bold leading-none">{formatINR(product.price)}</p>
          <p className={`mt-0.5 text-xs font-medium ${inStock ? "text-emerald-600" : "text-rose-600"}`}>{inStock ? "In stock" : "Out of stock"}</p>
        </div>
        <div className="flex-1">
          <AddToCartButton slug={product.slug} product={product} disabled={!inStock} compact />
        </div>
      </div>
    </div>
  );
}
