import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, SearchX, Sparkles } from "lucide-react";
import { CatalogFilters, SortSelect } from "@/components/CatalogControls";
import { CatalogResults, CatalogStateProvider } from "@/components/CatalogState";
import { ProductCard } from "@/components/ProductCard";
import { SORT_KEYS, type SortKey } from "@/lib/catalog";
import { getCategory, listBrands, listCategories, needsConfirmedPrice, searchProducts } from "@/server/catalog/queries";
import { hybridSearch } from "@/server/ai/hybrid-search";

type SP = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 12;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = await getCategory(first(sp.category) ?? "");
  const q = first(sp.q);
  const title = q ? `Results for "${q}"` : cat ? cat.name : "All medicines";
  // Search result pages are thin and endless; keep them out of the index. Category and main listings are indexable.
  return { title, robots: q ? { index: false, follow: true } : undefined, alternates: { canonical: cat ? `/medicines?category=${cat.slug}` : "/medicines" } };
}

/** Pages to show: first, last, and a few around the current page; null = an ellipsis. */
function pageWindow(current: number, total: number): (number | null)[] {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => keep.add(n));
  const pages = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

export default async function MedicinesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const [categories, brands] = await Promise.all([listCategories(), listBrands()]);
  const category = categories.some((c) => c.slug === first(sp.category)) ? first(sp.category) : undefined;
  const sortParam = first(sp.sort) as SortKey | undefined;
  const sort = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : "relevance";
  const maxRaw = Number(first(sp.max));
  const maxPrice = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined;
  const pageRaw = Math.floor(Number(first(sp.page))) || 1;

  const query = {
    q,
    category,
    brands: all(sp.brand).slice(0, 20),
    maxPrice,
    otcOnly: first(sp.otc) === "1",
    inStockOnly: first(sp.stock) === "1",
    sort,
    pageSize: PAGE_SIZE,
  };
  let { items: visible, total, interpretedAs } = await hybridSearch({ ...query, page: Math.max(pageRaw, 1) });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(pageRaw, 1), totalPages);
  if (page !== Math.max(pageRaw, 1)) ({ items: visible, total } = await searchProducts({ ...query, page }));

  // Price and stock filters only show products with a confirmed price; say how many others match, so the list
  // never looks mysteriously short, and offer a one-click way to see them.
  const hiddenByPriceFilters = needsConfirmedPrice(query)
    ? Math.max(0, (await searchProducts({ ...query, maxPrice: undefined, inStockOnly: false, sort: "relevance", page: 1, pageSize: 1 })).total - total)
    : 0;
  const withoutPriceFilters = (() => {
    const p = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (k === "page" || k === "max" || k === "stock") return;
      all(v).forEach((x) => p.append(k, x));
    });
    const qs = p.toString();
    return qs ? `/medicines?${qs}` : "/medicines";
  })();

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

  const cat = category ? categories.find((c) => c.slug === category) : undefined;
  const heading = q ? `Results for “${q}”` : cat ? cat.name : "All medicines";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <CatalogStateProvider>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-teal-700">Home</Link> / <span className="text-slate-900">{heading}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} {total === 1 ? "product" : "products"}
            {cat ? ` · ${cat.blurb}` : ""}
          </p>
        </div>
        <SortSelect />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <CatalogFilters categories={categories} brands={brands} />

        <CatalogResults className="min-w-0 flex-1">
          {hiddenByPriceFilters > 0 && (
            <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100" role="status">
              <Info className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>
                Showing products with a confirmed price{query.inStockOnly ? " in stock" : ""}. {hiddenByPriceFilters.toLocaleString("en-IN")} more{" "}
                {hiddenByPriceFilters === 1 ? "matches" : "match"} your other filters (most are listed without a price and available on request).
              </span>
              <Link href={withoutPriceFilters} scroll={false} className="font-semibold underline underline-offset-2 hover:text-amber-700">
                Show all
              </Link>
            </p>
          )}
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
              {interpretedAs && (
                <p className="mb-4 flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm text-teal-900 ring-1 ring-teal-100">
                  <Sparkles className="h-4 w-4 text-teal-600" /> {interpretedAs}
                </p>
              )}
              <div className="mn-grid grid grid-cols-2 gap-4 md:grid-cols-3">
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1">
                  {page > 1 && (
                    <Link href={pageHref(page - 1)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-teal-500">
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Link>
                  )}
                  {pageWindow(page, totalPages).map((n, i) =>
                    n === null ? (
                      <span key={`gap-${i}`} aria-hidden className="px-1 text-slate-400">…</span>
                    ) : (
                    <Link
                      key={n}
                      href={pageHref(n)}
                      aria-current={n === page ? "page" : undefined}
                      className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-semibold ${n === page ? "bg-teal-600 text-white" : "border border-slate-200 bg-white hover:border-teal-500"}`}
                    >
                      {n}
                    </Link>
                    ),
                  )}
                  {page < totalPages && (
                    <Link href={pageHref(page + 1)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-teal-500">
                      Next <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </CatalogResults>
      </div>
      </CatalogStateProvider>
    </main>
  );
}
