import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { CatalogFilters, SortSelect } from "@/components/CatalogControls";
import { ProductCard } from "@/components/ProductCard";
import { categories, getCategory, queryProducts, type SortKey } from "@/lib/data";

type SP = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 12;
const SORTS: SortKey[] = ["relevance", "price-asc", "price-desc", "discount", "rating"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = getCategory(first(sp.category) ?? "");
  const q = first(sp.q);
  return { title: q ? `Results for "${q}"` : cat ? cat.name : "All medicines" };
}

export default async function MedicinesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim() || undefined;
  const category = categories.some((c) => c.slug === first(sp.category)) ? first(sp.category) : undefined;
  const sortParam = first(sp.sort) as SortKey | undefined;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : "relevance";
  const maxRaw = Number(first(sp.max));
  const maxPrice = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined;

  const results = queryProducts({
    q,
    category,
    brands: all(sp.brand),
    maxPrice,
    otcOnly: first(sp.otc) === "1",
    inStockOnly: first(sp.stock) === "1",
    sort,
  });

  const pageRaw = Math.floor(Number(first(sp.page))) || 1;
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(Math.max(pageRaw, 1), totalPages);
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (k === "page") return;
      all(v).forEach((x) => p.append(k, x));
    });
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/medicines?${qs}` : "/medicines";
  };

  const cat = category ? getCategory(category) : undefined;
  const heading = q ? `Results for “${q}”` : cat ? cat.name : "All medicines";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-teal-700">Home</Link> / <span className="text-slate-900">{heading}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {results.length} {results.length === 1 ? "product" : "products"}
            {cat ? ` · ${cat.blurb}` : ""}
          </p>
        </div>
        <SortSelect />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <CatalogFilters />

        <section className="min-w-0 flex-1" aria-label="Product results">
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <SearchX className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-4 text-lg font-semibold">No products found</h2>
              <p className="mt-1 text-sm text-slate-500">Try a different spelling, or remove some filters.</p>
              <Link href="/medicines" className="mt-5 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
                Clear search
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
                  {page > 1 && (
                    <Link href={pageHref(page - 1)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-teal-500">
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Link>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <Link
                      key={n}
                      href={pageHref(n)}
                      aria-current={n === page ? "page" : undefined}
                      className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-semibold ${n === page ? "bg-teal-600 text-white" : "border border-slate-200 bg-white hover:border-teal-500"}`}
                    >
                      {n}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link href={pageHref(page + 1)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-teal-500">
                      Next <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
