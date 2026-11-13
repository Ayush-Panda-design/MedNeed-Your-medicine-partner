"use client";

import Link from "next/link";
import { Minus, Plus, ShieldAlert, ShoppingBag, Trash2, Upload } from "lucide-react";
import { ProductVisual } from "@/components/ProductVisual";
import { formatINR } from "@/lib/catalog";
import { useAuth, useCart } from "@/lib/providers";

const FREE_DELIVERY_ABOVE = 499;
const DELIVERY_FEE = 40;

export default function CartPage() {
  const cart = useCart();
  const auth = useAuth();

  if (cart.loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      </main>
    );
  }

  if (cart.loadFailed && cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">We could not load your cart</h1>
        <p className="mt-2 text-slate-600">Check your connection and try again. Your items are saved.</p>
        <button onClick={cart.retry} className="mt-6 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700">Try again</button>
      </main>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-14 w-14 text-slate-300" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">Add medicines and health products to get started.</p>
        <Link href="/medicines" className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700">
          Browse medicines
        </Link>
      </main>
    );
  }

  const delivery = cart.subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total = cart.subtotal + delivery;
  const savings = cart.mrpTotal - cart.subtotal;
  const remaining = FREE_DELIVERY_ABOVE - cart.subtotal;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Your cart <span className="text-lg font-medium text-slate-500">({cart.count} items)</span></h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-label="Cart items" className="space-y-4">
          {remaining > 0 && (
            <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Add items worth <strong>{formatINR(remaining)}</strong> more for free delivery.
            </p>
          )}

          {cart.lines.map(({ product, qty }) => (
            <article key={product.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <Link href={`/medicines/${product.slug}`}>
                <ProductVisual product={product} className="h-24 w-24 rounded-xl" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/medicines/${product.slug}`} className="font-semibold hover:text-teal-700">{product.name}</Link>
                    <p className="text-xs text-slate-500">{product.packSize}</p>
                    {product.rx && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                        <ShieldAlert className="h-3 w-3" /> Prescription required
                      </p>
                    )}
                  </div>
                  <button onClick={() => cart.remove(product.slug)} aria-label={`Remove ${product.name}`} className="h-fit rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button aria-label="Decrease quantity" onClick={() => cart.setQty(product.slug, qty - 1)} className="grid h-9 w-9 place-items-center hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                    <button aria-label="Increase quantity" onClick={() => cart.setQty(product.slug, qty + 1)} className="grid h-9 w-9 place-items-center hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatINR(product.price * qty)}</p>
                    {product.mrp > product.price && <p className="text-xs text-slate-400 line-through">{formatINR(product.mrp * qty)}</p>}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {cart.hasRx && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /> Your cart has prescription medicines. A valid prescription is needed before we can dispatch them.</p>
              <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-amber-200 px-4 py-2 font-semibold text-amber-900/60">
                <Upload className="h-4 w-4" /> Upload (coming soon)
              </button>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-44">
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Total MRP</dt><dd>{formatINR(cart.mrpTotal)}</dd></div>
            {savings > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>− {formatINR(savings)}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-600">Delivery</dt><dd>{delivery === 0 ? <span className="font-semibold text-emerald-700">FREE</span> : formatINR(delivery)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><dt>To pay</dt><dd>{formatINR(total)}</dd></div>
          </dl>
          {savings > 0 && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">You are saving {formatINR(savings)} on this order.</p>}

          {auth.user ? (
            <button disabled className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-200 py-3.5 font-semibold text-slate-500">
              Checkout (coming in Phase 5)
            </button>
          ) : (
            <Link href="/login" className="mt-5 block w-full rounded-xl bg-teal-600 py-3.5 text-center font-semibold text-white hover:bg-teal-700">
              Sign in to continue
            </Link>
          )}
          <button onClick={cart.clear} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-rose-600">Clear cart</button>
        </aside>
      </div>
    </main>
  );
}
