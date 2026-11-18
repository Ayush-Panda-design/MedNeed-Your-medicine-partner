import { db, type Db } from "../db";
import { audit } from "../auth/users";
import { clearCache } from "../cache";
import { buildSearchText, slugify } from "./text";
import type { Actor } from "./repo";
import raw from "./data/store-items.json";

/**
 * Adds the shop's own product list (exported from the billing software: name, company, form only; no prices, stock or
 * composition) to the catalogue as CATALOG-ONLY listings: visible in the right section with their details, no price and no
 * cart, customers can ask the store to source them. Making an item orderable still needs real MRP, stock and a schedule.
 *
 *   - Items already in the catalogue (same product name and company) are left alone.
 *   - Everything else is added once; running it again adds nothing new.
 *   - Non-medicine items (soap, diapers, condoms, devices...) are marked OTC; medicines stay "schedule unknown".
 *   - Only clear cases are sorted into a section. Anything doubtful stays "Uncategorised" for a person to place.
 * A preview (commit = false) runs everything inside a transaction and rolls it back.
 */
export const STORE_SOURCE = "store:stock-settings-2026-11-15";

type Item = [name: string, company: string, form: string, category: string];
const ITEMS = raw as Item[];

export const STORE_CATEGORIES: { slug: string; name: string; icon: string; blurb: string; sort: number }[] = [
  { slug: "personal-care", name: "Personal Care", icon: "smile", blurb: "Oral care, soaps, hair and daily hygiene", sort: 72 },
  { slug: "ayurvedic-herbal", name: "Ayurvedic & Herbal", icon: "leaf", blurb: "Ayurvedic and herbal remedies", sort: 74 },
  { slug: "nutrition", name: "Nutrition & Health Drinks", icon: "apple", blurb: "Protein, health drinks and food supplements", sort: 76 },
  { slug: "sexual-wellness", name: "Sexual Wellness", icon: "heart", blurb: "Condoms, lubricants and tests", sort: 95 },
];

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

const STOP = new Set(["tablet", "tablets", "tab", "capsule", "capsules", "cap", "syrup", "syp", "injection", "inj", "ointment", "oint", "suspension", "susp", "drops", "drop", "solution", "sachet", "powder", "oral", "dry", "nos", "strip", "pack", "bottle", "tube", "gm", "mg", "ml", "g", "mcg", "iu", "expt", "expectorant", "liquid", "kit", "gel", "cream", "lotion", "spray", "sr", "er", "forte", "plus", "ds"]);
/** Order-free, unit-free key so "Aciloc 150mg Tab" and "Aciloc 150 Tablet" meet. */
export function nameKey(s: string) {
  return s
    .toLowerCase()
    .replace(/(\d)\s*(mg|gm|ml|mcg|g|iu|%)/g, "$1 ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .sort()
    .join(" ");
}
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** Brand family: first real word of the name plus the first letters of the maker (Asthalin + Cip). */
function familyKey(name: string, mf: string) {
  const first = name.toLowerCase().split(/[^a-z]+/).find((w) => w.length >= 4);
  const m = letters(mf).slice(0, 3);
  return first && m.length === 3 ? `${first}|${m}` : null;
}

const FORM_MAP: Record<string, string> = {
  tablet: "Tablet", captabs: "Tablet", capsule: "Capsule", syrup: "Syrup", expectorant: "Syrup", suspension: "Suspension", injection: "Injection", gel: "Gel", cream: "Cream",
  ointment: "Ointment", lotion: "Lotion", solution: "Lotion", shampoo: "Lotion", wash: "Lotion", facewash: "Lotion", drops: "Drops", spray: "Spray", inhaler: "Inhaler", respule: "Inhaler",
  powder: "Powder", sachet: "Sachet", device: "Device", surgicals: "Device", kit: "Device", unit: "Device",
};
function formOf(form: string, name: string) {
  const n = name.toLowerCase();
  // What the product name says wins over the form column, which is often wrong ("02 60ml Syp" is listed as a tablet).
  if (/\b(inhaler|rotacaps?|respules?)\b/.test(n)) return "Inhaler";
  if (/\b(syp|syrup)\b/.test(n)) return "Syrup";
  if (/\b(inj|injection)\b/.test(n)) return "Injection";
  if (/\bcaps?(ule)?s?\b/.test(n)) return "Capsule";
  if (/\b(tab|tablet)s?\b/.test(n)) return "Tablet";
  return FORM_MAP[form.toLowerCase()] ?? "Other";
}

const DRUG_FORMS = new Set(["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Drops"]);
type Pick = { slug: string | null; nonDrug: boolean };

/** Sorts a store item into a section from its name and form. Only clear cases get a section. */
export function pickSection(name: string, form: string, excelCat: string, company: string): Pick {
  const n = name.toLowerCase();
  const f = form.toLowerCase();
  const drugForm = DRUG_FORMS.has(formOf(form, name));
  const nd = (slug: string): Pick => ({ slug, nonDrug: true });

  if (f === "condom" || /\b(condoms?|lubricants?|lube|pregnancy test|prega ?news|ovulation|durex|manforce|kamasutra|skore)\b/.test(n)) return nd("sexual-wellness");
  if (f === "diaper" || /\b(diapers?|pampers|huggies|mamy ?poko|baby wipes?|baby soap|baby powder|baby oil|baby lotion|baby cream|baby shampoo|feeding bottle|nipple|teether|cerelac|lactogen|nan ?pro)\b/.test(n) || (/\bbaby\b/.test(n) && !drugForm)) return nd("baby-care");
  if (f === "sanitary pad" || /\b(sanitary|napkins?|pantyliner|stayfree|whisper|sofy|menstrual|tampons?|intimate wash)\b/.test(n)) return nd("womens-care");
  if (["device", "surgicals", "bandage", "strip", "box"].includes(f) || /\b(glucometer|gluco meter|test strips?|lancets?|bp monitor|blood pressure|thermometer|nebuli[sz]er|bandage|plaster|gauze|cotton|gloves?|syringes?|face mask|crepe|brace|collar|splint|oximeter|spacer|catheter|dressing|sanitizer|walking stick|wheel ?chair|hot water bag|ice bag|knee|ankle|wrist|lumbar|abdominal belt|support)\b/.test(n)) {
    if (!(f === "strip" && !/\b(test|lancet|glucose)\b/.test(n))) return nd("devices");
  }
  if (/\b(shampoo|face ?wash|facewash|cleanser|moisturi[sz]er|sunscreen|sun screen|serum|scrub|face pack|body lotion)\b/.test(n) || ["facewash", "shampoo"].includes(f)) {
    // Medicated skin and hair products belong with skin care.
    return nd("skin-care");
  }
  if (/\b(soap|toothpaste|tooth paste|tooth brush|toothbrush|mouthwash|mouth wash|deodorant|talc|talcum|body wash|lip balm|hair oil|hair gel|handwash|hand wash|razor|shaving|wipes?|perfume|cologne|nail)\b/.test(n) || ["soap", "toothpaste", "mouthwash", "wipe"].includes(f)) return nd("personal-care");
  if (excelCat.toLowerCase().includes("ayurved") || /\b(baidyanath|patanjali|zandu|aimil|charak|kottakkal|hamdard|himalaya|organic india|churna|arishta|asava|bhasma|giloy|ashwagandha|triphala|tulsi|chyawan|kashayam)\b/.test(`${n} ${company.toLowerCase()}`)) return nd("ayurvedic-herbal");
  if (!drugForm && (excelCat.toLowerCase().includes("nutrition") || /\b(protein|horlicks|bournvita|complan|ensure|glucon ?d|electral|whey|oats|muesli|energy drink|health drink|pediasure|protinex|stevia)\b/.test(n))) return nd("nutrition");

  // Medicines with no composition: only unmistakable cues.
  if (f === "inhaler" || f === "respule" || /\b(inhaler|respules?|rotacaps?|rotahaler|nebulis)\b/.test(n)) return { slug: "respiratory-care", nonDrug: false };
  if (/\b(eye|ophthalmic|ear)\s*(drops?|ointment|gel)\b|\b(eye drops?|ear drops?|otic)\b/.test(n)) return { slug: "eye-ear", nonDrug: false };
  if (/\b(insulin|glargine|lantus|mixtard|novomix|humulin|huminsulin|tresiba)\b/.test(n)) return { slug: "diabetes-care", nonDrug: false };
  if (/\b(acne|pimple|dark spot|glow|whiten|anti ?ageing|scar|wart|itch|ringworm|fungal|skin|derma|moist)\b/.test(n) && ["cream", "gel", "ointment", "lotion"].includes(f)) return { slug: "skin-care", nonDrug: false };
  return { slug: null, nonDrug: false };
}

const EXPAND: [RegExp, string][] = [[/\btab$/i, "Tablet"], [/\bcap$/i, "Capsule"], [/\bsyp$/i, "Syrup"], [/\binj$/i, "Injection"], [/\boint$/i, "Ointment"]];
function tidyName(name: string) {
  let n = squash(name);
  for (const [re, to] of EXPAND) n = n.replace(re, to);
  return n.replace(/\b(Tablet|Capsule|Syrup|Injection|Ointment)\s+\1\b/gi, "$1").replace(/\bTablet\s+Tablet\b/gi, "Tablet");
}
function packOf(name: string) {
  const m = [...name.matchAll(/(\d+(?:\.\d+)?\s?(?:ml|gm|g|kg|l|nos|pcs|s)\b)/gi)].pop();
  return m ? squash(m[1]).slice(0, 40) : "Pack";
}

export type StoreImportReport = {
  committed: boolean;
  totalInFile: number;
  alreadyInCatalogue: number;
  alreadyAddedBefore: number;
  toAdd: number;
  added: number;
  bySection: Record<string, number>;
  unsorted: number;
  newSections: string[];
  sample: { name: string; company: string; section: string }[];
};

class Rollback extends Error {}

export async function runStoreImport(actor: Actor, commit: boolean, database?: Db): Promise<StoreImportReport> {
  const d = database ?? (await db());

  // Existing catalogue: product keys by manufacturer, and manufacturers by size.
  const existing = await d.query<{ name: string; mf: string; source: string; cat: string }>(
    `select m.name, mf.name as mf, m.source, c.slug as cat from medicines m join manufacturers mf on mf.id = m.manufacturer_id join categories c on c.id = m.category_id`,
  );
  const byKey = new Map<string, { mf: string; source: string }[]>();
  // Brand families: products sharing a first word and maker (Asthalin, Asthalin Rotacaps...) sit in the same section.
  const family = new Map<string, Map<string, number>>();
  for (const e of existing) {
    const k = nameKey(e.name);
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push({ mf: letters(e.mf), source: e.source });
    if (e.cat === "uncategorised" || e.source === STORE_SOURCE) continue;
    const fk = familyKey(e.name, e.mf);
    if (!fk) continue;
    const counts = family.get(fk) ?? family.set(fk, new Map()).get(fk)!;
    counts.set(e.cat, (counts.get(e.cat) ?? 0) + 1);
  }
  const familySection = (name: string, company: string) => {
    const counts = family.get(familyKey(name, company) ?? "");
    if (!counts) return null;
    let total = 0, best = "", bestN = 0;
    for (const [c, n] of counts) { total += n; if (n > bestN) { best = c; bestN = n; } }
    return bestN / total >= 0.8 ? best : null; // only when the family agrees
  };
  const mfs = await d.query<{ name: string; n: string }>(
    `select mf.name, count(m.id)::text as n from manufacturers mf left join medicines m on m.manufacturer_id = mf.id group by mf.id`,
  );
  const mfSorted = mfs.map((m) => ({ name: m.name, key: letters(m.name), n: Number(m.n) })).sort((a, b) => b.n - a.n);
  const mfCache = new Map<string, string>();
  const manufacturerFor = (company: string) => {
    const c = letters(company);
    if (c.length < 3 && c !== "dr") return "Other brands"; // "Dr" is the start of Dr Reddy's; other 1-2 letter codes tell us nothing
    const hit = mfCache.get(c);
    if (hit) return hit;
    const found = mfSorted.find((m) => m.key.startsWith(c)); // biggest manufacturer first
    const name = found ? found.name : squash(company).slice(0, 120);
    mfCache.set(c, name);
    return name;
  };

  const report: StoreImportReport = { committed: false, totalInFile: ITEMS.length, alreadyInCatalogue: 0, alreadyAddedBefore: 0, toAdd: 0, added: 0, bySection: {}, unsorted: 0, newSections: [], sample: [] };
  type Prepared = { name: string; mf: string; form: string; pack: string; slugCat: string; schedule: string; ref: string };
  const prepared: Prepared[] = [];
  const seenKeys = new Set<string>();
  for (const [rawName, company, rawForm, excelCat] of ITEMS) {
    const name = tidyName(rawName);
    const k = nameKey(rawName);
    const cands = byKey.get(k);
    if (cands?.some((c) => c.mf.startsWith(letters(company).slice(0, 3)))) {
      if (cands.some((c) => c.source === STORE_SOURCE)) report.alreadyAddedBefore++;
      else report.alreadyInCatalogue++;
      continue;
    }
    const mf = manufacturerFor(company);
    const dupKey = `${k}|${letters(mf)}|${packOf(name).toLowerCase()}`;
    if (seenKeys.has(dupKey)) continue;
    seenKeys.add(dupKey);
    const form = formOf(rawForm, name);
    const pick = pickSection(name, rawForm, excelCat, company);
    if (!pick.slug && !pick.nonDrug) {
      let fam = familySection(name, company);
      // The same brand name can cover a tablet and a cream: how it is used decides the section (as in classify.ts).
      const topical = ["Cream", "Gel", "Ointment", "Lotion"].includes(form) && !/\b(vaginal|oral|mouth|dental|gum)\b/i.test(name);
      if (fam && topical && ["hormones-steroids", "respiratory-care", "infection-care", "cold-cough", "heart-care"].includes(fam)) fam = "skin-care";
      else if (fam && /\bnasal\b/i.test(name)) fam = "cold-cough";
      if (fam) pick.slug = fam;
    }
    const slugCat = pick.slug ?? "uncategorised";
    report.bySection[slugCat] = (report.bySection[slugCat] ?? 0) + 1;
    if (!pick.slug) report.unsorted++;
    prepared.push({ name, mf, form, pack: packOf(name), slugCat, schedule: pick.nonDrug ? "OTC" : "unknown", ref: squash(company).slice(0, 60) });
  }
  report.toAdd = prepared.length;
  report.sample = prepared.filter((p) => p.slugCat !== "uncategorised").filter((_, i) => i % Math.max(1, Math.floor(prepared.length / 14)) === 0).slice(0, 14).map((p) => ({ name: p.name, company: p.mf, section: p.slugCat }));

  const taken = new Set((await d.query<{ slug: string }>(`select slug from medicines`)).map((r) => r.slug));
  try {
    await d.tx(async (t) => {
      for (const c of STORE_CATEGORIES) {
        const made = await t.query(`insert into categories (slug, name, icon, blurb, sort_order) values ($1,$2,$3,$4,$5) on conflict (slug) do nothing returning slug`, [c.slug, c.name, c.icon, c.blurb, c.sort]);
        if (made.length) report.newSections.push(c.name);
      }
      const BATCH = 800;
      for (let i = 0; i < prepared.length; i += BATCH) {
        const chunk = prepared.slice(i, i + BATCH).map((p) => {
          let slug = slugify(p.name) || "item";
          if (taken.has(slug)) slug = `${slug}-${slugify(p.mf).slice(0, 18) || "x"}`;
          let n = 2;
          const base = slug;
          while (taken.has(slug)) slug = `${base}-${n++}`;
          taken.add(slug);
          return { ...p, slug, search: buildSearchText({ name: p.name, manufacturer: p.mf, salts: [], uses: [], category: "" }) };
        });
        await t.query(`insert into manufacturers (name) select distinct m from unnest($1::text[]) m on conflict (lower(name)) do nothing`, [[...new Set(chunk.map((c) => c.mf))]]);
        const res = await t.query<{ slug: string }>(
          `insert into medicines (slug, name, manufacturer_id, category_id, form, pack_size, mrp, price, schedule, status, data_status, composition_key, search_text, source, source_ref)
           select x.slug, x.name, m.id, c.id, x.form, x.pack, 1, 1, x.schedule, 'catalog', 'unverified', '', x.search, $10, x.ref
           from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[]) as x(slug, name, mf, form, pack, cat, schedule, search, ref)
           join manufacturers m on lower(m.name) = lower(x.mf)
           join categories c on c.slug = x.cat
           on conflict do nothing
           returning slug`,
          [chunk.map((c) => c.slug), chunk.map((c) => c.name), chunk.map((c) => c.mf), chunk.map((c) => c.form), chunk.map((c) => c.pack), chunk.map((c) => c.slugCat), chunk.map((c) => c.schedule), chunk.map((c) => c.search), chunk.map((c) => c.ref), STORE_SOURCE],
        );
        report.added += res.length;
      }
      if (!commit) throw new Rollback();
    });
    report.committed = true;
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
  if (report.committed) {
    clearCache(); // the shop shows the new sections straight away on this server
    await audit(actor.id, "catalog.store_import", { added: report.added, existing: report.alreadyInCatalogue, unsorted: report.unsorted }, actor.ip);
  }
  return report;
}

export const storeItemCount = ITEMS.length;
