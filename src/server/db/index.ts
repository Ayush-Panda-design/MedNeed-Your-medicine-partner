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
}

// Production: node-postgres against DATABASE_URL.
// Development without DATABASE_URL: PGlite (Postgres compiled to WASM, no install and no native files).
async function connect(): Promise<Db> {
  const url = databaseUrl();

  if (url) {
    const mod: any = await import("pg");
    const Pool = mod.Pool ?? mod.default.Pool;
    const pool = new Pool({ connectionString: url, max: 10 });
    return {
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

  if (isProd()) throw new Error("DATABASE_URL must be set in production.");

  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const dir = pgliteDir();
  fs.mkdirSync(dir, { recursive: true });
  const lite: any = new PGlite(dir, { extensions: { pg_trgm } });
  await lite.waitReady;
  console.log(`[db] Using local development database (PGlite) at ${dir}`);
  return {
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
  await migrate(db);
  const { bootstrapAdmin } = await import("../auth/bootstrap");
  await bootstrapAdmin(db);
  // Fictional sample products so the storefront is not empty during development. Never in production.
  if (!isProd() && process.env.MEDNEED_NO_SAMPLE_DATA !== "1") {
    const { seedSampleCatalogIfEmpty } = await import("../catalog/seed");
    await seedSampleCatalogIfEmpty(db);
  }
  // Optional staging load of a CSV dataset (development only). See catalog/dataset.ts.
  if (!isProd() && process.env.MEDNEED_DATASET) {
    const { loadDataset } = await import("../catalog/dataset");
    await loadDataset(db, process.env.MEDNEED_DATASET, Number(process.env.MEDNEED_DATASET_LIMIT) || 30000);
  }
  return db;
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
