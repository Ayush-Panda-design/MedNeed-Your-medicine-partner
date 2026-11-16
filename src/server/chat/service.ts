import { ApiError } from "../http";
import { db, query, type Row, type Tx } from "../db";
import { publish } from "../live/events";
import { audit } from "../auth/users";
import { rateLimit } from "../security/rate-limit";

export type ChatRef = { type: "order" | "prescription"; id: string };
export type ChatMessage = {
  id: number;
  role: "customer" | "staff" | "system";
  body: string;
  at: string;
  ref: (ChatRef & { label: string }) | null;
  clientId: string | null;
  senderName: string | null;
};

const MAX_LEN = 2000;
/** A customer may send this many messages in a row before the store has answered. Stops floods without blocking real questions. */
const MAX_UNANSWERED = 12;

/** Plain text only: the page shows it as text (never HTML). Removes control characters and tidies blank lines. */
export function cleanBody(raw: string): string {
  const text = String(raw ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new ApiError(400, "Please type a message.", "empty");
  if (text.length > MAX_LEN) throw new ApiError(400, `Messages can be up to ${MAX_LEN} characters.`, "too_long");
  return text;
}

const preview = (s: string) => s.replace(/\s+/g, " ").slice(0, 120);

async function labelFor(r: Row): Promise<ChatMessage["ref"]> {
  if (!r.ref_type || !r.ref_id) return null;
  const type = r.ref_type as ChatRef["type"];
  if (type === "order") {
    const o = (await query<Row>(`select order_number from orders where id = $1`, [r.ref_id]))[0];
    return { type, id: r.ref_id, label: o ? `Order ${o.order_number}` : "Order" };
  }
  const p = (await query<Row>(`select created_at from prescriptions where id = $1`, [r.ref_id]))[0];
  return { type, id: r.ref_id, label: p ? `Prescription of ${new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Prescription" };
}

async function toMessage(r: Row): Promise<ChatMessage> {
  return {
    id: Number(r.id),
    role: r.sender_role,
    body: r.body,
    at: new Date(r.created_at).toISOString(),
    ref: await labelFor(r),
    clientId: r.client_id ?? null,
    // Customers see "Store team", never a staff member's name.
    senderName: r.sender_role === "staff" ? "Store team" : null,
  };
}

const MSG_SELECT = `select m.* from chat_messages m`;

export async function getThreadForUser(userId: string): Promise<Row | null> {
  return (await query<Row>(`select * from chat_threads where user_id = $1`, [userId]))[0] ?? null;
}

async function ensureThread(t: Tx, userId: string): Promise<Row> {
  const rows = await t.query<Row>(
    `insert into chat_threads (user_id) values ($1) on conflict (user_id) do update set user_id = excluded.user_id returning *`,
    [userId],
  );
  return rows[0];
}

/** Messages of a thread after `after` (0 = from the start, newest 200). */
export async function listMessages(threadId: string, after = 0): Promise<ChatMessage[]> {
  const rows = after > 0
    ? await query<Row>(`${MSG_SELECT} where m.thread_id = $1 and m.id > $2 order by m.id limit 200`, [threadId, after])
    : await query<Row>(`select * from (${MSG_SELECT} where m.thread_id = $1 order by m.id desc limit 200) x order by id`, [threadId]);
  return Promise.all(rows.map(toMessage));
}

/** A reference (order or prescription) is only accepted if it belongs to this customer. */
async function checkRef(userId: string, ref?: ChatRef | null): Promise<ChatRef | null> {
  if (!ref) return null;
  const table = ref.type === "order" ? "orders" : "prescriptions";
  const rows = await query<Row>(`select id from ${table} where id = $1 and user_id = $2`, [ref.id, userId]);
  if (!rows[0]) throw new ApiError(404, "We couldn't find that order or prescription on your account.", "bad_ref");
  return ref;
}

export async function sendCustomerMessage(userId: string, rawBody: string, opts: { clientId?: string | null; ref?: ChatRef | null } = {}): Promise<ChatMessage> {
  const body = cleanBody(rawBody);
  await rateLimit(`chat-min:${userId}`, 10, 60, "You're sending messages very quickly. Please wait a moment.");
  await rateLimit(`chat-hr:${userId}`, 60, 3600, "You've sent a lot of messages. Please wait a while, or call the store.");
  const ref = await checkRef(userId, opts.ref);
  const clientId = opts.clientId ? String(opts.clientId).slice(0, 64) : null;

  const message = await (await db()).tx(async (t) => {
    const thread = await ensureThread(t, userId);
    if (clientId) {
      const dup = await t.query<Row>(`${MSG_SELECT} where m.thread_id = $1 and m.client_id = $2`, [thread.id, clientId]);
      if (dup[0]) return dup[0]; // a retry of a message that already went through
    }
    const unanswered = await t.query<Row>(
      `select count(*)::int as n from chat_messages where thread_id = $1 and sender_role = 'customer'
         and id > coalesce((select max(id) from chat_messages where thread_id = $1 and sender_role <> 'customer'), 0)`,
      [thread.id],
    );
    if ((unanswered[0]?.n ?? 0) >= MAX_UNANSWERED) {
      throw new ApiError(429, "The store team will reply soon. Please wait for their answer before sending more, or call us.", "too_many_unanswered");
    }
    const row = (await t.query<Row>(
      `insert into chat_messages (thread_id, sender_role, sender_id, body, ref_type, ref_id, client_id) values ($1,'customer',$2,$3,$4,$5,$6) returning *`,
      [thread.id, userId, body, ref?.type ?? null, ref?.id ?? null, clientId],
    ))[0];
    await t.query(
      `update chat_threads set status = 'open', staff_unread = staff_unread + 1, last_message_at = now(), last_preview = $2, last_sender = 'customer',
         customer_read_at = now(), customer_unread = 0 where id = $1`,
      [thread.id, preview(body)],
    );
    await publish({ staff: true }, "chat", { thread: thread.id, message: Number(row.id) }, t.query);
    await publish({ userId }, "chat", { thread: thread.id, message: Number(row.id) }, t.query); // the customer's other tabs and devices
    return row;
  });
  return toMessage(message);
}

export async function sendStaffMessage(staffId: string, threadId: string, rawBody: string, clientId?: string | null): Promise<ChatMessage> {
  const body = cleanBody(rawBody);
  await rateLimit(`chat-staff:${staffId}`, 120, 60, "You're replying very quickly. Please wait a moment.");
  const cid = clientId ? String(clientId).slice(0, 64) : null;
  const out = await (await db()).tx(async (t) => {
    const thread = (await t.query<Row>(`select * from chat_threads where id = $1 for update`, [threadId]))[0];
    if (!thread) throw new ApiError(404, "That conversation was not found.");
    if (cid) {
      const dup = await t.query<Row>(`${MSG_SELECT} where m.thread_id = $1 and m.client_id = $2`, [threadId, cid]);
      if (dup[0]) return { row: dup[0], userId: thread.user_id as string };
    }
    const row = (await t.query<Row>(
      `insert into chat_messages (thread_id, sender_role, sender_id, body, client_id) values ($1,'staff',$2,$3,$4) returning *`,
      [threadId, staffId, body, cid],
    ))[0];
    await t.query(
      `update chat_threads set status = 'open', customer_unread = customer_unread + 1, staff_unread = 0, staff_read_at = now(),
         last_message_at = now(), last_preview = $2, last_sender = 'staff' where id = $1`,
      [threadId, preview(body)],
    );
    await publish({ userId: thread.user_id }, "chat", { thread: threadId, message: Number(row.id) }, t.query);
    await publish({ staff: true }, "chat", { thread: threadId, message: Number(row.id) }, t.query); // other staff see it too
    return { row, userId: thread.user_id as string };
  });
  await audit(staffId, "chat.reply", { thread: threadId }).catch(() => {});
  const withName = (await query<Row>(`${MSG_SELECT} where m.id = $1`, [out.row.id]))[0];
  return toMessage(withName);
}

/** The customer opened the chat: clears their unread count and lets staff see "Seen". */
export async function markCustomerRead(userId: string) {
  const rows = await query<Row>(
    `update chat_threads set customer_unread = 0, customer_read_at = now() where user_id = $1 and (customer_unread > 0 or customer_read_at is null or customer_read_at < last_message_at) returning id`,
    [userId],
  );
  if (rows[0]) {
    await publish({ staff: true }, "chat", { thread: rows[0].id, read: true });
    await publish({ userId }, "chat", { thread: rows[0].id, read: true }); // clears the badge in the customer's other tabs
  }
}

export async function markStaffRead(threadId: string) {
  const rows = await query<Row>(
    `update chat_threads set staff_unread = 0, staff_read_at = now() where id = $1 and (staff_unread > 0 or staff_read_at is null or staff_read_at < last_message_at) returning user_id`,
    [threadId],
  );
  if (rows[0]) {
    await publish({ userId: rows[0].user_id }, "chat", { thread: threadId, read: true });
    await publish({ staff: true }, "chat", { thread: threadId, read: true });
  }
}

export async function setThreadStatus(staffId: string, threadId: string, status: "open" | "closed") {
  const rows = await query<Row>(`update chat_threads set status = $2 where id = $1 returning user_id`, [threadId, status]);
  if (!rows[0]) throw new ApiError(404, "That conversation was not found.");
  await publish({ staff: true }, "chat", { thread: threadId, status });
  await audit(staffId, `chat.${status === "closed" ? "close" : "reopen"}`, { thread: threadId }).catch(() => {});
}

export type ThreadSummary = {
  id: string;
  status: "open" | "closed";
  customer: { id: string; name: string; phone: string | null; email: string | null };
  unread: number;
  lastAt: string;
  preview: string;
  lastSender: string;
};

export async function listThreads(opts: { filter: "open" | "unread" | "closed" | "all"; q?: string; limit?: number }): Promise<{ items: ThreadSummary[]; unreadTotal: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.filter === "open") where.push(`t.status = 'open'`);
  if (opts.filter === "closed") where.push(`t.status = 'closed'`);
  if (opts.filter === "unread") where.push(`t.staff_unread > 0`);
  const q = opts.q?.trim().slice(0, 60);
  if (q) {
    params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
    where.push(`(u.name ilike $${params.length} or u.email ilike $${params.length} or u.phone ilike $${params.length})`);
  }
  params.push(Math.min(opts.limit ?? 100, 200));
  const rows = await query<Row>(
    `select t.*, u.name, u.phone, u.email from chat_threads t join users u on u.id = t.user_id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by (t.staff_unread > 0) desc, t.last_message_at desc limit $${params.length}`,
    params,
  );
  const total = (await query<Row>(`select count(*)::int as n from chat_threads where staff_unread > 0`))[0]?.n ?? 0;
  return {
    unreadTotal: total,
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      customer: { id: r.user_id, name: r.name?.trim() || r.email?.split("@")[0] || "Customer", phone: r.phone, email: r.email },
      unread: r.staff_unread,
      lastAt: new Date(r.last_message_at).toISOString(),
      preview: r.last_preview,
      lastSender: r.last_sender,
    })),
  };
}

export async function getThreadForStaff(threadId: string): Promise<(ThreadSummary & { customerReadAt: string | null; staffReadAt: string | null }) | null> {
  const r = (await query<Row>(`select t.*, u.name, u.phone, u.email from chat_threads t join users u on u.id = t.user_id where t.id = $1`, [threadId]))[0];
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    customer: { id: r.user_id, name: r.name?.trim() || r.email?.split("@")[0] || "Customer", phone: r.phone, email: r.email },
    unread: r.staff_unread,
    lastAt: new Date(r.last_message_at).toISOString(),
    preview: r.last_preview,
    lastSender: r.last_sender,
    customerReadAt: r.customer_read_at ? new Date(r.customer_read_at).toISOString() : null,
    staffReadAt: r.staff_read_at ? new Date(r.staff_read_at).toISOString() : null,
  };
}

/** Counters for the launcher badge and the admin menu. */
export async function customerUnread(userId: string): Promise<number> {
  return (await query<Row>(`select customer_unread as n from chat_threads where user_id = $1`, [userId]))[0]?.n ?? 0;
}
export async function staffUnread(): Promise<number> {
  return (await query<Row>(`select coalesce(sum(staff_unread), 0)::int as n from chat_threads`))[0]?.n ?? 0;
}
