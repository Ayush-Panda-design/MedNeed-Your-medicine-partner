import type { Q } from "../db";
import { sellableQtySql } from "../inventory/config";
import { evaluateCoupon } from "./coupons";
import { deliveryCharge, resolveDistance, type Place } from "./delivery";
import type { StoreSettings } from "./settings";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type QuoteInput = {
  items: { slug: string; qty: number }[];
  fulfilment: "delivery" | "pickup";
  place?: Place | null;
  couponCode?: string | null;
  userId?: string | null;
};

export type QuoteLine = {
  medicineId: string | null; slug: string; name: string; packSize: string; manufacturer: string; schedule: string; rx: boolean;
  qty: number; unitPrice: number; mrp: number; lineTotal: number; available: number; problem: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  mrpTotal: number; subtotal: number; discount: number; deliveryFee: number; total: number;
  coupon: { code: string; discount: number } | null; couponError: string | null;
  delivery: { status: "ok" | "estimate" | "blocked" | "pickup"; fee: number; baseFee: number; distanceFee: number; km: number | null; source: "pin" | "pincode" | null; message: string | null };
  requiresPrescription: boolean;
  problems: string[];
  canCheckout: boolean;
};

/**
 * The one place that prices a basket. The browser only says *what* and *how many*; every price, fee, discount and
 * stock check comes from here, and checkout runs the same function again inside the order transaction.
 */
export async function buildQuote(q: Q, settings: StoreSettings, input: QuoteInput): Promise<Quote> {
  const wanted = new Map<string, number>();
  for (const i of input.items) wanted.set(i.slug, (wanted.get(i.slug) ?? 0) + i.qty);

  const rows = wanted.size
    ? await q<{ id: string; slug: string; name: string; pack_size: string; schedule: string; status: string; no_online_sale: boolean; price: string; mrp: string; manufacturer: string; sellable: number }>(
        `select m.id, m.slug, m.name, m.pack_size, m.schedule, m.status, m.no_online_sale, m.price, m.mrp, mf.name as manufacturer, ${sellableQtySql("m")} as sellable
           from medicines m join manufacturers mf on mf.id = m.manufacturer_id where m.slug = any($1::text[])`,
        [[...wanted.keys()]],
      )
    : [];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const lines: QuoteLine[] = [];
  const problems: string[] = [];
  for (const [slug, qty] of wanted) {
    const r = bySlug.get(slug);
    if (!r || r.status !== "active" || r.no_online_sale || r.schedule === "X" || r.schedule === "unknown") {
      const name = r?.name ?? slug;
      const problem = `${name} is no longer available to order online.`;
      problems.push(problem);
      lines.push({ medicineId: r?.id ?? null, slug, name, packSize: r?.pack_size ?? "", manufacturer: r?.manufacturer ?? "", schedule: r?.schedule ?? "", rx: false, qty, unitPrice: 0, mrp: 0, lineTotal: 0, available: 0, problem });
      continue;
    }
    const price = Number(r.price);
    const available = Number(r.sellable);
    let problem: string | null = null;
    if (qty > settings.maxQtyPerLine) problem = `You can order at most ${settings.maxQtyPerLine} of ${r.name} at a time.`;
    else if (available === 0) problem = `${r.name} is out of stock.`;
    else if (qty > available) problem = `${r.name}: only ${available} left.`;
    if (problem) problems.push(problem);
    lines.push({
      medicineId: r.id, slug, name: r.name, packSize: r.pack_size, manufacturer: r.manufacturer, schedule: r.schedule, rx: r.schedule === "H" || r.schedule === "H1",
      qty, unitPrice: price, mrp: Number(r.mrp), lineTotal: round2(price * qty), available, problem,
    });
  }

  return finishQuote(q, settings, input, lines, problems);
}

/** Totals, coupon, delivery. Also used at checkout with the real batch prices swapped into `lines`. */
export async function finishQuote(q: Q, settings: StoreSettings, input: QuoteInput, lines: QuoteLine[], problems: string[]): Promise<Quote> {
  const subtotal = round2(lines.reduce((n, l) => n + l.lineTotal, 0));
  const mrpTotal = round2(lines.reduce((n, l) => n + l.mrp * l.qty, 0));
  if (lines.length === 0) problems.push("Your cart is empty.");

  let coupon: Quote["coupon"] = null;
  let couponError: string | null = null;
  if (input.couponCode?.trim()) {
    const c = await evaluateCoupon(q, input.couponCode, input.userId ?? null, subtotal);
    if (c.ok) coupon = { code: c.code, discount: c.discount };
    else couponError = c.message;
  }
  const discount = coupon?.discount ?? 0;

  const delivery: Quote["delivery"] = { status: "pickup", fee: 0, baseFee: 0, distanceFee: 0, km: null, source: null, message: null };
  if (input.fulfilment === "pickup") {
    if (!settings.pickup.enabled) {
      delivery.status = "blocked";
      delivery.message = "Store pickup is not available right now.";
      problems.push(delivery.message);
    }
  } else if (!settings.delivery.enabled) {
    delivery.status = "blocked";
    delivery.message = "Home delivery is not available right now.";
    problems.push(delivery.message);
  } else if (!input.place) {
    // No address yet: show the fee that applies inside the base distance, and the minimum order.
    const est = deliveryCharge(settings, subtotal, 0);
    delivery.status = "estimate";
    if (est.ok) {
      delivery.fee = est.fee;
      delivery.baseFee = est.baseFee;
    } else delivery.message = est.message;
  } else {
    const dist = await resolveDistance(q, settings, input.place);
    if (!dist.ok) {
      delivery.status = "blocked";
      delivery.message = dist.message;
      problems.push(dist.message);
    } else {
      delivery.km = dist.km;
      delivery.source = dist.source;
      const charge = deliveryCharge(settings, subtotal, dist.km);
      if (charge.ok) {
        delivery.status = "ok";
        delivery.fee = charge.fee;
        delivery.baseFee = charge.baseFee;
        delivery.distanceFee = charge.distanceFee;
      } else {
        delivery.status = "blocked";
        delivery.message = charge.message;
        problems.push(charge.message);
      }
    }
  }
  if (input.fulfilment === "delivery" && delivery.status === "estimate" && delivery.message && lines.length) problems.push(delivery.message);

  const deliveryFee = delivery.status === "ok" || delivery.status === "estimate" ? delivery.fee : 0;
  return {
    lines, mrpTotal, subtotal, discount, deliveryFee, total: round2(subtotal - discount + deliveryFee), coupon, couponError, delivery,
    requiresPrescription: lines.some((l) => l.rx), problems, canCheckout: problems.length === 0,
  };
}
