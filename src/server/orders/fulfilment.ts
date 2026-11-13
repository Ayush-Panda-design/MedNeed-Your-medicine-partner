import { randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError } from "../http";
import { audit, createUser, normalizePhone, type Role } from "../auth/users";
import { db, query, type Row, type Tx } from "../db";
import { kickNotifications, notifyOrder } from "../notifications/queue";
import { rateLimit } from "../security/rate-limit";
import { assignInvoiceNumber } from "./invoice-number";
import { lockOrder } from "./place";

type Actor = { id: string; ip?: string };

export const MAX_CODE_TRIES = 5;
/** After this many failed attempts the order is flagged so the shop decides whether to try again or cancel. */
export const FAILED_ATTEMPT_FLAG = 3;
export const FAIL_REASONS = { not_reachable: "Customer not reachable", wrong_address: "Address could not be found", refused: "Customer refused the order", not_home: "Nobody was available", other: "Other" } as const;
export type FailReason = keyof typeof FAIL_REASONS;

const newCode = () => String(randomInt(0, 10_000)).padStart(4, "0");
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* ---------- packing ---------- */

/** The packer confirms one batch by typing or scanning its batch number. The number must match the batch the system reserved. */
export async function pickBatch(actor: Actor, orderId: string, rowId: string, batchNo: string | null) {
  const database = await db();
  await database.tx(async (t) => {
    const o = await lockOrder(t, orderId);
    if (o.status !== "confirmed") throw new ApiError(409, "Items can only be confirmed while the order is waiting to be packed.", "bad_state");
    if (o.requires_prescription && o.prescription_status !== "verified") throw new ApiError(409, "Verify the prescription before packing this order.", "prescription_pending");
    const row = (await t.query<Row>(`select b.id, b.batch_no from order_item_batches b join order_items i on i.id = b.order_item_id where b.id = $1 and i.order_id = $2 for update of b`, [rowId, orderId]))[0];
    if (!row) throw new ApiError(404, "That item was not found on this order.");
    if (batchNo === null) {
      await t.query(`update order_item_batches set picked_at = null, picked_by = null where id = $1`, [rowId]);
      return;
    }
    if (String(row.batch_no).trim().toLowerCase() !== batchNo.trim().toLowerCase()) throw new ApiError(409, "That batch number does not match. Check the pack in your hand.", "batch_mismatch");
    await t.query(`update order_item_batches set picked_at = coalesce(picked_at, now()), picked_by = coalesce(picked_by, $2) where id = $1`, [rowId, actor.id]);
  });
}

/* ---------- delivery staff ---------- */

async function partnerOrThrow(t: Tx, partnerId: string) {
  const p = (await t.query<Row>(`select u.id, u.name, u.phone from users u join user_roles r on r.user_id = u.id and r.role = 'delivery' where u.id = $1 and u.status = 'active'`, [partnerId]))[0];
  if (!p) throw new ApiError(400, "Choose an active delivery person.", "bad_partner");
  return p;
}

const needRx = (o: Row) => o.requires_prescription && o.prescription_status !== "verified";

/** Hand packed orders to a delivery person. Each order gets its own 4-digit code, which the customer reads out at the door. */
export async function dispatchOrders(actor: Actor, orderIds: string[], partnerId: string) {
  const ids = [...new Set(orderIds)].sort();
  if (ids.length === 0) throw new ApiError(400, "Choose at least one order.", "no_orders");
  if (ids.length > 30) throw new ApiError(400, "Send at most 30 orders at a time.", "too_many");
  const database = await db();
  await database.tx(async (t) => {
    const partner = await partnerOrThrow(t, partnerId);
    for (const id of ids) {
      const o = await lockOrder(t, id);
      if (o.status !== "packed") throw new ApiError(409, `Order ${o.order_number} is ${String(o.status).replace(/_/g, " ")}, so it cannot be sent out.`, "bad_state");
      if (o.fulfilment !== "delivery") throw new ApiError(409, `Order ${o.order_number} is a pickup order.`, "bad_state");
      if (needRx(o)) throw new ApiError(409, `Order ${o.order_number} has prescription medicines. Verify the prescription first.`, "prescription_pending");
      const code = newCode();
      await t.query(`update orders set status = 'out_for_delivery', delivery_partner_id = $2, delivery_code = $3, delivery_code_attempts = 0, dispatched_at = now(), updated_at = now() where id = $1`, [id, partnerId, code]);
      await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,'out_for_delivery',$2,$3)`, [id, `Sent out with ${partner.name ?? "a delivery person"}`, actor.id]);
      await notifyOrder(t, id, "out_for_delivery", { code, partnerName: partner.name ?? undefined, partnerPhone: partner.phone ? partner.phone.replace(/^\+91/, "") : undefined }, String(o.delivery_attempts));
      await audit(actor.id, "orders.dispatched", { id, orderNumber: o.order_number, partnerId }, actor.ip, t.query);
    }
  });
  kickNotifications();
}

/** Change the delivery person of an order that is already on the road. This also issues a fresh code (it is how a locked code is reset). */
export async function reassignOrder(actor: Actor, orderId: string, partnerId: string) {
  const database = await db();
  await database.tx(async (t) => {
    const partner = await partnerOrThrow(t, partnerId);
    const o = await lockOrder(t, orderId);
    if (o.status !== "out_for_delivery") throw new ApiError(409, "Only an order that is out for delivery can be reassigned.", "bad_state");
    const code = newCode();
    await t.query(`update orders set delivery_partner_id = $2, delivery_code = $3, delivery_code_attempts = 0, updated_at = now() where id = $1`, [orderId, partnerId, code]);
    await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,'out_for_delivery',$2,$3)`, [orderId, `Reassigned to ${partner.name ?? "a delivery person"}`, actor.id]);
    await notifyOrder(t, orderId, "out_for_delivery", { code, partnerName: partner.name ?? undefined, partnerPhone: partner.phone ? partner.phone.replace(/^\+91/, "") : undefined }, `${o.delivery_attempts}-r${Date.now().toString(36)}`);
    await audit(actor.id, "orders.reassigned", { id: orderId, orderNumber: o.order_number, from: o.delivery_partner_id, to: partnerId }, actor.ip, t.query);
  });
  kickNotifications();
}

/** The delivery person finishes the delivery by entering the customer's code. For cash orders they also confirm the money. */
export async function completeDelivery(partner: { id: string; ip?: string }, orderId: string, input: { code: string; cashCollected: boolean }) {
  await rateLimit(`deliver:${partner.id}`, 60, 600, "Too many attempts. Please wait a few minutes.");
  const database = await db();
  let wrong: ApiError | null = null;
  await database.tx(async (t) => {
    const o = await lockOrder(t, orderId);
    if (o.delivery_partner_id !== partner.id) throw new ApiError(404, "Order not found.");
    if (o.status !== "out_for_delivery") throw new ApiError(409, "This order is not out for delivery.", "bad_state");
    if (o.delivery_code_attempts >= MAX_CODE_TRIES) throw new ApiError(423, "Too many wrong codes. Please call the shop. They can issue a new code.", "code_locked");
    if (!o.delivery_code || !safeEqual(String(o.delivery_code), input.code)) {
      // The counter is saved even though the request fails.
      await t.query(`update orders set delivery_code_attempts = delivery_code_attempts + 1 where id = $1`, [orderId]);
      const left = MAX_CODE_TRIES - (o.delivery_code_attempts + 1);
      wrong = new ApiError(409, left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Please call the shop. They can issue a new code.", left > 0 ? "bad_code" : "code_locked");
      return;
    }
    const cash = o.payment_status === "unpaid" && o.payment_method === "cod";
    if (cash && !input.cashCollected) throw new ApiError(400, `Confirm that you collected ₹${Number(o.total)} before finishing.`, "cash_required");
    await t.query(
      `update orders set status = 'delivered', delivered_at = now(), delivery_code = null, updated_at = now(),
         payment_status = case when $2 then 'paid' else payment_status end,
         cod_collected = case when $2 then total else cod_collected end, cod_collected_at = case when $2 then now() else cod_collected_at end
       where id = $1`, [orderId, cash]);
    await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,'delivered',$2,$3)`, [orderId, cash ? "Delivered. Payment collected" : "Delivered", partner.id]);
    await assignInvoiceNumber(t, orderId);
    await notifyOrder(t, orderId, "delivered");
    await audit(partner.id, "orders.delivered", { id: orderId, orderNumber: o.order_number, cash }, partner.ip, t.query);
  });
  if (wrong) throw wrong;
  kickNotifications();
}

/** The delivery person could not hand the order over. It goes back to the shop's queue to be sent again or cancelled. */
export async function failDelivery(partner: { id: string; ip?: string }, orderId: string, reason: FailReason, note: string) {
  const database = await db();
  await database.tx(async (t) => {
    const o = await lockOrder(t, orderId);
    if (o.delivery_partner_id !== partner.id) throw new ApiError(404, "Order not found.");
    if (o.status !== "out_for_delivery") throw new ApiError(409, "This order is not out for delivery.", "bad_state");
    const text = FAIL_REASONS[reason];
    await t.query(`update orders set status = 'packed', delivery_partner_id = null, delivery_code = null, delivery_code_attempts = 0, delivery_attempts = delivery_attempts + 1, updated_at = now() where id = $1`, [orderId]);
    await t.query(`insert into delivery_attempts (order_id, partner_id, reason, note) values ($1,$2,$3,$4)`, [orderId, partner.id, text, note]);
    await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,'packed',$2,$3)`, [orderId, `Delivery attempt ${o.delivery_attempts + 1} failed: ${text}${note ? ` (${note})` : ""}`, partner.id]);
    await notifyOrder(t, orderId, "delivery_failed", { reason: text }, String(o.delivery_attempts + 1));
    await audit(partner.id, "orders.delivery_failed", { id: orderId, orderNumber: o.order_number, reason: text }, partner.ip, t.query);
  });
  kickNotifications();
}

export const failInput = z.object({ reason: z.enum(Object.keys(FAIL_REASONS) as [FailReason, ...FailReason[]]), note: z.string().trim().max(200).default("") });
export const completeInput = z.object({ code: z.string().regex(/^\d{4}$/, "Enter the 4-digit code"), cashCollected: z.boolean().default(false) });

/* ---------- delivery team (admin) ---------- */

export async function listPartners() {
  const rows = await query(
    `select u.id, u.name, u.phone, u.status, u.last_login_at,
            (select count(*)::int from orders o where o.delivery_partner_id = u.id and o.status = 'out_for_delivery') as active,
            (select count(*)::int from orders o where o.delivery_partner_id = u.id and o.status = 'delivered' and o.delivered_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as delivered_today,
            (select coalesce(sum(o.cod_collected), 0)::float from orders o where o.delivery_partner_id = u.id and o.cod_collected_at is not null and o.cod_settled_at is null) as cash_pending,
            (select count(*)::int from orders o where o.delivery_partner_id = u.id and o.cod_collected_at is not null and o.cod_settled_at is null) as cash_orders
     from users u join user_roles r on r.user_id = u.id and r.role = 'delivery' order by u.name nulls last, u.created_at`);
  return rows.map((r) => ({ id: r.id as string, name: (r.name ?? "") as string, phone: (r.phone ?? "") as string, status: r.status as string, lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null, active: Number(r.active), deliveredToday: Number(r.delivered_today), cashPending: Number(r.cash_pending), cashOrders: Number(r.cash_orders) }));
}

export const partnerInput = z.object({ name: z.string().trim().min(2, "Enter the person's name").max(80), phone: z.string().trim().min(10, "Enter a 10-digit mobile number").max(20) });

/** Give a mobile number the delivery role. If the person already has an account (for example as a customer) it is kept. */
export async function addPartner(actor: Actor, input: z.infer<typeof partnerInput>) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ApiError(400, "Enter a valid 10-digit mobile number.", "bad_phone");
  const database = await db();
  const userId = await database.tx(async (t) => {
    const existing = (await t.query<Row>(`select id, status from users where phone = $1 for update`, [phone]))[0];
    if (existing) {
      if (existing.status !== "active") throw new ApiError(409, "That account is disabled.", "disabled");
      await t.query(`insert into user_roles (user_id, role) values ($1,'delivery') on conflict do nothing`, [existing.id]);
      return existing.id as string;
    }
    return null;
  });
  let id = userId;
  if (!id) {
    const u = await createUser({ name: input.name, phone, phoneVerified: false, roles: ["customer", "delivery"] as Role[] });
    id = u.id;
  }
  await audit(actor.id, "delivery.partner_added", { userId: id, phone }, actor.ip);
  return { id, phone };
}

export async function removePartner(actor: Actor, partnerId: string) {
  const database = await db();
  await database.tx(async (t) => {
    const busy = await t.query(`select 1 from orders where delivery_partner_id = $1 and status = 'out_for_delivery' limit 1`, [partnerId]);
    if (busy.length) throw new ApiError(409, "This person still has orders out for delivery. Reassign them first.", "has_orders");
    const unsettled = await t.query(`select 1 from orders where delivery_partner_id = $1 and cod_collected_at is not null and cod_settled_at is null limit 1`, [partnerId]);
    if (unsettled.length) throw new ApiError(409, "This person still owes cash. Settle it first.", "has_cash");
    const gone = await t.query(`delete from user_roles where user_id = $1 and role = 'delivery' returning user_id`, [partnerId]);
    if (!gone.length) throw new ApiError(404, "Delivery person not found.");
    await audit(actor.id, "delivery.partner_removed", { userId: partnerId }, actor.ip, t.query);
  });
}

/** The shop received the cash a delivery person collected. */
export async function settleCash(actor: Actor, partnerId: string) {
  const database = await db();
  return database.tx(async (t) => {
    const rows = await t.query<{ total: string }>(`update orders set cod_settled_at = now(), cod_settled_by = $2 where delivery_partner_id = $1 and cod_collected_at is not null and cod_settled_at is null returning cod_collected as total`, [partnerId, actor.id]);
    const amount = rows.reduce((a, r) => a + Number(r.total), 0);
    if (rows.length === 0) throw new ApiError(409, "There is no cash to settle.", "nothing");
    await audit(actor.id, "delivery.cash_settled", { partnerId, orders: rows.length, amount }, actor.ip, t.query);
    return { orders: rows.length, amount };
  });
}

/* ---------- screens ---------- */

const mapRow = (r: Row) => ({
  id: r.id as string, orderNumber: r.order_number as string, status: r.status as string, fulfilment: r.fulfilment as "delivery" | "pickup",
  customerName: r.customer_name as string, customerPhone: r.customer_phone as string,
  area: [r.line1, r.city, r.pincode].filter(Boolean).join(", ") as string, pincode: (r.pincode ?? null) as string | null,
  slotDate: (r.slot_day ?? null) as string | null, slotWindow: (r.slot_window ?? null) as string | null,
  total: Number(r.total), paymentMethod: r.payment_method as string, paymentStatus: r.payment_status as string,
  requiresRx: r.requires_prescription as boolean, rxStatus: r.prescription_status as string,
  createdAt: new Date(r.created_at).toISOString(), dispatchedAt: r.dispatched_at ? new Date(r.dispatched_at).toISOString() : null,
  deliveryAttempts: Number(r.delivery_attempts), partnerId: (r.delivery_partner_id ?? null) as string | null, partnerName: (r.partner_name ?? null) as string | null, partnerPhone: (r.partner_phone ?? null) as string | null,
  codeLocked: Number(r.delivery_code_attempts) >= MAX_CODE_TRIES,
  itemCount: Number(r.item_count), batchesTotal: Number(r.batches_total), batchesPicked: Number(r.batches_picked),
});
export type FulfilmentOrder = ReturnType<typeof mapRow>;

export async function fulfilmentQueues() {
  const rows = await query(
    `select o.*, to_char(o.slot_date, 'YYYY-MM-DD') as slot_day, o.address->>'line1' as line1, o.address->>'city' as city, o.address->>'pincode' as pincode,
            p.name as partner_name, p.phone as partner_phone,
            (select coalesce(sum(qty), 0)::int from order_items i where i.order_id = o.id) as item_count,
            (select count(*)::int from order_item_batches b join order_items i on i.id = b.order_item_id where i.order_id = o.id) as batches_total,
            (select count(*)::int from order_item_batches b join order_items i on i.id = b.order_item_id where i.order_id = o.id and b.picked_at is not null) as batches_picked
     from orders o left join users p on p.id = o.delivery_partner_id
     where o.status in ('confirmed', 'packed', 'out_for_delivery')
     order by (o.slot_date is not null), o.slot_date, o.slot_window, o.created_at limit 500`);
  const all = rows.map(mapRow);
  const rxWait = (o: FulfilmentOrder) => o.requiresRx && o.rxStatus !== "verified";
  return {
    toPack: all.filter((o) => o.status === "confirmed" && !rxWait(o)),
    waitingRx: all.filter((o) => o.status === "confirmed" && rxWait(o)),
    readyToSend: all.filter((o) => o.status === "packed" && o.fulfilment === "delivery"),
    readyForPickup: all.filter((o) => o.status === "packed" && o.fulfilment === "pickup"),
    onTheRoad: all.filter((o) => o.status === "out_for_delivery"),
  };
}

/** Everything the packer needs: each item with the batches reserved for it and whether each is confirmed yet. */
export async function packingDetail(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const o = (await query(`select o.*, to_char(o.slot_date, 'YYYY-MM-DD') as slot_day from orders o where o.id = $1`, [orderId]))[0];
  if (!o) return null;
  const rows = await query(
    `select i.id as item_id, i.name, i.pack_size, i.manufacturer, i.schedule, b.id as row_id, b.batch_no, to_char(b.expiry_date, 'YYYY-MM') as expiry, b.qty, b.picked_at
     from order_items i join order_item_batches b on b.order_item_id = i.id where i.order_id = $1 order by i.name, b.expiry_date`, [orderId]);
  type Line = { itemId: string; name: string; packSize: string; manufacturer: string; schedule: string; batches: { rowId: string; batchNo: string; expiry: string; qty: number; picked: boolean }[] };
  const items = new Map<string, Line>();
  for (const r of rows) {
    const line = items.get(r.item_id) ?? { itemId: r.item_id as string, name: r.name as string, packSize: r.pack_size as string, manufacturer: r.manufacturer as string, schedule: r.schedule as string, batches: [] };
    line.batches.push({ rowId: r.row_id as string, batchNo: r.batch_no as string, expiry: r.expiry as string, qty: Number(r.qty), picked: r.picked_at != null });
    items.set(r.item_id, line);
  }
  return {
    id: o.id as string, orderNumber: o.order_number as string, status: o.status as string, fulfilment: o.fulfilment as string, customerName: o.customer_name as string,
    slotDate: (o.slot_day ?? null) as string | null, slotWindow: (o.slot_window ?? null) as string | null, customerNote: o.customer_note as string,
    requiresRx: o.requires_prescription as boolean, rxStatus: o.prescription_status as string, items: [...items.values()],
  };
}

/** What a delivery person sees: their own orders on the road, plus today's totals. */
export async function partnerWork(partnerId: string) {
  const rows = await query(
    `select o.id, o.order_number, o.customer_name, o.customer_phone, o.address, o.total, o.payment_method, o.payment_status, o.customer_note, o.slot_window, o.dispatched_at, o.delivery_code_attempts,
            (select coalesce(sum(qty), 0)::int from order_items i where i.order_id = o.id) as item_count
     from orders o where o.delivery_partner_id = $1 and o.status = 'out_for_delivery' order by o.dispatched_at, o.created_at`, [partnerId]);
  const [today] = await query<{ delivered: number; cash: number }>(
    `select count(*)::int as delivered, coalesce(sum(cod_collected), 0)::float as cash from orders
     where delivery_partner_id = $1 and status = 'delivered' and delivered_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`, [partnerId]);
  return {
    orders: rows.map((r) => {
      const a = (r.address ?? {}) as { line1?: string; line2?: string; landmark?: string; city?: string; state?: string; pincode?: string; lat?: number | null; lng?: number | null; phone?: string };
      const text = [a.line1, a.line2, a.landmark ? `near ${a.landmark}` : null, a.city, a.pincode].filter(Boolean).join(", ");
      return {
        id: r.id as string, orderNumber: r.order_number as string, customerName: r.customer_name as string, phone: ((a.phone ?? r.customer_phone) as string),
        address: text, mapUrl: a.lat != null && a.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`,
        total: Number(r.total), collect: r.payment_method === "cod" && r.payment_status === "unpaid", note: (r.customer_note ?? "") as string, slotWindow: (r.slot_window ?? null) as string | null,
        itemCount: Number(r.item_count), locked: Number(r.delivery_code_attempts) >= MAX_CODE_TRIES,
      };
    }),
    deliveredToday: Number(today?.delivered ?? 0), cashToday: Number(today?.cash ?? 0),
  };
}

