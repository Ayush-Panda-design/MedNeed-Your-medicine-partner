import { db, query, type Row } from "../db";
import { notifyRefill, kickNotifications } from "../notifications/queue";
import { classifyRefill } from "../ai/refill";
import { AiUnavailable } from "../ai/gemini";

/** Nudge this many days before the estimated run-out, so the refill can arrive in time. */
const LEAD_DAYS = 3;
/** Never nudge sooner than this after delivery, even for a short interval. */
const MIN_DAYS_AHEAD = 1;

export type Reminder = {
  id: string;
  slug: string;
  name: string;
  intervalDays: number;
  remindAt: string;
  status: string;
  orderId: string | null;
  createdAt: string;
};

function mapReminder(r: Row): Reminder {
  return {
    id: String(r.id),
    slug: r.slug as string,
    name: r.name as string,
    intervalDays: Number(r.interval_days),
    remindAt: new Date(r.remind_at as string).toISOString(),
    status: r.status as string,
    orderId: (r.order_id ?? null) as string | null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

/**
 * Look at recently delivered orders that haven't been considered yet, and for each maintenance medicine
 * create a scheduled refill reminder. AI classification is cached per medicine, so this spends almost no quota
 * once the catalogue has been seen once. Runs from the cron job, never in the delivery request path.
 */
export async function backfillRefillReminders(limit = 20): Promise<{ scanned: number; created: number }> {
  const orders = await query<Row>(
    `select o.id, o.user_id, o.delivered_at, u.refill_optout
     from orders o join users u on u.id = o.user_id
     where o.status = 'delivered' and o.refills_done = false and o.delivered_at is not null
     order by o.delivered_at asc limit $1`,
    [limit],
  );
  let created = 0;
  for (const o of orders) {
    const orderId = o.id as string;
    const userId = o.user_id as string;
    const deliveredAt = new Date(o.delivered_at as string);
    const optedOut = Boolean(o.refill_optout);

    let aiDown = false;
    if (!optedOut) {
      const items = await query<Row>(`select distinct slug, name from order_items where order_id = $1`, [orderId]);
      for (const it of items) {
        const slug = it.slug as string;
        let cls;
        try {
          cls = await classifyRefill(slug);
        } catch (e) {
          // AI is temporarily unavailable: leave this order unprocessed so a later run can try again.
          if (e instanceof AiUnavailable) { aiDown = true; break; }
          throw e;
        }
        if (!cls.maintenance || cls.intervalDays <= 0) continue;
        const remindAt = new Date(deliveredAt.getTime() + Math.max(MIN_DAYS_AHEAD, cls.intervalDays - LEAD_DAYS) * 86400_000);
        const existed = await query<Row>(`select 1 from refill_reminders where user_id = $1 and slug = $2 and status = 'scheduled'`, [userId, slug]);
        // One active reminder per customer+medicine; a newer order just refreshes the schedule.
        await query(
          `insert into refill_reminders (user_id, slug, name, order_id, interval_days, remind_at)
           values ($1,$2,$3,$4,$5,$6)
           on conflict (user_id, slug) where status = 'scheduled'
           do update set remind_at = excluded.remind_at, order_id = excluded.order_id, interval_days = excluded.interval_days, name = excluded.name, updated_at = now()`,
          [userId, slug, it.name as string, orderId, cls.intervalDays, remindAt.toISOString()],
        );
        if (!existed.length) created++;
      }
    }
    // Only mark the order handled when we actually reached a decision for it (AI was up, or the customer opted out).
    if (!aiDown) await query(`update orders set refills_done = true where id = $1`, [orderId]);
  }
  return { scanned: orders.length, created };
}

/** Send reminders whose time has come, via the notification outbox. One-shot: the next order re-arms the cycle. */
export async function dispatchDueRefills(limit = 20): Promise<{ sent: number }> {
  const due = await query<Row>(
    `select id, user_id, slug, name from refill_reminders where status = 'scheduled' and remind_at <= now() order by remind_at asc limit $1`,
    [limit],
  );
  let sent = 0;
  for (const r of due) {
    const database = await db();
    await database.tx(async (t) => {
      // Re-check under lock so two workers can't both send the same reminder.
      const locked = await t.query<Row>(`select id from refill_reminders where id = $1 and status = 'scheduled' for update skip locked`, [r.id]);
      if (!locked.length) return;
      await notifyRefill(t, { id: String(r.id), userId: r.user_id as string, slug: r.slug as string, name: r.name as string });
      await t.query(`update refill_reminders set status = 'notified', last_notified_at = now(), updated_at = now() where id = $1`, [r.id]);
    });
    sent++;
  }
  if (sent) kickNotifications();
  return { sent };
}

/* ---------- customer-facing management ---------- */

export async function listReminders(userId: string): Promise<Reminder[]> {
  const rows = await query<Row>(
    `select id, slug, name, order_id, interval_days, remind_at, status, created_at
     from refill_reminders where user_id = $1 and status in ('scheduled','notified')
     order by (status = 'scheduled') desc, remind_at asc limit 100`,
    [userId],
  );
  return rows.map(mapReminder);
}

export async function cancelReminder(userId: string, id: string): Promise<boolean> {
  const res = await query<Row>(
    `update refill_reminders set status = 'cancelled', updated_at = now() where id = $1 and user_id = $2 and status = 'scheduled' returning id`,
    [id, userId],
  );
  return res.length > 0;
}

/** Push a reminder further out (e.g. "I still have enough"). */
export async function snoozeReminder(userId: string, id: string, days: number): Promise<boolean> {
  const d = Math.min(90, Math.max(1, Math.round(days)));
  const res = await query<Row>(
    `update refill_reminders set remind_at = greatest(remind_at, now()) + make_interval(days => $3), status = 'scheduled', updated_at = now()
     where id = $1 and user_id = $2 and status in ('scheduled','notified') returning id`,
    [id, userId, d],
  );
  return res.length > 0;
}

export async function getRefillOptout(userId: string): Promise<boolean> {
  const r = await query<Row>(`select refill_optout from users where id = $1`, [userId]);
  return Boolean(r[0]?.refill_optout);
}

export async function setRefillOptout(userId: string, optout: boolean): Promise<void> {
  await query(`update users set refill_optout = $2, updated_at = now() where id = $1`, [userId, optout]);
  // Turning reminders off cancels the scheduled ones too.
  if (optout) await query(`update refill_reminders set status = 'cancelled', updated_at = now() where user_id = $1 and status = 'scheduled'`, [userId]);
}
