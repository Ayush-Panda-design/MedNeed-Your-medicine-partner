import { z } from "zod";
import { query } from "../db";
import { ApiError } from "../http";
import { audit } from "../auth/users";
import { rateLimit } from "../security/rate-limit";

export const requestInput = z.object({
  slug: z.string().trim().min(1).max(200),
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(10, "Enter a valid 10-digit mobile number").max(16),
  quantity: z.number().int().min(1).max(99),
  note: z.string().trim().max(200),
});

/** Indian mobile number: 10 digits starting 6-9, optionally written with +91 / 91 / 0 or spaces. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export async function createRequest(input: z.infer<typeof requestInput>, ip: string) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ApiError(400, "Enter a valid 10-digit mobile number.", "bad_phone");
  await rateLimit(`medreq:ip:${ip}`, 8, 3600, "Too many requests from this device. Please try again in an hour, or call us.");
  await rateLimit(`medreq:phone:${phone}`, 6, 3600, "Too many requests for this number. Please try again in an hour, or call us.");

  const rows = await query<{ id: string; name: string; status: string; schedule: string; no_online_sale: boolean; in_stock: boolean }>(
    `select id, name, status, schedule, no_online_sale, in_stock from medicines where slug = $1 and status in ('active','catalog')`,
    [input.slug],
  );
  const m = rows[0];
  if (!m) throw new ApiError(404, "This medicine is no longer listed.", "not_found");
  if (m.schedule === "X" || m.no_online_sale) throw new ApiError(409, "This medicine cannot be requested online. Please visit the store with a prescription.", "restricted");
  if (m.status === "active" && m.in_stock) throw new ApiError(409, "This medicine is available to order online. Add it to your cart.", "orderable");

  const dup = await query(`select 1 from medicine_requests where medicine_id = $1 and phone = $2 and status = 'new' and created_at > now() - interval '1 day'`, [m.id, phone]);
  if (dup.length) return { id: null, duplicate: true };
  const [r] = await query<{ id: string }>(
    `insert into medicine_requests (medicine_id, name, phone, quantity, note) values ($1,$2,$3,$4,$5) returning id`,
    [m.id, input.name, phone, input.quantity, input.note],
  );
  return { id: r.id, duplicate: false };
}

export type RequestRow = { id: string; medicine: string; slug: string; schedule: string; name: string; phone: string; quantity: number; note: string; status: string; createdAt: string };

export async function listRequests(status?: string): Promise<RequestRow[]> {
  const ok = ["new", "contacted", "fulfilled", "cancelled"].includes(status ?? "");
  const rows = await query(
    `select r.*, m.name as medicine, m.slug, m.schedule from medicine_requests r join medicines m on m.id = r.medicine_id
     ${ok ? "where r.status = $1" : ""} order by (r.status = 'new') desc, r.created_at desc limit 200`,
    ok ? [status] : [],
  );
  return rows.map((r) => ({ id: r.id, medicine: r.medicine, slug: r.slug, schedule: r.schedule, name: r.name, phone: r.phone, quantity: r.quantity, note: r.note, status: r.status, createdAt: new Date(r.created_at).toISOString() }));
}

export async function setRequestStatus(actor: { id: string; ip?: string }, id: string, status: string) {
  if (!["new", "contacted", "fulfilled", "cancelled"].includes(status)) throw new ApiError(400, "Unknown status.", "bad_status");
  const rows = await query(`update medicine_requests set status = $2, handled_by = $3, updated_at = now() where id = $1 returning id`, [id, status, actor.id]);
  if (!rows[0]) throw new ApiError(404, "Request not found.", "not_found");
  await audit(actor.id, "catalog.request.status", { id, status }, actor.ip);
}
