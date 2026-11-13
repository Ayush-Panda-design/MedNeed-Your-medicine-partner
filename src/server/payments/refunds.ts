import { db, type Row, type Tx } from "../db";
import { audit } from "../auth/users";
import { createGatewayRefund, toPaise } from "./razorpay";
import { kickNotifications, notifyOrder } from "../notifications/queue";

/** Queue a full refund for a paid order. Safe to call twice: a payment can only ever have one refund row. */
export async function queueRefundForOrder(t: Tx, orderId: string, reason: string, actorId: string | null, paymentId?: string): Promise<string | null> {
  const p = (await t.query<Row>(`select id, amount from payments where order_id = $1 and status = 'paid' and ($2::uuid is null or id = $2::uuid) order by paid_at limit 1`, [orderId, paymentId ?? null]))[0];
  if (!p) return null;
  const r = await t.query<{ id: string }>(
    `insert into refunds (order_id, payment_id, amount, reason) values ($1,$2,$3,$4) on conflict (payment_id) do nothing returning id`,
    [orderId, p.id, p.amount, reason],
  );
  if (!r[0]) return null;
  await t.query(`insert into order_events (order_id, status, note, actor_id) select $1, status, $2, $3 from orders where id = $1`, [orderId, `Refund of ₹${Number(p.amount)} started: ${reason}`, actorId]);
  await audit(actorId, "payments.refund.queued", { orderId, amount: Number(p.amount), reason }, undefined, t.query);
  return r[0].id;
}

const CLAIM = `r.id = $1 and ((r.status in ('pending','failed') and r.attempts < 8) or (r.status = 'processing' and r.gateway_refund_id is null and r.updated_at < now() - interval '10 minutes'))`;

/** Send one refund to Razorpay. The call is made outside any database transaction, and is idempotent on Razorpay's side. */
export async function processRefund(refundId: string): Promise<"done" | "pending" | "failed" | "skipped"> {
  const database = await db();
  const r = await database.tx(async (t) => {
    const row = (await t.query<Row>(`select r.*, p.gateway_payment_id from refunds r join payments p on p.id = r.payment_id where ${CLAIM} for update of r skip locked`, [refundId]))[0];
    if (!row) return null;
    await t.query(`update refunds set status = 'processing', attempts = attempts + 1, updated_at = now() where id = $1`, [refundId]);
    return row;
  });
  if (!r) return "skipped";
  try {
    const gr = await createGatewayRefund(r.gateway_payment_id as string, toPaise(Number(r.amount)), `RF${String(r.id).slice(0, 8)}`, r.id as string);
    const processed = gr.status === "processed";
    await database.tx(async (t) => {
      await t.query(`update refunds set status = $2, gateway_refund_id = $3, last_error = null, updated_at = now() where id = $1`, [refundId, processed ? "processed" : "processing", gr.id]);
      if (processed) await markOrderRefunded(t, r.order_id as string, Number(r.amount));
    });
    if (processed) kickNotifications();
    return processed ? "done" : "pending";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refund failed";
    await database.tx(async (t) => {
      await t.query(`update refunds set status = 'failed', last_error = $2, updated_at = now() where id = $1`, [refundId, msg.slice(0, 300)]);
      await audit(null, "payments.refund.failed", { refundId, orderId: r.order_id, error: msg.slice(0, 200) }, undefined, t.query);
    });
    return "failed";
  }
}

export async function markOrderRefunded(t: Tx, orderId: string, amount: number) {
  await t.query(`update orders set payment_status = 'refunded', updated_at = now() where id = $1`, [orderId]);
  await t.query(`insert into order_events (order_id, status, note) select $1, status, $2 from orders where id = $1`, [orderId, `Refund of ₹${amount} completed`]);
  await notifyOrder(t, orderId, "refund_processed", { amount });
  await audit(null, "payments.refund.processed", { orderId, amount }, undefined, t.query);
}

export async function processRefundsForOrder(orderId: string) {
  const database = await db();
  const rows = await database.query<{ id: string }>(`select id from refunds where order_id = $1 and status in ('pending','failed','processing')`, [orderId]);
  for (const r of rows) await processRefund(r.id);
}

/** For the scheduler: retry refunds that are waiting or failed. */
export async function processDueRefunds(limit = 25) {
  const database = await db();
  const rows = await database.query<{ id: string }>(
    `select id from refunds where (status in ('pending','failed') and attempts < 8) or (status = 'processing' and gateway_refund_id is null and updated_at < now() - interval '10 minutes') order by created_at limit ${limit}`,
  );
  let n = 0;
  for (const r of rows) if ((await processRefund(r.id)) === "done") n++;
  return { checked: rows.length, completed: n };
}

/** Razorpay told us (webhook) that a refund finished or failed. */
export async function applyRefundWebhook(gatewayRefundId: string, gatewayPaymentId: string | null, status: "processed" | "failed", error?: string) {
  const database = await db();
  await database.tx(async (t) => {
    let r = (await t.query<Row>(`select * from refunds where gateway_refund_id = $1 for update`, [gatewayRefundId]))[0];
    if (!r && gatewayPaymentId) {
      r = (await t.query<Row>(`select r.* from refunds r join payments p on p.id = r.payment_id where p.gateway_payment_id = $1 for update of r`, [gatewayPaymentId]))[0];
    }
    if (!r || r.status === "processed") return;
    if (status === "processed") {
      await t.query(`update refunds set status = 'processed', gateway_refund_id = coalesce(gateway_refund_id, $2), last_error = null, updated_at = now() where id = $1`, [r.id, gatewayRefundId]);
      await markOrderRefunded(t, r.order_id as string, Number(r.amount));
    } else {
      // A refund the bank rejected cannot be retried from here; it needs a person.
      await t.query(`update refunds set status = 'failed', attempts = 8, last_error = $2, updated_at = now() where id = $1`, [r.id, (error ?? "Refund failed at the bank").slice(0, 300)]);
      await audit(null, "payments.refund.failed", { refundId: r.id, orderId: r.order_id, error }, undefined, t.query);
    }
  });
  if (status === "processed") kickNotifications();
}

/** Admin: try a failed refund again (only ones that failed on our side, not ones the bank rejected). */
export async function retryRefund(actorId: string, refundId: string, ip?: string) {
  const database = await db();
  await database.tx(async (t) => {
    await t.query(`update refunds set attempts = 0, status = 'pending', updated_at = now() where id = $1 and status = 'failed' and attempts < 8`, [refundId]);
    await audit(actorId, "payments.refund.retry", { refundId }, ip, t.query);
  });
  return processRefund(refundId);
}
