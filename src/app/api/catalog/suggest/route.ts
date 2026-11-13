import { clientIp, handle, ok } from "@/server/http";
import { rateLimit } from "@/server/security/rate-limit";
import { searchProducts } from "@/server/catalog/queries";

// Public, read-only. Fast keyword/typo-tolerant lookup that powers the header search dropdown while typing.
// (Deliberately does not call the AI: it runs on every pause in typing. Pressing Enter uses the full smart search.)
export const GET = handle(async (req) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return ok({ items: [], total: 0 }, { headers: { "Cache-Control": "no-store" } });
  await rateLimit(`suggest:${clientIp(req)}`, 180, 60, "Too many searches. Please wait a moment.");
  const { items, total } = await searchProducts({ q, page: 1, pageSize: 6 });
  return ok({ items, total }, { headers: { "Cache-Control": "no-store" } });
});
