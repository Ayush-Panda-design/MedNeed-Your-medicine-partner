import { createHash } from "node:crypto";
import { query } from "../db";

/** Serve a cached AI result when one is fresh, otherwise compute and store it. Shields the free-tier quota. */
export async function cached<T>(feature: string, keyParts: unknown, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cacheKey = createHash("sha256").update(`${feature}:${JSON.stringify(keyParts)}`).digest("hex");
  const hit = await query<{ value: T }>(`select value from ai_cache where cache_key = $1 and expires_at > now()`, [cacheKey]).catch(() => []);
  if (hit[0]) return hit[0].value as T;
  const value = await fn();
  await query(
    `insert into ai_cache (cache_key, feature, value, expires_at) values ($1, $2, $3::jsonb, now() + make_interval(secs => $4))
     on conflict (cache_key) do update set value = excluded.value, expires_at = excluded.expires_at, created_at = now()`,
    [cacheKey, feature, JSON.stringify(value), ttlSeconds],
  ).catch(() => {});
  return value;
}
