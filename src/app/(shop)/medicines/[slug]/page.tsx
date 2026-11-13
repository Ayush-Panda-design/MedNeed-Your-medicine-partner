import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, FlaskConical, MapPin, ShieldAlert, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { MobileBuyBar } from "@/components/MobileBuyBar";
import { RequestMedicine } from "@/components/RequestMedicine";
import { MedicineQA } from "@/components/MedicineQA";
import { discountPercent, formatINR } from "@/lib/catalog";
import { appUrl, aiEnabled } from "@/server/env";
import { getProductBySlug, getRelated, getSubstitutes } from "@/server/catalog/queries";

function summary(p: { name: string; composition: string; manufacturer: string; packSize: string; rx: boolean; orderable: boolean }) {
  const text = `${p.name}${p.composition ? ` (${p.composition})` : ""} by ${p.manufacturer}. ${p.packSize}. ${p.rx ? "Prescription required." : "No prescription needed."} ${p.orderable ? "Order online from MedNeed." : "Available on request from MedNeed."}`;
  return text.length > 158 ? `${text.slice(0, 155)}...` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  // Catalog-only details come from an unverified source: keep them out of search engines until someone confirms them.
  const robots = p.orderable ? undefined : { index: false, follow: true };
  const description = summary(p);
  return {
    title: p.name,
    description,
    robots,
    alternates: { canonical: `/medicines/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", url: `/medicines/${p.slug}`, images: p.imageUrl ? [{ url: p.imageUrl }] : undefined },
  };
}

// Escape "<" so product text can never break out of the script tag.
const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const off = product.orderable ? discountPercent(product) : 0;
  const [subs, related] = await Promise.all([getSubstitutes(product, 6), getRelated(product, 4)]);
  const base = appUrl();
  const productUrl = `${base}/medicines/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.name,
        description: summary(product),
        url: productUrl,
        image: product.imageUrl ? (product.imageUrl.startsWith("http") ? product.imageUrl : `${base}${product.imageUrl}`) : undefined,
        brand: { "@type": "Organization", name: product.manufacturer },
        category: product.categoryName,
        offers: !product.orderable ? undefined : {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "INR",
          price: product.price.toFixed(2),
          availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      },
      ...(product.salts.length
        ? [
            {
              "@type": "Drug",
              name: product.name,
              activeIngredient: product.salts.map((x) => (x.strength ? `${x.name} ${x.strength}` : x.name)),
              dosageForm: product.form,
              manufacturer: { "@type": "Organization", name: product.manufacturer },
              prescriptionStatus: product.rx ? "https://schema.org/PrescriptionOnly" : "https://schema.org/OTC",
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          { "@type": "ListItem", position: 2, name: "Medicines", item: `${base}/medicines` },
          { "@type": "ListItem", position: 3, name: product.categoryName, item: `${base}/medicines?category=${product.category}` },
          { "@type": "ListItem", position: 4, name: product.name },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-teal-700">Home</Link> /{" "}
        <Link href="/medicines" className="hover:text-teal-700">Medicines</Link> /{" "}
        <Link href={`/medicines?category=${product.category}`} className="hover:text-teal-700">{product.categoryName}</Link> /{" "}
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_360px]">
        <div className="mn-zoom aspect-square w-full self-start rounded-3xl border border-slate-200"><ProductVisual product={product} className="h-full w-full" /></div>

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
          {product.dataStatus === "sample" && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Sample listing for development. This is not a real product.</p>
          )}

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-slate-500">Composition</dt>
            <dd className="font-medium">{product.composition || "Not applicable"}</dd>
            <dt className="text-slate-500">Prescription</dt>
            <dd className="font-medium">{product.schedule === "unknown" ? "Please confirm with our pharmacist (treated as prescription-only)" : product.rx ? `Required (Schedule ${product.schedule})` : "Not required"}</dd>
            <dt className="text-slate-500">Pack size</dt>
            <dd className="font-medium">{product.packSize}</dd>
            <dt className="text-slate-500">Used for</dt>
            <dd className="font-medium">{product.uses.join(", ") || "See product information"}</dd>
          </dl>

          {product.rx && product.orderable && (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>This is a prescription medicine. You will be asked to upload a valid prescription at checkout, and a pharmacist will verify it before your order is packed.</p>
            </div>
          )}

          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            {product.orderable && <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-teal-600" /> Sourced from licensed distributors</li>}
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-teal-600" /> Free delivery on orders above ₹499</li>
          </ul>
        </div>

        {/* Buy box */}
        {product.orderable ? (
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
              <AddToCartButton slug={product.slug} product={product} disabled={!product.inStock} />
            </div>
            <p className={`mt-3 text-sm font-medium ${product.inStock ? "text-emerald-600" : "text-rose-600"}`}>
              {product.inStock ? (product.availableQty <= 5 ? `Only ${product.availableQty} left` : "In stock") : "Currently out of stock"}
            </p>
            {!product.inStock && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold">Need it anyway?</p>
                <p className="mb-3 mt-1 text-xs text-slate-600">We can get it from our supplier. Leave your number and we will call you.</p>
                <RequestMedicine slug={product.slug} />
              </div>
            )}

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
        ) : (
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-44">
            {product.restricted ? (
              <>
                <p className="text-lg font-bold">Not available online</p>
                <p className="mt-2 text-sm text-slate-600">This medicine cannot be sold online. Please visit the store with a valid prescription.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">Available on request</p>
                <p className="mb-4 mt-1 text-sm text-slate-600">
                  We can arrange this medicine for you. Leave your number and we will call to confirm the price and availability.
                  {product.rx && " A valid prescription will be needed."}
                </p>
                <RequestMedicine slug={product.slug} />
              </>
            )}
          </aside>
        )}
      </div>

      {/* Information */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        {[
          product.description && { t: "About this product", body: <p>{product.description}</p> },
          product.howToUse && { t: "How to use", body: <p>{product.howToUse}</p> },
          product.sideEffects.length > 0 && {
            t: "Possible side effects",
            body: (
              <ul className="list-disc space-y-1 pl-5">
                {product.sideEffects.map((s) => <li key={s}>{s}</li>)}
              </ul>
            ),
          },
          product.precautions.length > 0 && {
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
      {aiEnabled() && (
        <div className="mt-6">
          <MedicineQA slug={product.slug} />
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Information is for general awareness and is not medical advice. Consult a doctor or pharmacist before use.
      </p>

      {subs.length > 0 && (
        <section className="mt-14" aria-labelledby="subs">
          <h2 id="subs" className="flex items-center gap-2 text-2xl font-bold"><FlaskConical className="h-6 w-6 text-teal-600" /> Substitutes</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Same salts at the same strength and form: {product.composition}. Always check with your doctor or pharmacist before switching, and never switch a prescription medicine without their approval.
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {subs.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related">
          <h2 id="related" className="mb-5 text-2xl font-bold">More in {product.categoryName}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      {product.orderable && product.inStock && <MobileBuyBar product={product} inStock={product.inStock} />}
    </main>
  );
}
