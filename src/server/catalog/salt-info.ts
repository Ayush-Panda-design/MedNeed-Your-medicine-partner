import { query, type Row } from "../db";
import { cached } from "../cache";

/**
 * Ingredient-level information (what an ingredient is generally used for, how it is usually taken, common side effects).
 * It is stored once per ingredient (a few thousand rows), not per medicine, so every medicine in the catalogue that
 * contains the ingredient can be found by symptom ("fever", "acidity") and shown with general "used for" text.
 *
 * The text is written by AI from widely known general information and stays marked "not reviewed" until a pharmacist
 * checks it. It never contains doses. Customers are shown that it is general information, not advice.
 */
export const searchTextOf = (name: string, uses: string[], keywords: string[]) =>
  [name, ...uses, ...keywords].join(" ").toLowerCase().replace(/[^a-z0-9଀-୿\s&-]/g, " ").replace(/\s+/g, " ").trim();

const clean = (v: unknown, max: number): string[] =>
  (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim().replace(/\s+/g, " ")).filter((x) => x.length > 1 && x.length <= max).slice(0, 12);

export type SaltInfoInput = { name: string; uses?: unknown; keywords?: unknown; how_to_use?: unknown; side_effects?: unknown; precautions?: unknown };

/** Validates one AI-written entry. Returns null when it has nothing usable. */
export function cleanSaltInfo(x: SaltInfoInput) {
  const uses = clean(x.uses, 60);
  const keywords = clean(x.keywords, 40).map((k) => k.toLowerCase());
  const how = typeof x.how_to_use === "string" ? x.how_to_use.trim().slice(0, 300) : "";
  // Doses are the pharmacist's and the doctor's call, never generated text: drop any entry that quotes a number of mg/ml.
  const hasDose = (t: string) => /\b\d+(\.\d+)?\s?(mg|mcg|ml|g|iu|units?)\b/i.test(t);
  const sideEffects = clean(x.side_effects, 90).filter((t) => !hasDose(t));
  const precautions = clean(x.precautions, 140).filter((t) => !hasDose(t));
  if (uses.length === 0) return null;
  return { uses, keywords, howToUse: hasDose(how) ? "" : how, sideEffects, precautions };
}

const STOP = new Set(["for","the","and","with","medicine","medicines","tablet","tablets","syrup","capsule","capsules","cure","treatment","remedy","best","good","pain","relief"].filter((w) => w !== "pain" && w !== "relief"));

/** Ids of ingredients whose "used for" text matches every word of the search ("stomach pain", "fever"). Empty when none. */
export async function symptomSaltIds(q: string): Promise<string[]> {
  const tokens = q.toLowerCase().split(/\s+/).map((t) => t.replace(/[^a-z0-9଀-୿&-]/g, "")).filter((t) => t.length >= 3).slice(0, 4);
  if (tokens.length === 0) return [];
  return cached(`symptom-salts:${tokens.join(" ")}`, 300_000, async () => {
    // A tiny table (one row per ingredient) so a plain scan is fine; the trigram index keeps it quick as it grows.
    // Each word must start a word in the ingredient's text ("ors" must not match "disorders").
    const where = tokens.map((_, i) => `search_text ~ $${i + 1}`).join(" and ");
    const rows = await query<{ salt_id: string }>(`select salt_id from salt_info where ${where} limit 400`, tokens.map((t) => `\\m${t}`));
    return rows.map((r) => r.salt_id);
  });
}

export type MedicineSaltInfo = { uses: string[]; howToUse: string; sideEffects: string[]; precautions: string[]; reviewed: boolean };

/** Combined ingredient information for one medicine (all of its ingredients), or null when none is stored. */
export async function infoForMedicine(medicineId: string): Promise<MedicineSaltInfo | null> {
  const rows = await query<Row>(
    `select si.uses, si.how_to_use, si.side_effects, si.precautions, si.reviewed
     from medicine_salts ms join salt_info si on si.salt_id = ms.salt_id where ms.medicine_id = $1 order by ms.position`,
    [medicineId],
  );
  if (rows.length === 0) return null;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : typeof v === "string" ? (JSON.parse(v) as string[]) : []);
  const uniq = (xs: string[]) => [...new Set(xs)].slice(0, 12);
  return {
    uses: uniq(rows.flatMap((r) => arr(r.uses))),
    howToUse: rows.length === 1 ? String(rows[0].how_to_use ?? "") : "",
    sideEffects: uniq(rows.flatMap((r) => arr(r.side_effects))),
    precautions: uniq(rows.flatMap((r) => arr(r.precautions))),
    reviewed: rows.every((r) => r.reviewed === true),
  };
}
