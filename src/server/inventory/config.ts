// Inventory rules that the whole app must agree on. Change them here (or with the env vars), nowhere else.

function intEnv(name: string, fallback: number, min: number, max: number) {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/** A batch with less than this many days to expiry is not sold online (default 30). */
export const minShelfDays = () => intEnv("INVENTORY_MIN_SHELF_DAYS", 30, 0, 365);
/** Batches expiring within this many days appear in the "near expiry" alert (default 90). */
export const expiryAlertDays = () => intEnv("INVENTORY_EXPIRY_ALERT_DAYS", 90, 1, 730);

/** "Today" in the store's timezone, as a SQL expression. */
export const TODAY_SQL = `(now() at time zone 'Asia/Kolkata')::date`;

/**
 * SQL expression: units of medicine `alias` that can be sold right now (not expired, not about to expire).
 * `stock_qty > 0` short-circuits the subquery so browsing 30,000 unstocked catalog rows stays cheap.
 * Only interpolates a validated integer.
 */
export function sellableQtySql(alias = "m") {
  return `coalesce(case when ${alias}.stock_qty > 0 then (select sum(b.qty_on_hand)::int from stock_batches b where b.medicine_id = ${alias}.id and b.qty_on_hand > 0 and b.expiry_date >= ${TODAY_SQL} + ${minShelfDays()}) end, 0)`;
}
export const inStockSql = (alias = "m") => `(${sellableQtySql(alias)} > 0)`;
