import { z } from "zod";
import { handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { cartItemsSchema, getCart, saveCart } from "@/server/cart/store";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

/** The signed-in user's saved cart (slugs and quantities only). */
export const GET = handle(async () => {
  const { userId } = await requireApiUser();
  return ok({ items: await getCart(userId) }, { headers: { "Cache-Control": "no-store" } });
});

const schema = z.object({ items: cartItemsSchema });

/** Replace the saved cart. The browser sends the whole cart after each change (debounced). */
export const PUT = handle(async (req) => {
  const { userId } = await requireApiUser();
  await rateLimit(`cart:${userId}`, 240, 600, "You're changing your cart very quickly. Please wait a moment.");
  const { items } = await readJson(req, schema);
  return ok({ items: await saveCart(userId, items) });
});
