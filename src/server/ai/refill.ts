import { getProductBySlug } from "../catalog/queries";
import { generateJSON } from "./gemini";
import { cached } from "./cache";

export type RefillClass = { maintenance: boolean; intervalDays: number; reason: string };

const DEFAULT_INTERVAL = 30;
const MIN_INTERVAL = 7;
const MAX_INTERVAL = 90;

/**
 * Decide whether a medicine is a long-term/maintenance product people typically reorder on a regular cycle
 * (e.g. blood pressure, diabetes, thyroid, cholesterol), and a rough reorder interval for one pack as sold.
 * This is a scheduling hint about product type, NOT medical or dosing advice. Cached 90 days per slug, so
 * the same medicine is only ever classified once across all customers.
 */
export async function classifyRefill(slug: string): Promise<RefillClass> {
  const p = await getProductBySlug(slug);
  // Unknown product: nothing to remind about. (Not an AI outage — safe to treat as settled.)
  if (!p) return { maintenance: false, intervalDays: 0, reason: "unknown product" };
  // Caches only on success; an AiUnavailable propagates so the caller can retry this medicine later.
  return cached<RefillClass>("refill-class", slug, 90 * 24 * 3600, async () => {
    const facts =
      `Name: ${p.name}\n` +
      `Composition: ${p.composition || "n/a"}\n` +
      `Form: ${p.form || "n/a"}\n` +
      `Pack: ${p.packSize || "n/a"}\n` +
      `Category: ${p.categoryName || "n/a"}`;
    const system =
      `You classify a pharmacy product for REFILL scheduling only. This is not medical advice and not dosing. ` +
      `Decide if it is a long-term "maintenance" medicine that people with a chronic condition typically take continuously ` +
      `and reorder on a regular cycle (examples: blood pressure, diabetes, thyroid, cholesterol, heart, asthma maintenance inhalers). ` +
      `Short courses (antibiotics, painkillers), one-off or as-needed products, supplements and general OTC items are NOT maintenance. ` +
      `Reply ONLY as JSON {"maintenance": boolean, "intervalDays": number, "reason": string}. ` +
      `intervalDays: for a maintenance medicine, a typical number of days one pack as sold lasts a regular user (usually 30; between ${MIN_INTERVAL} and ${MAX_INTERVAL}); ` +
      `for non-maintenance, set 0. reason: a short phrase. Never give dosing or medical advice.`;
    const out = await generateJSON<RefillClass>([{ text: facts }], { system, maxOutputTokens: 160 });
    const maintenance = Boolean(out?.maintenance);
    let intervalDays = Math.round(Number(out?.intervalDays) || 0);
    if (maintenance) intervalDays = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, intervalDays || DEFAULT_INTERVAL));
    else intervalDays = 0;
    return { maintenance, intervalDays, reason: String(out?.reason ?? "").slice(0, 200) };
  });
}
