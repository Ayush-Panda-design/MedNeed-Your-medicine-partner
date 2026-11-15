"use client";

import { useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@/lib/catalog";
import { useCatalogState } from "./CatalogState";

function useUpdate() {
  const shared = useCatalogState();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (shared) return shared;
  // Fallback when used outside CatalogStateProvider: navigate directly (previous behaviour).
  return {
    params,
    pending: false,
    update(mutate: (p: URLSearchParams) => void) {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      next.delete("page");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    clear() {
      const next = new URLSearchParams();
      const q = params.get("q");
      if (q) next.set("q", q);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
  };
}

export function SortSelect() {
  const { params, update } = useUpdate();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="sort" className="text-slate-500">Sort by</label>
      <select
        id="sort"
        value={params.get("sort") ?? "relevance"}
        onChange={(e) => update((p) => (e.target.value === "relevance" ? p.delete("sort") : p.set("sort", e.target.value)))}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-teal-600"
      >
        <option value="relevance">Relevance</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="discount">Discount</option>
      </select>
    </div>
  );
}

const PRICE_STEPS = [100, 250, 500, 1000, 2500];

function FilterBody({ categories, brands }: { categories: Category[]; brands: string[] }) {
  const uid = useId();
  const { params, update, clear } = useUpdate();
  const category = params.get("category") ?? "";
  const selectedBrands = params.getAll("brand");
  const maxPrice = params.get("max") ?? "";
  const otc = params.get("otc") === "1";
  const stock = params.get("stock") === "1";
  const active = Boolean(category || selectedBrands.length || maxPrice || otc || stock);

  return (
    <div className="space-y-6">
      {active && (
        <button onClick={clear} className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
          <X className="h-4 w-4" /> Clear all filters
        </button>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Category</legend>
        <ul className="space-y-1.5 text-sm">
          <li>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name={`category-${uid}`} checked={!category} onChange={() => update((p) => p.delete("category"))} className="accent-teal-600" />
              All categories
            </label>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name={`category-${uid}`} checked={category === c.slug} onChange={() => update((p) => p.set("category", c.slug))} className="accent-teal-600" />
                {c.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price</legend>
        <ul className="space-y-1.5 text-sm">
          <li>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name={`price-${uid}`} checked={!maxPrice} onChange={() => update((p) => p.delete("max"))} className="accent-teal-600" />
              Any price
            </label>
          </li>
          {PRICE_STEPS.map((n) => (
            <li key={n}>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name={`price-${uid}`} checked={maxPrice === String(n)} onChange={() => update((p) => p.set("max", String(n)))} className="accent-teal-600" />
                Under ₹{n.toLocaleString("en-IN")}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Manufacturer</legend>
        <ul className="space-y-1.5 text-sm">
          {brands.map((b) => (
            <li key={b}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={(e) =>
                    update((p) => {
                      const cur = p.getAll("brand").filter((x) => x !== b);
                      p.delete("brand");
                      [...cur, ...(e.target.checked ? [b] : [])].forEach((x) => p.append("brand", x));
                    })
                  }
                  className="accent-teal-600"
                />
                {b}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Availability</legend>
        <ul className="space-y-1.5 text-sm">
          <li>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={otc} onChange={(e) => update((p) => (e.target.checked ? p.set("otc", "1") : p.delete("otc")))} className="accent-teal-600" />
              No prescription needed
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={stock} onChange={(e) => update((p) => (e.target.checked ? p.set("stock", "1") : p.delete("stock")))} className="accent-teal-600" />
              In stock only
            </label>
          </li>
        </ul>
      </fieldset>
    </div>
  );
}

export function CatalogFilters({ categories, brands }: { categories: Category[]; brands: string[] }) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-44 max-h-[calc(100vh-12rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><SlidersHorizontal className="h-4 w-4" /> Filters</h2>
          <FilterBody categories={categories} brands={brands} />
        </div>
      </aside>
      <details className="group rounded-2xl border border-slate-200 bg-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </summary>
        <div className="border-t border-slate-100 p-4"><FilterBody categories={categories} brands={brands} /></div>
      </details>
    </>
  );
}
