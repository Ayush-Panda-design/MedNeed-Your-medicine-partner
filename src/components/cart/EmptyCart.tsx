import Link from "next/link";
import { ShoppingBag, Upload } from "lucide-react";
import "./cart.css";

export function EmptyCart() {
  return (
    <main className="mc-root mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mc-in mx-auto grid h-28 w-28 place-items-center rounded-full bg-tint ring-8 ring-subtle">
        <ShoppingBag className="h-12 w-12 text-teal-600" strokeWidth={1.5} />
      </div>
      <h1 className="mc-in mt-6 text-2xl font-bold" style={{ animationDelay: "60ms" }}>Your cart is empty</h1>
      <p className="mc-in mt-2 text-slate-600" style={{ animationDelay: "120ms" }}>Add medicines and health products to get started.</p>
      <div className="mc-in mt-7 flex flex-wrap justify-center gap-3" style={{ animationDelay: "180ms" }}>
        <Link href="/medicines" className="mc-cta inline-block rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-3 font-semibold text-white">Browse medicines</Link>
        <Link href="/account/prescriptions/new" className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 py-3 font-semibold text-ink hover:bg-subtle">
          <Upload className="h-4 w-4" /> Upload prescription
        </Link>
      </div>
    </main>
  );
}
