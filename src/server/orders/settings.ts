import { z } from "zod";
import { audit } from "../auth/users";
import { query } from "../db";

const money = z.number().min(0).max(1_000_000);
const optEmail = z.string().trim().max(254).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address, or leave blank");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:MM");

export const settingsSchema = z
  .object({
    shop: z.object({
      name: z.string().trim().min(2).max(80),
      address: z.string().trim().max(300),
      phone: z.string().trim().max(20),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    delivery: z.object({
      enabled: z.boolean(),
      /** Delivery orders below this subtotal are refused (customers can pick up instead). */
      minOrder: money,
      /** Fee bands on the item subtotal: the first band whose `below` is above the subtotal applies. At or above the last band, delivery is free. */
      feeBands: z.array(z.object({ below: z.number().positive().max(1_000_000), fee: money })).max(5),
      freeRadiusKm: z.number().min(0).max(100),
      perKmRate: money,
      maxRadiusKm: z.number().min(1).max(100),
    }),
    pickup: z.object({ enabled: z.boolean() }),
    payments: z.object({
      codEnabled: z.boolean(),
      codMax: money,
      /** Needs the payment gateway (Phase 7). Keep off until then. */
      onlineEnabled: z.boolean(),
    }),
    hours: z.object({ open: hhmm, close: hhmm }),
    slots: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:MM-HH:MM")).max(12),
    /** Minutes stock is held for an order that is waiting for online payment. */
    holdMinutes: z.number().int().min(5).max(120),
    maxQtyPerLine: z.number().int().min(1).max(100),
    /** How long a prescription stays usable, counted from the date the doctor wrote it. */
    prescriptions: z.object({ validityDays: z.number().int().min(7).max(365) }),
    /** Which channels order messages go out on. A channel also needs its provider configured on the server. */
    notifications: z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
    /** Printed on tax invoices. Prices are GST-inclusive (MRP rules), so the tax is worked out from the price. */
    invoice: z.object({
      legalName: z.string().trim().min(2).max(120),
      gstin: z.string().trim().toUpperCase().regex(/^(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])?$/, "Enter a valid 15-character GSTIN, or leave blank"),
      drugLicense: z.string().trim().max(200),
      /** Used for any medicine without its own rate. */
      defaultGstPercent: z.number().min(0).max(40),
      deliveryGstPercent: z.number().min(0).max(40),
      /** The state the shop is in: decides CGST+SGST (same state) or IGST (other states). */
      state: z.string().trim().min(2).max(40),
      footerNote: z.string().trim().max(300),
    }),
    /** Business details shown on the website footer and the policy pages (Contact, Privacy, Terms, Refunds, Shipping). */
    legal: z.object({
      supportEmail: optEmail,
      /** Registered pharmacist in charge (name and State Pharmacy Council registration number). */
      pharmacistName: z.string().trim().max(120),
      pharmacistRegNo: z.string().trim().max(80),
      /** Grievance Officer required by the IT Rules / DPDP Act. */
      grievanceName: z.string().trim().max(120),
      grievanceEmail: optEmail,
      /** Tick once a lawyer has approved the policy pages; until then they carry a "being finalised" notice. */
      policiesReviewed: z.boolean(),
    }),
  })
  .superRefine((s, ctx) => {
    if (s.delivery.maxRadiusKm < s.delivery.freeRadiusKm) ctx.addIssue({ code: "custom", path: ["delivery", "maxRadiusKm"], message: "The maximum distance cannot be less than the base delivery distance." });
    for (let i = 1; i < s.delivery.feeBands.length; i++) {
      if (s.delivery.feeBands[i].below <= s.delivery.feeBands[i - 1].below) ctx.addIssue({ code: "custom", path: ["delivery", "feeBands", i, "below"], message: "Fee bands must go up in order." });
    }
    if (s.hours.close <= s.hours.open) ctx.addIssue({ code: "custom", path: ["hours", "close"], message: "Closing time must be after opening time." });
    for (const w of s.slots) {
      const [a, b] = w.split("-");
      if (b <= a) ctx.addIssue({ code: "custom", path: ["slots"], message: `Slot ${w} ends before it starts.` });
    }
  });
export type StoreSettings = z.infer<typeof settingsSchema>;

/** Shop details for MED NEED (two branches; treated as one shop for now). The pin below is only the middle of Bhubaneswar: the admin must set the exact shop location (`locationConfigured` tells them). */
export const DEFAULT_SETTINGS: StoreSettings = {
  shop: { name: "MED NEED", address: "Two branches. Branch 1: Plot no. 1629, Nakhara, DPS Road, Bhubaneswar, Odisha 751032. Branch 2: 842/1275, Puri Canal Road, Rudhrapur, Pahal / Balianta, Bhubaneswar, Odisha 751035.", phone: "9437545411", lat: 20.2961, lng: 85.8245 },
  delivery: { enabled: true, minOrder: 150, feeBands: [{ below: 300, fee: 30 }, { below: 500, fee: 15 }], freeRadiusKm: 10, perKmRate: 5, maxRadiusKm: 15 },
  pickup: { enabled: true },
  payments: { codEnabled: true, codMax: 5000, onlineEnabled: false },
  hours: { open: "07:00", close: "22:00" },
  slots: ["07:00-10:00", "10:00-13:00", "13:00-16:00", "16:00-19:00", "19:00-22:00"],
  holdMinutes: 15,
  maxQtyPerLine: 10,
  prescriptions: { validityDays: 180 },
  notifications: { email: true, sms: false, whatsapp: false },
  invoice: {
    legalName: "MED NEED", gstin: "", drugLicense: "", defaultGstPercent: 5, deliveryGstPercent: 18, state: "Odisha",
    footerNote: "Medicines are dispensed against a valid prescription where required. Goods once sold are not returnable unless damaged or wrongly supplied.",
  },
  legal: { supportEmail: "medneed.services@gmail.com", pharmacistName: "", pharmacistRegNo: "", grievanceName: "", grievanceEmail: "", policiesReviewed: false },
};

type Q = typeof query;

function merge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base) || typeof base !== "object") return (over as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  if (typeof over !== "object" || Array.isArray(over)) return base;
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) out[k] = k in out ? merge(out[k], v) : v;
  return out as T;
}

export async function getSettings(q: Q = query): Promise<StoreSettings & { locationConfigured: boolean }> {
  const rows = await q<{ data: Record<string, unknown> }>(`select data from store_settings where id = 1`);
  const stored = rows[0]?.data ?? {};
  const merged = merge(DEFAULT_SETTINGS, stored);
  // Stored data was validated on save; if it is ever damaged, fall back to defaults rather than breaking checkout.
  const parsed = settingsSchema.safeParse(merged);
  const out = parsed.success ? parsed.data : DEFAULT_SETTINGS;
  // "Configured" means the admin moved the pin off the placeholder, not merely saved the form.
  const locationConfigured = out.shop.lat !== DEFAULT_SETTINGS.shop.lat || out.shop.lng !== DEFAULT_SETTINGS.shop.lng;
  return { ...out, locationConfigured };
}

export async function saveSettings(actor: { id: string; ip?: string }, input: StoreSettings) {
  await query(`update store_settings set data = $1::jsonb, updated_at = now(), updated_by = $2 where id = 1`, [JSON.stringify(input), actor.id]);
  await audit(actor.id, "orders.settings.updated", { delivery: input.delivery, pickup: input.pickup, payments: input.payments, shop: { lat: input.shop.lat, lng: input.shop.lng } }, actor.ip);
}

/** What the storefront may know (no internal limits beyond what the customer needs). */
export const publicSettings = (s: StoreSettings) => ({
  shopName: s.shop.name,
  deliveryEnabled: s.delivery.enabled,
  pickupEnabled: s.pickup.enabled,
  minOrder: s.delivery.minOrder,
  freeRadiusKm: s.delivery.freeRadiusKm,
  maxRadiusKm: s.delivery.maxRadiusKm,
  perKmRate: s.delivery.perKmRate,
  feeBands: s.delivery.feeBands,
  hours: s.hours,
  slots: s.slots,
});

const ampm = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** Business details for the footer and policy pages. Blank values are shown as "to be added" only on the pages that need them. */
export async function businessInfo() {
  const s = await getSettings();
  return {
    name: s.shop.name,
    legalName: s.invoice.legalName,
    address: s.shop.address,
    phone: s.shop.phone,
    email: s.legal.supportEmail,
    hours: s.hours,
    /** "7:00 AM to 10:00 PM" */
    hoursLabel: `${ampm(s.hours.open)} to ${ampm(s.hours.close)}`,
    gstin: s.invoice.gstin,
    drugLicense: s.invoice.drugLicense,
    state: s.invoice.state,
    pharmacistName: s.legal.pharmacistName,
    pharmacistRegNo: s.legal.pharmacistRegNo,
    grievanceName: s.legal.grievanceName,
    grievanceEmail: s.legal.grievanceEmail || s.legal.supportEmail,
    reviewed: s.legal.policiesReviewed,
    delivery: { enabled: s.delivery.enabled, minOrder: s.delivery.minOrder, feeBands: s.delivery.feeBands, freeRadiusKm: s.delivery.freeRadiusKm, perKmRate: s.delivery.perKmRate, maxRadiusKm: s.delivery.maxRadiusKm, slots: s.slots },
    pickup: s.pickup.enabled,
    cod: { enabled: s.payments.codEnabled, max: s.payments.codMax },
    rxValidityDays: s.prescriptions.validityDays,
  };
}
export type BusinessInfo = Awaited<ReturnType<typeof businessInfo>>;
