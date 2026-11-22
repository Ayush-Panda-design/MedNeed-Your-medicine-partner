import fs from "node:fs";
import type { Db } from "../db";
import { parseCsv } from "./csv";
import { buildSearchText, compositionKey, parseComposition, slugify, type SaltInput } from "./text";

/**
 * Development-only staging loader for the free "Indian Medicine Dataset" CSV
 * (columns: id,name,price(₹),Is_discontinued,manufacturer_name,type,pack_size_label,short_composition1,short_composition2).
 *
 * That dataset's origin is not documented, so nothing loaded here is trusted:
 *   - every row becomes an UNVERIFIED, CATALOG-ONLY listing: visible with its details, but with no price and no cart;
 *     customers can only ask the store to source it (and never for restricted drugs);
 *   - the prescription schedule is "unknown" (treated as prescription-only) and the database refuses to
 *     verify or publish an item until a pharmacist chooses one;
 *   - the price is the dataset's price used as both MRP and selling price, to be replaced by real data.
 * Replace this with the wholesaler's item master or a licensed database before going live.
 */
export const DATASET_SOURCE = "dataset:indian-medicine-dataset";

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

const FORM_WORDS: [RegExp, string][] = [
  [/capsule/, "Capsule"], [/tablet|\btab\b/, "Tablet"], [/syrup|elixir|linctus/, "Syrup"], [/suspension/, "Suspension"],
  [/injection|infusion|vial|ampoule|cartridge|pen\b|prefilled/, "Injection"], [/\bgel\b/, "Gel"], [/cream/, "Cream"], [/ointment/, "Ointment"],
  [/lotion|shampoo|solution|wash/, "Lotion"], [/drop/, "Drops"], [/spray/, "Spray"], [/inhaler|rotacap|respule/, "Inhaler"],
  [/powder|granules/, "Powder"], [/sachet/, "Sachet"],
];
export function guessForm(name: string, pack: string) {
  // The pack label ("strip of 10 tablets") is the most reliable; the product name is the fallback.
  for (const text of [pack.toLowerCase(), name.toLowerCase()]) for (const [re, form] of FORM_WORDS) if (re.test(text)) return form;
  return /\b(sr|er|dt|md|pr|cr|mr|xr|od)\b/i.test(name) ? "Tablet" : "Other";
}

type Item = { id: string; name: string; manufacturer: string; pack: string; price: number; form: string; salts: SaltInput[] };

export function readDataset(file: string, limit: number): Item[] {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const head = rows[0].map((h) => h.trim());
  const ix = (n: string) => head.indexOf(n);
  const c = { id: ix("id"), name: ix("name"), price: ix("price(₹)"), disc: ix("Is_discontinued"), mf: ix("manufacturer_name"), pack: ix("pack_size_label"), s1: ix("short_composition1"), s2: ix("short_composition2") };
  if (Object.values(c).some((i) => i < 0)) throw new Error("Dataset columns are not what the loader expects.");
  const out: Item[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < rows.length && out.length < limit; i++) {
    const r = rows[i];
    if ((r[c.disc] ?? "").trim().toUpperCase() !== "FALSE") continue; // skip discontinued
    const price = Number((r[c.price] ?? "").trim());
    const name = squash(r[c.name] ?? "");
    const manufacturer = squash(r[c.mf] ?? "");
    const pack = squash(r[c.pack] ?? "") || "Pack";
    if (!(price > 0) || name.length < 2 || manufacturer.length < 2 || name.length > 160 || manufacturer.length > 120 || pack.length > 80) continue;
    const key = `${name.toLowerCase()}|${manufacturer.toLowerCase()}|${pack.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const salts = parseComposition([r[c.s1] ?? "", r[c.s2] ?? ""].filter((x) => squash(x)).join("+")).slice(0, 12);
    // A salt listed twice (rare data error) would break the primary key; keep the first.
    const uniq = salts.filter((s, j) => salts.findIndex((o) => o.name.toLowerCase() === s.name.toLowerCase()) === j);
    out.push({ id: (r[c.id] ?? "").trim(), name, manufacturer, pack, price, form: guessForm(name, pack), salts: uniq });
  }
  return out;
}

export async function loadDataset(db: Db, file: string, limit: number) {
  const [{ n }] = await db.query<{ n: string }>(`select count(*)::text n from medicines where source = $1`, [DATASET_SOURCE]);
  if (Number(n) >= limit) return console.log(`[dataset] ${n} dataset medicines already staged. Nothing to do.`);
  const started = Date.now();
  let all = readDataset(file, limit);
  // Optional: keep only the products of the N manufacturers with the most products in the file (fits small databases).
  const topN = Number(process.env.DATASET_TOP_MANUFACTURERS) || 0;
  if (topN) {
    const cnt = new Map<string, number>();
    for (const it of all) cnt.set(it.manufacturer, (cnt.get(it.manufacturer) ?? 0) + 1);
    const keep = new Set([...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map((x) => x[0]));
    all = all.filter((it) => keep.has(it.manufacturer));
  }
  // Resume support: skip rows whose dataset id was already imported (a re-run must not create "-id" duplicates).
  const done = new Set((await db.query<{ r: string }>(`select source_ref r from medicines where source = $1`, [DATASET_SOURCE])).map((x) => x.r));
  const items = all.filter((it) => !done.has(it.id));
  console.log(`[dataset] Staging ${items.length} medicines (${all.length - items.length} already present) from ${file} (catalog-only, unverified)...`);

  const taken = new Set((await db.query<{ slug: string }>(`select slug from medicines`)).map((r) => r.slug));
  const BATCH = Number(process.env.DATASET_BATCH) || 500;
  const PAUSE_MS = Number(process.env.DATASET_PAUSE_MS) || 0;
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    if (PAUSE_MS) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const chunk = items.slice(i, i + BATCH);
    const prepared = chunk.map((it) => {
      let slug = slugify(it.name) || `medicine-${it.id}`;
      if (taken.has(slug)) slug = `${slug}-${it.id}`;
      taken.add(slug);
      return { ...it, slug };
    });
    // If the host flips the database to read-only (e.g. a free plan near its disk limit), wait and retry the batch.
    for (let attempt = 0; ; attempt++) {
      try {
        await loadBatch();
        break;
      } catch (e) {
        if (!/read-only/i.test(String(e instanceof Error ? e.message : e)) || attempt >= 30) throw e;
        console.log(`[dataset] database is read-only; waiting 20s (retry ${attempt + 1}/30)...`);
        await new Promise((r) => setTimeout(r, 20000));
      }
    }
    async function loadBatch() {
    await db.tx(async (t) => {
      await t.query(`insert into manufacturers (name) select distinct m from unnest($1::text[]) m on conflict (lower(name)) do nothing`, [[...new Set(prepared.map((p) => p.manufacturer))]]);
      const saltNames = [...new Set(prepared.flatMap((p) => p.salts.map((s) => s.name)))];
      if (saltNames.length) await t.query(`insert into salts (name) select distinct s from unnest($1::text[]) s on conflict (lower(name)) do nothing`, [saltNames]);
      const res = await t.query<{ slug: string }>(
        `insert into medicines (slug, name, manufacturer_id, category_id, form, pack_size, mrp, price, schedule, status, data_status, composition_key, search_text, source, source_ref)
         select x.slug, x.name, m.id, c.id, x.form, x.pack, x.price, x.price, 'unknown', 'catalog', 'unverified', x.ckey, x.search, 'dataset:indian-medicine-dataset', x.ref
         from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::numeric[], $7::text[], $8::text[], $9::text[]) as x(slug, name, mf, form, pack, price, ckey, search, ref)
         join manufacturers m on lower(m.name) = lower(x.mf)
         cross join (select id from categories where slug = 'uncategorised') c
         on conflict do nothing
         returning slug`,
        [
          prepared.map((p) => p.slug), prepared.map((p) => p.name), prepared.map((p) => p.manufacturer), prepared.map((p) => p.form), prepared.map((p) => p.pack),
          prepared.map((p) => p.price), prepared.map((p) => compositionKey(p.salts)),
          prepared.map((p) => buildSearchText({ name: p.name, manufacturer: p.manufacturer, salts: p.salts, uses: [], category: "" })),
          prepared.map((p) => p.id),
        ],
      );
      inserted += res.length;
      const made = new Set(res.map((r) => r.slug));
      const rows = prepared.filter((p) => made.has(p.slug)).flatMap((p) => p.salts.map((s, pos) => ({ slug: p.slug, salt: s.name, strength: s.strength, pos })));
      if (rows.length) {
        await t.query(
          `insert into medicine_salts (medicine_id, salt_id, strength, position)
           select md.id, sl.id, x.strength, x.pos
           from unnest($1::text[], $2::text[], $3::text[], $4::int[]) as x(slug, salt, strength, pos)
           join medicines md on md.slug = x.slug join salts sl on lower(sl.name) = lower(x.salt)
           on conflict do nothing`,
          [rows.map((r) => r.slug), rows.map((r) => r.salt), rows.map((r) => r.strength), rows.map((r) => r.pos)],
        );
      }
    });
    }
    if ((i / BATCH) % 10 === 9) console.log(`[dataset] ${Math.min(i + BATCH, items.length)} / ${items.length}`);
  }
  await db.query(`analyze medicines`).catch(() => {});
  const { autoCategorise } = await import("./categorise");
  const sorted = await autoCategorise(db);
  console.log(`[dataset] Sorted into sections: ${JSON.stringify(sorted.assigned)}; ${sorted.left} left uncategorised; ${sorted.flaggedNoOnlineSale} flagged "never sold online" pending pharmacist review.`);
  console.log(`[dataset] Staged ${inserted} new medicines in ${Math.round((Date.now() - started) / 1000)}s. They are listed as catalog-only items (request, not order) until verified and published.`);
}
