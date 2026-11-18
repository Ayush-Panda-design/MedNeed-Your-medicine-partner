import fs from "node:fs";
import { databaseUrl, isProd, pgliteDir } from "../env";
import { migrations } from "./migrations";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;
export type Q = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;
export type Tx = { query: Q; exec: (sql: string) => Promise<void> };
export interface Db {
  query: Q;
  exec: (sql: string) => Promise<void>;
  tx: <T>(fn: (t: Tx) => Promise<T>) => Promise<T>;
  /** Run fn while holding a database-wide lock, so only one server instance at a time does start-up work. */
  exclusive: <T>(fn: () => Promise<T>) => Promise<T>;
}

// Production: node-postgres against DATABASE_URL.
// Development without DATABASE_URL: PGlite (Postgres compiled to WASM, no install and no native files).
async function connect(): Promise<Db> {
  const url = databaseUrl();

  if (url) {
    const mod: any = await import("pg");
    const Pool = mod.Pool ?? mod.default.Pool;
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX) || 10 });
    return {
      exclusive: async (fn) => {
        // Transaction-scoped advisory lock on one dedicated connection, so instances starting together
        // (serverless cold starts, rolling deploys) migrate and seed one after another, never at once.
        // It must be transaction-scoped: behind a transaction-mode pooler (Neon "-pooler", PgBouncer) a
        // session lock can stay held by a pooled backend forever and hang every later cold start.
        // The lock ends with the transaction, and lock_timeout stops a request from ever waiting indefinitely.
        const client = await pool.connect();
        try {
          await client.query("begin");
          await client.query("set local lock_timeout = '30s'");
          await client.query(`select pg_advisory_xact_lock(727002)`);
          const out = await fn();
          await client.query("commit");
          return out;
        } catch (err) {
          await client.query("rollback").catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },
      query: async (sql, params) => (await pool.query(sql, params as any[])).rows,
      exec: async (sql) => {
        await pool.query(sql);
      },
      tx: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("begin");
          const out = await fn({
            query: async (sql, params) => (await client.query(sql, params as any[])).rows,
            exec: async (sql) => {
              await client.query(sql);
            },
          });
          await client.query("commit");
          return out;
        } catch (err) {
          await client.query("rollback").catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },
    };
  }

  if (isProd()) throw new Error("No database configured: set DATABASE_URL (or POSTGRES_URL) for this environment and redeploy.");

  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const dir = pgliteDir();
  fs.mkdirSync(dir, { recursive: true });
  const lite: any = new PGlite(dir, { extensions: { pg_trgm } });
  await lite.waitReady;
  console.log(`[db] Using local development database (PGlite) at ${dir}`);
  return {
    exclusive: (fn) => fn(), // single process in development
    query: async (sql, params) => (await lite.query(sql, params)).rows,
    exec: async (sql) => {
      await lite.exec(sql);
    },
    tx: (fn) =>
      lite.transaction((t: any) =>
        fn({
          query: async (sql, params) => (await t.query(sql, params)).rows,
          exec: async (sql) => {
            await t.exec(sql);
          },
        }),
      ),
  };
}

async function migrate(db: Db) {
  await db.exec(`create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await db.query<{ id: string }>(`select id from schema_migrations`)).map((r) => r.id));
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    await db.tx(async (t) => {
      await t.exec(m.sql);
      await t.query(`insert into schema_migrations (id) values ($1)`, [m.id]);
    });
    console.log(`[db] Applied migration ${m.id}`);
  }
}

async function init(): Promise<Db> {
  const db = await connect();
  // Fast path for the common case (a warm database): nothing to migrate and an admin exists, so skip the lock.
  if (!(await upToDate(db))) await db.exclusive(() => startup(db));
  return db;
}

async function upToDate(db: Db): Promise<boolean> {
  if (!isProd()) return false; // development always runs startup (sample data, dataset, ADMIN_RESET)
  try {
    const applied = new Set((await db.query<{ id: string }>(`select id from schema_migrations`)).map((r) => r.id));
    if (!migrations.every((m) => applied.has(m.id))) return false;
    const admins = await db.query<{ n: number }>(`select count(*)::int as n from user_roles where role = 'admin'`);
    if (!admins[0]?.n) return false;
    // Demo deployments only need start-up work while the catalogue is still empty. A cheap "any row?" check answers that, so a
    // populated demo site takes the fast path too (before, every cold start took the database-wide lock and counted all rows,
    // and cold starts arriving together queued behind each other).
    if (process.env.MEDNEED_DEMO_DATA === "1" && !(await db.query(`select 1 from medicines limit 1`)).length) return false;
    return true;
  } catch {
    return false; // fresh database (no tables yet)
  }
}

async function startup(db: Db) {
  await migrate(db);
  const { bootstrapAdmin } = await import("../auth/bootstrap");
  await bootstrapAdmin(db);
  // Fictional sample products so the storefront is not empty during development. In production only when a
  // staging/demo deployment opts in with MEDNEED_DEMO_DATA=1 (never set this on the live site).
  const demo = isProd() ? process.env.MEDNEED_DEMO_DATA === "1" : process.env.MEDNEED_NO_SAMPLE_DATA !== "1";
  if (demo) {
    const { seedSampleCatalogIfEmpty } = await import("../catalog/seed");
    await seedSampleCatalogIfEmpty(db);
  }
  // Optional staging load of a CSV dataset (development only). See catalog/dataset.ts.
  if (!isProd() && process.env.MEDNEED_DATASET) {
    const { loadDataset } = await import("../catalog/dataset");
    await loadDataset(db, process.env.MEDNEED_DATASET, Number(process.env.MEDNEED_DATASET_LIMIT) || 30000);
  }
}

const g = globalThis as unknown as { __medneedDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__medneedDb) {
    g.__medneedDb = init().catch((err) => {
      g.__medneedDb = undefined;
      throw err;
    });
  }
  return g.__medneedDb;
}

export async function query<T = Row>(sql: string, params?: unknown[]) {
  return (await db()).query<T>(sql, params);
}
