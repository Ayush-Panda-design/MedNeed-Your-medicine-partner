import { ApiError } from "../http";
import type { Q, Tx } from "../db";

/**
 * Prescription rules, kept apart from order placement so both checkout and the pharmacist's review can use them.
 * A prescription is approved with a most-units-per-medicine limit. Verified orders draw from that limit
 * (prescription_usage); cancelling or expiring an order gives the units back.
 */

export type RxLine = { medicineId: string; name: string; qty: number };
export type RxUsage = { prescriptionId: string; medicineId: string; qty: number };
export type RxState = "verified" | "pending" | "short" | "none";
export type RxPlan = { state: RxState; usage: RxUsage[]; problem: string | null; approvedBy: string | null };

type RxRow = { id: string; status: string; expired: boolean; valid_until: string | null; doctor_name: string };

/** Lock the customer's prescriptions first. Always do this before locking medicines, so checkout and review can never wait on each other. */
export async function lockPrescriptions(q: Q, userId: string, ids: string[]) {
  if (ids.length === 0) return;
  await q(`select id from prescriptions where id = any($1::uuid[]) and user_id = $2 order by id for update`, [ids, userId]);
}

/**
 * Works out whether the prescriptions attached to an order cover its prescription medicines.
 * strict = checkout (refuse anything unusable); non-strict = re-checking an order already placed (ignore unusable ones).
 */
export async function planPrescriptions(q: Q, userId: string, rawIds: string[], lines: RxLine[], strict: boolean): Promise<RxPlan> {
  const ids = [...new Set(rawIds)];
  if (lines.length === 0) return { state: "verified", usage: [], problem: null, approvedBy: null };
  if (ids.length === 0) {
    if (strict) throw new ApiError(400, "Add a prescription for the prescription medicines in your cart.", "rx_required");
    return { state: "none", usage: [], problem: "No prescription attached.", approvedBy: null };
  }

  const rows = await q<RxRow>(
    `select id, status, doctor_name, to_char(valid_until, 'YYYY-MM-DD') as valid_until, (valid_until is not null and valid_until < (now() at time zone 'Asia/Kolkata')::date) as expired
       from prescriptions where id = any($1::uuid[]) and user_id = $2 and status <> 'withdrawn'`,
    [ids, userId],
  );
  if (strict && rows.length !== ids.length) throw new ApiError(400, "One of the prescriptions you chose was not found. Please choose again.", "rx_not_found");
  if (strict) {
    if (rows.some((r) => r.status === "rejected")) throw new ApiError(400, "A prescription you chose was rejected by our pharmacist. Choose another or upload a new one.", "rx_rejected");
    if (rows.some((r) => r.status === "approved" && r.expired)) throw new ApiError(400, "A prescription you chose has expired. Choose another or upload a new one.", "rx_expired");
  }
  const approved = rows.filter((r) => r.status === "approved" && !r.expired).sort((a, b) => (a.valid_until ?? "").localeCompare(b.valid_until ?? "") || a.id.localeCompare(b.id));
  const waiting = rows.filter((r) => r.status === "pending" || r.status === "needs_info");

  // Units still available on each approved prescription.
  const left = new Map<string, number>();
  if (approved.length) {
    const avail = await q<{ prescription_id: string; medicine_id: string; remaining: number }>(
      `select i.prescription_id, i.medicine_id,
              i.max_qty - coalesce((select sum(u.qty) from prescription_usage u where u.prescription_id = i.prescription_id and u.medicine_id = i.medicine_id), 0)::int as remaining
         from prescription_items i where i.prescription_id = any($1::uuid[])`,
      [approved.map((a) => a.id)],
    );
    for (const a of avail) left.set(`${a.prescription_id}:${a.medicine_id}`, Number(a.remaining));
  }

  const usage: RxUsage[] = [];
  let shortMsg: string | null = null;
  for (const line of lines) {
    let need = line.qty;
    for (const rx of approved) {
      const k = `${rx.id}:${line.medicineId}`;
      const have = left.get(k) ?? 0;
      if (have <= 0 || need <= 0) continue;
      const take = Math.min(have, need);
      left.set(k, have - take);
      usage.push({ prescriptionId: rx.id, medicineId: line.medicineId, qty: take });
      need -= take;
    }
    if (need > 0 && !shortMsg) {
      const covered = line.qty - need;
      const listed = approved.some((rx) => left.has(`${rx.id}:${line.medicineId}`));
      shortMsg = !listed
        ? `${line.name} is not on your approved prescription.`
        : covered > 0 ? `Your prescription covers only ${covered} of the ${line.qty} ${line.name} you ordered.` : `Your prescription has no ${line.name} left to supply.`;
    }
  }

  const doctor = approved[0]?.doctor_name || null;
  if (!shortMsg && approved.length) return { state: "verified", usage, problem: null, approvedBy: doctor };
  if (waiting.length) return { state: "pending", usage: [], problem: null, approvedBy: null };
  if (strict) {
    if (approved.length) throw new ApiError(409, `${shortMsg} Reduce the quantity or upload a new prescription.`, "rx_limit");
    throw new ApiError(400, "Add a prescription for the prescription medicines in your cart.", "rx_required");
  }
  return { state: approved.length ? "short" : "none", usage: [], problem: shortMsg ?? "No usable prescription is attached.", approvedBy: null };
}

export async function recordUsage(t: Tx, orderId: string, usage: RxUsage[]) {
  for (const u of usage) {
    await t.query(`insert into prescription_usage (prescription_id, medicine_id, order_id, qty) values ($1,$2,$3,$4) on conflict (prescription_id, medicine_id, order_id) do update set qty = excluded.qty`, [u.prescriptionId, u.medicineId, orderId, u.qty]);
  }
}

/** Gives the units back (the order was cancelled or expired). */
export async function releaseRxUsage(t: Tx, orderId: string) {
  await t.query(`delete from prescription_usage where order_id = $1`, [orderId]);
}

/** The prescription medicines on an order, one row per medicine. */
export async function rxLinesOfOrder(q: Q, orderId: string): Promise<RxLine[]> {
  const rows = await q<{ medicine_id: string; name: string; qty: number }>(
    `select medicine_id, max(name) as name, sum(qty)::int as qty from order_items where order_id = $1 and schedule in ('H','H1') group by medicine_id order by medicine_id`,
    [orderId],
  );
  return rows.map((r) => ({ medicineId: r.medicine_id, name: r.name, qty: Number(r.qty) }));
}

/**
 * Re-checks an order that is waiting for its prescription. If the attached approved prescriptions now cover it,
 * the units are drawn from them and the order is marked verified. The caller holds the order lock and the prescription locks.
 */
export async function tryVerifyOrder(t: Tx, order: { id: string; user_id: string; status: string }): Promise<boolean> {
  const ids = (await t.query<{ prescription_id: string }>(`select prescription_id from order_prescriptions where order_id = $1`, [order.id])).map((r) => r.prescription_id);
  if (ids.length === 0) return false;
  const lines = await rxLinesOfOrder(t.query, order.id);
  await t.query(`delete from prescription_usage where order_id = $1`, [order.id]);
  const plan = await planPrescriptions(t.query, order.user_id, ids, lines, false);
  if (plan.state !== "verified") return false;
  await recordUsage(t, order.id, plan.usage);
  const note = plan.approvedBy ? `Verified against a prescription from ${plan.approvedBy}` : "Verified against an approved prescription";
  await t.query(`update orders set prescription_status = 'verified', prescription_note = $2, updated_at = now() where id = $1`, [order.id, note]);
  await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,null)`, [order.id, order.status, `Prescription verified. ${note}.`]);
  return true;
}
