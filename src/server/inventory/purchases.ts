import { ApiError } from "../http";
import { audit, isUniqueViolation } from "../auth/users";
import { db, query, type Row, type Tx } from "../db";
import { TODAY_SQL } from "./config";
import type { PurchaseInput } from "./schema";
import { lockMedicines, moveStock, syncMedicine, type Actor } from "./stock";

const cents = (n: number) => Math.round(n * 100);
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : "");

/**
 * Record a wholesaler invoice and put its stock on the shelf, atomically: either the whole bill is saved
 * (purchase, batches, ledger, prices) or nothing is. Safe to retry with the same idempotencyKey.
 */
export async function createPurchase(actor: Actor, input: PurchaseInput): Promise<{ id: string; replayed: boolean; total: number }> {
  const database = await db();

  if (input.idempotencyKey) {
    const prior = await query<{ id: string; total_amount: string }>(`select id, total_amount from purchases where idempotency_key = $1`, [input.idempotencyKey]);
    if (prior[0]) return { id: prior[0].id, replayed: true, total: Number(prior[0].total_amount) };
  }

  try {
    return await database.tx(async (t) => savePurchase(t, actor, input));
  } catch (err) {
    if (isUniqueViolation(err)) {
      const name = (err as { constraint?: string }).constraint ?? "";
      if (input.idempotencyKey) {
        const prior = await query<{ id: string; total_amount: string }>(`select id, total_amount from purchases where idempotency_key = $1`, [input.idempotencyKey]);
        if (prior[0]) return { id: prior[0].id, replayed: true, total: Number(prior[0].total_amount) };
      }
      if (name.includes("purchases_bill") || /purchases/.test(String((err as Error).message))) {
        throw new ApiError(409, "This bill number has already been entered for this supplier.", "duplicate_bill");
      }
    }
    throw err;
  }
}

async function savePurchase(t: Tx, actor: Actor, input: PurchaseInput) {
  const sup = await t.query<{ id: string; is_active: boolean; name: string }>(`select id, is_active, name from suppliers where id = $1`, [input.supplierId]);
  if (!sup[0]) throw new ApiError(400, "That supplier does not exist.", "bad_supplier");
  if (!sup[0].is_active) throw new ApiError(409, `${sup[0].name} is marked inactive. Re-activate the supplier first.`, "supplier_inactive");

  const today = (await t.query<{ d: string; future: boolean }>(`select to_char(${TODAY_SQL}, 'YYYY-MM-DD') as d, $1::date > ${TODAY_SQL} as future`, [input.billDate]))[0];
  if (today.future) throw new ApiError(400, "The bill date cannot be in the future.", "bad_bill_date");

  // Validate every line before touching stock so the error message names the offending row.
  input.lines.forEach((l, i) => {
    const row = `Line ${i + 1}`;
    if (l.qty + l.freeQty < 1) throw new ApiError(400, `${row}: enter a quantity or a free quantity.`, "bad_quantity");
    if (l.purchaseRate > l.mrp) throw new ApiError(400, `${row}: purchase rate (₹${l.purchaseRate}) is higher than MRP (₹${l.mrp}). Check the numbers.`, "rate_above_mrp");
    if (l.expiryDate < today.d) throw new ApiError(400, `${row}: batch ${l.batchNo} has already expired (${l.expiryDate}). Expired stock cannot be received.`, "already_expired");
  });

  const medicineIds = input.lines.map((l) => l.medicineId);
  await lockMedicines(t, medicineIds);
  const meds = await t.query<{ id: string; name: string; status: string }>(`select id, name, status from medicines where id = any($1::uuid[])`, [[...new Set(medicineIds)]]);
  const byId = new Map(meds.map((m) => [m.id, m]));
  for (const m of meds) if (m.status === "discontinued") throw new ApiError(409, `${m.name} is discontinued. Un-discontinue it before receiving stock.`, "discontinued");

  const totalCents = input.lines.reduce((n, l) => n + cents(l.qty * l.purchaseRate), 0);
  const [purchase] = await t.query<{ id: string }>(
    `insert into purchases (supplier_id, bill_number, bill_date, total_amount, notes, idempotency_key, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [input.supplierId, input.billNumber, input.billDate, totalCents / 100, input.notes, input.idempotencyKey ?? null, actor.id],
  );

  for (const [i, l] of input.lines.entries()) {
    const label = `Line ${i + 1} (${byId.get(l.medicineId)?.name ?? "medicine"}, batch ${l.batchNo})`;
    const existing = await t.query<{ id: string; expiry: string; mrp: string }>(
      `select id, to_char(expiry_date, 'YYYY-MM-DD') as expiry, mrp from stock_batches where medicine_id = $1 and upper(batch_no) = upper($2) for update`,
      [l.medicineId, l.batchNo],
    );
    let batchId: string;
    if (existing[0]) {
      if (existing[0].expiry !== l.expiryDate) throw new ApiError(409, `${label}: this batch is already in stock with expiry ${existing[0].expiry}, not ${l.expiryDate}. Check the batch number.`, "batch_expiry_mismatch");
      if (cents(Number(existing[0].mrp)) !== cents(l.mrp)) throw new ApiError(409, `${label}: this batch is already in stock with MRP ₹${existing[0].mrp}, not ₹${l.mrp}. Check the batch number.`, "batch_mrp_mismatch");
      batchId = existing[0].id;
      // Latest cost wins for reporting; quantity is added through the ledger below.
      await t.query(`update stock_batches set purchase_rate = $2, qty_received = qty_received + $3 where id = $1`, [batchId, l.purchaseRate, l.qty + l.freeQty]);
    } else {
      const [b] = await t.query<{ id: string }>(
        `insert into stock_batches (medicine_id, batch_no, expiry_date, mrp, purchase_rate, qty_received, qty_on_hand) values ($1,$2,$3,$4,$5,$6,0) returning id`,
        [l.medicineId, l.batchNo, l.expiryDate, l.mrp, l.purchaseRate, l.qty + l.freeQty],
      );
      batchId = b.id;
    }
    await moveStock(t, batchId, l.qty + l.freeQty, "purchase", { ref: { type: "purchase", id: purchase.id }, note: `Bill ${input.billNumber}`, actorId: actor.id });
    await t.query(
      `insert into purchase_items (purchase_id, batch_id, medicine_id, batch_no, expiry_date, qty, free_qty, mrp, purchase_rate, line_total) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [purchase.id, batchId, l.medicineId, l.batchNo, l.expiryDate, l.qty, l.freeQty, l.mrp, l.purchaseRate, cents(l.qty * l.purchaseRate) / 100],
    );
  }
  for (const id of new Set(medicineIds)) await syncMedicine(t, id);

  await audit(actor.id, "inventory.purchase.created", { id: purchase.id, supplier: sup[0].name, billNumber: input.billNumber, lines: input.lines.length, total: totalCents / 100 }, actor.ip, t.query);
  return { id: purchase.id, replayed: false, total: totalCents / 100 };
}

/* ---------- reads ---------- */

export async function listPurchases(page: number, pageSize: number) {
  const rows = await query<Row>(
    `select p.id, p.bill_number, to_char(p.bill_date, 'YYYY-MM-DD') as bill_date, p.total_amount, p.created_at, s.name as supplier,
            (select count(*)::int from purchase_items i where i.purchase_id = p.id) as lines,
            (select coalesce(sum(i.qty + i.free_qty), 0)::int from purchase_items i where i.purchase_id = p.id) as units
       from purchases p join suppliers s on s.id = p.supplier_id order by p.bill_date desc, p.created_at desc limit $1 offset $2`,
    [pageSize, (page - 1) * pageSize],
  );
  const [{ n }] = await query<{ n: string }>(`select count(*) as n from purchases`);
  return {
    total: Number(n),
    items: rows.map((r) => ({
      id: r.id as string, billNumber: r.bill_number as string, billDate: r.bill_date as string,
      total: Number(r.total_amount), supplier: r.supplier as string, lines: Number(r.lines), units: Number(r.units), createdAt: iso(r.created_at),
    })),
  };
}

export async function getPurchase(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [p] = await query<Row>(
    `select p.*, to_char(p.bill_date, 'YYYY-MM-DD') as bill_day, s.name as supplier, u.name as entered_by from purchases p join suppliers s on s.id = p.supplier_id left join users u on u.id = p.created_by where p.id = $1`,
    [id],
  );
  if (!p) return null;
  const items = await query<Row>(
    `select i.*, to_char(i.expiry_date, 'YYYY-MM-DD') as expiry_day, m.name as medicine, m.slug, mf.name as manufacturer from purchase_items i join medicines m on m.id = i.medicine_id join manufacturers mf on mf.id = m.manufacturer_id where i.purchase_id = $1 order by m.name, i.batch_no`,
    [id],
  );
  return {
    id: p.id as string, supplier: p.supplier as string, billNumber: p.bill_number as string, billDate: p.bill_day as string, total: Number(p.total_amount),
    notes: p.notes as string, enteredBy: (p.entered_by as string | null) ?? null, createdAt: iso(p.created_at),
    items: items.map((i) => ({
      id: i.id as string, medicineId: i.medicine_id as string, medicine: i.medicine as string, slug: i.slug as string, manufacturer: i.manufacturer as string,
      batchNo: i.batch_no as string, expiryDate: i.expiry_day as string, qty: Number(i.qty), freeQty: Number(i.free_qty), mrp: Number(i.mrp), purchaseRate: Number(i.purchase_rate), lineTotal: Number(i.line_total),
    })),
  };
}
