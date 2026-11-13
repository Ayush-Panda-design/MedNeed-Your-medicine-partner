import { ApiError } from "../http";
import { audit, normalizePhone } from "../auth/users";
import { appUrl } from "../env";
import { db, query, type Row, type Tx } from "../db";
import { getSettings } from "../orders/settings";
import { channelConfigured, deliver, PermanentSendError, type Channel } from "./providers";
import { PHONE_EVENTS, render, type Ctx, type EventKey, type OrderEvent, type RxEvent } from "./templates";

/** How long to wait before attempt 2, 3, 4, 5, 6. After the sixth failure the message is marked dead and shows up in the admin log. */
const BACKOFF_SECONDS = [60, 300, 1800, 7200, 21600];
export const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;
const CLAIM_SECONDS = 300;

type Who = { userId: string; name: string; email: string | null; phone: string | null };

/** Writes one row per channel. Runs inside the caller's transaction, so the message exists if and only if the change committed. */
async function enqueue(t: Tx, who: Who, event: EventKey, ctx: Ctx, orderId: string | null, dedupeBase: string, phoneOk = true) {
  const settings = await getSettings(t.query);
  const r = render(event, ctx);
  const phone = who.phone ? normalizePhone(who.phone) : null;
  const plan: { channel: Channel; to: string | null; body: string }[] = [
    { channel: "email", to: who.email, body: r.text },
    { channel: "sms", to: phone, body: r.sms },
    { channel: "whatsapp", to: phone, body: r.sms || r.text },
  ];
  for (const p of plan) {
    if (!p.to || !p.body) continue;
    if (!settings.notifications[p.channel] || !channelConfigured(p.channel)) continue;
    if (p.channel !== "email" && (!phoneOk || !PHONE_EVENTS.has(event))) continue;
    await t.query(
      `insert into notifications (user_id, order_id, event, channel, recipient, subject, body, html, params, dedupe_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) on conflict (dedupe_key) do nothing`,
      [who.userId, orderId, event, p.channel, p.to, r.subject, p.body, p.channel === "email" ? r.html : null, JSON.stringify(r.params.map(String)), `${dedupeBase}:${p.channel}`],
    );
  }
}

export type OrderExtra = { partnerName?: string; partnerPhone?: string; reason?: string; amount?: number; code?: string };

/**
 * Queue the customer messages for an order event. `suffix` separates events that can legitimately happen more than once
 * (for example a second delivery attempt); the same event with the same suffix is only ever queued once.
 */
export async function notifyOrder(t: Tx, orderId: string, event: OrderEvent, extra: OrderExtra = {}, suffix = "") {
  const o = (await t.query<Row>(
    `select o.order_number, o.total, o.fulfilment, o.payment_method, o.payment_status, o.customer_name, o.customer_phone,
            u.id as user_id, u.name, u.email, u.phone
     from orders o join users u on u.id = o.user_id where o.id = $1`, [orderId]))[0];
  if (!o) return;
  const settings = await getSettings(t.query);
  const first = String(o.name ?? o.customer_name ?? "there").trim().split(/\s+/)[0] || "there";
  const ctx: Ctx = {
    name: first, shopName: settings.shop.name, shopPhone: settings.shop.phone, link: `${appUrl()}/account/orders/${orderId}`,
    orderNumber: o.order_number, total: Number(o.total), fulfilment: o.fulfilment,
    cod: o.payment_method === "cod" || o.payment_method === "pay_at_store", paid: o.payment_status === "paid", ...extra,
  };
  if (event === "order_cancelled") ctx.paid = o.payment_status === "paid" && o.payment_method === "online";
  await enqueue(t, { userId: o.user_id, name: first, email: o.email, phone: o.phone ?? normalizePhone(o.customer_phone) }, event, ctx, orderId, `order:${orderId}:${event}${suffix ? `:${suffix}` : ""}`);
}

/** A refill nudge for one maintenance medicine, sent to the customer who bought it. Links straight to the product page to reorder. */
export async function notifyRefill(t: Tx, reminder: { id: string | number; userId: string; slug: string; name: string }) {
  const u = (await t.query<Row>(`select id, name, email, phone from users where id = $1`, [reminder.userId]))[0];
  if (!u) return;
  const settings = await getSettings(t.query);
  const first = String(u.name ?? "there").trim().split(/\s+/)[0] || "there";
  const ctx: Ctx = { name: first, shopName: settings.shop.name, shopPhone: settings.shop.phone, link: `${appUrl()}/medicines/${reminder.slug}`, medicine: reminder.name };
  await enqueue(t, { userId: u.id as string, name: first, email: (u.email ?? null) as string | null, phone: (u.phone ?? null) as string | null }, "refill_due", ctx, null, `refill:${reminder.id}`);
}

/** Prescription decisions are sent to the customer who uploaded it. */
export async function notifyPrescription(t: Tx, prescriptionId: string, event: RxEvent, reason: string, suffix: string, phoneOk = true) {
  const r = (await t.query<Row>(`select u.id as user_id, u.name, u.email, u.phone from prescriptions p join users u on u.id = p.user_id where p.id = $1`, [prescriptionId]))[0];
  if (!r) return;
  const settings = await getSettings(t.query);
  const first = String(r.name ?? "there").trim().split(/\s+/)[0] || "there";
  const ctx: Ctx = { name: first, shopName: settings.shop.name, shopPhone: settings.shop.phone, link: `${appUrl()}/account/prescriptions/${prescriptionId}`, reason };
  await enqueue(t, { userId: r.user_id, name: first, email: r.email, phone: r.phone }, event, ctx, null, `rx:${prescriptionId}:${event}:${suffix}`, phoneOk);
}

/* ---------- the worker ---------- */

type Claimed = { id: string; channel: Channel; recipient: string; subject: string; body: string; html: string | null; params: string[]; event: string; attempts: number };

async function claim(limit: number): Promise<Claimed[]> {
  const database = await db();
  return database.tx(async (t) => {
    // Rows whose worker died mid-send (claim expired) are picked up again too.
    const rows = await t.query<Row>(
      `select id from notifications where (status = 'pending' and next_attempt_at <= now()) or (status = 'sending' and locked_until < now())
       order by id limit $1 for update skip locked`, [limit]);
    if (rows.length === 0) return [];
    return t.query<Claimed>(
      `update notifications set status = 'sending', attempts = attempts + 1, locked_until = now() + make_interval(secs => $2)
       where id = any($1::bigint[])
       returning id, channel, recipient, subject, body, html, params, event, attempts`, [rows.map((r) => r.id), CLAIM_SECONDS]);
  });
}

/** Send what is due. Safe to run from any number of processes at once. */
export async function processDueNotifications(limit = 20): Promise<{ sent: number; retry: number; dead: number }> {
  const out = { sent: 0, retry: 0, dead: 0 };
  const settings = await getSettings();
  for (const n of await claim(limit)) {
    try {
      if (!settings.notifications[n.channel] || !channelConfigured(n.channel)) throw new PermanentSendError(`The ${n.channel} channel is switched off or not configured.`);
      const id = await deliver(n.channel, { to: n.recipient, subject: n.subject, text: n.body, html: n.html, params: n.params, template: `mn_${n.event}` });
      await query(`update notifications set status = 'sent', sent_at = now(), provider_id = $2, last_error = null, locked_until = null where id = $1`, [n.id, id || null]);
      out.sent++;
    } catch (e) {
      const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      if (e instanceof PermanentSendError || n.attempts >= MAX_ATTEMPTS) {
        await query(`update notifications set status = 'dead', last_error = $2, locked_until = null where id = $1`, [n.id, message]);
        out.dead++;
      } else {
        await query(`update notifications set status = 'pending', last_error = $2, locked_until = null, next_attempt_at = now() + make_interval(secs => $3) where id = $1`, [n.id, message, BACKOFF_SECONDS[n.attempts - 1] ?? BACKOFF_SECONDS.at(-1)]);
        out.retry++;
      }
    }
  }
  return out;
}

let running = false;
/** Send right away after a change commits, without making the customer's request wait. The scheduler is the safety net. */
export function kickNotifications() {
  if (running || process.env.NOTIFICATIONS_INLINE === "0") return;
  running = true;
  processDueNotifications(10).catch((e) => console.error("[notify]", e)).finally(() => { running = false; });
}

/* ---------- admin ---------- */

export async function listNotifications(opts: { status?: string; page: number; pageSize: number }) {
  const where = opts.status && opts.status !== "all" ? `where n.status = $1` : "";
  const params = opts.status && opts.status !== "all" ? [opts.status] : [];
  const rows = await query(
    `select n.id, n.event, n.channel, n.recipient, n.status, n.attempts, n.last_error, n.created_at, n.sent_at, n.next_attempt_at, o.order_number, o.id as order_id
     from notifications n left join orders o on o.id = n.order_id ${where} order by n.id desc limit ${opts.pageSize} offset ${(opts.page - 1) * opts.pageSize}`, params);
  const [{ n }] = await query<{ n: string }>(`select count(*) as n from notifications n ${where}`, params);
  const counts = await query<{ status: string; n: number }>(`select status, count(*)::int as n from notifications group by status`);
  return { total: Number(n), items: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number> };
}

export const notificationsForOrder = (orderId: string) =>
  query(`select id, event, channel, recipient, status, attempts, last_error, created_at, sent_at from notifications where order_id = $1 order by id`, [orderId]);

/** Put a dead (or waiting) message back in the queue. */
export async function retryNotification(actor: { id: string; ip?: string }, id: number) {
  const rows = await query<Row>(`update notifications set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null, locked_until = null where id = $1 and status in ('dead', 'pending') returning id`, [id]);
  if (!rows[0]) throw new ApiError(409, "Only a message that has not been sent can be retried.", "not_retryable");
  await audit(actor.id, "notifications.retry", { id }, actor.ip);
  kickNotifications();
}
