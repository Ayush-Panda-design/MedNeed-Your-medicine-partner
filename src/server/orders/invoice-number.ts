import type { Tx } from "../db";

/** Indian financial year label for a date, like "2026-27" (April to March, Indian time). */
export function financialYear(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * Gives the order its tax-invoice number the first time it is needed: MN/2026-27/000001, counting up without gaps within
 * a financial year. The counter row is locked, so two orders can never get the same number. Runs inside the caller's transaction,
 * so if the transaction fails no number is used up.
 */
export async function assignInvoiceNumber(t: Tx, orderId: string) {
  const o = (await t.query<{ invoice_number: string | null }>(`select invoice_number from orders where id = $1 for update`, [orderId]))[0];
  if (!o || o.invoice_number) return o?.invoice_number ?? null;
  const fy = financialYear();
  const [c] = await t.query<{ last_number: number }>(
    `insert into invoice_counters (fy, last_number) values ($1, 1) on conflict (fy) do update set last_number = invoice_counters.last_number + 1 returning last_number`,
    [fy],
  );
  const number = `MN/${fy}/${String(c.last_number).padStart(6, "0")}`;
  await t.query(`update orders set invoice_number = $2, invoice_date = now() where id = $1`, [orderId, number]);
  return number;
}
