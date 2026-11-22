/* Sorts "Uncategorised" catalog medicines into sections in small committed chunks (gentle on small hosted databases).
 *   $env:TARGET_DATABASE_URL="postgres://...";  npx tsx scripts/categorise-chunked.ts
 * Safe to re-run: only touches items still in Uncategorised. */
import { Pool } from "pg";
import { classify } from "../src/server/catalog/classify";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const pool = new Pool({ connectionString: process.env.TARGET_DATABASE_URL, max: 1 });
  pool.on("error", () => {});
  const run = async (sql: string, p: unknown[] = []) => {
    for (let a = 0; ; a++) {
      try { return (await pool.query(sql, p)).rows; } catch (e) {
        const m = String(e instanceof Error ? e.message : e);
        if (a >= 60 || !/read-only|terminat|Connection|ECONN/i.test(m)) throw e;
        console.log(`waiting (${m.slice(0, 50)}) ${a + 1}/60`); await sleep(20000);
      }
    }
  };
  const cats = new Map<string, string>((await run(`select slug, id from categories`)).map((r: any) => [r.slug, r.id]));
  let done = 0; let last = "00000000-0000-0000-0000-000000000000";
  for (;;) {
    const rows = await run(
      `select m.id, m.name, m.form, coalesce(array_agg(s.name order by ms.position) filter (where s.name is not null), '{}') salts
       from (select id, name, form from medicines where category_id = $1 and status in ('draft','catalog') and id > $2 order by id limit 2000) m
       left join medicine_salts ms on ms.medicine_id = m.id left join salts s on s.id = ms.salt_id group by m.id, m.name, m.form`, [cats.get("uncategorised"), last]);
    if (!rows.length) break;
    last = (rows as any[]).map((r) => r.id).sort().pop();
    const by = new Map<string, string[]>(); const restricted: string[] = []; const none: string[] = [];
    for (const r of rows as any[]) {
      const o = classify({ name: r.name, form: r.form, salts: r.salts });
      if (o.restricted) restricted.push(r.id);
      if (o.category && cats.get(o.category)) (by.get(o.category) ?? by.set(o.category, []).get(o.category)!).push(r.id); else none.push(r.id);
    }
    for (const [slug, ids] of by) await run(`update medicines set category_id = $1 where id = any($2::uuid[])`, [cats.get(slug), ids]);
    if (restricted.length) await run(`update medicines set no_online_sale = true where id = any($1::uuid[])`, [restricted]);
    done += rows.length - none.length;
    console.log(`sorted ${done} (this chunk left ${none.length} unmatched)`);
    await sleep(300);
  }
  console.log("done");
  await pool.end();
}
main().catch((e) => { console.error("failed:", e instanceof Error ? e.message : e); process.exit(1); });
