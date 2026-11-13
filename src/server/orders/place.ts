import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError } from "../http";
import { audit, isUniqueViolation } from "../auth/users";
import { db, query, type Row, type Tx } from "../db";
import { lockMedicines, allocateFefo, returnSale } from "../inventory/stock";
import { rateLimit } from "../security/rate-limit";
import { processRefundsForOrder, queueRefundForOrder } from "../payments/refunds";
import { razorpayConfigured } from "../payments/razorpay";
import { kickNotifications, notifyOrder } from "../notifications/queue";
import { lockPrescriptions, planPrescriptions, recordUsage, releaseRxUsage, type RxLine } from "../prescriptions/coverage";
import { assignInvoiceNumber } from "./invoice-number";
import { evaluateCoupon } from "./coupons";
import { buildQuote, finishQuote, type QuoteInput, type QuoteLine } from "./quote";
import { getSettings, type StoreSettings } from "./settings";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const placeOrderInput = z.object({
  items: z.array(z.object({ slug: z.string().min(1).max(160), qty: z.number().int().min(1).max(100) })).min(1, "Your cart is empty").max(50),
  fulfilment: z.enum(["delivery", "pickup"]),
  addressId: z.uuid().nullable().optional(),
  contact: z.object({ name: z.string().trim().min(2, "Enter your name").max(80), phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number") }).nullable().optional(),
  couponCode: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(["cod", "pay_at_store", "online"]),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  slotWindow: z.string().max(11).nullable().optional(),
  customerNote: z.string().trim().max(300).optional(),
  /** Prescriptions to place the order with. Required when the cart has prescription medicines. */
  prescriptionIds: z.array(z.uuid()).max(5).optional(),
  /** The total the customer saw. If the real total is higher the order is refused so they can review it. */
  expectedTotal: z.number().min(0),
  idempotencyKey: z.string().trim().min(8).max(80),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

/* ---------- time helpers (store runs on Indian time) ---------- */
function istNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function validateSlot(settings: StoreSettings, date: string | null | undefined, window: string | null | undefined, now = istNow()) {
  if (!date && !window) {
    if (now.minutes < toMin(settings.hours.open) || now.minutes >= toMin(settings.hours.close)) {
      throw new ApiError(400, `We are closed right now (open ${settings.hours.open} to ${settings.hours.close}). Choose a delivery time slot instead.`, "closed");
    }
    return { date: null, window: null };
  }
  if (!date || !window) throw new ApiError(400, "Choose both a day and a time slot.", "bad_slot");
  if (date !== now.date && date !== addDays(now.date, 1)) throw new ApiError(400, "You can schedule for today or tomorrow only.", "bad_slot");
  if (!settings.slots.includes(window)) throw new ApiError(400, "That time slot is not available.", "bad_slot");
  const end = toMin(window.split("-")[1]);
  if (date === now.date && end < now.minutes + 60) throw new ApiError(400, "That time slot is too soon. Choose a later slot.", "bad_slot");
  return { date, window };
}

/* ---------- placing an order ---------- */

type Placed = { id: string; orderNumber: string; total: number; status: string; replayed: boolean };

export async function placeOrder(user: { id: string; name: string | null; phone: string | null }, input: PlaceOrderInput, ip?: string): Promise<Placed> {
  await rateLimit(`order:${user.id}`, Number(process.env.ORDER_RATE_LIMIT) || 10, 600, "Too many orders in a short time. Please wait a few minutes.");
  await expirePendingOrders().catch(() => undefined);

  const existing = await query<{ id: string; order_number: string; total: string; status: string }>(`select id, order_number, total, status from orders where user_id = $1 and idempotency_key = $2`, [user.id, input.idempotencyKey]);
  if (existing[0]) return { id: existing[0].id, orderNumber: existing[0].order_number, total: Number(existing[0].total), status: existing[0].status, replayed: true };

  const database = await db();
  try {
    const placed = await database.tx((t) => placeInTx(t, user, input, ip));
    kickNotifications();
    return placed;
  } catch (e) {
    if (isUniqueViolation(e)) {
      const again = await query<{ id: string; order_number: string; total: string; status: string }>(`select id, order_number, total, status from orders where user_id = $1 and idempotency_key = $2`, [user.id, input.idempotencyKey]);
      if (again[0]) return { id: again[0].id, orderNumber: again[0].order_number, total: Number(again[0].total), status: again[0].status, replayed: true };
    }
    throw e;
  }
}

async function placeInTx(t: Tx, user: { id: string; name: string | null; phone: string | null }, input: PlaceOrderInput, ip?: string): Promise<Placed> {
  const settings = await getSettings(t.query);

  // Who the order is for, and where it goes.
  let address: Row | null = null;
  let contact: { name: string; phone: string };
  if (input.fulfilment === "delivery") {
    if (!input.addressId) throw new ApiError(400, "Choose a delivery address.", "no_address");
    address = (await t.query(`select * from addresses where id = $1 and user_id = $2`, [input.addressId, user.id]))[0] ?? null;
    if (!address) throw new ApiError(400, "That address was not found.", "no_address");
    contact = { name: address.full_name, phone: address.phone };
  } else {
    const name = input.contact?.name ?? user.name ?? "";
    const phone = input.contact?.phone ?? user.phone ?? "";
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) throw new ApiError(400, "Enter the name and mobile number of the person collecting the order.", "no_contact");
    contact = { name, phone };
  }
  const place = address ? { lat: address.lat == null ? null : Number(address.lat), lng: address.lng == null ? null : Number(address.lng), pincode: address.pincode as string } : null;
  const quoteInput: QuoteInput = { items: input.items, fulfilment: input.fulfilment, place, couponCode: input.couponCode ?? null, userId: user.id };

  // Prescriptions are locked before medicines, the same order the pharmacist's review uses, so the two can never wait on each other.
  await lockPrescriptions(t.query, user.id, input.prescriptionIds ?? []);
  // Lock every medicine in a fixed order first so two orders can never wait on each other.
  const ids = await t.query<{ id: string }>(`select id from medicines where slug = any($1::text[])`, [[...new Set(input.items.map((i) => i.slug))]]);
  await lockMedicines(t, ids.map((r) => r.id));

  const first = await buildQuote(t.query, settings, quoteInput);
  const lineProblem = first.lines.find((l) => l.problem);
  if (lineProblem) throw new ApiError(409, lineProblem.problem as string, "cart_changed");

  const slot = validateSlot(settings, input.slotDate, input.slotWindow);

  // Take the stock. Real prices come from the batches that fill each line.
  const orderId = randomUUID();
  const allocated: { line: QuoteLine; lines: Awaited<ReturnType<typeof allocateFefo>>["lines"] }[] = [];
  const priced: QuoteLine[] = [];
  for (const l of [...first.lines].sort((a, b) => (a.medicineId as string).localeCompare(b.medicineId as string))) {
    const r = await allocateFefo(t, l.medicineId as string, l.qty, { type: "order", id: orderId }, { id: user.id });
    allocated.push({ line: l, lines: r.lines });
    priced.push({ ...l, unitPrice: r.unitPrice, mrp: r.mrp, lineTotal: round2(r.unitPrice * l.qty) });
  }
  const final = await finishQuote(t.query, settings, quoteInput, priced, []);
  if (!final.canCheckout) throw new ApiError(409, final.problems[0], "cart_changed");
  if (final.couponError && input.couponCode?.trim()) throw new ApiError(409, final.couponError, "coupon_invalid");
  if (final.total > input.expectedTotal + 0.005) throw new ApiError(409, `The total has changed to ₹${final.total}. Please review your order.`, "price_changed");

  // Payment method rules.
  const pay = input.paymentMethod;
  if (input.fulfilment === "delivery" && pay === "pay_at_store") throw new ApiError(400, "Pay at store is only for pickup orders.", "bad_payment");
  if (input.fulfilment === "pickup" && pay === "cod") throw new ApiError(400, "Cash on delivery is only for delivery orders.", "bad_payment");
  if (pay === "cod") {
    if (!settings.payments.codEnabled) throw new ApiError(400, "Cash on delivery is not available right now.", "bad_payment");
    if (final.total > settings.payments.codMax) throw new ApiError(400, `Cash on delivery is available up to ₹${settings.payments.codMax}. Choose online payment for larger orders.`, "bad_payment");
  }
  if (pay === "online" && (!settings.payments.onlineEnabled || !razorpayConfigured())) throw new ApiError(400, "Online payment is not available yet.", "bad_payment");

  // Prescription medicines need a prescription, and each prescription only covers the quantities the pharmacist approved.
  const rxLines: RxLine[] = priced.filter((l) => l.rx).map((l) => ({ medicineId: l.medicineId as string, name: l.name, qty: l.qty }));
  const rxPlan = rxLines.length ? await planPrescriptions(t.query, user.id, input.prescriptionIds ?? [], rxLines, true) : null;

  // Coupon: lock it, re-check the limits, and count the use in the same transaction.
  let couponId: string | null = null;
  if (final.coupon) {
    const c = await evaluateCoupon(t.query, final.coupon.code, user.id, final.subtotal, true);
    if (!c.ok) throw new ApiError(409, c.message, "coupon_invalid");
    couponId = c.id;
  }

  const status = pay === "online" ? "pending_payment" : "confirmed";
  const rx = final.requiresPrescription;
  const rxVerified = rxPlan?.state === "verified";
  const orderNumber = (await t.query<{ n: string }>(`select 'MN' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || nextval('order_number_seq') as n`))[0].n;
  const addressSnapshot = address
    ? { fullName: address.full_name, phone: address.phone, line1: address.line1, line2: address.line2, landmark: address.landmark, city: address.city, state: address.state, pincode: address.pincode, lat: address.lat == null ? null : Number(address.lat), lng: address.lng == null ? null : Number(address.lng) }
    : null;

  await t.query(
    `insert into orders (id, order_number, user_id, status, fulfilment, payment_method, customer_name, customer_phone, address, distance_km, distance_source,
        mrp_total, subtotal, discount, delivery_fee, total, coupon_code, slot_date, slot_window, customer_note, requires_prescription, prescription_status, expires_at, idempotency_key)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, case when $4 = 'pending_payment' then now() + make_interval(mins => $23) end, $24)`,
    [orderId, orderNumber, user.id, status, input.fulfilment, pay, contact.name, contact.phone, addressSnapshot ? JSON.stringify(addressSnapshot) : null, final.delivery.km, final.delivery.source,
      final.mrpTotal, final.subtotal, final.discount, final.deliveryFee, final.total, final.coupon?.code ?? null, slot.date, slot.window, input.customerNote ?? "", rx, rx ? (rxVerified ? "verified" : "pending") : "not_required", settings.holdMinutes, input.idempotencyKey],
  );

  const gstRows = await t.query<{ id: string; gst_percent: string | null; hsn: string | null }>(`select id, gst_percent, hsn from medicines where id = any($1::uuid[])`, [allocated.map((a) => a.line.medicineId)]);
  const gstOf = new Map(gstRows.map((g) => [g.id, g]));
  for (const { line, lines } of allocated) {
    const p = priced.find((x) => x.slug === line.slug) as QuoteLine;
    const [item] = await t.query<{ id: string }>(
      `insert into order_items (order_id, medicine_id, slug, name, pack_size, manufacturer, schedule, qty, unit_price, mrp, line_total, gst_percent, hsn) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
      [orderId, line.medicineId, line.slug, line.name, line.packSize, line.manufacturer, line.schedule, line.qty, p.unitPrice, p.mrp, p.lineTotal,
        gstOf.get(line.medicineId as string)?.gst_percent ?? settings.invoice.defaultGstPercent, gstOf.get(line.medicineId as string)?.hsn || "3004"],
    );
    for (const b of lines) await t.query(`insert into order_item_batches (order_item_id, batch_id, batch_no, expiry_date, qty) values ($1,$2,$3,$4,$5)`, [item.id, b.batchId, b.batchNo, b.expiryDate, b.qty]);
  }
  if (couponId && final.coupon) {
    await t.query(`update coupons set used_count = used_count + 1 where id = $1`, [couponId]);
    await t.query(`insert into coupon_redemptions (coupon_id, user_id, order_id, amount) values ($1,$2,$3,$4)`, [couponId, user.id, orderId, final.coupon.discount]);
  }
  await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,$4)`, [orderId, status, "Order placed", user.id]);
  if (rxPlan) {
    for (const id of new Set(input.prescriptionIds ?? [])) await t.query(`insert into order_prescriptions (order_id, prescription_id) values ($1,$2)`, [orderId, id]);
    if (rxVerified) {
      await recordUsage(t, orderId, rxPlan.usage);
      const note = rxPlan.approvedBy ? `Verified against a prescription from ${rxPlan.approvedBy}` : "Verified against an approved prescription";
      await t.query(`update orders set prescription_note = $2 where id = $1`, [orderId, note]);
      await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,null)`, [orderId, status, `Prescription verified. ${note}.`]);
    }
  }
  if (status === "confirmed") await notifyOrder(t, orderId, "order_confirmed");
  await audit(user.id, "orders.placed", { id: orderId, orderNumber, total: final.total, fulfilment: input.fulfilment, payment: pay, prescriptions: rxPlan ? [...new Set(input.prescriptionIds ?? [])] : undefined }, ip, t.query);
  return { id: orderId, orderNumber, total: final.total, status, replayed: false };
}

/* ---------- cancelling, expiring, moving an order along ---------- */

type Actor = { id: string; ip?: string; staff: boolean };

export async function lockOrder(t: Tx, id: string) {
  const o = (await t.query<Row>(`select * from orders where id = $1 for update`, [id]))[0];
  if (!o) throw new ApiError(404, "Order not found.");
  return o;
}

/** Put the stock and the coupon use back, then close the order. */
export async function release(t: Tx, o: Row, to: "cancelled" | "expired", reason: string, actorId: string | null) {
  await returnSale(t, { type: "order", id: o.id }, actorId ? { id: actorId } : null);
  await releaseRxUsage(t, o.id);
  const red = await t.query<{ coupon_id: string }>(`delete from coupon_redemptions where order_id = $1 returning coupon_id`, [o.id]);
  for (const r of red) await t.query(`update coupons set used_count = greatest(0, used_count - 1) where id = $1`, [r.coupon_id]);
  await t.query(`update orders set status = $2, cancel_reason = $3, cancelled_by = $4, expires_at = null, delivery_code = null, updated_at = now() where id = $1`, [o.id, to, reason, actorId]);
  await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,$4)`, [o.id, to, reason, actorId]);
  // Money already taken goes back to the customer. The payout itself is made right after this transaction commits.
  if (o.payment_status === "paid" && o.payment_method === "online") await queueRefundForOrder(t, o.id, reason, actorId);
  await notifyOrder(t, o.id, to === "expired" ? "order_expired" : "order_cancelled", { reason: to === "expired" ? undefined : reason });
}

export async function cancelOrder(actor: Actor, orderId: string, reason: string) {
  const text = reason.trim();
  if (text.length < 3) throw new ApiError(400, "Tell us why the order is being cancelled.", "reason_required");
  const database = await db();
  await database.tx(async (t) => {
    const o = await lockOrder(t, orderId);
    if (!actor.staff && o.user_id !== actor.id) throw new ApiError(404, "Order not found.");
    const allowed = actor.staff ? ["pending_payment", "confirmed", "packed", "out_for_delivery"] : ["pending_payment", "confirmed"];
    if (!allowed.includes(o.status)) {
      throw new ApiError(409, actor.staff ? `A ${o.status.replace(/_/g, " ")} order cannot be cancelled.` : "This order is already being prepared and cannot be cancelled online. Please call the store.", "not_cancellable");
    }
    await release(t, o, "cancelled", text, actor.id);
    await audit(actor.id, "orders.cancelled", { id: orderId, orderNumber: o.order_number, reason: text, by: actor.staff ? "staff" : "customer", wasPaid: o.payment_status === "paid" }, actor.ip, t.query);
  });
  kickNotifications();
  await processRefundsForOrder(orderId).catch((e) => console.error("[refund]", e));
}

/** Release stock held by orders whose online-payment window has run out. Safe to run any time, from any number of processes. */
export async function expirePendingOrders() {
  const database = await db();
  const n = await database.tx(async (t) => {
    const due = await t.query<Row>(`select * from orders where status = 'pending_payment' and expires_at < now() order by expires_at limit 50 for update skip locked`);
    for (const o of due) {
      await release(t, o, "expired", "Payment was not completed in time", null);
      await audit(null, "orders.expired", { id: o.id, orderNumber: o.order_number }, undefined, t.query);
    }
    return due.length;
  });
  if (n > 0) kickNotifications();
  return n;
}

// Packing is confirmed batch by batch on the packing screen, and dispatch (which needs a delivery person) has its own
// action in fulfilment.ts, so neither is a plain status change. "Delivered" from here is the shop's override: handing a
// pickup order over the counter, or closing a delivery when the delivery person could not use their screen.
const NEXT: Record<string, string[]> = { confirmed: ["packed"], packed: ["delivered"], out_for_delivery: ["delivered"] };

export async function advanceOrder(actor: Actor, orderId: string, to: string) {
  const database = await db();
  await database.tx(async (t) => {
    const o = await lockOrder(t, orderId);
    if (!(NEXT[o.status] ?? []).includes(to)) throw new ApiError(409, `An order that is ${o.status.replace(/_/g, " ")} cannot be moved to ${to.replace(/_/g, " ")}.`, "bad_transition");
    if (o.fulfilment === "delivery" && o.status === "packed" && to === "delivered") throw new ApiError(409, "Send the order out for delivery first.", "bad_transition");
    if (o.requires_prescription && o.prescription_status !== "verified") {
      throw new ApiError(409, to === "packed" ? "This order has prescription medicines. Verify the prescription before packing it." : "This order has prescription medicines. Verify the prescription before it leaves the store.", "prescription_pending");
    }
    if (to === "packed") {
      const [left] = await t.query<{ n: number }>(`select count(*)::int as n from order_item_batches b join order_items i on i.id = b.order_item_id where i.order_id = $1 and b.picked_at is null`, [orderId]);
      if (left.n > 0) throw new ApiError(409, `${left.n} item batch${left.n === 1 ? " is" : "es are"} not confirmed yet. Confirm each one on the packing screen.`, "not_picked");
    }
    const paid = to === "delivered" && o.payment_status === "unpaid" && (o.payment_method === "cod" || o.payment_method === "pay_at_store");
    // Cash taken by a delivery person is owed to the shop until the admin settles it.
    const partnerCash = paid && o.delivery_partner_id != null;
    await t.query(
      `update orders set status = $2, payment_status = case when $3 then 'paid' else payment_status end, updated_at = now(),
         packed_at = case when $2 = 'packed' then now() else packed_at end, packed_by = case when $2 = 'packed' then $4::uuid else packed_by end,
         delivered_at = case when $2 = 'delivered' then now() else delivered_at end, delivery_code = case when $2 = 'delivered' then null else delivery_code end,
         cod_collected = case when $5 then total else cod_collected end, cod_collected_at = case when $5 then now() else cod_collected_at end
       where id = $1`, [orderId, to, paid, actor.id, partnerCash]);
    const note = to === "delivered" ? (o.status === "out_for_delivery" ? `Marked delivered by the shop${paid ? ". Payment collected" : ""}` : paid ? "Payment collected" : "") : "";
    await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,$4)`, [orderId, to, note, actor.id]);
    if (to === "delivered") await assignInvoiceNumber(t, orderId);
    await notifyOrder(t, orderId, to === "packed" ? (o.fulfilment === "pickup" ? "ready_for_pickup" : "order_packed") : "delivered");
    await audit(actor.id, "orders.status", { id: orderId, orderNumber: o.order_number, from: o.status, to }, actor.ip, t.query);
  });
  kickNotifications();
}

export async function reviewPrescription(actor: Actor, orderId: string, decision: "verified" | "rejected", note: string) {
  const text = note.trim();
  if (text.length < 3) throw new ApiError(400, "Add a short note (for example, doctor name or why it was rejected).", "note_required");
  const database = await db();
  await database.tx(async (t) => {
    const o = await lockOrder(t, orderId);
    if (!o.requires_prescription) throw new ApiError(409, "This order has no prescription medicines.", "not_required");
    if ((await t.query(`select 1 from order_prescriptions where order_id = $1 limit 1`, [orderId])).length) {
      throw new ApiError(409, "This order was placed with an uploaded prescription. Review it from the Prescriptions queue.", "use_queue");
    }
    if (!["confirmed", "packed"].includes(o.status)) throw new ApiError(409, "The prescription can only be reviewed before the order is sent out.", "bad_state");
    await t.query(`update orders set prescription_status = $2, prescription_note = $3, updated_at = now() where id = $1`, [orderId, decision, text]);
    await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,$4)`, [orderId, o.status, `Prescription ${decision}: ${text}`, actor.id]);
    if (decision === "rejected") await release(t, { ...o, status: o.status }, "cancelled", `Prescription rejected: ${text}`, actor.id);
    await audit(actor.id, "orders.prescription", { id: orderId, orderNumber: o.order_number, decision, note: text }, actor.ip, t.query);
  });
  if (decision === "rejected") await processRefundsForOrder(orderId).catch((e) => console.error("[refund]", e));
}
