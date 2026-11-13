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

export async function clearRateLimit(key: string) {
  await query(`delete from rate_limits where key = $1`, [key]);
}
