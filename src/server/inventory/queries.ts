import { query, type Row } from "../db";
import { escapeLike } from "../catalog/text";
import { expiryAlertDays, minShelfDays, sellableQtySql, TODAY_SQL } from "./config";
import { sellingPrice } from "./stock";

export type BatchRow = {
  id: string; batchNo: string; expiryDate: string; daysToExpiry: number; mrp: number; purchaseRate: number;
  qtyReceived: number; qtyOnHand: number; sellable: boolean; state: "ok" | "near_expiry" | "short_dated" | "expired";
};

const BATCH_SELECT = `
  select b.id, b.batch_no, to_char(b.expiry_date, 'YYYY-MM-DD') as expiry, (b.expiry_date - ${TODAY_SQL})::int as days,
         b.mrp, b.purchase_rate, b.qty_received, b.qty_on_hand`;

function batchState(days: number): BatchRow["state"] {
  if (days < 0) return "expired";
  if (days < minShelfDays()) return "short_dated";
  if (days <= expiryAlertDays()) return "near_expiry";
  return "ok";
}
function mapBatch(r: Row): BatchRow {
  const days = Number(r.days);
  const state = batchState(days);
  return {
    id: r.id, batchNo: r.batch_no, expiryDate: r.expiry, daysToExpiry: days, mrp: Number(r.mrp), purchaseRate: Number(r.purchase_rate),
    qtyReceived: Number(r.qty_received), qtyOnHand: Number(r.qty_on_hand), sellable: state !== "expired" && state !== "short_dated" && Number(r.qty_on_hand) > 0, state,
  };
}

export async function getInventoryMedicine(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [m] = await query<Row>(
    `select m.id, m.slug, m.name, m.status, m.pack_size, m.form, m.mrp, m.price, m.schedule, m.no_online_sale, m.data_status, m.stock_qty, m.discount_percent, m.reorder_level,
            m.nppa_ceiling_price, m.gst_percent, m.hsn, mf.name as manufacturer, ${sellableQtySql("m")} as sellable_qty
       from medicines m join manufacturers mf on mf.id = m.manufacturer_id where m.id = $1`,
    [id],
  );
  if (!m) return null;
  const batches = (await query(`${BATCH_SELECT} from stock_batches b where b.medicine_id = $1 order by (b.qty_on_hand = 0), b.expiry_date, b.created_at`, [id])).map(mapBatch);
  const movements = await query<Row>(
    `select mv.id, mv.delta, mv.balance_after, mv.kind, mv.note, mv.ref_type, mv.created_at, b.batch_no, u.name as actor
       from stock_movements mv join stock_batches b on b.id = mv.batch_id left join users u on u.id = mv.actor_id
      where mv.medicine_id = $1 order by mv.id desc limit 50`,
    [id],
  );
  const mrp = Number(m.mrp);
  return {
    id: m.id as string, slug: m.slug as string, name: m.name as string, manufacturer: m.manufacturer as string, packSize: m.pack_size as string, form: m.form as string,
    status: m.status as string, schedule: m.schedule as string, noOnlineSale: m.no_online_sale as boolean, dataStatus: m.data_status as string,
    mrp, price: Number(m.price), discountPercent: Number(m.discount_percent), reorderLevel: Number(m.reorder_level),
    stockQty: Number(m.stock_qty), sellableQty: Number(m.sellable_qty),
    gstPercent: m.gst_percent == null ? null : Number(m.gst_percent), hsn: (m.hsn ?? "") as string,
    nppaCeilingPrice: m.nppa_ceiling_price == null ? null : Number(m.nppa_ceiling_price),
    previewPrice: sellingPrice(mrp, Number(m.discount_percent), m.nppa_ceiling_price == null ? null : Number(m.nppa_ceiling_price)),
    batches,
    movements: movements.map((r) => ({
      id: String(r.id), delta: Number(r.delta), balanceAfter: Number(r.balance_after), kind: r.kind as string, note: r.note as string, batchNo: r.batch_no as string,
      actor: (r.actor as string | null) ?? null, createdAt: new Date(r.created_at as string).toISOString(),
    })),
  };
}

/** Dashboard numbers + alert lists. */
export async function inventoryOverview() {
  const alertDays = expiryAlertDays();
  const [totals] = await query<Row>(
    `select count(*) filter (where qty_on_hand > 0)::int as batches, coalesce(sum(qty_on_hand), 0)::int as units,
            coalesce(sum(qty_on_hand * purchase_rate), 0) as cost_value, coalesce(sum(qty_on_hand * mrp), 0) as mrp_value,
            count(distinct medicine_id) filter (where qty_on_hand > 0)::int as medicines
       from stock_batches`,
  );
  const lowStock = await query<Row>(
    `select m.id, m.name, m.pack_size, mf.name as manufacturer, m.reorder_level, m.status, ${sellableQtySql("m")} as sellable_qty
       from medicines m join manufacturers mf on mf.id = m.manufacturer_id
      where (m.status = 'active' or exists (select 1 from stock_batches b where b.medicine_id = m.id))
        and ${sellableQtySql("m")} <= m.reorder_level
      order by ${sellableQtySql("m")}, m.name limit 100`,
  );
  const nearExpiry = await query<Row>(
    `${BATCH_SELECT}, m.id as medicine_id, m.name as medicine
       from stock_batches b join medicines m on m.id = b.medicine_id
      where b.qty_on_hand > 0 and b.expiry_date <= ${TODAY_SQL} + ${alertDays}
      order by b.expiry_date, m.name limit 200`,
  );
  const [unlisted] = await query<Row>(
    `select count(*)::int as n from medicines m where m.stock_qty > 0 and m.status <> 'active' and m.status <> 'discontinued'`,
  );
  return {
    totals: { batches: Number(totals.batches), units: Number(totals.units), medicines: Number(totals.medicines), costValue: Number(totals.cost_value), mrpValue: Number(totals.mrp_value) },
    lowStock: lowStock.map((r) => ({ id: r.id as string, name: r.name as string, packSize: r.pack_size as string, manufacturer: r.manufacturer as string, reorderLevel: Number(r.reorder_level), sellableQty: Number(r.sellable_qty), status: r.status as string })),
    nearExpiry: nearExpiry.map((r) => ({ ...mapBatch(r), medicineId: r.medicine_id as string, medicine: r.medicine as string })),
    stockedButNotLive: Number(unlisted.n),
    settings: { minShelfDays: minShelfDays(), expiryAlertDays: alertDays },
  };
}

/** Medicine picker for the purchase form. */
export async function searchMedicinesForPurchase(q: string) {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const rows = await query<Row>(
    `select m.id, m.name, m.pack_size, m.form, m.mrp, m.status, m.stock_qty, mf.name as manufacturer
       from medicines m join manufacturers mf on mf.id = m.manufacturer_id
      where m.status <> 'discontinued' and (m.search_text like $1 or word_similarity($2, m.search_text) >= 0.6)
      order by (lower(m.name) like $3) desc, (m.stock_qty > 0) desc, m.name limit 15`,
    [`%${escapeLike(term)}%`, term, `${escapeLike(term)}%`],
  );
  return rows.map((r) => ({ id: r.id as string, name: r.name as string, packSize: r.pack_size as string, form: r.form as string, manufacturer: r.manufacturer as string, mrp: Number(r.mrp), status: r.status as string, stockQty: Number(r.stock_qty) }));
}

/** Stock list for the inventory page: medicines that have ever been stocked, plus optional filter. */
export async function listStocked(opts: { q?: string; page: number; pageSize: number }) {
  const params: unknown[] = [];
  const where = [`exists (select 1 from stock_batches b where b.medicine_id = m.id)`];
  if (opts.q?.trim()) {
    params.push(`%${escapeLike(opts.q.trim().toLowerCase())}%`);
    where.push(`m.search_text like $${params.length}`);
  }
  const clause = `where ${where.join(" and ")}`;
  const rows = await query<Row>(
    `select m.id, m.name, m.pack_size, m.status, m.stock_qty, m.reorder_level, m.mrp, m.price, mf.name as manufacturer, ${sellableQtySql("m")} as sellable_qty,
            (select min(b.expiry_date) from stock_batches b where b.medicine_id = m.id and b.qty_on_hand > 0)::text as next_expiry
       from medicines m join manufacturers mf on mf.id = m.manufacturer_id ${clause} order by m.name limit ${opts.pageSize} offset ${(opts.page - 1) * opts.pageSize}`,
    params,
  );
  const [{ n }] = await query<{ n: string }>(`select count(*) as n from medicines m ${clause}`, params);
  return {
    total: Number(n),
    items: rows.map((r) => ({
      id: r.id as string, name: r.name as string, packSize: r.pack_size as string, manufacturer: r.manufacturer as string, status: r.status as string,
      stockQty: Number(r.stock_qty), sellableQty: Number(r.sellable_qty), reorderLevel: Number(r.reorder_level), mrp: Number(r.mrp), price: Number(r.price),
      nextExpiry: r.next_expiry ? String(r.next_expiry).slice(0, 10) : null,
    })),
  };
}
