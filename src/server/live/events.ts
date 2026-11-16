import { query, type Q, type Row } from "../db";

/*
 * Live signals. A signal says "something changed" (a chat message, an order status) and carries ids only.
 * The browser hears it over /api/live/stream and then asks the normal, access-checked API for the details,
 * so a signal can never leak message text or personal data.
 *
 * This file is the only place that knows how signals travel. To move to a hosted WebSocket service later
 * (Pusher, Ably), publish() and the stream route are the only two things to change.
 */

export type LiveEvent = { id: number; topic: string; payload: Record<string, unknown> };

type Audience = { userId?: string | null; staff?: boolean };

/** Record a signal. Pass the transaction's query function so the signal exists only if the change committed. */
export async function publish(audience: Audience, topic: string, payload: Record<string, unknown> = {}, q: Q = query) {
  if (!audience.userId && !audience.staff) return;
  await q(`insert into live_events (user_id, staff, topic, payload) values ($1, $2, $3, $4::jsonb)`, [
    audience.userId ?? null,
    audience.staff === true,
    topic.slice(0, 60),
    JSON.stringify(payload),
  ]);
}

/** Signals for this person (and for staff, the shared staff ones) after `after`, oldest first. */
export async function eventsSince(userId: string, staff: boolean, after: number, limit = 50): Promise<LiveEvent[]> {
  const rows = await query<Row>(
    `select id, topic, payload from live_events
     where id > $1 and (user_id = $2 or ($3::boolean and staff))
     order by id limit $4`,
    [after, userId, staff, limit],
  );
  return rows.map((r) => ({ id: Number(r.id), topic: r.topic, payload: r.payload ?? {} }));
}

export async function latestEventId(): Promise<number> {
  const rows = await query<Row>(`select coalesce(max(id), 0) as id from live_events`);
  return Number(rows[0]?.id ?? 0);
}

/** Signals are only needed for a few seconds; this keeps the table tiny. Called now and then, not on every request. */
let lastPrune = 0;
export async function pruneEvents() {
  if (Date.now() - lastPrune < 10 * 60_000) return;
  lastPrune = Date.now();
  await query(`delete from live_events where created_at < now() - interval '1 day'`).catch(() => {});
}
