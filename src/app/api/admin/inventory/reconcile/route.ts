import { handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { query } from "@/server/db";
import { reconcile } from "@/server/inventory/stock";

// Admin-only health check: the ledger must always add up to the stored quantities.
export const GET = handle(async () => {
  await requireApiStaff(["admin"]);
  return ok(await reconcile(query));
});
