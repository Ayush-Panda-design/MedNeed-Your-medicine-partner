import { aiEnabled } from "../env";
import { searchProducts, productsByIds, type CatalogQuery } from "../catalog/queries";
import type { Product } from "@/lib/catalog";
import { AiUnavailable } from "./gemini";
import { embedQuery } from "./embeddings";
import { cosineTopK, indexReady } from "./vector-index";
import { smartSearch } from "./smart-search";

/** Candidate pool size for fusion. Broad keyword results (>= this) skip fusion and keep exact pagination. */
const POOL = 100;

/** Reciprocal Rank Fusion: combine several ranked lists into one, rewarding items that rank high in any list. */
function rrf(lists: Product[][], k = 60): Product[] {
  const score = new Map<string, number>();
  const byId = new Map<string, Product>();
  for (const list of lists) {
    list.forEach((p, rank) => {
      score.set(p.id, (score.get(p.id) ?? 0) + 1 / (k + rank + 1));
      if (!byId.has(p.id)) byId.set(p.id, p);
    });
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(id)!);
}

/**
 * Hybrid search: keyword (precise, for brands/exact terms) fused with semantic vector recall (for natural language
 * and symptoms), with the LLM query-rewrite as a final fallback.
 *
 * Safety: when there is no text query, when the user is sorting by price/discount, when AI is off, or when the vector
 * index isn't populated yet, this behaves EXACTLY like the existing search — same results, totals and pagination.
 * Vectors only change things for thin or empty keyword results, which is where semantic recall actually helps.
 */
export async function hybridSearch(c: CatalogQuery): Promise<{ items: Product[]; total: number; interpretedAs?: string }> {
  const q = (c.q ?? "").trim();
  const explicitSort = c.sort === "price-asc" || c.sort === "price-desc" || c.sort === "discount";
  if (!q || explicitSort) return searchProducts(c);

  const base = await searchProducts(c);
  // Plenty of keyword hits already: keep exact behaviour (and correct deep pagination).
  if (base.total >= POOL) return base;

  // Gather semantic candidates, if the index is ready. Any failure degrades silently to keyword-only.
  let vectorOrdered: Product[] = [];
  if (aiEnabled()) {
    try {
      if (await indexReady()) {
        const qv = await embedQuery(q);
        const top = await cosineTopK(qv, POOL);
        if (top.length) {
          const byId = await productsByIds(top.map((t) => t.id), c);
          vectorOrdered = top.map((t) => byId.get(t.id)).filter((p): p is Product => Boolean(p));
        }
      }
    } catch (e) {
      if (!(e instanceof AiUnavailable)) console.error("[hybrid]", e);
    }
  }

  // No semantic signal available → preserve current behaviour (keyword, or the LLM-rewrite fallback on a miss).
  if (vectorOrdered.length === 0) return base.total > 0 ? base : smartSearch(c);

  // Fuse the full thin keyword set with the semantic candidates.
  const kwFull = base.total > 0 ? (await searchProducts({ ...c, page: 1, pageSize: POOL })).items : [];
  const fused = rrf([kwFull, vectorOrdered]);
  const start = (c.page - 1) * c.pageSize;
  const items = fused.slice(start, start + c.pageSize);
  // Only flag it as an interpreted/semantic result when keyword search alone found nothing.
  const interpretedAs = base.total === 0 ? `Showing related matches for "${q}"` : undefined;
  return { items, total: fused.length, interpretedAs };
}
