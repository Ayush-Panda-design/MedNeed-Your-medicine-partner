import { query, type Row } from "../db";
import { infoForMedicine, symptomSaltIds } from "./salt-info";
import type { Category, Product, ProductDetail, SortKey } from "@/lib/catalog";
import { MEDICINE_COLUMNS, MEDICINE_JOINS, MEDICINE_SELECT, mapMedicine } from "./repo";
import { escapeLike } from "./text";
import { inStockSql } from "../inventory/config";
import { cached } from "../cache";

// Storefront reads. Only medicines that are active (published) are ever returned from here.

const toProduct = (m: ReturnType<typeof mapMedicine>): Product => ({
  id: m.id, slug: m.slug, name: m.name, composition: m.composition, manufacturer: m.manufacturer, category: m.category, categoryName: m.categoryName,
  form: m.form, packSize: m.packSize, mrp: m.mrp, price: m.price, schedule: m.schedule, rx: m.rx, inStock: m.inStock, availableQty: m.availableQty, imageUrl: m.imageUrl,
  orderable: m.orderable, restricted: m.restricted,
});

export async function listCategories(): Promise<Category[]> {
  return cached("categories", 300_000, listCategoriesNow);
}
async function listCategoriesNow(): Promise<Category[]> {
  const rows = await query<Row>(`select c.slug, c.name, c.icon, c.blurb from categories c where c.is_active and exists (select 1 from medicines m where m.category_id = c.id and m.status in ('active','catalog')) order by c.sort_order, c.name`);
  return rows.map((r) => ({ slug: r.slug, name: r.name, icon: r.icon, blurb: r.blurb }));
}

/** Number of products customers can see in each category (live + catalogue-only), for the homepage. */
export async function categoryCounts(): Promise<Record<string, number>> {
  return cached("category-counts", 600_000, categoryCountsNow);
}
async function categoryCountsNow(): Promise<Record<string, number>> {
  const rows = await query<{ slug: string; n: string }>(
    `select c.slug, count(m.id) as n from categories c join medicines m on m.category_id = c.id and m.status in ('active','catalog') where c.is_active group by c.slug`,
  );
  return Object.fromEntries(rows.map((r) => [r.slug, Number(r.n)]));
}

export async function getCategory(slug: string): Promise<Category | null> {
  const rows = await query<Row>(`select slug, name, icon, blurb from categories where slug = $1 and is_active`, [slug]);
  return rows[0] ? { slug: rows[0].slug, name: rows[0].name, icon: rows[0].icon, blurb: rows[0].blurb } : null;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const rows = await query(`${MEDICINE_SELECT} where m.slug = $1 and m.status in ('active','catalog')`, [slug]);
  if (!rows[0]) return null;
  const p = mapMedicine(rows[0]);
  // Fill gaps from the ingredient information (general text, marked as such). The product's own text always wins.
  const gaps = p.uses.length === 0 || !p.howToUse || p.sideEffects.length === 0 || p.precautions.length === 0;
  if (!gaps) return p;
  const info = await infoForMedicine(p.id).catch(() => null);
  if (!info) return p;
  return {
    ...p,
    uses: p.uses.length ? p.uses : info.uses,
    howToUse: p.howToUse || info.howToUse,
    sideEffects: p.sideEffects.length ? p.sideEffects : info.sideEffects,
    precautions: p.precautions.length ? p.precautions : info.precautions,
    ingredientInfo: { reviewed: info.reviewed },
  };
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const ph = slugs.map((_, i) => `$${i + 1}`).join(",");
  const rows = await query(`${MEDICINE_SELECT} where m.status = 'active' and m.slug in (${ph})`, slugs);
  return rows.map((r) => toProduct(mapMedicine(r)));
}

/** Same salts at the same strengths, same form. Cheapest first. Never matches on category alone. */
export async function getSubstitutes(p: { id: string }, limit = 6): Promise<Product[]> {
  const rows = await query(
    `${MEDICINE_SELECT}
     where m.status in ('active','catalog') and m.id <> $1 and m.composition_key <> ''
       and m.composition_key = (select composition_key from medicines where id = $1)
       and m.form = (select form from medicines where id = $1)
     order by (m.status = 'active') desc, m.price asc, m.name limit ${Math.min(limit, 20)}`,
    [p.id],
  );
  return rows.map((r) => toProduct(mapMedicine(r)));
}

export async function getRelated(p: { id: string; category: string }, limit = 4): Promise<Product[]> {
  const rows = await query(
    `${MEDICINE_SELECT} where m.status in ('active','catalog') and c.slug = $2 and m.id <> $1 order by (m.status = 'active') desc, ${inStockSql()} desc, m.name limit ${Math.min(limit, 20)}`,
    [p.id, p.category],
  );
  return rows.map((r) => toProduct(mapMedicine(r)));
}

export async function listBrands(limit = 30): Promise<string[]> {
  return cached(`brands:${limit}`, 600_000, () => listBrandsNow(limit));
}
async function listBrandsNow(limit: number): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `select mf.name from medicines m join manufacturers mf on mf.id = m.manufacturer_id where m.status in ('active','catalog')
     group by mf.name order by count(*) desc, mf.name limit ${limit}`,
  );
  return rows.map((r) => r.name);
}

export async function listDeals(limit = 4): Promise<Product[]> {
  const rows = await query(`${MEDICINE_SELECT} where m.status = 'active' and ${inStockSql()} and m.price < m.mrp order by (m.mrp - m.price) / m.mrp desc, m.name limit ${limit}`);
  return rows.map((r) => toProduct(mapMedicine(r)));
}

export async function listNewest(limit = 8): Promise<Product[]> {
  const rows = await query(`${MEDICINE_SELECT} where m.status = 'active' and ${inStockSql()} order by m.created_at desc, m.name limit ${limit}`);
  return rows.map((r) => toProduct(mapMedicine(r)));
}

export async function listAllActiveSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const rows = await query<Row>(`select slug, updated_at from medicines where status = 'active' order by slug`);
  return rows.map((r) => ({ slug: r.slug, updatedAt: new Date(r.updated_at).toISOString() }));
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  brands?: string[];
  maxPrice?: number;
  otcOnly?: boolean;
  inStockOnly?: boolean;
  sort?: SortKey;
  page: number;
  pageSize: number;
};

/**
 * Search matches every word of the query against name, salts, manufacturer, category and uses.
 * A word matches if it appears in the text OR is close enough to a word in it (pg_trgm), so "paracetmol" still finds Paracetamol.
 */
export async function searchProducts(input: CatalogQuery): Promise<{ items: Product[]; total: number }> {
  const c = input.q ? { ...input, q: normalizeQuery(input.q) } : input;
  // Exact word matches first. Only when nothing matches exactly do we allow close spellings, so a correct
  // search is not diluted by thousands of loosely similar products while a typo still finds its target.
  const exact = await runSearch(c, false);
  const q = (c.q ?? "").trim();
  if (!q) return exact;
  // Thin results: also look for medicines whose ingredients are used for what was typed ("fever", "acidity").
  // Keyword matches stay first; nothing changes while no ingredient information has been stored.
  if (exact.total < SYMPTOM_BELOW_HITS) {
    const salts = await symptomSaltIds(q).catch(() => [] as string[]);
    if (salts.length > 0) return runSearch(c, false, salts);
  }
  if (exact.total > 0) return exact;
  return runSearch(c, true);
}

/** Common Hindi/Hinglish health words customers type, mapped to the English words the catalogue uses. */
const HINGLISH: [RegExp, string][] = [
  [/\b(sir|sar|head) ?dard\b/g, "headache"], [/\bbukh?aar\b/g, "fever"], [/\bpet (dard|mein dard)\b/g, "stomach pain"], [/\bkh?ansi\b/g, "cough"],
  [/\bzukh?am\b|\bzukaam\b/g, "cold"], [/\bdast\b/g, "diarrhoea"], [/\bulti\b/g, "vomiting"], [/\bjalan\b/g, "acidity"], [/\bchakkar\b/g, "dizziness"],
  [/\bkamzori\b/g, "weakness"], [/\bdaant dard\b/g, "toothache"], [/\bbadan dard\b/g, "body pain"], [/\bneend\b/g, "sleep"], [/\bkabz\b/g, "constipation"],
];
/** Words that carry no meaning for a product search ("medicine for acidity in the morning"); dropped unless nothing else is left. */
const FILLER = new Set(["for", "and", "the", "of", "in", "with", "to", "a", "an", "my", "me", "best", "buy", "medicine", "medicines", "need", "want", "please", "on", "at", "is"]);

export function normalizeQuery(q: string) {
  let s = q.toLowerCase().trim();
  for (const [re, to] of HINGLISH) s = s.replace(re, to);
  return s;
}

/** Below this many keyword hits, a search is widened with ingredient-based (symptom) matches. */
const SYMPTOM_BELOW_HITS = 40;

/**
 * Fetch specific products by id, applying the same visibility and facet filters as search.
 * Used by hybrid (semantic) search to keep vector candidates consistent with the active filters.
 * Returns a map keyed by id so the caller can order results however it likes (e.g. by similarity).
 */
/** Filters that only make sense for products with a confirmed price and stock (catalog-only items have neither). */
export const needsConfirmedPrice = (c: Partial<CatalogQuery>) => Boolean(c.maxPrice || c.inStockOnly);

export async function productsByIds(ids: string[], c: Partial<CatalogQuery> = {}): Promise<Map<string, Product>> {
  const out = new Map<string, Product>();
  if (!ids.length) return out;
  const params: unknown[] = [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const where: string[] = [needsConfirmedPrice(c) ? `m.status = 'active'` : `m.status in ('active','catalog')`];
  where.push(`m.id = any(${add(ids)}::uuid[])`);
  if (c.category) where.push(`c.slug = ${add(c.category)}`);
  if (c.brands?.length) where.push(`mf.name in (${c.brands.map((b) => add(b)).join(",")})`);
  if (c.maxPrice) where.push(`m.price <= ${add(c.maxPrice)}`);
  if (c.otcOnly) where.push(`m.schedule = 'OTC'`);
  if (c.inStockOnly) where.push(`${inStockSql()}`);
  const rows = await query(`${MEDICINE_COLUMNS} ${MEDICINE_JOINS} where ${where.join(" and ")}`, params);
  for (const r of rows) {
    const p = toProduct(mapMedicine(r));
    out.set(p.id, p);
  }
  return out;
}

async function runSearch(c: CatalogQuery, fuzzy: boolean, symptomSalts?: string[]): Promise<{ items: Product[]; total: number }> {
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  // Catalog-only items have no confirmed price or stock, so the price and stock *filters* leave them out.
  // Sorting never removes anything: it only changes the order (see below).
  const where: string[] = [needsConfirmedPrice(c) ? `m.status = 'active'` : `m.status in ('active','catalog')`];

  if (c.category) where.push(`c.slug = ${add(c.category)}`);
  if (c.brands?.length) where.push(`mf.name in (${c.brands.map((b) => add(b)).join(",")})`);
  if (c.maxPrice) where.push(`m.price <= ${add(c.maxPrice)}`);
  if (c.otcOnly) where.push(`m.schedule = 'OTC'`);
  if (c.inStockOnly) where.push(`${inStockSql()}`);

  const typed = (c.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const meaningful = typed.filter((t) => !FILLER.has(t));
  const tokens = (meaningful.length ? meaningful : typed).slice(0, 6);
  const likes: string[] = [];
  for (const t of tokens) {
    const like = add(`%${escapeLike(t)}%`);
    likes.push(like);
    if (symptomSalts) continue; // keyword words are combined with the ingredient match below
    if (fuzzy) {
      const raw = add(t);
      // %> lets the trigram index find close spellings (threshold set in migration 0016); the explicit check keeps
      // the 0.5 cut-off even where that database setting is unavailable.
      where.push(`(m.search_text like ${like} or (m.search_text %> ${raw} and word_similarity(${raw}, m.search_text) >= 0.5))`);
    } else where.push(`m.search_text like ${like}`);
  }

  // Symptom mode: a medicine matches when every typed word is in its text OR it contains an ingredient used for it.
  const kwMatch = likes.length ? likes.map((l) => `m.search_text like ${l}`).join(" and ") : "false";
  if (symptomSalts) where.push(`((${kwMatch}) or m.id in (select ms.medicine_id from medicine_salts ms where ms.salt_id = any(${add(symptomSalts)}::uuid[])))`);

  // Parameters used by the WHERE clause. The count query must receive exactly these and nothing else.
  const whereParams = params.slice();
  const clause = `where ${where.join(" and ")}`;

  // Default browse order matches medicines_browse_idx, so a page is read from the index instead of sorting the table.
  let order = `(m.status = 'active') desc, (m.stock_qty > 0) desc, m.name`;
  // Price/discount sorts: products with a confirmed price first, in the chosen order; catalog-only products (whose
  // reference price is not shown to customers) follow, by name.
  const priced = `(m.status = 'active') desc`;
  if (c.sort === "price-asc") order = `${priced}, (case when m.status = 'active' then m.price end) asc nulls last, m.name`;
  else if (c.sort === "price-desc") order = `${priced}, (case when m.status = 'active' then m.price end) desc nulls last, m.name`;
  else if (c.sort === "discount") order = `${priced}, (case when m.status = 'active' then (m.mrp - m.price) / m.mrp end) desc nulls last, m.name`;
  else if (symptomSalts) {
    // Direct keyword matches first, then medicines that can be bought, then simpler (fewer-ingredient) products.
    order = `(${kwMatch}) desc, (m.status = 'active') desc, ${inStockSql()} desc, length(m.composition_key), m.name`;
  } else if (tokens.length) {
    const scores = tokens.map((t, i) => `greatest(word_similarity(${add(t)}, lower(m.name)), (case when m.search_text like ${likes[i]} then 0.5 else 0 end))`);
    const prefix = add(`${escapeLike(tokens.join(" "))}%`);
    // Scores are grouped in quarter steps so near-equal matches tie; then the plainer product wins (fewer ingredients, shorter name):
    // "paracetamol" lists Paracetamol tablets before a Tramadol+Paracetamol combination.
    const score = `round((((${scores.join(" + ")}) + (case when lower(m.name) like ${prefix} then 1 else 0 end))::numeric) * 4)`;
    order = `${score} desc, (m.status = 'active') desc, ${inStockSql()} desc, length(m.composition_key), length(m.name), m.name`;
  }

  // Totals change rarely and counting tens of thousands of rows is the slowest part of a page, so they are cached briefly.
  const total = await cached(`count:${clause}:${JSON.stringify(whereParams)}`, 120_000, async () =>
    Number((await query<{ n: string }>(`select count(*) as n ${MEDICINE_JOINS} ${clause}`, whereParams))[0].n),
  );
  const limit = add(c.pageSize);
  const offset = add((c.page - 1) * c.pageSize);
  const rows = await query(`${MEDICINE_COLUMNS} ${MEDICINE_JOINS} ${clause} order by ${order} limit ${limit} offset ${offset}`, params);
  return { items: rows.map((r) => toProduct(mapMedicine(r))), total };
}
