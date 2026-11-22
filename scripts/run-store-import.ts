/* Imports the shop's own product list (src/server/catalog/data/store-items.json) as catalog-only items.
 *   $env:TARGET_DATABASE_URL="postgres://..."; npx tsx scripts/run-store-import.ts preview|commit */
import { Pool } from "pg";
import type { Db } from "../src/server/db";
import { runStoreImport } from "../src/server/catalog/store-items";

async function main() {
  const commit = process.argv[2] === "commit";
  const pool = new Pool({ connectionString: process.env.TARGET_DATABASE_URL, max: 2 });
  const mk = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: any[] }> }) => ({ query: async (s: string, p?: unknown[]) => (await c.query(s, p)).rows, exec: async (s: string) => { await c.query(s); } });
  const db = {
    ...mk(pool as any),
    tx: async (fn: (t: unknown) => Promise<unknown>) => {
      const client = await pool.connect();
      try { await client.query("begin"); const out = await fn(mk(client as any)); await client.query("commit"); return out; }
      catch (e) { await client.query("rollback").catch(() => {}); throw e; } finally { client.release(); }
    },
    exclusive: (fn: () => Promise<unknown>) => fn(),
  } as unknown as Db;
  const [admin] = await db.query<{ id: string }>(`select user_id as id from user_roles where role = 'admin' limit 1`);
  const report = await runStoreImport({ id: admin?.id ?? "00000000-0000-0000-0000-000000000000" } as never, commit, db);
  console.log(commit ? "COMMITTED" : "PREVIEW (rolled back)", JSON.stringify(report, null, 1).slice(0, 2500));
  await pool.end();
}
main().catch((e) => { console.error("failed:", e instanceof Error ? e.message : e); process.exit(1); });
