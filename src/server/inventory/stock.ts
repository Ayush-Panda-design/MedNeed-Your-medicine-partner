import { ApiError } from "../http";
import { audit } from "../auth/users";
import { db, type Q, type Tx } from "../db";
import { minShelfDays, TODAY_SQL } from "./config";
import type { AdjustInput } from "./schema";

type Runner = { query: Q };
export type Actor = { id: string; ip?: string };
export type MovementKind = "purchase" | "opening" | "sale" | "sale_return" | "damage" | "expired" | "correction" | "supplier_return";
export type Ref = { type: string; id: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What the customer pays per unit for a batch: MRP less the product's discount, never above MRP, never below 1 paisa. */
export const sellingPrice = (mrp: number, discountPercent: number, ceiling?: number | null) => {
  let price = round2(mrp * (1 - discountPercent / 100));
  if (ceiling != null && price > ceiling) price = ceiling;
  return Math.min(mrp, Math.max(0.01, price));
};

/** Lock the medicine rows (in a fixed order so two concurrent transactions can never deadlock). */
export async function lockMedicines(t: Runner, ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  const rows = await t.query<{ id: string }>(`select id from medicines where id = any($1::uuid[]) order by id for update`, [sorted]);
  if (rows.length !== sorted.length) throw new ApiError(404, "One of the medicines no longer exists.", "medicine_missing");
}

/**
 * Write one ledger row and move the batch quantity in the same statement order, refusing to go below zero.
 * Callers must already hold the medicine lock.
 */
export async function moveStock(t: Runner, batchId: string, delta: number, kind: MovementKind, opts: { ref?: Ref; note?: string; actorId?: string | null } = {}) {
  if (!Number.isInteger(delta) || delta === 0) throw new ApiError(400, "Quantity must be a non-zero whole number.", "bad_quantity");
  const rows = await t.query<{ medicine_id: string; qty_on_hand: number }>(
    `update stock_batches set qty_on_hand = qty_on_hand + $2, updated_at = now() where id = $1 and qty_on_hand + $2 >= 0 returning medicine_id, qty_on_hand`,
    [batchId, delta],
  );
  if (!rows[0]) throw new ApiError(409, "Not enough stock in this batch.", "insufficient_stock");
  await t.query(
    `insert into stock_movements (batch_id, medicine_id, delta, balance_after, kind, ref_type, ref_id, note, actor_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [batchId, rows[0].medicine_id, delta, rows[0].qty_on_hand, kind, opts.ref?.type ?? null, opts.ref?.id ?? null, opts.note ?? "", opts.actorId ?? null],
  );
  return rows[0].medicine_id;
}

/**
 * Recompute the medicine's stock total and, when it has sellable stock, its MRP and selling price from the
 * batch that will be sold next (earliest expiry). Call after any stock change, inside the same transaction.
 */
export async function syncMedicine(t: Runner, medicineId: string) {
  await t.query(`update medicines set stock_qty = coalesce((select sum(qty_on_hand) from stock_batches where medicine_id = $1), 0) where id = $1`, [medicineId]);
  const head = await t.query<{ mrp: string; discount_percent: string; nppa: string | null }>(
    `select b.mrp, m.discount_percent, m.nppa_ceiling_price as nppa
       from stock_batches b join medicines m on m.id = b.medicine_id
      where b.medicine_id = $1 and b.qty_on_hand > 0 and b.expiry_date >= ${TODAY_SQL} + ${minShelfDays()}
      order by b.expiry_date, b.created_at, b.id limit 1`,
    [medicineId],
  );
  if (!head[0]) return;
  const mrp = Number(head[0].mrp);
  const price = sellingPrice(mrp, Number(head[0].discount_percent), head[0].nppa == null ? null : Number(head[0].nppa));
  await t.query(`update medicines set mrp = $2, price = $3 where id = $1 and (mrp <> $2 or price <> $3)`, [medicineId, mrp, price]);
}

/** Opening balance for stock already on the shelf before this system was used (and for development sample data). */
export async function addOpeningStock(t: Tx, medicineId: string, v: { batchNo: string; qty: number; mrp: number; purchaseRate: number; expiryInDays: number; source?: string; note?: string; actorId?: string | null }) {
  await lockMedicines(t, [medicineId]);
  const [b] = await t.query<{ id: string }>(
    `insert into stock_batches (medicine_id, batch_no, expiry_date, mrp, purchase_rate, qty_received, qty_on_hand, source)
     values ($1, $2, ${TODAY_SQL} + $3::int, $4, $5, $6, 0, $7) returning id`,
    [medicineId, v.batchNo, v.expiryInDays, v.mrp, v.purchaseRate, v.qty, v.source ?? "opening"],
  );
  await moveStock(t, b.id, v.qty, "opening", { note: v.note ?? "Opening balance", actorId: v.actorId ?? null });
  await syncMedicine(t, medicineId);
  return b.id;
}

/* ---------- manual adjustments ---------- */

export async function adjustBatch(actor: Actor, batchId: string, input: AdjustInput) {
  const database = await db();
  return database.tx(async (t) => {
    const found = await t.query<{ medicine_id: string }>(`select medicine_id from stock_batches where id = $1`, [batchId]);
    if (!found[0]) throw new ApiError(404, "Batch not found.");
    await lockMedicines(t, [found[0].medicine_id]);
    const batch = (await t.query<{ batch_no: string; qty_on_hand: number }>(`select batch_no, qty_on_hand from stock_batches where id = $1 for update`, [batchId]))[0];

    if (input.kind !== "correction" && input.delta > 0) throw new ApiError(400, "Damaged, expired and returned stock can only be removed. Use a count correction to add stock.", "bad_direction");
    if (input.delta < 0 && -input.delta > batch.qty_on_hand) throw new ApiError(409, `Only ${batch.qty_on_hand} unit(s) are in this batch.`, "insufficient_stock");

    await moveStock(t, batchId, input.delta, input.kind, { note: input.reason, actorId: actor.id, ref: { type: "adjustment", id: batchId } });
    await syncMedicine(t, found[0].medicine_id);
    await audit(actor.id, "inventory.stock.adjusted", { batchId, batchNo: batch.batch_no, medicineId: found[0].medicine_id, kind: input.kind, delta: input.delta, reason: input.reason, before: batch.qty_on_hand }, actor.ip, t.query);
    return { qtyOnHand: batch.qty_on_hand + input.delta };
  });
}

/* ---------- sales: first-expiry-first-out ---------- */

export type Allocation = { batchId: string; batchNo: string; expiryDate: string; qty: number; mrp: number; unitPrice: number };

/**
 * Take `qty` units for a sale from the earliest-expiring sellable batches. Throws 409 if there is not enough
 * sellable stock. Must run inside a transaction (pass the transaction handle); the caller commits it together
 * with the order, so stock and order can never disagree.
 *
 * `unitPrice` is the lowest per-unit price among the batches used, so a sale spanning batches with different
 * MRPs never exceeds the MRP printed on any pack handed over.
 */
export async function allocateFefo(t: Tx, medicineId: string, qty: number, ref: Ref, actor?: { id: string } | null) {
  if (!Number.isInteger(qty) || qty < 1) throw new ApiError(400, "Quantity must be at least 1.", "bad_quantity");
  await lockMedicines(t, [medicineId]);
  const med = (await t.query<{ discount_percent: string; nppa: string | null; name: string }>(`select discount_percent, nppa_ceiling_price as nppa, name from medicines where id = $1`, [medicineId]))[0];
  const batches = await t.query<{ id: string; batch_no: string; expiry: string; qty_on_hand: number; mrp: string }>(
    `select id, batch_no, to_char(expiry_date, 'YYYY-MM-DD') as expiry, qty_on_hand, mrp from stock_batches
      where medicine_id = $1 and qty_on_hand > 0 and expiry_date >= ${TODAY_SQL} + ${minShelfDays()}
      order by expiry_date, created_at, id for update`,
    [medicineId],
  );
  const available = batches.reduce((n, b) => n + b.qty_on_hand, 0);
  if (available < qty) throw new ApiError(409, available > 0 ? `${med.name}: only ${available} left.` : `${med.name} is out of stock.`, "insufficient_stock");

  const lines: Allocation[] = [];
  let need = qty;
  for (const b of batches) {
    if (need === 0) break;
    const take = Math.min(need, b.qty_on_hand);
    await moveStock(t, b.id, -take, "sale", { ref, actorId: actor?.id ?? null });
    const mrp = Number(b.mrp);
    lines.push({ batchId: b.id, batchNo: b.batch_no, expiryDate: b.expiry, qty: take, mrp, unitPrice: sellingPrice(mrp, Number(med.discount_percent), med.nppa == null ? null : Number(med.nppa)) });
    need -= take;
  }
  await syncMedicine(t, medicineId);
  return { lines, unitPrice: Math.min(...lines.map((l) => l.unitPrice)), mrp: Math.min(...lines.map((l) => l.mrp)) };
}

/** Undo a sale (cancelled or failed order): put back whatever is still outstanding for this reference. Safe to call twice. */
export async function returnSale(t: Tx, ref: Ref, actor?: { id: string } | null) {
  const out = await t.query<{ batch_id: string; medicine_id: string; net: string }>(
    `select batch_id, medicine_id, sum(delta) as net from stock_movements where ref_type = $1 and ref_id = $2 and kind in ('sale','sale_return') group by batch_id, medicine_id having sum(delta) < 0`,
    [ref.type, ref.id],
  );
  await lockMedicines(t, out.map((r) => r.medicine_id));
  for (const r of out) await moveStock(t, r.batch_id, -Number(r.net), "sale_return", { ref, actorId: actor?.id ?? null });
  for (const id of new Set(out.map((r) => r.medicine_id))) await syncMedicine(t, id);
  return out.length;
}

/* ---------- integrity ---------- */

/** Compare the ledger with the stored quantities. Returns anything that disagrees (should always be empty). */
export async function reconcile(q: Q) {
  const batches = await q<{ id: string; batch_no: string; qty_on_hand: number; ledger: string }>(
    `select b.id, b.batch_no, b.qty_on_hand, coalesce(sum(m.delta), 0) as ledger from stock_batches b left join stock_movements m on m.batch_id = b.id
      group by b.id having b.qty_on_hand <> coalesce(sum(m.delta), 0)`,
  );
  const medicines = await q<{ id: string; name: string; stock_qty: number; batches: string }>(
    `select m.id, m.name, m.stock_qty, coalesce(sum(b.qty_on_hand), 0) as batches from medicines m left join stock_batches b on b.medicine_id = m.id
      group by m.id having m.stock_qty <> coalesce(sum(b.qty_on_hand), 0)`,
  );
  return {
    ok: batches.length === 0 && medicines.length === 0,
    batchMismatches: batches.map((b) => ({ id: b.id, batchNo: b.batch_no, stored: b.qty_on_hand, ledger: Number(b.ledger) })),
    medicineMismatches: medicines.map((m) => ({ id: m.id, name: m.name, stored: m.stock_qty, batches: Number(m.batches) })),
  };
}

/* ---------- per-product settings ---------- */

export async function updateInventorySettings(actor: Actor, medicineId: string, v: { discountPercent?: number; reorderLevel?: number; gstPercent?: number | null; hsn?: string }) {
  const database = await db();
  return database.tx(async (t) => {
    await lockMedicines(t, [medicineId]);
    const before = (await t.query<{ name: string; discount_percent: string; reorder_level: number }>(`select name, discount_percent, reorder_level from medicines where id = $1`, [medicineId]))[0];
    await t.query(
      `update medicines set discount_percent = $2, reorder_level = $3, gst_percent = case when $4::boolean then $5::numeric else gst_percent end, hsn = case when $6::boolean then nullif($7, '') else hsn end, updated_at = now() where id = $1`,
      [medicineId, v.discountPercent ?? Number(before.discount_percent), v.reorderLevel ?? before.reorder_level, v.gstPercent !== undefined, v.gstPercent ?? null, v.hsn !== undefined, v.hsn ?? ""],
    );
    await syncMedicine(t, medicineId);
    await audit(actor.id, "inventory.settings.updated", { medicineId, name: before.name, discountPercent: { from: Number(before.discount_percent), to: v.discountPercent }, reorderLevel: { from: before.reorder_level, to: v.reorderLevel }, gstPercent: v.gstPercent, hsn: v.hsn }, actor.ip, t.query);
  });
}
