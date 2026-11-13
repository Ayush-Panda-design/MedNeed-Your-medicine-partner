import { z } from "zod";
import { ApiError } from "../http";
import { audit, isUniqueViolation } from "../auth/users";
import { query, type Q, type Row } from "../db";

const round2 = (n: number) => Math.round(n * 100) / 100;
const dateOrNull = z.union([z.string().datetime({ offset: true }), z.null()]);

export const couponInput = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,20}$/, "Code: 3-20 letters, numbers, - or _"),
    description: z.string().trim().max(120),
    kind: z.enum(["percent", "flat"]),
    value: z.number().positive("Enter a value above 0").max(100_000),
    maxDiscount: z.number().positive().max(100_000).nullable(),
    minOrder: z.number().min(0).max(1_000_000),
    startsAt: dateOrNull,
    endsAt: dateOrNull,
    usageLimit: z.number().int().positive().max(1_000_000).nullable(),
    perUserLimit: z.number().int().min(1).max(1000),
    isActive: z.boolean(),
  })
  .superRefine((c, ctx) => {
    if (c.kind === "percent" && c.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "A percentage cannot be above 100." });
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
  });
export type CouponInput = z.infer<typeof couponInput>;

export type CouponResult = { ok: true; id: string; code: string; discount: number } | { ok: false; message: string };

/** Check a coupon against a basket. With `lock`, the coupon row is locked so limits cannot be beaten by parallel orders. */
export async function evaluateCoupon(q: Q, code: string, userId: string | null, subtotal: number, lock = false): Promise<CouponResult> {
  const c = (await q<Row>(`select * from coupons where upper(code) = upper($1) ${lock ? "for update" : ""}`, [code.trim()]))[0];
  const bad = (message: string): CouponResult => ({ ok: false, message });
  if (!c || !c.is_active) return bad("This coupon code is not valid.");
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return bad("This coupon is not active yet.");
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return bad("This coupon has expired.");
  if (!userId) return bad("Sign in to use a coupon.");
  const min = Number(c.min_order);
  if (subtotal < min) return bad(`Add items worth ₹${round2(min - subtotal)} more to use this coupon (minimum order ₹${min}).`);
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return bad("This coupon has been fully used.");
  const mine = Number((await q<{ n: string }>(`select count(*) as n from coupon_redemptions where coupon_id = $1 and user_id = $2`, [c.id, userId]))[0].n);
  if (mine >= c.per_user_limit) return bad("You have already used this coupon.");
  let discount = c.kind === "percent" ? round2((subtotal * Number(c.value)) / 100) : Number(c.value);
  if (c.max_discount != null) discount = Math.min(discount, Number(c.max_discount));
  discount = round2(Math.min(discount, subtotal));
  if (discount <= 0) return bad("This coupon does not apply to your basket.");
  return { ok: true, id: c.id, code: c.code, discount };
}

const map = (r: Row) => ({
  id: r.id as string, code: r.code as string, description: r.description as string, kind: r.kind as "percent" | "flat", value: Number(r.value),
  maxDiscount: r.max_discount == null ? null : Number(r.max_discount), minOrder: Number(r.min_order),
  startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null, endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  usageLimit: r.usage_limit as number | null, perUserLimit: r.per_user_limit as number, usedCount: r.used_count as number, isActive: r.is_active as boolean,
});
export type Coupon = ReturnType<typeof map>;

export async function listCoupons(): Promise<Coupon[]> {
  return (await query(`select * from coupons order by is_active desc, created_at desc`)).map(map);
}

const params = (v: CouponInput) => [v.code.toUpperCase(), v.description, v.kind, v.value, v.maxDiscount, v.minOrder, v.startsAt, v.endsAt, v.usageLimit, v.perUserLimit, v.isActive];

export async function createCoupon(actor: { id: string; ip?: string }, v: CouponInput) {
  try {
    const [r] = await query<{ id: string }>(
      `insert into coupons (code, description, kind, value, max_discount, min_order, starts_at, ends_at, usage_limit, per_user_limit, is_active) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      params(v),
    );
    await audit(actor.id, "orders.coupon.created", { id: r.id, code: v.code.toUpperCase() }, actor.ip);
    return r.id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new ApiError(409, "A coupon with this code already exists.", "duplicate");
    throw e;
  }
}

export async function updateCoupon(actor: { id: string; ip?: string }, id: string, v: CouponInput) {
  try {
    const rows = await query(
      `update coupons set code=$2, description=$3, kind=$4, value=$5, max_discount=$6, min_order=$7, starts_at=$8, ends_at=$9, usage_limit=$10, per_user_limit=$11, is_active=$12 where id=$1 returning id`,
      [id, ...params(v)],
    );
    if (!rows[0]) throw new ApiError(404, "Coupon not found.");
    await audit(actor.id, "orders.coupon.updated", { id, code: v.code.toUpperCase(), isActive: v.isActive }, actor.ip);
  } catch (e) {
    if (isUniqueViolation(e)) throw new ApiError(409, "A coupon with this code already exists.", "duplicate");
    throw e;
  }
}
