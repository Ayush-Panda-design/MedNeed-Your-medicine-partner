"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import type { Category } from "@/lib/catalog";
import { CATEGORY_TILES, FALLBACK_TILE } from "@/lib/categoryTiles";
import { CategoryArt } from "./category/CategoryArt";
import "./category/tiles.css";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Header "Categories" button: opens a visual menu of every category (the same illustrations as the homepage tiles),
 * instead of a long strip of plain links. Closes on outside click, Escape, or after choosing.
 */
export function CategoryMenu({ categories, overlay, ink = false, className = "" }: { categories: Category[]; overlay: boolean; ink?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Categories"
        aria-controls={id}
        className={`flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg px-[8px] text-sm sm:h-auto sm:min-w-0 sm:justify-start sm:px-3 sm:py-2 font-semibold transition-colors ${overlay ? "text-white hover:bg-white/10" : ink ? "text-[#0c3640] hover:bg-white/55" : "text-slate-800 hover:bg-teal-50 hover:text-teal-800"}`}
      >
        <LayoutGrid className="h-[20px] w-[20px]" aria-hidden />
        <span className="hidden sm:inline">Categories</span>
        <ChevronDown className={`hidden h-4 w-4 transition-transform sm:block ${open ? "rotate-180" : ""} ${overlay ? "text-white/70" : ink ? "text-[#2a5d66]" : "text-slate-400"}`} aria-hidden />
      </button>

      {open && (
        <div
          id={id}
          className="mn-catmenu fixed inset-x-3 top-[6.5rem] z-50 max-h-[calc(100svh-6rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl shadow-slate-900/15 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[min(46rem,calc(100vw-2rem))]"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">Shop by category</p>
            <span className="flex items-center gap-2">
              {/* On the narrowest phones the theme switch lives here instead of the header. */}
              <ThemeToggle className="text-slate-700 hover:bg-slate-100 min-[360px]:hidden" />
              <Link href="/medicines" onClick={() => setOpen(false)} className="text-sm font-semibold text-teal-700 hover:underline">
                All medicines →
              </Link>
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {categories.map((c, i) => {
              const t = CATEGORY_TILES[c.slug] ?? FALLBACK_TILE;
              return (
                <li key={c.slug}>
                  <Link
                    href={`/medicines?category=${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="ct-tile mn-catmenu-item group rounded-xl p-1.5 hover:bg-slate-50"
                    style={{ "--c1": t.c1, "--c2": t.c2, "--a": t.a, "--p": t.p, "--i": i } as CSSProperties}
                  >
                    <span className="ct-card !rounded-xl">
                      <span className="ct-arc" aria-hidden />
                      <CategoryArt slug={c.slug} className="ct-art" />
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-center text-xs font-semibold leading-tight text-slate-700 group-hover:text-teal-700">{c.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
