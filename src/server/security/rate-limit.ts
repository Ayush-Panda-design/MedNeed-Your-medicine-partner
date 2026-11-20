import { query } from "../db";
import { ApiError } from "../http";

/** Fixed-window counter in the database, so limits hold across server instances. */
export async function rateLimit(key: string, limit: number, windowSeconds: number, message = "Too many attempts. Please try again later.") {
  const rows = await query<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2::double precision) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2::double precision) then now() else rate_limits.window_start end
     returning count`,
    [key, windowSeconds],
  );
  if (rows[0].count > limit) throw new ApiError(429, message, "rate_limited");
}

/**
 * A lighter limiter that lives in the server's memory instead of the database, for harmless read-only endpoints such as
 * search suggestions that run on every pause in typing. It saves a database write per call. It is per server instance, so it
 * is a soft brake, not a security control: sign-in, codes, orders and payments keep using rateLimit() above.
 */
const soft = new Map<string, { start: number; count: number }>();
export function rateLimitSoft(key: string, limit: number, windowSeconds: number, message = "Too many attempts. Please try again later.") {
  const now = Date.now();
  if (soft.size > 5000) for (const [k, v] of soft) if (now - v.start > windowSeconds * 1000) soft.delete(k);
  if (soft.size > 20000) soft.clear(); // never let a flood of keys grow without bound
  const e = soft.get(key);
  if (!e || now - e.start > windowSeconds * 1000) {
    soft.set(key, { start: now, count: 1 });
    return;
  }
  e.count += 1;
  if (e.count > limit) throw new ApiError(429, message, "rate_limited");
}

export async function clearRateLimit(key: string) {
  await query(`delete from rate_limits where key = $1`, [key]);
}
