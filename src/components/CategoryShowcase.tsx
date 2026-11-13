"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/lib/catalog";
import { CATEGORY_UI, FALLBACK_UI, FEATURED_SLUGS, FILTERS } from "@/lib/categoryShowcase";
import { CategoryIcon } from "./CategoryIcon";
import { SectionHead } from "./SectionHead";
import "./category/showcase.css";

type Filter = (typeof FILTERS)[number]["id"];
const uiFor = (slug: string) => CATEGORY_UI[slug] ?? FALLBACK_UI;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Homepage "Shop by category": a bento grid (large featured cards + compact cards), a type filter that reflows
 * the grid, and a snap-scrolling row on phones. Links, names and descriptions are exactly what the database holds.
 */
export function CategoryShowcase({ categories, counts = {} }: { categories: Category[]; counts?: Record<string, number> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const gridRef = useRef<HTMLUListElement>(null);
  const flip = useRef<Map<string, DOMRect> | null>(null);
  const busy = useRef(false);

  const visible = useMemo(() => categories.filter((c) => filter === "all" || uiFor(c.slug).type === filter), [categories, filter]);

  // Reveal the cards with a short stagger the first time the grid scrolls into view.
  useEffect(() => {
    const ul = gridRef.current;
    if (!ul || reducedMotion() || !("IntersectionObserver" in window)) return;
    setReady(true);
    if (ul.getBoundingClientRect().top < window.innerHeight * 0.9) { setShown(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    io.observe(ul);
    return () => io.disconnect();
  }, []);

  // After a filter change, slide the cards that stayed from their old position to the new one (FLIP).
  useLayoutEffect(() => {
    const ul = gridRef.current;
    const prev = flip.current;
    if (!ul || !prev) return;
    flip.current = null;
    ul.querySelectorAll<HTMLElement>("[data-key]").forEach((li) => {
      const p = prev.get(li.dataset.key ?? "");
      if (!p) return;
      const n = li.getBoundingClientRect();
      const dx = p.left - n.left, dy = p.top - n.top;
      if (!dx && !dy) return;
      li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(.22, 1, .36, 1)" });
    });
  }, [filter]);

  function changeFilter(next: Filter) {
    if (next === filter || busy.current) return;
    const ul = gridRef.current;
    if (!ul || reducedMotion()) { setFilter(next); return; }
    const keep = new Set(categories.filter((c) => next === "all" || uiFor(c.slug).type === next).map((c) => c.slug));
    keep.add("__all");
    const items = Array.from(ul.querySelectorAll<HTMLElement>("[data-key]"));
    const going = items.filter((li) => !keep.has(li.dataset.key ?? ""));
    busy.current = true;
    ul.style.minHeight = `${ul.offsetHeight}px`; // hold the height while cards move, so the page below doesn't jump
    const apply = () => {
      const rects = new Map<string, DOMRect>();
      items.forEach((li) => { if (!going.includes(li)) rects.set(li.dataset.key ?? "", li.getBoundingClientRect()); });
      flip.current = rects;
      setFilter(next);
      window.setTimeout(() => { ul.style.minHeight = ""; busy.current = false; }, 380);
    };
    if (!going.length) return apply();
    going.forEach((li) => li.classList.add("cs-leaving"));
    window.setTimeout(apply, 160);
  }

  const gridClass = `cs-grid cs-scroll ${ready && !shown ? "cs-pre" : ""} ${shown ? "cs-show" : ""} max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:overflow-x-auto max-md:px-4 max-md:py-2 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-6 md:grid-flow-dense lg:auto-rows-[minmax(88px,auto)]`;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between [&>div:first-child]:!mb-0">
        <SectionHead eyebrow="Categories" title="Shop by category" sub="Everything for your family's health in one place" />
        <div className="flex items-center gap-4">
          <div role="group" aria-label="Filter categories" className="cs-scroll -mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => changeFilter(f.id)} className="cs-filter">{f.label}</button>
            ))}
          </div>
          <Link href="/medicines" className="hidden items-center gap-1 whitespace-nowrap text-sm font-semibold text-teal-700 hover:underline sm:flex">View all <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">Showing {visible.length} {visible.length === 1 ? "category" : "categories"}</p>

      <ul ref={gridRef} className={gridClass}>
        {visible.map((c, i) => <CategoryTile key={c.slug} category={c} index={i} featured={FEATURED_SLUGS.includes(c.slug)} count={counts[c.slug] ?? 0} />)}
        <li data-key="__all" style={{ ["--i" as string]: Math.min(visible.length, 12) }} className="max-md:w-[70vw] max-md:max-w-[260px] max-md:shrink-0 max-md:snap-start lg:col-span-2">
          <Link href="/medicines" className="cs-card cs-viewall min-h-[88px] font-semibold text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
            <span className="inline-flex items-center gap-1.5">View all medicines <ArrowRight className="h-4 w-4" /></span>
            <span className="text-xs font-normal text-ink-2">Browse the full catalogue</span>
          </Link>
        </li>
      </ul>

      {visible.length === 0 && (
        <p className="mt-4 rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-2">No categories in this group right now.</p>
      )}
    </>
  );
}

function CategoryTile({ category: c, index, featured, count }: { category: Category; index: number; featured: boolean; count: number }) {
  const ui = uiFor(c.slug);
  const chips = featured ? ui.popular ?? [] : [];
  return (
    <li
      data-key={c.slug}
      style={{ ["--i" as string]: Math.min(index, 12) }}
      className={`${featured ? "md:col-span-2 lg:row-span-2" : ""} max-md:w-[82vw] max-md:max-w-[340px] max-md:shrink-0 max-md:snap-start lg:col-span-2`}
    >
      <div className={`cs-card cs-t-${ui.tint} ${featured ? "cs-featured" : ""}`}>
        <span aria-hidden className="cs-clip"><span className="cs-mark"><CategoryIcon name={c.icon} className="h-full w-full" /></span></span>

        <div className="relative flex items-center gap-3">
          <span aria-hidden className="cs-tile"><CategoryIcon name={c.icon} className="h-5 w-5 lg:h-[22px] lg:w-[22px]" /></span>
          <div className="min-w-0 flex-1">
            <Link href={`/medicines?category=${c.slug}`} className="cs-main block truncate text-[15px]">{c.name}</Link>
            <p className="truncate text-xs text-ink-2">{c.blurb}</p>
            <span className="cs-meta">{ui.meta}</span>
          </div>
          <ArrowRight aria-hidden className={`cs-arrow h-4 w-4 ${featured ? "md:hidden" : ""}`} />
        </div>

        {featured && (
          <div className="relative mt-auto hidden flex-col gap-3 pt-4 md:flex">
            {chips.length > 0 && (
              <div className="cs-popular flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-2">Popular</span>
                {chips.map((t) => <Link key={t} href={`/medicines?q=${encodeURIComponent(t)}`} className="cs-chip">{t}</Link>)}
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span aria-hidden className="inline-flex items-center gap-1 font-bold" style={{ color: "var(--t-fg)" }}>Explore <ArrowRight className="h-3.5 w-3.5" /></span>
              {count > 0 && <span className="font-medium text-ink-2">{count.toLocaleString("en-IN")} {count === 1 ? "product" : "products"}</span>}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
