import { z } from "zod";
import { ApiError } from "../http";
import { audit } from "../auth/users";
import { db, query, type Row } from "../db";
import { escapeLike } from "../catalog/text";
import { rateLimit } from "../security/rate-limit";
import { getSettings } from "../orders/settings";
import { lockOrder, release } from "../orders/place";
import { processRefundsForOrder } from "../payments/refunds";
import { kickNotifications, notifyPrescription } from "../notifications/queue";
import { rxLinesOfOrder, tryVerifyOrder, type RxLine } from "./coverage";
import { deletePrescriptionFile, putPrescriptionFile, readUploads, type IncomingFile } from "./storage";

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const OPEN = ["pending", "needs_info"];
const MAX_OPEN_PER_USER = 10;
const LIVE_ORDER = ["pending_payment", "confirmed", "packed", "out_for_delivery"];

export { readUploads };

/* ------------------------------------------------------------------ reading ------------------------------------------------------------------ */

function mapRx(r: Row) {
  const expired = r.status === "approved" && Boolean(r.expired);
  return {
    id: r.id as string, status: r.status as "pending" | "needs_info" | "approved" | "rejected" | "withdrawn", expired,
    patientName: r.patient_name as string, doctorName: r.doctor_name as string, doctorRegNo: r.doctor_reg_no as string,
    prescribedOn: (r.prescribed_day ?? null) as string | null, validUntil: (r.valid_day ?? null) as string | null,
    customerNote: r.customer_note as string, reviewNote: r.review_note as string, reviewedAt: iso(r.reviewed_at),
    createdAt: iso(r.created_at) as string, updatedAt: iso(r.updated_at) as string,
  };
}
export type PrescriptionSummary = ReturnType<typeof mapRx> & {
  files: { id: string; mime: string }[];
  items: { medicineId: string; slug: string; name: string; packSize: string; maxQty: number; remaining: number }[];
};

const SELECT = `select p.*, to_char(p.prescribed_on, 'YYYY-MM-DD') as prescribed_day, to_char(p.valid_until, 'YYYY-MM-DD') as valid_day,
  (p.valid_until is not null and p.valid_until < (now() at time zone 'Asia/Kolkata')::date) as expired from prescriptions p`;

async function attach(rows: Row[]): Promise<PrescriptionSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const files = await query<Row>(`select id, prescription_id, mime from prescription_files where prescription_id = any($1::uuid[]) order by position, created_at`, [ids]);
  const items = await query<Row>(
    `select i.prescription_id, i.medicine_id, m.slug, m.name, m.pack_size, i.max_qty,
            i.max_qty - coalesce((select sum(u.qty) from prescription_usage u where u.prescription_id = i.prescription_id and u.medicine_id = i.medicine_id), 0)::int as remaining
       from prescription_items i join medicines m on m.id = i.medicine_id where i.prescription_id = any($1::uuid[]) order by m.name`,
    [ids],
  );
  return rows.map((r) => ({
    ...mapRx(r),
    files: files.filter((f) => f.prescription_id === r.id).map((f) => ({ id: f.id as string, mime: f.mime as string })),
    items: items.filter((i) => i.prescription_id === r.id).map((i) => ({ medicineId: i.medicine_id as string, slug: i.slug as string, name: i.name as string, packSize: i.pack_size as string, maxQty: Number(i.max_qty), remaining: Math.max(0, Number(i.remaining)) })),
  }));
}

export async function listUserPrescriptions(userId: string): Promise<PrescriptionSummary[]> {
  return attach(await query(`${SELECT} where p.user_id = $1 and p.status <> 'withdrawn' order by p.created_at desc limit 100`, [userId]));
}

export async function getUserPrescription(userId: string, id: string): Promise<(PrescriptionSummary & { events: { status: string; note: string; at: string }[]; orders: { id: string; orderNumber: string; status: string }[] }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await query(`${SELECT} where p.id = $1 and p.user_id = $2 and p.status <> 'withdrawn'`, [id, userId]);
  if (!row) return null;
  const [rx] = await attach([row]);
  const events = await query<Row>(`select status, note, created_at from prescription_events where prescription_id = $1 order by id`, [id]);
  const orders = await query<Row>(`select o.id, o.order_number, o.status from order_prescriptions op join orders o on o.id = op.order_id where op.prescription_id = $1 order by o.created_at desc`, [id]);
  return { ...rx, events: events.map((e) => ({ status: e.status as string, note: e.note as string, at: iso(e.created_at) as string })), orders: orders.map((o) => ({ id: o.id as string, orderNumber: o.order_number as string, status: o.status as string })) };
}

/** Which attached prescriptions an order was placed with (for the order pages). */
export async function prescriptionsOfOrder(orderId: string) {
  const rows = await query<Row>(
    `select p.id, p.status, p.doctor_name, p.review_note, (p.valid_until is not null and p.valid_until < (now() at time zone 'Asia/Kolkata')::date) as expired
       from order_prescriptions op join prescriptions p on p.id = op.prescription_id where op.order_id = $1 order by p.created_at`,
    [orderId],
  );
  return rows.map((r) => ({ id: r.id as string, status: r.status as string, doctorName: r.doctor_name as string, reviewNote: r.review_note as string, expired: Boolean(r.expired) }));
}

export async function adminListPrescriptions(opts: { status?: string; q?: string; page: number; pageSize: number }) {
  const params: unknown[] = [];
  const where: string[] = [`p.status <> 'withdrawn'`];
  if (opts.status === "open") where.push(`p.status in ('pending','needs_info')`);
  else if (opts.status && opts.status !== "all") {
    params.push(opts.status);
    where.push(`p.status = $${params.length}`);
  }
  if (opts.q?.trim()) {
    params.push(`%${escapeLike(opts.q.trim().toLowerCase())}%`);
    where.push(`(lower(u.name) like $${params.length} or lower(p.patient_name) like $${params.length} or lower(p.doctor_name) like $${params.length} or u.phone like $${params.length})`);
  }
  const clause = `where ${where.join(" and ")}`;
  const order = opts.status === "open" || !opts.status ? "p.created_at asc" : "p.created_at desc";
  const rows = await query<Row>(
    `select p.id, p.status, p.patient_name, p.doctor_name, p.created_at, u.name as customer_name, u.phone as customer_phone, u.email as customer_email,
            (select count(*)::int from prescription_files f where f.prescription_id = p.id) as file_count,
            (select count(*)::int from order_prescriptions op join orders o on o.id = op.order_id where op.prescription_id = p.id and o.status in ('pending_payment','confirmed','packed','out_for_delivery')) as live_orders
       from prescriptions p join users u on u.id = p.user_id ${clause} order by ${order} limit ${opts.pageSize} offset ${(opts.page - 1) * opts.pageSize}`,
    params,
  );
  const [{ n }] = await query<{ n: string }>(`select count(*) as n from prescriptions p join users u on u.id = p.user_id ${clause}`, params);
  const counts = await query<{ status: string; n: number }>(`select status, count(*)::int as n from prescriptions where status <> 'withdrawn' group by status`);
  return {
    total: Number(n),
    counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>,
    items: rows.map((r) => ({
      id: r.id as string, status: r.status as string, patientName: r.patient_name as string, doctorName: r.doctor_name as string, createdAt: iso(r.created_at) as string,
      customerName: (r.customer_name ?? null) as string | null, customerPhone: (r.customer_phone ?? null) as string | null, customerEmail: (r.customer_email ?? null) as string | null,
      fileCount: Number(r.file_count), liveOrders: Number(r.live_orders),
    })),
  };
}

export async function getPrescriptionForStaff(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await query(`${SELECT} where p.id = $1`, [id]);
  if (!row) return null;
  const [rx] = await attach([row]);
  const [u] = await query<Row>(`select name, phone, email from users where id = $1`, [row.user_id]);
  const events = await query<Row>(`select e.status, e.note, e.created_at, a.name as actor from prescription_events e left join users a on a.id = e.actor_id where e.prescription_id = $1 order by e.id`, [id]);
  const orderRows = await query<Row>(
    `select o.id, o.order_number, o.status, o.prescription_status, o.created_at from order_prescriptions op join orders o on o.id = op.order_id where op.prescription_id = $1 order by o.created_at desc`,
    [id],
  );
  const orders = [];
  for (const o of orderRows) orders.push({ id: o.id as string, orderNumber: o.order_number as string, status: o.status as string, prescriptionStatus: o.prescription_status as string, live: LIVE_ORDER.includes(o.status), lines: await rxLinesOfOrder(query, o.id) });
  // What the customer's open orders need from this prescription: a starting point for the approved quantities.
  const wanted = new Map<string, RxLine & { slug?: string }>();
  for (const o of orders.filter((x) => x.live && x.prescriptionStatus === "pending")) {
    for (const l of o.lines) wanted.set(l.medicineId, { ...l, qty: (wanted.get(l.medicineId)?.qty ?? 0) + l.qty });
  }
  const suggested = [...wanted.values()].map((l) => ({ medicineId: l.medicineId, name: l.name, qty: l.qty }));
  const packs = suggested.length ? await query<Row>(`select id, pack_size from medicines where id = any($1::uuid[])`, [suggested.map((s) => s.medicineId)]) : [];
  return {
    ...rx,
    customer: { id: row.user_id as string, name: (u?.name ?? null) as string | null, phone: (u?.phone ?? null) as string | null, email: (u?.email ?? null) as string | null },
    events: events.map((e) => ({ status: e.status as string, note: e.note as string, at: iso(e.created_at) as string, actor: (e.actor ?? null) as string | null })),
    orders,
    suggested: suggested.map((s) => ({ ...s, packSize: (packs.find((p) => p.id === s.medicineId)?.pack_size ?? "") as string })),
  };
}

/** Used by the file route: does this person own the prescription, and what are the file's details? */
export async function getFileForViewer(prescriptionId: string, fileId: string, viewer: { userId: string; staff: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(prescriptionId) || !/^[0-9a-f-]{36}$/i.test(fileId)) return null;
  const [r] = await query<Row>(
    `select f.storage_key, f.mime, f.position, p.user_id from prescription_files f join prescriptions p on p.id = f.prescription_id where f.id = $1 and p.id = $2`,
    [fileId, prescriptionId],
  );
  if (!r) return null;
  if (!viewer.staff && r.user_id !== viewer.userId) return null;
  return { key: r.storage_key as string, mime: r.mime as string, position: Number(r.position) };
}

/* ------------------------------------------------------------------ customer actions ------------------------------------------------------------------ */

async function storeFiles(files: IncomingFile[]): Promise<{ key: string; file: IncomingFile }[]> {
  const stored: { key: string; file: IncomingFile }[] = [];
  try {
    for (const file of files) stored.push({ key: await putPrescriptionFile(file.buf, file.kind), file });
  } catch (e) {
    await Promise.all(stored.map((s) => deletePrescriptionFile(s.key)));
    throw e;
  }
  return stored;
}

const textField = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function createPrescription(user: { id: string }, fields: { patientName?: string; doctorName?: string; note?: string }, files: IncomingFile[], ip?: string) {
  await rateLimit(`rx-upload:${user.id}`, Number(process.env.RX_UPLOAD_LIMIT) || 10, 3600, "You have uploaded a lot of prescriptions in a short time. Please try again later.");
  const [{ n }] = await query<{ n: number }>(`select count(*)::int as n from prescriptions where user_id = $1 and status = any($2::text[])`, [user.id, OPEN]);
  if (Number(n) >= MAX_OPEN_PER_USER) throw new ApiError(409, `You already have ${MAX_OPEN_PER_USER} prescriptions waiting for review. Please wait for our pharmacist to check them.`, "too_many_open");

  const stored = await storeFiles(files);
  try {
    const database = await db();
    const id = await database.tx(async (t) => {
      const [p] = await t.query<{ id: string }>(
        `insert into prescriptions (user_id, patient_name, doctor_name, customer_note) values ($1,$2,$3,$4) returning id`,
        [user.id, textField(fields.patientName, 80), textField(fields.doctorName, 80), textField(fields.note, 300)],
      );
      for (let i = 0; i < stored.length; i++) {
        const s = stored[i];
        await t.query(`insert into prescription_files (prescription_id, storage_key, mime, bytes, sha256, position) values ($1,$2,$3,$4,$5,$6)`, [p.id, s.key, s.file.kind.mime, s.file.buf.length, s.file.sha256, i]);
      }
      await t.query(`insert into prescription_events (prescription_id, status, note, actor_id) values ($1,'pending','Uploaded',$2)`, [p.id, user.id]);
      await audit(user.id, "prescriptions.uploaded", { id: p.id, files: stored.length }, ip, t.query);
      return p.id;
    });
    return { id };
  } catch (e) {
    await Promise.all(stored.map((s) => deletePrescriptionFile(s.key)));
    throw e;
  }
}

/** The customer adds more pages, or answers the pharmacist's question. Puts the prescription back in the queue. */
export async function addToPrescription(user: { id: string }, id: string, files: IncomingFile[] | null, note: string, ip?: string) {
  const reply = textField(note, 300);
  if (!files?.length && reply.length < 2) throw new ApiError(400, "Add a file or write a message.", "nothing_to_add");
  await rateLimit(`rx-upload:${user.id}`, Number(process.env.RX_UPLOAD_LIMIT) || 10, 3600, "You have uploaded a lot of prescriptions in a short time. Please try again later.");
  const stored = files?.length ? await storeFiles(files) : [];
  try {
    const database = await db();
    await database.tx(async (t) => {
      const p = (await t.query<Row>(`select * from prescriptions where id = $1 and user_id = $2 for update`, [id, user.id]))[0];
      if (!p || p.status === "withdrawn") throw new ApiError(404, "Prescription not found.");
      if (!OPEN.includes(p.status)) throw new ApiError(409, "This prescription has already been reviewed.", "already_reviewed");
      const [{ n }] = await t.query<{ n: number }>(`select count(*)::int as n from prescription_files where prescription_id = $1`, [id]);
      if (Number(n) + stored.length > 10) throw new ApiError(400, "A prescription can have at most 10 files.", "too_many_files");
      for (let i = 0; i < stored.length; i++) {
        const s = stored[i];
        await t.query(`insert into prescription_files (prescription_id, storage_key, mime, bytes, sha256, position) values ($1,$2,$3,$4,$5,$6)`, [id, s.key, s.file.kind.mime, s.file.buf.length, s.file.sha256, Number(n) + i]);
      }
      await t.query(`update prescriptions set status = 'pending', customer_note = case when $2 <> '' then $2 else customer_note end, updated_at = now() where id = $1`, [id, reply]);
      await t.query(`insert into prescription_events (prescription_id, status, note, actor_id) values ($1,'pending',$2,$3)`, [id, [stored.length ? `Added ${stored.length} file(s)` : "", reply].filter(Boolean).join(". "), user.id]);
      await audit(user.id, "prescriptions.updated", { id, files: stored.length }, ip, t.query);
    });
  } catch (e) {
    await Promise.all(stored.map((s) => deletePrescriptionFile(s.key)));
    throw e;
  }
}

/** The customer removes a prescription that no order depends on. The files are deleted; the record stays. */
export async function withdrawPrescription(user: { id: string }, id: string, ip?: string) {
  const keys: string[] = [];
  const database = await db();
  await database.tx(async (t) => {
    const p = (await t.query<Row>(`select * from prescriptions where id = $1 and user_id = $2 for update`, [id, user.id]))[0];
    if (!p || p.status === "withdrawn") throw new ApiError(404, "Prescription not found.");
    const [{ n }] = await t.query<{ n: number }>(`select count(*)::int as n from order_prescriptions op join orders o on o.id = op.order_id where op.prescription_id = $1 and o.status not in ('cancelled','expired')`, [id]);
    if (Number(n) > 0) throw new ApiError(409, "This prescription was used for an order, so we must keep it on record.", "in_use");
    for (const f of await t.query<{ storage_key: string }>(`select storage_key from prescription_files where prescription_id = $1`, [id])) keys.push(f.storage_key);
    await t.query(`delete from prescription_files where prescription_id = $1`, [id]);
    await t.query(`update prescriptions set status = 'withdrawn', updated_at = now() where id = $1`, [id]);
    await t.query(`insert into prescription_events (prescription_id, status, note, actor_id) values ($1,'withdrawn','Removed by the customer',$2)`, [id, user.id]);
    await audit(user.id, "prescriptions.withdrawn", { id }, ip, t.query);
  });
  await Promise.all(keys.map(deletePrescriptionFile));
}

/* ------------------------------------------------------------------ pharmacist review ------------------------------------------------------------------ */

export const reviewInput = z.object({
  decision: z.enum(["approve", "reject", "needs_info"]),
  note: z.string().trim().max(300).default(""),
  doctorName: z.string().trim().max(80).default(""),
  doctorRegNo: z.string().trim().max(40).default(""),
  patientName: z.string().trim().max(80).default(""),
  prescribedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date on the prescription").optional(),
  items: z.array(z.object({ medicineId: z.uuid(), maxQty: z.number().int().min(1, "Quantity must be at least 1").max(1000) })).max(40).default([]),
});
export type ReviewInput = z.infer<typeof reviewInput>;

type Actor = { id: string; ip?: string };

export async function reviewPrescription(actor: Actor, id: string, input: ReviewInput) {
  const settings = await getSettings();
  const cancelled: string[] = [];
  const database = await db();
  await database.tx(async (t) => {
    const p = (await t.query<Row>(`select * from prescriptions where id = $1 for update`, [id]))[0];
    if (!p || p.status === "withdrawn") throw new ApiError(404, "Prescription not found.");
    const linked = await t.query<Row>(`select o.id from order_prescriptions op join orders o on o.id = op.order_id where op.prescription_id = $1 order by o.id`, [id]);

    if (input.decision === "needs_info") {
      if (p.status !== "pending") throw new ApiError(409, "Only a prescription waiting for review can be sent back to the customer.", "bad_state");
      if (input.note.length < 3) throw new ApiError(400, "Tell the customer what is needed.", "note_required");
      await t.query(`update prescriptions set status = 'needs_info', review_note = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now() where id = $1`, [id, input.note, actor.id]);
    } else if (input.decision === "reject") {
      if (!OPEN.includes(p.status)) throw new ApiError(409, "This prescription has already been reviewed.", "bad_state");
      if (input.note.length < 3) throw new ApiError(400, "Give a reason. The customer will see it.", "note_required");
      await t.query(`update prescriptions set status = 'rejected', review_note = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now() where id = $1`, [id, input.note, actor.id]);
    } else {
      if (p.status !== "pending") throw new ApiError(409, "Only a prescription waiting for review can be approved.", "bad_state");
      if (input.doctorName.length < 2) throw new ApiError(400, "Enter the doctor's name as written on the prescription.", "doctor_required");
      if (!input.prescribedOn) throw new ApiError(400, "Enter the date on the prescription.", "date_required");
      if (input.items.length === 0) throw new ApiError(400, "Add at least one medicine and the quantity it may supply.", "items_required");
      const ids = input.items.map((i) => i.medicineId);
      if (new Set(ids).size !== ids.length) throw new ApiError(400, "A medicine is listed twice.", "items_duplicate");
      const [dates] = await t.query<{ valid_until: string; future: boolean; expired: boolean }>(
        `select to_char($1::date + $2::int, 'YYYY-MM-DD') as valid_until, ($1::date > (now() at time zone 'Asia/Kolkata')::date) as future, ($1::date + $2::int < (now() at time zone 'Asia/Kolkata')::date) as expired`,
        [input.prescribedOn, settings.prescriptions.validityDays],
      );
      if (dates.future) throw new ApiError(400, "The prescription date is in the future.", "bad_date");
      if (dates.expired) throw new ApiError(400, `This prescription is older than ${settings.prescriptions.validityDays} days and has expired. Reject it and ask for a new one.`, "expired");
      const meds = await t.query<Row>(`select id, name, schedule, no_online_sale from medicines where id = any($1::uuid[])`, [ids]);
      if (meds.length !== ids.length) throw new ApiError(400, "One of the medicines was not found.", "bad_item");
      const bad = meds.find((m) => m.schedule === "X" || m.schedule === "unknown" || m.no_online_sale);
      if (bad) throw new ApiError(400, `${bad.name} cannot be sold online.`, "bad_item");

      await t.query(`delete from prescription_items where prescription_id = $1`, [id]);
      for (const i of input.items) await t.query(`insert into prescription_items (prescription_id, medicine_id, max_qty) values ($1,$2,$3)`, [id, i.medicineId, i.maxQty]);
      await t.query(
        `update prescriptions set status = 'approved', doctor_name = $2, doctor_reg_no = $3, patient_name = case when $4 <> '' then $4 else patient_name end, prescribed_on = $5::date, valid_until = $6::date,
                review_note = $7, reviewed_by = $8, reviewed_at = now(), updated_at = now() where id = $1`,
        [id, input.doctorName, input.doctorRegNo, input.patientName, input.prescribedOn, dates.valid_until, input.note, actor.id],
      );
    }

    const noteText = { approve: `Approved. ${input.doctorName}${input.doctorRegNo ? ` (reg. ${input.doctorRegNo})` : ""}, valid for ${settings.prescriptions.validityDays} days from ${input.prescribedOn ?? ""}`, reject: `Rejected: ${input.note}`, needs_info: `More information needed: ${input.note}` }[input.decision];
    const [ev] = await t.query<{ id: string }>(`insert into prescription_events (prescription_id, status, note, actor_id) values ($1,$2,$3,$4) returning id`, [id, input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "needs_info", noteText, actor.id]);

    // Orders waiting on this prescription.
    for (const l of linked) {
      const o = await lockOrder(t, l.id).catch(() => null);
      if (!o || !["pending_payment", "confirmed", "packed"].includes(o.status) || !o.requires_prescription || o.prescription_status === "verified") continue;
      if (input.decision === "approve") {
        await tryVerifyOrder(t, { id: o.id, user_id: o.user_id, status: o.status });
      } else if (input.decision === "reject") {
        const others = await t.query(`select 1 from order_prescriptions op join prescriptions p on p.id = op.prescription_id where op.order_id = $1 and p.id <> $2 and p.status in ('pending','needs_info')`, [o.id, id]);
        if (others.length === 0) {
          const reason = `Prescription rejected: ${input.note}`;
          await t.query(`update orders set prescription_status = 'rejected', prescription_note = $2 where id = $1`, [o.id, input.note]);
          await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,$4)`, [o.id, o.status, reason, actor.id]);
          await release(t, o, "cancelled", reason, actor.id);
          await audit(actor.id, "orders.cancelled", { id: o.id, orderNumber: o.order_number, reason, by: "prescription_review", wasPaid: o.payment_status === "paid" }, actor.ip, t.query);
          cancelled.push(o.id);
        }
      } else {
        await t.query(`insert into order_events (order_id, status, note, actor_id) values ($1,$2,$3,$4)`, [o.id, o.status, `Pharmacist needs more information about the prescription: ${input.note}`, actor.id]);
      }
    }
    // Tell the customer. When a rejection also cancelled an order, the cancellation message is the one sent to their phone.
    await notifyPrescription(t, id, input.decision === "approve" ? "rx_approved" : input.decision === "reject" ? "rx_rejected" : "rx_needs_info", input.decision === "approve" ? "" : input.note, String(ev.id), input.decision !== "reject" || cancelled.length === 0);
    await audit(actor.id, "prescriptions.reviewed", { id, decision: input.decision, note: input.note, items: input.decision === "approve" ? input.items : undefined, cancelledOrders: cancelled.length }, actor.ip, t.query);
  });
  kickNotifications();
  for (const orderId of cancelled) await processRefundsForOrder(orderId).catch((e) => console.error("[refund]", e));
}

