import { query, type Row } from "../db";
import type { Category, Product, ProductDetail, SortKey } from "@/lib/catalog";
import { MEDICINE_COLUMNS, MEDICINE_JOINS, MEDICINE_SELECT, mapMedicine } from "./repo";
import { escapeLike } from "./text";
import { inStockSql } from "../inventory/config";

// Storefront reads. Only medicines that are active (published) are ever returned from here.

const toProduct = (m: ReturnType<typeof mapMedicine>): Product => ({
  id: m.id, slug: m.slug, name: m.name, composition: m.composition, manufacturer: m.manufacturer, category: m.category, categoryName: m.categoryName,
  form: m.form, packSize: m.packSize, mrp: m.mrp, price: m.price, schedule: m.schedule, rx: m.rx, inStock: m.inStock, availableQty: m.availableQty, imageUrl: m.imageUrl,
  orderable: m.orderable, restricted: m.restricted,
});

export async function listCategories(): Promise<Category[]> {
  const rows = await query<Row>(`select c.slug, c.name, c.icon, c.blurb from categories c where c.is_active and exists (select 1 from medicines m where m.category_id = c.id and m.status in ('active','catalog')) order by c.sort_order, c.name`);
  return rows.map((r) => ({ slug: r.slug, name: r.name, icon: r.icon, blurb: r.blurb }));
}

export async function getCategory(slug: string): Promise<Category | null> {
  const rows = await query<Row>(`select slug, name, icon, blurb from categories where slug = $1 and is_active`, [slug]);
  return rows[0] ? { slug: rows[0].slug, name: rows[0].name, icon: rows[0].icon, blurb: rows[0].blurb } : null;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const rows = await query(`${MEDICINE_SELECT} where m.slug = $1 and m.status in ('active','catalog')`, [slug]);
  return rows[0] ? mapMedicine(rows[0]) : null;
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
export async function searchProducts(c: CatalogQuery): Promise<{ items: Product[]; total: number }> {
  // Exact word matches first. Only when nothing matches exactly do we allow close spellings, so a correct
  // search is not diluted by thousands of loosely similar products while a typo still finds its target.
  const exact = await runSearch(c, false);
  if (exact.total > 0 || !(c.q ?? "").trim()) return exact;
  return runSearch(c, true);
}

/**
 * Fetch specific products by id, applying the same visibility and facet filters as search.
 * Used by hybrid (semantic) search to keep vector candidates consistent with the active filters.
 * Returns a map keyed by id so the caller can order results however it likes (e.g. by similarity).
 */
export async function productsByIds(ids: string[], c: Partial<CatalogQuery> = {}): Promise<Map<string, Product>> {
  const out = new Map<string, Product>();
  if (!ids.length) return out;
  const params: unknown[] = [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const needsPrice = Boolean(c.maxPrice || c.inStockOnly || c.sort === "price-asc" || c.sort === "price-desc" || c.sort === "discount");
  const where: string[] = [needsPrice ? `m.status = 'active'` : `m.status in ('active','catalog')`];
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

async function runSearch(c: CatalogQuery, fuzzy: boolean): Promise<{ items: Product[]; total: number }> {
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  // Catalog-only items have no confirmed price or stock, so any filter or sort that depends on those leaves them out.
  const needsPrice = Boolean(c.maxPrice || c.inStockOnly || c.sort === "price-asc" || c.sort === "price-desc" || c.sort === "discount");
  const where: string[] = [needsPrice ? `m.status = 'active'` : `m.status in ('active','catalog')`];

  if (c.category) where.push(`c.slug = ${add(c.category)}`);
  if (c.brands?.length) where.push(`mf.name in (${c.brands.map((b) => add(b)).join(",")})`);
  if (c.maxPrice) where.push(`m.price <= ${add(c.maxPrice)}`);
  if (c.otcOnly) where.push(`m.schedule = 'OTC'`);
  if (c.inStockOnly) where.push(`${inStockSql()}`);

  const tokens = (c.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  const likes: string[] = [];
  for (const t of tokens) {
    const like = add(`%${escapeLike(t)}%`);
    likes.push(like);
    if (fuzzy) {
      const raw = add(t);
      where.push(`(m.search_text like ${like} or word_similarity(${raw}, m.search_text) >= 0.5)`);
    } else where.push(`m.search_text like ${like}`);
  }

  // Parameters used by the WHERE clause. The count query must receive exactly these and nothing else.
  const whereParams = params.slice();
  const clause = `where ${where.join(" and ")}`;

  let order = `(m.status = 'active') desc, ${inStockSql()} desc, m.name`;
  if (c.sort === "price-asc") order = "m.price asc, m.name";
  else if (c.sort === "price-desc") order = "m.price desc, m.name";
  else if (c.sort === "discount") order = "(m.mrp - m.price) / m.mrp desc, m.name";
  else if (tokens.length) {
    const scores = tokens.map((t, i) => `greatest(word_similarity(${add(t)}, lower(m.name)), (case when m.search_text like ${likes[i]} then 0.5 else 0 end))`);
    const prefix = add(`${escapeLike(tokens.join(" "))}%`);
    order = `((${scores.join(" + ")}) + (case when lower(m.name) like ${prefix} then 1 else 0 end)) desc, (m.status = 'active') desc, ${inStockSql()} desc, m.name`;
  }

  const countRows = await query<{ n: string }>(`select count(*) as n ${MEDICINE_JOINS} ${clause}`, whereParams);
  const limit = add(c.pageSize);
  const offset = add((c.page - 1) * c.pageSize);
  const rows = await query(`${MEDICINE_COLUMNS} ${MEDICINE_JOINS} ${clause} order by ${order} limit ${limit} offset ${offset}`, params);
  return { items: rows.map((r) => toProduct(mapMedicine(r))), total: Number(countRows[0].n) };
}
