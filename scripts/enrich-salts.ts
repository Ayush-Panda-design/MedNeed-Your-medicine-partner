/*
 * Writes general ingredient information (what it is used for, how it is usually taken, common side effects) for every
 * ingredient in the catalogue, once per ingredient, using the Gemini keys in .env.local (GEMINI_API_KEYS).
 *
 *   PowerShell (in the project folder):
 *     $env:TARGET_DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"   # leave unset to use the local dev database
 *     npx tsx scripts/enrich-salts.ts            # everything still missing (about 1,600 ingredients, resumable)
 *     npx tsx scripts/enrich-salts.ts 24         # only the first 24, as a test
 *
 * Safe to stop and start again: it only fills ingredients that have no information yet, and saves after every batch.
 * The text is stored as "not reviewed" and is shown to customers as general information. It never contains doses.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { Pool } from "pg";
import { generateJSON, AiUnavailable } from "../src/server/ai/gemini";
import { cleanSaltInfo, searchTextOf, type SaltInfoInput } from "../src/server/catalog/salt-info";
import { geminiModel } from "../src/server/env";

const BATCH = 12;
const SYSTEM = `You write short, general patient-facing information about medicine ingredients for an Indian online pharmacy.
Rules:
- Use only widely known, well-established information. If you are not sure about an ingredient, return an empty "uses" list for it.
- NEVER give doses, strengths, or how many tablets to take. No numbers with mg, mcg, ml, g or units anywhere.
- "uses": 2 to 6 plain-language conditions or symptoms a person would search for (for example "fever", "headache", "acidity", "high blood pressure").
- "keywords": 4 to 10 extra search words people use for those problems, including common alternative names and everyday words (for example "bukhar", "gas", "heartburn", "sugar", "BP"). Never put brand names here.
- "how_to_use": one short general sentence (for example "Usually taken after food."). No doses.
- "side_effects": up to 5 common ones, short.
- "precautions": up to 4 short safety points (for example "Avoid in pregnancy unless your doctor advises.").
- Write in simple English. Return only JSON.`;

async function main() {
  const url = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const limit = Number(process.argv[2]) || Infinity;
  let query: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  let end: () => Promise<void> = async () => {};
  if (url) {
    const pool = new Pool({ connectionString: url, max: 2 });
    query = async (sql, params) => (await pool.query(sql, params as unknown[])).rows;
    end = () => pool.end();
    console.log(`Database: ${new URL(url).host}`);
  } else {
    const { query: q } = await import("../src/server/db");
    query = q as typeof query;
    console.log("Database: local development database");
  }

  const [{ ok }] = (await query(`select to_regclass('public.salt_info') is not null as ok`)) as { ok: boolean }[];
  if (!ok) throw new Error("The salt_info table does not exist yet. Open the website once (so it updates itself), then run this again.");

  const todo = (await query(
    `select s.id, s.name,
       (select count(*) from medicine_salts ms where ms.salt_id = s.id) as n
     from salts s left join salt_info si on si.salt_id = s.id
     where si.salt_id is null order by n desc, s.name`,
  )) as { id: string; name: string; n: string }[];
  const work = todo.slice(0, limit);
  console.log(`${todo.length} ingredients still need information. Doing ${work.length}. Model: ${geminiModel()}`);

  let done = 0, empty = 0, waits = 0;
  for (let i = 0; i < work.length; i += BATCH) {
    const chunk = work.slice(i, i + BATCH);
    let out: SaltInfoInput[] | null = null;
    for (let attempt = 0; attempt < 6 && !out; attempt++) {
      try {
        const res = await generateJSON<{ ingredients?: SaltInfoInput[] } | SaltInfoInput[]>(
          [{ text: `Ingredients: ${JSON.stringify(chunk.map((c) => c.name))}\nReturn JSON like {"ingredients":[{"name":"<exactly as given>","uses":[],"keywords":[],"how_to_use":"","side_effects":[],"precautions":[]}]} with one entry per ingredient.` }],
          { system: SYSTEM, temperature: 0.2, maxOutputTokens: 4096 },
        );
        out = Array.isArray(res) ? res : res.ingredients ?? [];
      } catch (e) {
        if (!(e instanceof AiUnavailable)) throw e;
        const wait = Math.min(120, 20 * (attempt + 1));
        console.log(`  AI busy or limit reached (${(e as Error).message}). Waiting ${wait}s ...`);
        waits++;
        await new Promise((r) => setTimeout(r, wait * 1000));
      }
    }
    if (!out) {
      console.log("  Giving up on this batch for now. Run the command again later to continue.");
      break;
    }
    const byName = new Map(out.map((o) => [String(o.name ?? "").trim().toLowerCase(), o]));
    for (const c of chunk) {
      const info = byName.get(c.name.trim().toLowerCase());
      const cleaned = info ? cleanSaltInfo(info) : null;
      if (!cleaned) {
        empty++; // nothing usable: leave it so a later run can try again
        continue;
      }
      await query(
        `insert into salt_info (salt_id, uses, keywords, how_to_use, side_effects, precautions, search_text, source, reviewed, model)
         values ($1,$2::jsonb,$3,$4,$5::jsonb,$6::jsonb,$7,'ai',false,$8) on conflict (salt_id) do nothing`,
        [c.id, JSON.stringify(cleaned.uses), cleaned.keywords.join(", "), cleaned.howToUse, JSON.stringify(cleaned.sideEffects), JSON.stringify(cleaned.precautions), searchTextOf(c.name, cleaned.uses, cleaned.keywords), geminiModel()],
      );
      done++;
    }
    console.log(`  ${Math.min(i + BATCH, work.length)} / ${work.length}  (saved ${done}, no usable answer for ${empty})`);
  }
  console.log(`Finished: ${done} ingredients saved, ${empty} without a usable answer (run again to retry them), ${waits} waits.`);
  await end();
  process.exit(0);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
