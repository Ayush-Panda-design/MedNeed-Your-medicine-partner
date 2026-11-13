"use client";

import Link from "next/link";
import { ShieldAlert, Undo2, Upload } from "lucide-react";
import { useAuth, useCart } from "@/lib/providers";
import type { Product } from "@/lib/catalog";
import { useQuote } from "@/lib/useQuote";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CartSkeleton } from "@/components/cart/CartSkeleton";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { FreeDeliveryProgress } from "@/components/cart/FreeDeliveryProgress";
import { MobileCheckoutBar, OrderSummary } from "@/components/cart/OrderSummary";
import "@/components/cart/cart.css";

const EXIT_MS = 250; // length of the card's exit animation before the removal is applied
const UNDO_MS = 6000;
const MAX_QTY = 10; // the cart store itself clamps every line to 10

export default function CartPage() {
  const cart = useCart();
  const auth = useAuth();
  const items = useMemo(() => cart.lines.map((l) => ({ slug: l.product.slug, qty: l.qty })), [cart.lines]);
  const { data, error: quoteError } = useQuote(items, { fulfilment: "delivery" });
  const quote = data?.quote;

  // Removal flow: play the exit animation, then call the same cart.remove as before, and offer a short "Undo".
  const [leaving, setLeaving] = useState<string[]>([]);
  const [undo, setUndo] = useState<{ product: Product; qty: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const handleRemove = useCallback((product: Product, qty: number) => {
    if (leaving.includes(product.slug)) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const commit = () => {
      cart.remove(product.slug);
      setLeaving((l) => l.filter((s) => s !== product.slug));
      setUndo({ product, qty });
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    };
    if (reduce) return commit();
    setLeaving((l) => [...l, product.slug]);
    timers.current.push(setTimeout(commit, EXIT_MS));
  }, [cart, leaving]);

  const handleSetQty = useCallback((slug: string, qty: number) => {
    if (qty <= 0) {
      const line = cart.lines.find((l) => l.product.slug === slug);
      if (line) return handleRemove(line.product, line.qty); // same end result as before: the line is removed
    }
    cart.setQty(slug, qty);
  }, [cart, handleRemove]);

  const handleUndo = () => {
    if (!undo) return;
    cart.add(undo.product.slug, undo.qty, undo.product);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  if (cart.loading) return <CartSkeleton />;

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
      <>
        <EmptyCart />
        {undo && <UndoBar name={undo.product.name} onUndo={handleUndo} />}
      </>
    );
  }

  const subtotal = quote?.subtotal ?? cart.subtotal;
  const savings = (quote?.mrpTotal ?? cart.mrpTotal) - subtotal;
  const settings = data?.settings;
  const nextBand = settings?.feeBands.find((b) => subtotal < b.below);
  const shortBy = nextBand ? nextBand.below - subtotal : 0;
  const belowMin = settings ? subtotal < settings.minOrder : false;
  const blocking = quote?.lines.filter((l) => l.problem) ?? [];
  const total = quote?.total ?? cart.subtotal;
  const unlocked = !!settings && !belowMin && !nextBand && quote?.deliveryFee === 0;

  return (
    <main className="mc-root mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:pb-8">
      <h1 className="mc-in text-3xl font-bold">Your cart <span className="text-lg font-medium text-slate-500">({cart.count} items)</span></h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-label="Cart items" className="space-y-4">
          <div className="mc-in" style={{ animationDelay: "40ms" }}>
            <FreeDeliveryProgress
              belowMin={belowMin && settings ? { minOrder: settings.minOrder, subtotal } : null}
              next={!belowMin && nextBand && shortBy > 0 ? { below: nextBand.below, fee: nextBand.fee, isLast: settings?.feeBands[settings.feeBands.length - 1] === nextBand, shortBy, subtotal } : null}
              unlocked={unlocked}
            />
          </div>
          {blocking.length > 0 && (
            <ul role="alert" className="space-y-1 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {blocking.map((l) => <li key={l.slug}>{l.problem}</li>)}
            </ul>
          )}
          {quoteError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{quoteError}</p>}

          {cart.lines.map(({ product, qty }, i) => (
            <CartItemCard
              key={product.id}
              product={product}
              qty={qty}
              maxQty={MAX_QTY}
              index={i}
              leaving={leaving.includes(product.slug)}
              onSetQty={handleSetQty}
              onRemove={handleRemove}
            />
          ))}

          {cart.hasRx && (
            <div className="mc-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /> Your cart has prescription medicines. A valid prescription is needed before we can dispatch them.</p>
              <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-amber-200 px-4 py-2 font-semibold text-amber-900/60">
                <Upload className="h-4 w-4" /> Upload (coming soon)
              </button>
            </div>
          )}
        </section>

        <OrderSummary
          mrpTotal={cart.mrpTotal}
          savings={savings}
          deliveryFee={quote ? quote.deliveryFee : undefined}
          total={total}
          signedIn={!!auth.user}
          blocked={blocking.length > 0}
          onClear={cart.clear}
        />
      </div>

      <MobileCheckoutBar total={total} savings={savings} signedIn={!!auth.user} blocked={blocking.length > 0} />
      {undo && <UndoBar name={undo.product.name} onUndo={handleUndo} />}
    </main>
  );
}

function UndoBar({ name, onUndo }: { name: string; onUndo: () => void }) {
  return (
    <div role="status" className="mc-undo fixed bottom-28 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 overflow-hidden rounded-xl bg-slate-900 text-sm text-white shadow-xl lg:bottom-6">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="truncate">{name} removed from cart</span>
        <button onClick={onUndo} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-lime-300 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300">
          <Undo2 className="h-4 w-4" /> Undo
        </button>
      </div>
      <div className="mc-countdown h-0.5 bg-lime-400" />
    </div>
  );
}
