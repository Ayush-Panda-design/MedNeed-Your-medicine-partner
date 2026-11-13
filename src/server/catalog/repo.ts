import { ApiError } from "../http";
import { audit } from "../auth/users";
import { db, query, type Q, type Row, type Tx } from "../db";
import { sellableQtySql } from "../inventory/config";
import type { ProductDetail, Schedule } from "@/lib/catalog";
import { buildSearchText, cleanSaltName, compositionKey, escapeLike, formatComposition, slugify, type SaltInput } from "./text";
import type { MedicineAction, MedicineFields } from "./schema";

type Runner = { query: Q };
export type Actor = { id: string; ip?: string };

export type AdminMedicine = ProductDetail & {
  status: "draft" | "catalog" | "active" | "discontinued";
  noOnlineSale: boolean;
  categoryId: string;
  source: string;
  sourceRef: string | null;
  verifiedAt: string | null;
  createdAt: string;
  /** Total units on hand (including near-expiry). */
  stockQty: number;
  discountPercent: number;
  reorderLevel: number;
};

/** Discount that turns `mrp` into `price`, as a percentage with 2 decimals (0-90). */
export const discountFor = (mrp: number, price: number) => Math.min(90, Math.max(0, Math.round(((mrp - price) / mrp) * 10000) / 100));

const json = <T,>(v: unknown, fallback: T): T => {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
};
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : "");

export const MEDICINE_COLUMNS = `
  select m.*, ${sellableQtySql("m")} as sellable_qty, mf.name as manufacturer_name, c.slug as category_slug, c.name as category_name,
    coalesce((select json_agg(json_build_object('name', s.name, 'strength', ms.strength) order by ms.position)
              from medicine_salts ms join salts s on s.id = ms.salt_id where ms.medicine_id = m.id), '[]'::json) as salts_json`;
export const MEDICINE_JOINS = `
  from medicines m
  join manufacturers mf on mf.id = m.manufacturer_id
  join categories c on c.id = m.category_id`;
export const MEDICINE_SELECT = `${MEDICINE_COLUMNS}${MEDICINE_JOINS}`;

export function mapMedicine(r: Row): AdminMedicine {
  const salts = json<SaltInput[]>(r.salts_json, []);
  const schedule = r.schedule as Schedule;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    composition: formatComposition(salts),
    manufacturer: r.manufacturer_name,
    category: r.category_slug,
    categoryName: r.category_name,
    categoryId: r.category_id,
    form: r.form,
    packSize: r.pack_size,
    mrp: Number(r.mrp),
    price: Number(r.price),
    schedule,
    rx: schedule !== "OTC",
    inStock: Number(r.sellable_qty) > 0,
    availableQty: Number(r.sellable_qty),
    imageUrl: r.image_url,
    orderable: r.status === "active",
    restricted: schedule === "X" || Boolean(r.no_online_sale),
    description: r.description,
    uses: json<string[]>(r.uses, []),
    howToUse: r.how_to_use,
    sideEffects: json<string[]>(r.side_effects, []),
    precautions: json<string[]>(r.precautions, []),
    salts,
    dataStatus: r.data_status,
    nppaCeilingPrice: r.nppa_ceiling_price == null ? null : Number(r.nppa_ceiling_price),
    updatedAt: iso(r.updated_at),
    status: r.status,
    noOnlineSale: r.no_online_sale,
    source: r.source,
    sourceRef: r.source_ref,
    verifiedAt: r.verified_at ? iso(r.verified_at) : null,
    createdAt: iso(r.created_at),
    stockQty: Number(r.stock_qty),
    discountPercent: Number(r.discount_percent),
    reorderLevel: Number(r.reorder_level),
  };
}

export async function getAdminMedicine(id: string): Promise<AdminMedicine | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await query(`${MEDICINE_SELECT} where m.id = $1`, [id]);
  return rows[0] ? mapMedicine(rows[0]) : null;
}

/* ---------- lookups that create on demand ---------- */

export async function ensureManufacturer(t: Runner, name: string, cache?: Map<string, string>) {
  const clean = name.replace(/\s+/g, " ").trim();
  const key = clean.toLowerCase();
  const hit = cache?.get(key);
  if (hit) return hit;
  const rows = await t.query<{ id: string }>(
    `insert into manufacturers (name) values ($1) on conflict ((lower(name))) do update set name = manufacturers.name returning id`,
    [clean],
  );
  cache?.set(key, rows[0].id);
  return rows[0].id;
}

export async function ensureSalt(t: Runner, name: string, cache?: Map<string, string>) {
  const clean = cleanSaltName(name);
  const key = clean.toLowerCase();
  const hit = cache?.get(key);
  if (hit) return hit;
  const rows = await t.query<{ id: string }>(
    `insert into salts (name) values ($1) on conflict ((lower(name))) do update set name = salts.name returning id`,
    [clean],
  );
  cache?.set(key, rows[0].id);
  return rows[0].id;
}

export async function writeSalts(t: Runner, medicineId: string, salts: SaltInput[], cache?: Map<string, string>) {
  await t.query(`delete from medicine_salts where medicine_id = $1`, [medicineId]);
  for (let i = 0; i < salts.length; i++) {
    const saltId = await ensureSalt(t, salts[i].name, cache);
    await t.query(`insert into medicine_salts (medicine_id, salt_id, strength, position) values ($1, $2, $3, $4)`, [medicineId, saltId, salts[i].strength, i]);
  }
}

export async function uniqueSlug(t: Runner, name: string) {
  const base = slugify(name);
  const rows = await t.query<{ slug: string }>(`select slug from medicines where slug = $1 or slug like $2`, [base, `${escapeLike(base)}-%`]);
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${Date.now()}`;
}

async function categoryOrThrow(t: Runner, id: string) {
  const rows = await t.query<{ id: string; name: string }>(`select id, name from categories where id = $1`, [id]);
  if (!rows[0]) throw new ApiError(400, "That category does not exist.", "bad_category");
  return rows[0];
}

/* ---------- create ---------- */

export type CreateOptions = { source?: string; sourceRef?: string | null; status?: "draft" | "active"; dataStatus?: "unverified" | "sample" };

/** Everything is created as an unverified draft unless a trusted caller (the dev seed) says otherwise. */
export async function insertMedicine(t: Runner, actorId: string | null, v: MedicineFields, opts: CreateOptions = {}, caches?: { mf: Map<string, string>; salt: Map<string, string> }) {
  const category = await categoryOrThrow(t, v.categoryId);
  const manufacturerId = await ensureManufacturer(t, v.manufacturer, caches?.mf);
  const slug = await uniqueSlug(t, v.name);
  const search = buildSearchText({ name: v.name, manufacturer: v.manufacturer, salts: v.salts, uses: v.uses, category: category.name });
  const rows = await t.query<{ id: string }>(
    `insert into medicines (slug, name, manufacturer_id, category_id, form, pack_size, mrp, price, schedule, no_online_sale, status, data_status, discount_percent,
        composition_key, description, uses, how_to_use, side_effects, precautions, image_url, source, source_ref, nppa_ceiling_price, search_text, created_by, updated_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$25) returning id`,
    [
      slug, v.name, manufacturerId, v.categoryId, v.form, v.packSize, v.mrp, v.price, v.schedule, v.noOnlineSale, opts.status ?? "draft", opts.dataStatus ?? "unverified", discountFor(v.mrp, v.price),
      compositionKey(v.salts), v.description, JSON.stringify(v.uses), v.howToUse, JSON.stringify(v.sideEffects), JSON.stringify(v.precautions), v.imageUrl,
      opts.source ?? "manual", opts.sourceRef ?? null, v.nppaCeilingPrice, search, actorId,
    ],
  );
  await writeSalts(t, rows[0].id, v.salts, caches?.salt);
  return { id: rows[0].id, slug };
}

export async function createMedicine(actor: Actor, v: MedicineFields) {
  const database = await db();
  const created = await database.tx(async (t) => {
    const r = await insertMedicine(t, actor.id, v);
    await audit(actor.id, "catalog.medicine.created", { id: r.id, name: v.name, schedule: v.schedule }, actor.ip, t.query);
    return r;
  });
  return (await getAdminMedicine(created.id))!;
}

/* ---------- update ---------- */

const CLINICAL = ["name", "manufacturer", "form", "packSize", "schedule", "noOnlineSale"] as const;

/** Fields whose change means a pharmacist must look at the record again. */
export function changesIdentity(before: AdminMedicine, next: Partial<MedicineFields>) {
  for (const k of CLINICAL) {
    if (next[k] === undefined) continue;
    const a = String(before[k as keyof AdminMedicine]).trim().toLowerCase();
    const b = String(next[k]).trim().toLowerCase();
    if (a !== b) return true;
  }
  if (next.salts && compositionKey(next.salts) !== compositionKey(before.salts)) return true;
  return false;
}

const TRACKED: (keyof MedicineFields)[] = ["name", "manufacturer", "categoryId", "form", "packSize", "mrp", "price", "schedule", "noOnlineSale", "description", "howToUse", "imageUrl", "nppaCeilingPrice"];

/** Transaction-aware update. `bulk` is true when called by the importer (no per-row audit entry). */
export async function updateInTx(t: Tx, actor: Actor, id: string, patch: Partial<MedicineFields>, opts: { bulk?: boolean } = {}) {
  {
    const found = await t.query(`${MEDICINE_SELECT} where m.id = $1 for update of m`, [id]);
    if (!found[0]) throw new ApiError(404, "Medicine not found.");
    const before = mapMedicine(found[0]);

    const mrp = patch.mrp ?? before.mrp;
    const price = patch.price ?? before.price;
    if (price > mrp) throw new ApiError(400, "Selling price cannot be higher than MRP.", "price_above_mrp");

    const salts = patch.salts ?? before.salts;
    const name = patch.name ?? before.name;
    const manufacturer = patch.manufacturer ?? before.manufacturer;
    const uses = patch.uses ?? before.uses;
    const categoryId = patch.categoryId ?? before.categoryId;
    const schedule = patch.schedule ?? before.schedule;
    const noOnlineSale = patch.noOnlineSale ?? before.noOnlineSale;

    // Once a medicine has sellable stock its MRP and price come from the stock batch (see inventory/stock.ts).
    const stocked = Number(found[0].sellable_qty) > 0;
    if (stocked && (Math.round(mrp * 100) !== Math.round(before.mrp * 100) || Math.round(price * 100) !== Math.round(before.price * 100))) {
      throw new ApiError(409, "This medicine is in stock, so its MRP comes from the stock batch and its price from the discount. Change the discount on the Inventory page instead.", "price_from_stock");
    }
    const discount = stocked ? before.discountPercent : discountFor(mrp, price);

    const category = await categoryOrThrow(t, categoryId);
    const manufacturerId = await ensureManufacturer(t, manufacturer);

    // A change to what the product *is* sends it back for review and off the shelf.
    let status = before.status;
    let dataStatus = before.dataStatus;
    let reverify = false;
    if (changesIdentity(before, patch)) {
      reverify = before.dataStatus !== "unverified" || before.status === "active";
      dataStatus = "unverified";
      if (status === "active") status = "draft";
    }
    if (status === "active" && (schedule === "X" || schedule === "unknown" || noOnlineSale)) status = "draft";

    await t.query(
      `update medicines set name=$2, manufacturer_id=$3, category_id=$4, form=$5, pack_size=$6, mrp=$7, price=$8, schedule=$9, no_online_sale=$10, discount_percent=$11,
          composition_key=$12, description=$13, uses=$14, how_to_use=$15, side_effects=$16, precautions=$17, image_url=$18, nppa_ceiling_price=$19,
          search_text=$20, status=$21, data_status=$22, verified_by = case when $22 = 'verified' then verified_by else null end,
          verified_at = case when $22 = 'verified' then verified_at else null end, updated_by=$23, updated_at=now()
       where id = $1`,
      [
        id, name, manufacturerId, categoryId, patch.form ?? before.form, patch.packSize ?? before.packSize, mrp, price, schedule, noOnlineSale, discount,
        compositionKey(salts), patch.description ?? before.description, JSON.stringify(uses), patch.howToUse ?? before.howToUse,
        JSON.stringify(patch.sideEffects ?? before.sideEffects), JSON.stringify(patch.precautions ?? before.precautions),
        patch.imageUrl === undefined ? before.imageUrl : patch.imageUrl,
        patch.nppaCeilingPrice === undefined ? before.nppaCeilingPrice : patch.nppaCeilingPrice,
        buildSearchText({ name, manufacturer, salts, uses, category: category.name }), status, dataStatus, actor.id,
      ],
    );
    if (patch.salts) await writeSalts(t, id, salts);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of TRACKED) {
      if (patch[k] === undefined) continue;
      const from = before[k as keyof AdminMedicine];
      if (JSON.stringify(from) !== JSON.stringify(patch[k])) changes[k] = { from, to: patch[k] };
    }
    if (patch.salts && compositionKey(patch.salts) !== compositionKey(before.salts)) changes.salts = { from: before.composition, to: formatComposition(patch.salts) };
    if (patch.uses || patch.sideEffects || patch.precautions) changes.content = { from: "edited", to: "edited" };
    if (!opts.bulk) await audit(actor.id, "catalog.medicine.updated", { id, name: before.name, changes, sentBackForReview: reverify || undefined }, actor.ip, t.query);
    return { changes, sentBackForReview: reverify };
  }
}

export async function updateMedicine(actor: Actor, id: string, patch: Partial<MedicineFields>) {
  const database = await db();
  await database.tx((t) => updateInTx(t, actor, id, patch));
  return (await getAdminMedicine(id))!;
}


/* ---------- verify / publish workflow ---------- */

export async function applyAction(actor: Actor, id: string, action: MedicineAction) {
  const database = await db();
  await database.tx(async (t) => {
    const found = await t.query(`${MEDICINE_SELECT} where m.id = $1 for update of m`, [id]);
    if (!found[0]) throw new ApiError(404, "Medicine not found.");
    const m = mapMedicine(found[0]);

    switch (action) {
      case "verify":
        if (m.schedule === "unknown") throw new ApiError(409, `${m.name}: choose the prescription schedule before verifying.`, "schedule_unknown");
        await t.query(`update medicines set data_status='verified', verified_by=$2, verified_at=now(), updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
      case "unverify":
        await t.query(`update medicines set data_status='unverified', status = case when status='active' then 'draft' else status end, verified_by=null, verified_at=null, updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
      case "publish":
        if (m.schedule === "X") throw new ApiError(409, `${m.name}: Schedule X medicines cannot be sold online.`, "schedule_x");
        if (m.noOnlineSale) throw new ApiError(409, `${m.name}: this medicine is marked "never sold online".`, "no_online_sale");
        if (m.schedule === "unknown") throw new ApiError(409, `${m.name}: choose the prescription schedule before publishing.`, "schedule_unknown");
        if (m.dataStatus === "unverified") throw new ApiError(409, `${m.name}: verify the details before publishing.`, "not_verified");
        await t.query(`update medicines set status='active', updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
      case "list":
        if (m.status !== "draft") throw new ApiError(409, `${m.name}: only drafts can be listed in the catalog.`, "not_draft");
        await t.query(`update medicines set status='catalog', updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
      case "unlist":
        if (m.status !== "catalog") throw new ApiError(409, `${m.name}: it is not listed in the catalog.`, "not_listed");
        await t.query(`update medicines set status='draft', updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
      case "unpublish":
        await t.query(`update medicines set status='draft', updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
      case "discontinue":
        await t.query(`update medicines set status='discontinued', updated_by=$2, updated_at=now() where id=$1`, [id, actor.id]);
        break;
    }
    await audit(actor.id, `catalog.medicine.${action}`, { id, name: m.name, from: { status: m.status, dataStatus: m.dataStatus } }, actor.ip, t.query);
  });
  return (await getAdminMedicine(id))!;
}

export async function bulkAction(actor: Actor, ids: string[], action: MedicineAction) {
  const done: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of ids) {
    try {
      await applyAction(actor, id, action);
      done.push(id);
    } catch (err) {
      failed.push({ id, error: err instanceof ApiError ? err.message : "Could not update this item." });
    }
  }
  return { done, failed };
}

export async function deleteDraft(actor: Actor, id: string) {
  const database = await db();
  await database.tx(async (t) => {
    const rows = await t.query<{ name: string; status: string }>(`select name, status from medicines where id = $1 for update`, [id]);
    if (!rows[0]) throw new ApiError(404, "Medicine not found.");
    if (rows[0].status !== "draft") throw new ApiError(409, "Only drafts can be deleted. Discontinue it instead.", "not_draft");
    const hist = await t.query(`select 1 from stock_batches where medicine_id = $1 limit 1`, [id]);
    if (hist.length) throw new ApiError(409, "This medicine has stock history and cannot be deleted. Discontinue it instead.", "has_stock_history");
    await t.query(`delete from medicines where id = $1`, [id]);
    await audit(actor.id, "catalog.medicine.deleted", { id, name: rows[0].name }, actor.ip, t.query);
  });
}

/* ---------- admin list ---------- */

export type AdminListParams = { q?: string; status?: string; dataStatus?: string; category?: string; page: number; pageSize: number };

export async function listAdminMedicines(p: AdminListParams) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (p.status && ["draft", "catalog", "active", "discontinued"].includes(p.status)) where.push(`m.status = ${add(p.status)}`);
  if (p.dataStatus && ["unverified", "verified", "sample"].includes(p.dataStatus)) where.push(`m.data_status = ${add(p.dataStatus)}`);
  if (p.category) where.push(`c.slug = ${add(p.category)}`);
  if (p.q?.trim()) {
    const term = p.q.trim().toLowerCase();
    const like = add(`%${escapeLike(term)}%`);
    const raw = add(term);
    where.push(`(m.search_text like ${like} or word_similarity(${raw}, m.search_text) >= 0.5)`);
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";
  const limit = add(p.pageSize);
  const offset = add((p.page - 1) * p.pageSize);
  const rows = await query(`${MEDICINE_SELECT} ${clause} order by m.updated_at desc, m.name limit ${limit} offset ${offset}`, params);
  const count = await query<{ n: string }>(
    `select count(*) as n from medicines m join categories c on c.id = m.category_id ${clause}`,
    params.slice(0, params.length - 2),
  );
  return { items: rows.map(mapMedicine), total: Number(count[0].n) };
}

/* ---------- categories ---------- */

export async function listCategoriesAdmin() {
  const rows = await query<Row>(
    `select c.*, (select count(*) from medicines m where m.category_id = c.id) as medicine_count from categories c order by c.sort_order, c.name`,
  );
  return rows.map((r) => ({
    id: r.id as string, slug: r.slug as string, name: r.name as string, icon: r.icon as string, blurb: r.blurb as string,
    sortOrder: r.sort_order as number, isActive: r.is_active as boolean, medicineCount: Number(r.medicine_count),
  }));
}

export type CategoryFields = { name: string; blurb: string; icon: string; sortOrder: number; isActive: boolean };

export async function createCategory(actor: Actor, v: CategoryFields) {
  const base = slugify(v.name);
  const taken = new Set((await query<{ slug: string }>(`select slug from categories where slug = $1 or slug like $2`, [base, `${escapeLike(base)}-%`])).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const rows = await query<{ id: string }>(
    `insert into categories (slug, name, icon, blurb, sort_order, is_active) values ($1,$2,$3,$4,$5,$6) returning id`,
    [slug, v.name, v.icon, v.blurb, v.sortOrder, v.isActive],
  );
  await audit(actor.id, "catalog.category.created", { id: rows[0].id, name: v.name }, actor.ip);
  return rows[0].id;
}

export async function updateCategory(actor: Actor, id: string, v: CategoryFields) {
  const rows = await query<{ id: string }>(
    `update categories set name=$2, icon=$3, blurb=$4, sort_order=$5, is_active=$6, updated_at=now() where id=$1 returning id`,
    [id, v.name, v.icon, v.blurb, v.sortOrder, v.isActive],
  );
  if (!rows[0]) throw new ApiError(404, "Category not found.");
  // Search text embeds the category name, so refresh it for this category.
  await query(
    `update medicines m set search_text = lower(regexp_replace(m.name || ' ' || coalesce((select string_agg(s.name, ' ') from medicine_salts ms join salts s on s.id = ms.salt_id where ms.medicine_id = m.id), '') || ' ' || (select name from manufacturers where id = m.manufacturer_id) || ' ' || $2 || ' ' || coalesce((select string_agg(u, ' ') from jsonb_array_elements_text(m.uses) u), ''), '\\s+', ' ', 'g')) where m.category_id = $1`,
    [id, v.name],
  );
  await audit(actor.id, "catalog.category.updated", { id, name: v.name, isActive: v.isActive }, actor.ip);
}
