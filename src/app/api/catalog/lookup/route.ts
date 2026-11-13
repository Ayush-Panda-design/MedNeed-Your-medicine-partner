import { z } from "zod";
import { handle, ok, readJson } from "@/server/http";
import { getProductsBySlugs } from "@/server/catalog/queries";

const schema = z.object({ slugs: z.array(z.string().regex(/^[a-z0-9-]{1,100}$/)).max(50) });

// Public. Resolves cart slugs to current, published products with their live prices.
export const POST = handle(async (req) => {
  const { slugs } = await readJson(req, schema);
  const products = await getProductsBySlugs(Array.from(new Set(slugs)));
  return ok({ products }, { headers: { "Cache-Control": "no-store" } });
});
