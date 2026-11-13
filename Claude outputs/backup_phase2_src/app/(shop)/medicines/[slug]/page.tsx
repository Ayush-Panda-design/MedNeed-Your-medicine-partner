import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, MapPin, ShieldAlert, Star, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { discountPercent, formatINR, getCategory, getProduct, products, substitutesFor } from "@/lib/data";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: p.name, description: p.description } : { title: "Product not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const cat = getCategory(product.category);
  const off = discountPercent(product);
  const subs = substitutesFor(product);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-teal-700">Home</Link> /{" "}
        <Link href="/medicines" className="hover:text-teal-700">Medicines</Link> /{" "}
        {cat && (
          <>
            <Link href={`/medicines?category=${cat.slug}`} className="hover:text-teal-700">{cat.name}</Link> /{" "}
          </>
        )}
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_360px]">
        <ProductVisual product={product} className="aspect-square w-full rounded-3xl border border-slate-200" />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.rx && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <ShieldAlert className="h-3.5 w-3.5" /> Prescription required
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{product.form}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-500">By {product.manufacturer}</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 font-semibold text-white">
              {product.rating.toFixed(1)} <Star className="h-3.5 w-3.5 fill-white" />
            </span>
            <span className="text-slate-500">{product.reviews.toLocaleString("en-IN")} ratings</span>
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-slate-500">Composition</dt>
            <dd className="font-medium">{product.composition}</dd>
            <dt className="text-slate-500">Pack size</dt>
            <dd className="font-medium">{product.packSize}</dd>
            <dt className="text-slate-500">Used for</dt>
            <dd className="font-medium">{product.uses.join(", ") || "See product information"}</dd>
          </dl>

          {product.rx && (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>This is a prescription medicine. You will be asked to upload a valid prescription at checkout, and a pharmacist will verify it before your order is packed.</p>
            </div>
          )}

          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-teal-600" /> Sourced from licensed distributors</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-teal-600" /> Free delivery on orders above ₹499</li>
          </ul>
        </div>

        {/* Buy box */}
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-44">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatINR(product.price)}</span>
            {off > 0 && (
              <>
                <span className="text-slate-400 line-through">{formatINR(product.mrp)}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{off}% OFF</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">MRP inclusive of all taxes</p>

          <div className="mt-5">
            <AddToCartButton slug={product.slug} disabled={!product.inStock} />
          </div>
          <p className={`mt-3 text-sm font-medium ${product.inStock ? "text-emerald-600" : "text-rose-600"}`}>
            {product.inStock ? "In stock" : "Currently out of stock"}
          </p>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <label htmlFor="pin" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-teal-600" /> Check delivery
            </label>
            <div className="mt-2 flex gap-2">
              <input id="pin" inputMode="numeric" maxLength={6} placeholder="Enter pincode" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" />
              <button type="button" className="rounded-lg border border-teal-600 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50">Check</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Live serviceability check arrives with checkout (Phase 5).</p>
          </div>
        </aside>
      </div>

      {/* Information */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        {[
          { t: "About this product", body: <p>{product.description}</p> },
          { t: "How to use", body: <p>{product.howToUse}</p> },
          product.sideEffects.length > 0 && {
            t: "Possible side effects",
            body: (
              <ul className="list-disc space-y-1 pl-5">
                {product.sideEffects.map((s) => <li key={s}>{s}</li>)}
              </ul>
            ),
          },
          {
            t: "Safety advice",
            body: (
              <ul className="list-disc space-y-1 pl-5">
                {product.precautions.map((s) => <li key={s}>{s}</li>)}
              </ul>
            ),
          },
        ]
          .filter((x): x is { t: string; body: React.ReactElement } => Boolean(x))
          .map((s) => (
            <article key={s.t} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold">{s.t}</h2>
              <div className="text-sm leading-relaxed text-slate-600">{s.body}</div>
            </article>
          ))}
      </section>
      <p className="mt-4 text-xs text-slate-400">
        Information is for general awareness and is not medical advice. Consult a doctor or pharmacist before use.
      </p>

      {subs.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-2xl font-bold">Similar products</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {subs.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </main>
  );
}
