import { aiEnabled } from "../env";
import { listCategories, searchProducts, type CatalogQuery } from "../catalog/queries";
import type { Product } from "@/lib/catalog";
import { cached } from "./cache";
import { AiUnavailable, generateJSON } from "./gemini";

type Intent = { keywords: string[]; categorySlug: string | null; note: string };

/** Ask the model to turn a natural-language / misspelt query into catalogue terms. Cached for a week per query. */
async function interpret(q: string): Promise<Intent | null> {
  try {
    return await cached("search-intent", q.toLowerCase(), 7 * 24 * 3600, async () => {
      const cats = (await listCategories()).map((c) => `${c.slug} (${c.name})`).join(", ");
      const system =
        `You map a customer's search on an Indian pharmacy to catalogue terms. Reply ONLY as JSON ` +
        `{"keywords": string[], "categorySlug": string|null, "note": string}. ` +
        `keywords: 2-5 lowercase generic medicine or active-ingredient terms that are likely to appear in product names or ` +
        `compositions for this need (e.g. "acidity" -> ["antacid","omeprazole","pantoprazole"]; "sugar tablet" -> ["metformin","glimepiride"]). ` +
        `categorySlug: the single best match from this list, or null: ${cats}. ` +
        `note: a short human phrase like "Showing results for antacids". ` +
        `Never invent brand names. Never give medical advice or dosing.`;
      return await generateJSON<Intent>([{ text: `Customer searched: "${q}"` }], { system, maxOutputTokens: 256 });
    });
  } catch (e) {
    if (!(e instanceof AiUnavailable)) console.error("[ai search]", e);
    return null;
  }
}

/**
 * Normal catalogue search, with an AI fallback: when an exact + fuzzy search finds nothing for a typed query,
 * interpret the query and try again with the mapped terms. If AI is off or unavailable, behaves exactly like searchProducts.
 */
export async function smartSearch(c: CatalogQuery): Promise<{ items: Product[]; total: number; interpretedAs?: string }> {
  const base = await searchProducts(c);
  const q = (c.q ?? "").trim();
  if (base.total > 0 || !aiEnabled() || !q || c.category) return base;

  const intent = await interpret(q);
  if (!intent) return base;

  // Try each keyword on its own. Product search ANDs the words in a query, so joining keywords would require
  // one product to contain all of them at once (almost never true). Taking the first keyword that finds
  // something keeps the normal ranking and pagination intact.
  for (const kw of intent.keywords) {
    const term = kw.trim();
    if (!term) continue;
    const hit = await searchProducts({ ...c, q: term });
    if (hit.total > 0) return { ...hit, interpretedAs: intent.note || `Showing results for ${term}` };
  }
  if (intent.categorySlug) {
    const byCategory = await searchProducts({ ...c, q: undefined, category: intent.categorySlug });
    if (byCategory.total > 0) return { ...byCategory, interpretedAs: intent.note || "Showing related products" };
  }
  return base;
}
