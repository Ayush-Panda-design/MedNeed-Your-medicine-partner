import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import type { Category } from "@/lib/catalog";
import { CATEGORY_TILES, FALLBACK_TILE } from "@/lib/categoryTiles";
import { SectionHead } from "../SectionHead";
import { CategoryArt } from "./CategoryArt";
import "./tiles.css";

/**
 * Homepage "Shop by category": a grid of bright square tiles, each with a soft arc, a folded corner and an
 * illustration (or a licensed photo, when one is configured), with the category name underneath.
 * Server-rendered and CSS-only: no client JavaScript.
 */
export function CategoryTiles({ categories, counts = {} }: { categories: Category[]; counts?: Record<string, number> }) {
  return (
    <div>
      <SectionHead
        eyebrow="Categories"
        title="Shop by category"
        sub="Everything for your family's health in one place"
        action={
          <Link href="/medicines" className="group hidden shrink-0 items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 sm:inline-flex">
            View all <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        }
      />
      <ul className="ct-grid" role="list">
        {categories.map((c, i) => {
          const t = CATEGORY_TILES[c.slug] ?? FALLBACK_TILE;
          const n = counts[c.slug] ?? 0;
          const style = { "--c1": t.c1, "--c2": t.c2, "--a": t.a, "--p": t.p, "--i": i } as CSSProperties;
          return (
            <li key={c.slug}>
              <Link href={`/medicines?category=${c.slug}`} className="ct-tile" style={style} aria-label={n > 0 ? `${c.name}, ${n.toLocaleString("en-IN")} products` : c.name}>
                <span className="ct-card">
                  <span className="ct-arc" aria-hidden />
                  <span className="ct-fold" aria-hidden />
                  {t.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static square asset from /public
                    <img src={t.photo} alt="" className="ct-photo" loading="lazy" decoding="async" width={600} height={600} />
                  ) : (
                    <CategoryArt slug={c.slug} className="ct-art" />
                  )}
                  {t.badge && <span className="ct-badge">{t.badge}</span>}
                </span>
                <span className="ct-name">{c.name}</span>
                {n > 0 && <span className="ct-count">{n.toLocaleString("en-IN")} items</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/medicines" className="mt-5 flex items-center justify-center gap-1 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-teal-700 sm:hidden">
        View all medicines <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
