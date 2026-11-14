/*
 * One-time import of the medicine dataset CSV into a database (for example the staging/Vercel Neon database).
 *
 *   PowerShell:
 *     $env:TARGET_DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
 *     npx tsx scripts/load-dataset.ts "data/indian_medicine_data.csv" 30000
 *
 * It only adds medicines (as "catalog only": visible with details, no price, no cart) and sorts them into
 * categories. It does not create users, change settings or load sample data. Safe to re-run: rows already
 * imported are skipped. The site must have started once against this database so its tables exist.
 * The dataset is unverified test data: never load it into the live production database.
 */
import { Pool } from "pg";
import type { Db } from "../src/server/db";
import { loadDataset } from "../src/server/catalog/dataset";

async function main() {
  const url = process.env.TARGET_DATABASE_URL;
  const file = process.argv[2];
  const limit = Number(process.argv[3]) || 30000;
  if (!url || !file) {
    console.error('Usage: set TARGET_DATABASE_URL, then: npx tsx scripts/load-dataset.ts "<path to csv>" [limit]');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 2 });
  const db: Db = {
    query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
    exec: async (sql) => {
      await pool.query(sql);
    },
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const out = await fn({
          query: async (sql: string, params?: unknown[]) => (await client.query(sql, params)).rows,
          exec: async (sql: string) => {
            await client.query(sql);
          },
        } as never);
        await client.query("commit");
        return out;
      } catch (e) {
        await client.query("rollback").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    exclusive: (fn) => fn(),
  } as Db;

  const [{ ok }] = await db.query<{ ok: boolean }>(`select to_regclass('public.medicines') is not null and to_regclass('public.categories') is not null as ok`);
  if (!ok) {
    console.error("The database has no MedNeed tables yet. Open the website once (so it sets itself up), then run this again.");
    process.exit(1);
  }
  const host = new URL(url).host;
  console.log(`Importing up to ${limit} rows from ${file} into ${host} ...`);
  const t0 = Date.now();
  await loadDataset(db, file, limit);
  const [{ n }] = await db.query<{ n: string }>(`select count(*)::text n from medicines`);
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s. Medicines in database: ${n}.`);
  await pool.end();
}

main().catch((e) => {
  console.error("Import failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
