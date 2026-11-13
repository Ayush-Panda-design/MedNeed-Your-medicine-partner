import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { getClaims } from "@/server/auth/session";
import { query } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { buildQuote } from "@/server/orders/quote";
import { getSettings, publicSettings } from "@/server/orders/settings";
import { razorpayConfigured } from "@/server/payments/razorpay";
import { planPrescriptions } from "@/server/prescriptions/coverage";

const body = z.object({
  items: z.array(z.object({ slug: z.string().min(1).max(160), qty: z.number().int().min(1).max(100) })).max(50),
  fulfilment: z.enum(["delivery", "pickup"]).default("delivery"),
  addressId: z.uuid().optional(),
  // Without a saved address (guests, or the cart page) the customer can just say where they are.
  pincode: z.string().regex(/^[1-9]\d{5}$/).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  couponCode: z.string().trim().max(30).optional(),
  prescriptionIds: z.array(z.uuid()).max(5).optional(),
});

/** Prices a basket on the server. Anyone can ask (the cart page needs it); coupons and saved addresses need a sign-in. */
export const POST = handle(async (req) => {
  await rateLimit(`quote:${clientIp(req)}`, 120, 60, "Too many requests. Please slow down.");
  const b = await readJson(req, body);
  const claims = await getClaims();
  const settings = await getSettings();

  let place: { lat: number | null; lng: number | null; pincode: string } | null = null;
  if (b.addressId && claims) {
    const a = (await query<{ lat: string | null; lng: string | null; pincode: string }>(`select lat, lng, pincode from addresses where id = $1 and user_id = $2`, [b.addressId, claims.userId]))[0];
    if (a) place = { lat: a.lat == null ? null : Number(a.lat), lng: a.lng == null ? null : Number(a.lng), pincode: a.pincode };
  } else if (b.pincode) place = { lat: b.lat ?? null, lng: b.lng ?? null, pincode: b.pincode };

  const quote = await buildQuote(query, settings, { items: b.items, fulfilment: b.fulfilment, place, couponCode: b.couponCode ?? null, userId: claims?.userId ?? null });
  // Do the chosen prescriptions cover the prescription medicines? (A hint for the page; checkout checks again for real.)
  let prescription: { required: boolean; state: "none" | "pending" | "verified" | "short"; message: string | null } = { required: false, state: "verified", message: null };
  const rxLines = quote.lines.filter((l) => l.rx && l.medicineId && !l.problem).map((l) => ({ medicineId: l.medicineId as string, name: l.name, qty: l.qty }));
  if (rxLines.length) {
    prescription = { required: true, state: "none", message: null };
    if (claims) {
      const plan = await planPrescriptions(query, claims.userId, b.prescriptionIds ?? [], rxLines, false);
      prescription = { required: true, state: plan.state, message: plan.problem };
    }
  }
  return ok({ quote, prescription, settings: publicSettings(settings), codEnabled: settings.payments.codEnabled, codMax: settings.payments.codMax, onlineEnabled: settings.payments.onlineEnabled && razorpayConfigured() });
});
