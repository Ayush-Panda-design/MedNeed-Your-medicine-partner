import { query, type Row } from "../db";
import { escapeLike } from "../catalog/text";

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function mapOrder(r: Row) {
  return {
    id: r.id as string, orderNumber: r.order_number as string, status: r.status as string, fulfilment: r.fulfilment as "delivery" | "pickup",
    paymentMethod: r.payment_method as string, paymentStatus: r.payment_status as string,
    customerName: r.customer_name as string, customerPhone: r.customer_phone as string,
    address: (r.address ?? null) as null | { fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string; lat: number | null; lng: number | null },
    distanceKm: r.distance_km == null ? null : Number(r.distance_km), distanceSource: (r.distance_source ?? null) as string | null,
    mrpTotal: Number(r.mrp_total), subtotal: Number(r.subtotal), discount: Number(r.discount), deliveryFee: Number(r.delivery_fee), total: Number(r.total),
    couponCode: (r.coupon_code ?? null) as string | null, slotDate: r.slot_day as string | null, slotWindow: (r.slot_window ?? null) as string | null,
    customerNote: r.customer_note as string, requiresPrescription: r.requires_prescription as boolean, prescriptionStatus: r.prescription_status as string, prescriptionNote: r.prescription_note as string,
    expiresAt: iso(r.expires_at), paidAt: iso(r.paid_at), invoiceNumber: (r.invoice_number ?? null) as string | null, cancelReason: (r.cancel_reason ?? null) as string | null, createdAt: iso(r.created_at) as string, updatedAt: iso(r.updated_at) as string,
  };
}
export type OrderSummary = ReturnType<typeof mapOrder> & { itemCount: number; customerEmail?: string | null };

const BASE = `select o.*, to_char(o.slot_date, 'YYYY-MM-DD') as slot_day, (select coalesce(sum(qty), 0)::int from order_items i where i.order_id = o.id) as item_count`;

export async function listOrdersForUser(userId: string): Promise<OrderSummary[]> {
  const rows = await query(`${BASE} from orders o where o.user_id = $1 order by o.created_at desc limit 100`, [userId]);
  return rows.map((r) => ({ ...mapOrder(r), itemCount: Number(r.item_count) }));
}

export async function getOrderDetail(id: string, opts: { userId?: string; staff?: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const params: unknown[] = [id];
  let where = "o.id = $1";
  if (!opts.staff) {
    params.push(opts.userId);
    where += " and o.user_id = $2";
  }
  const o = (await query(`${BASE}, u.email as customer_email, dp.name as partner_name, dp.phone as partner_phone from orders o join users u on u.id = o.user_id left join users dp on dp.id = o.delivery_partner_id where ${where}`, params))[0];
  if (!o) return null;
  const items = await query(`select i.*, (select coalesce(json_agg(json_build_object('batchNo', b.batch_no, 'expiry', to_char(b.expiry_date, 'YYYY-MM-DD'), 'qty', b.qty) order by b.expiry_date), '[]'::json) from order_item_batches b where b.order_item_id = i.id) as batches from order_items i where i.order_id = $1 order by i.name`, [id]);
  const events = await query(`select e.status, e.note, e.created_at, u.name as actor from order_events e left join users u on u.id = e.actor_id where e.order_id = $1 order by e.id`, [id]);
  const pays = await query(`select gateway_payment_id, gateway_order_id, amount, status, method, last_error, created_at, paid_at from payments where order_id = $1 order by created_at`, [id]);
  const refunds = await query(`select id, amount, reason, status, last_error, attempts, created_at from refunds where order_id = $1 order by created_at`, [id]);
  return {
    ...mapOrder(o), itemCount: Number(o.item_count), customerEmail: (o.customer_email ?? null) as string | null,
    // Tracking. The delivery code is shown only to the customer who owns the order, and only while it is on the road.
    deliveryAttempts: Number(o.delivery_attempts), packedAt: iso(o.packed_at), dispatchedAt: iso(o.dispatched_at), deliveredAt: iso(o.delivered_at),
    partnerName: o.status === "out_for_delivery" ? ((o.partner_name ?? null) as string | null) : null,
    partnerPhone: o.status === "out_for_delivery" && o.partner_phone ? String(o.partner_phone).replace(/^\+91/, "") : null,
    deliveryCode: !opts.staff && o.status === "out_for_delivery" ? ((o.delivery_code ?? null) as string | null) : null,
    items: items.map((i) => ({
      id: i.id as string, slug: i.slug as string, name: i.name as string, packSize: i.pack_size as string, manufacturer: i.manufacturer as string, schedule: i.schedule as string,
      qty: Number(i.qty), unitPrice: Number(i.unit_price), mrp: Number(i.mrp), lineTotal: Number(i.line_total),
      batches: (opts.staff ? i.batches : []) as { batchNo: string; expiry: string; qty: number }[],
    })),
    payments: opts.staff ? pays.map((p) => ({ paymentId: (p.gateway_payment_id ?? null) as string | null, gatewayOrderId: p.gateway_order_id as string, amount: Number(p.amount), status: p.status as string, method: (p.method ?? null) as string | null, error: (p.last_error ?? null) as string | null, createdAt: iso(p.created_at) as string, paidAt: iso(p.paid_at) })) : [],
    refunds: refunds.map((r) => ({ id: r.id as string, amount: Number(r.amount), reason: r.reason as string, status: r.status as string, error: opts.staff ? ((r.last_error ?? null) as string | null) : null, retryable: r.status === "failed" && Number(r.attempts) < 8, createdAt: iso(r.created_at) as string })),
    events: events.map((e) => ({ status: e.status as string, note: e.note as string, at: iso(e.created_at) as string, actor: (e.actor ?? null) as string | null })),
  };
}

export async function adminListOrders(opts: { status?: string; q?: string; page: number; pageSize: number }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.status && opts.status !== "all") {
    if (opts.status === "open") where.push(`o.status in ('confirmed','packed','out_for_delivery')`);
    else {
      params.push(opts.status);
      where.push(`o.status = $${params.length}`);
    }
  }
  if (opts.q?.trim()) {
    params.push(`%${escapeLike(opts.q.trim().toLowerCase())}%`);
    where.push(`(lower(o.order_number) like $${params.length} or lower(o.customer_name) like $${params.length} or o.customer_phone like $${params.length})`);
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";
  const rows = await query(`${BASE} from orders o ${clause} order by o.created_at desc limit ${opts.pageSize} offset ${(opts.page - 1) * opts.pageSize}`, params);
  const [{ n }] = await query<{ n: string }>(`select count(*) as n from orders o ${clause}`, params);
  const counts = await query<{ status: string; n: number }>(`select status, count(*)::int as n from orders group by status`);
  return { total: Number(n), items: rows.map((r) => ({ ...mapOrder(r), itemCount: Number(r.item_count) })), counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number> };
}

