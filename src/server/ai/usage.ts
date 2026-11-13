import { query } from "../db";

/** Best-effort per-key daily counter. Never blocks or fails the request. */
export function recordUsage(keyId: string, error: boolean): void {
  query(
    `insert into ai_key_usage (key_id, day, calls, errors) values ($1, current_date, 1, $2)
     on conflict (key_id, day) do update set calls = ai_key_usage.calls + 1, errors = ai_key_usage.errors + $2`,
    [keyId, error ? 1 : 0],
  ).catch(() => {});
}
