import { ApiError } from "../http";
import { audit } from "../auth/users";
import { db, query, type Row } from "../db";
import { getSettings } from "../orders/settings";
import { kickNotifications, notifyOrder } from "../notifications/queue";
import { queueRefundForOrder, processRefundsForOrder } from "./refunds";
import { createGatewayOrder, razorpayConfig, toPaise } from "./razorpay";

type User = { id: string; name: string | null; email: string | null; phone: string | null };

/** Create (or reuse) the Razorpay order for a customer order that is waiting for payment. */
export async function startPayment(user: User, orderId: string, ip?: string) {
  const cfg = razorpayConfig();
  if (!cfg) throw new ApiError(503, "Online payment is not set up yet.", "gateway_not_configured");

  const load = async () => {
    const o = (await query<Row>(`select * from orders where id = $1 and user_id = $2`, [orderId, user.id]))[0];
    if (!o) throw new ApiError(404, "Order not found.");
    if (o.payment_method !== "online" || o.status !== "pending_payment") throw new ApiError(409, "This order is not waiting for payment.", "not_payable");
    if (o.expires_at && new Date(o.expires_at).getTime() <= Date.now()) throw new ApiError(409, "The time to pay for this order has run out. Please place the order again.", "expired");
    return o;
  };
  const order = await load();
  const settings = await getSettings();

  let pay = (await query<Row>(`select * from payments where order_id = $1 and status = 'created' order by created_at desc limit 1`, [orderId]))[0];
  if (!pay) {
    const g = await createGatewayOrder(toPaise(Number(order.total)), order.order_number as string, { orderId, orderNumber: order.order_number as string });
    if (g.amount !== toPaise(Number(order.total))) throw new ApiError(502, "The payment service returned an unexpected amount.", "gateway_error");
    const database = await db();
    pay = await database.tx(async (t) => {
      const o = (await t.query<Row>(`select status from orders where id = $1 for update`, [orderId]))[0];
      if (o.status !== "pending_payment") throw new ApiError(409, "This order is not waiting for payment.", "not_payable");
      const [row] = await t.query<Row>(`insert into payments (order_id, gateway_order_id, amount) values ($1,$2,$3) returning *`, [orderId, g.id, order.total]);
      return row;
    });
  }
  // Give the customer time to finish paying, but never hold stock for more than an hour in total.
  await query(
    `update orders set expires_at = least(created_at + interval '60 minutes', greatest(expires_at, now() + interval '10 minutes')), updated_at = now() where id = $1 and status = 'pending_payment'`,
    [orderId],
  );
  await audit(user.id, "payments.started", { orderId, gatewayOrderId: pay.gateway_order_id }, ip);
  return {
    keyId: cfg.keyId,
    gatewayOrderId: pay.gateway_order_id as string,
    amountPaise: toPaise(Number(pay.amount)),
    orderNumber: order.order_number as string,
    shopName: settings.shop.name,
    prefill: { name: user.name ?? order.customer_name, email: user.email ?? "", contact: user.phone ?? order.customer_phone },
  };
}

export type ConfirmResult = { orderId: string; outcome: "confirmed" | "already" | "refund" };

/**
 * A payment has succeeded. Called both when the browser reports it (after checking the signature) and when Razorpay's
 * webhook says so, in either order and any number of times. The first call does the work; the rest change nothing.
 * If the order can no longer be fulfilled (cancelled or expired meanwhile), the money is sent back automatically.
 */
export async function confirmPayment(input: { gatewayOrderId: string; gatewayPaymentId: string; method?: string | null; amountPaise?: number | null; userId?: string }): Promise<ConfirmResult | null> {
  const database = await db();
  let refundNeeded = false;
  const result = await database.tx(async (t): Promise<ConfirmResult | null> => {
    const p = (await t.query<Row>(`select * from payments where gateway_order_id = $1 for update`, [input.gatewayOrderId]))[0];
    if (!p) return null;
    const o = (await t.query<Row>(`select * from orders where id = $1 for update`, [p.order_id]))[0];
    if (input.userId && o.user_id !== input.userId) return null;
    if (p.status === "paid") return { orderId: o.id, outcome: "already" };
    if (input.amountPaise != null && input.amountPaise !== toPaise(Number(p.amount))) {
      await t.query(`update payments set last_error = $2 where id = $1`, [p.id, `Amount mismatch: paid ${input.amountPaise} paise, expected ${toPaise(Number(p.amount))}`]);
      await audit(null, "payments.amount_mismatch", { orderId: o.id, paid: input.amountPaise, expected: toPaise(Number(p.amount)) }, undefined, t.query);
      return null;
    }
    const alreadyPaid = (await t.query(`select 1 from payments where order_id = $1 and status = 'paid' limit 1`, [o.id])).length > 0;
    await t.query(`update payments set status = 'paid', gateway_payment_id = $2, method = $3, paid_at = now(), last_error = null where id = $1`, [p.id, input.gatewayPaymentId, input.method ?? null]);
    if (o.status === "pending_payment" && !alreadyPaid) {
      await t.query(`update orders set status = 'confirmed', payment_status = 'paid', paid_at = now(), expires_at = null, updated_at = now() where id = $1`, [o.id]);
      await t.query(`insert into order_events (order_id, status, note) values ($1,'confirmed',$2)`, [o.id, `Payment received${input.method ? ` (${input.method})` : ""}`]);
      await notifyOrder(t, o.id, "order_confirmed");
      await audit(o.user_id, "payments.paid", { orderId: o.id, orderNumber: o.order_number, amount: Number(p.amount), method: input.method ?? null }, undefined, t.query);
      return { orderId: o.id, outcome: "confirmed" };
    }
    // Too late (cancelled or expired) or paid twice: give the money back.
    const why = alreadyPaid ? "Paid twice for the same order" : `Payment arrived after the order was ${o.status.replace(/_/g, " ")}`;
    await queueRefundForOrder(t, o.id, why, null, p.id);
    refundNeeded = true;
    await audit(null, "payments.late", { orderId: o.id, orderNumber: o.order_number, reason: why }, undefined, t.query);
    return { orderId: o.id, outcome: "refund" };
  });
  if (result?.outcome === "confirmed") kickNotifications();
  if (result && refundNeeded) await processRefundsForOrder(result.orderId).catch((e) => console.error("[refund]", e));
  return result;
}

export async function recordPaymentFailure(gatewayOrderId: string, message: string) {
  await query(`update payments set last_error = $2 where gateway_order_id = $1 and status = 'created'`, [gatewayOrderId, message.slice(0, 300)]);
}
