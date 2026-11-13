"use client";

import Link from "next/link";
import { Minus, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { ProductVisual } from "@/components/ProductVisual";
import { formatINR } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { AnimatedNumber } from "./AnimatedNumber";
import "./cart.css";

type Props = {
  product: Product;
  qty: number;
  /** Highest quantity the cart allows for one line. The "+" button is disabled there. */
  maxQty: number;
  index: number;
  leaving: boolean;
  onSetQty: (slug: string, qty: number) => void;
  onRemove: (product: Product, qty: number) => void;
};

export function CartItemCard({ product, qty, maxQty, index, leaving, onSetQty, onRemove }: Props) {
  const off = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  return (
    <article
      data-leaving={leaving}
      className="mc-card mc-in flex gap-4 rounded-card border border-line bg-surface p-4 sm:gap-5 sm:p-5"
      style={{ animationDelay: `${80 + Math.min(index, 6) * 55}ms` }}
    >
      <Link href={`/medicines/${product.slug}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <ProductVisual product={product} className="h-24 w-24 rounded-xl ring-1 ring-black/5 sm:h-28 sm:w-28" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/medicines/${product.slug}`} className="font-semibold leading-snug hover:text-teal-700 focus-visible:text-teal-700">{product.name}</Link>
            <p className="mt-0.5 text-xs text-slate-500">{product.packSize}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {product.categoryName && <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-ink-2">{product.categoryName}</span>}
              {product.rx && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                  <ShieldAlert className="h-3 w-3" /> Prescription required
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onRemove(product, qty)}
            aria-label={`Remove ${product.name}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex items-center overflow-hidden rounded-control border border-line-strong bg-surface">
            <button
              aria-label="Decrease quantity"
              onClick={() => onSetQty(product.slug, qty - 1)}
              className="grid h-11 w-11 place-items-center hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-500"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="grid w-9 place-items-center overflow-hidden text-center text-sm font-semibold tabular-nums" aria-live="polite" aria-atomic="true">
              <span key={qty} className="mc-roll">{qty}</span>
            </span>
            <button
              aria-label="Increase quantity"
              disabled={qty >= maxQty}
              onClick={() => onSetQty(product.slug, qty + 1)}
              className="grid h-11 w-11 place-items-center hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold tabular-nums leading-none">
              <AnimatedNumber value={product.price * qty} format={formatINR} />
            </p>
            {off > 0 && (
              <p className="mt-1 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-xs">
                <span className="whitespace-nowrap rounded-md bg-chip px-1.5 py-0.5 font-semibold text-chip-fg">{off}% off</span>
                <span className="text-ink-muted line-through tabular-nums">{formatINR(product.mrp * qty)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
