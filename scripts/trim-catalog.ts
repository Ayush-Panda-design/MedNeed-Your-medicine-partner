/* Keeps only the dataset medicines made by the N biggest manufacturers (default 90), deletes the rest, then reclaims disk.
 * Only touches catalog-only dataset rows (never live products, store items or sample data).
 *   $env:TARGET_DATABASE_URL="postgres://..."; npx tsx scripts/trim-catalog.ts "data/indian_medicine_data.csv" 90
 * Safe to re-run. Waits (retries) while the database is read-only or unreachable. */
import { Pool } from "pg";
import { readDataset, DATASET_SOURCE } from "../src/server/catalog/dataset";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const file = process.argv[2], top = Number(process.argv[3]) || 90;
  const pool = new Pool({ connectionString: process.env.TARGET_DATABASE_URL, max: 1, connectionTimeoutMillis: 20000 });
  pool.on("error", () => {});
  const run = async (sql: string, p: unknown[] = []) => {
    for (let a = 0; ; a++) {
      try { return (await pool.query(sql, p)).rows as any[]; } catch (e) {
        const m = String(e instanceof Error ? e.message : e);
        if (a >= 90 || !/read-only|terminat|Connection|ECONN|timeout|disconnected/i.test(m)) throw e;
        console.log(`waiting (${m.slice(0, 60)}) ${a + 1}/90`); await sleep(20000);
      }
    }
  };
  const items = readDataset(file, 300000);
  const cnt = new Map<string, number>();
  for (const i of items) cnt.set(i.manufacturer, (cnt.get(i.manufacturer) ?? 0) + 1);
  const keepMf = new Set([...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map((x) => x[0]));
  const dropIds = items.filter((i) => !keepMf.has(i.manufacturer)).map((i) => i.id);
  console.log(`keeping ${items.length - dropIds.length} medicines from ${top} manufacturers; deleting up to ${dropIds.length}`);
  let deleted = 0;
  for (let i = 0; i < dropIds.length; i += 2000) {
    const r = await run(`delete from medicines where source = $1 and status = 'catalog' and source_ref = any($2::text[]) returning 1`, [DATASET_SOURCE, dropIds.slice(i, i + 2000)]);
    deleted += r.length;
    if ((i / 2000) % 10 === 9) console.log(`deleted ${deleted}`);
    await sleep(200);
  }
  console.log(`deleted ${deleted}. Reclaiming disk (vacuum full)...`);
  for (const t of ["medicine_salts", "medicines"]) await run(`vacuum full ${t}`);
  await run(`delete from manufacturers m where not exists (select 1 from medicines x where x.manufacturer_id = m.id)`).catch(() => {});
  await run(`delete from salts s where not exists (select 1 from medicine_salts x where x.salt_id = s.id)`).catch(() => {});
  const [{ s }] = await run(`select pg_size_pretty(pg_database_size(current_database())) s`);
  const [{ n }] = await run(`select count(*)::text n from medicines`);
  console.log(`Done. ${n} medicines, database size ${s}.`);
  await pool.end();
}
main().catch((e) => { console.error("failed:", e instanceof Error ? e.message : e); process.exit(1); });
