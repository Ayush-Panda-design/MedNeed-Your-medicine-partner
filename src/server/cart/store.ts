import { z } from "zod";
import { query } from "../db";

export const MAX_LINES = 50;
export const MAX_QTY = 10;

export const cartItemsSchema = z
  .array(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/), qty: z.number().int().min(1).max(MAX_QTY) }))
  .max(MAX_LINES);
export type CartItems = z.infer<typeof cartItemsSchema>;

/** One line per product, quantities capped, order kept. */
export function normaliseItems(items: CartItems): CartItems {
  const seen = new Map<string, number>();
  for (const it of items) seen.set(it.slug, Math.min(MAX_QTY, Math.max(seen.get(it.slug) ?? 0, it.qty)));
  return Array.from(seen, ([slug, qty]) => ({ slug, qty })).slice(0, MAX_LINES);
}

export async function getCart(userId: string): Promise<CartItems> {
  const rows = await query<{ items: unknown }>(`select items from carts where user_id = $1`, [userId]);
  const parsed = cartItemsSchema.safeParse(rows[0]?.items ?? []);
  return parsed.success ? parsed.data : [];
}

export async function saveCart(userId: string, items: CartItems): Promise<CartItems> {
  const clean = normaliseItems(items);
  await query(
    `insert into carts (user_id, items, updated_at) values ($1, $2::jsonb, now())
     on conflict (user_id) do update set items = excluded.items, updated_at = now()`,
    [userId, JSON.stringify(clean)],
  );
  return clean;
}
